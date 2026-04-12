import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import VERIFICATION_CODE_EXPIRE_MINUTES
from app.core.jwt_utils import (
    ACCESS_TOKEN_EXPIRE_SECONDS,
    REFRESH_TOKEN_EXPIRE_SECONDS,
    build_forbidden_exception,
    build_unauthorized_exception,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.security import (
    hash_password,
    hash_verification_code,
    verify_password,
    verify_verification_code,
)
from app.models.user import User
from app.services.email_service import EmailDeliveryError, send_verification_email
from app.services.rate_limit_service import login_rate_limiter
from app.utils.code_generator import generate_code

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _build_verification_expiration() -> datetime:
    return _utcnow() + timedelta(minutes=VERIFICATION_CODE_EXPIRE_MINUTES)


def _query_user_by_identity(db: Session, identifier: str) -> User | None:
    normalized_identifier = identifier.strip().lower()
    return (
        db.query(User)
        .filter(
            or_(
                func.lower(User.username) == normalized_identifier,
                func.lower(User.email) == normalized_identifier,
            )
        )
        .first()
    )


def _issue_tokens(user: User) -> dict:
    access_token = create_access_token(user_id=user.id, username=user.username)
    refresh_token = create_refresh_token(user_id=user.id, username=user.username)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user_id": user.id,
        "username": user.username,
        "access_token_expires_in": ACCESS_TOKEN_EXPIRE_SECONDS,
        "refresh_token_expires_in": REFRESH_TOKEN_EXPIRE_SECONDS,
    }


def _send_verification_email_safely(user: User, code: str) -> bool:
    try:
        send_verification_email(user.email, user.username, code)
        return True
    except EmailDeliveryError:
        logger.warning("No fue posible enviar el OTP al usuario %s. Puede reenviarse mas tarde.", user.email)
        return False


def _persist_changes(db: Session) -> None:
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Error persistiendo cambios en autenticacion.")
        raise HTTPException(status_code=500, detail="Ocurrio un error interno de autenticacion.") from exc


def register_user(db: Session, user_data) -> dict:
    existing_user = (
        db.query(User)
        .filter(
            or_(
                func.lower(User.username) == user_data.username.lower(),
                func.lower(User.email) == user_data.email.lower(),
            )
        )
        .first()
    )

    if existing_user:
        detail = "Usuario o email ya existe."
        if not existing_user.is_verified:
            detail += " Si aun no verificas tu cuenta, usa /auth/resend-code."
        raise HTTPException(status_code=400, detail=detail)

    code = generate_code()
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password=hash_password(user_data.password),
        verification_code=hash_verification_code(code),
        verification_code_expires_at=_build_verification_expiration(),
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception("Error creando usuario %s", user_data.email)
        raise HTTPException(status_code=500, detail="Error creando usuario.") from exc

    email_sent = _send_verification_email_safely(new_user, code)
    message = "Usuario creado. Revisa tu correo para verificar tu cuenta."
    if not email_sent:
        message = (
            "Usuario creado, pero no se pudo enviar el correo de verificacion. "
            "Configura SMTP y usa /auth/resend-code para reenviarlo."
        )

    return {"message": message, "email_sent": email_sent}


def verify_user(db: Session, email: str, code: str) -> dict:
    user = db.query(User).filter(func.lower(User.email) == email.lower()).first()

    if not user or not user.verification_code:
        raise HTTPException(status_code=400, detail="Codigo invalido.")

    if user.is_verified:
        return {"message": "La cuenta ya esta verificada."}

    if user.verification_code_expires_at and user.verification_code_expires_at < _utcnow():
        raise HTTPException(status_code=400, detail="El codigo expiro. Solicita uno nuevo.")

    if not verify_verification_code(code, user.verification_code):
        raise HTTPException(status_code=400, detail="Codigo invalido.")

    user.is_verified = True
    user.verification_code = None
    user.verification_code_expires_at = None
    _persist_changes(db)

    return {"message": "Cuenta verificada correctamente."}


def resend_verification_code(db: Session, email: str) -> dict:
    user = db.query(User).filter(func.lower(User.email) == email.lower()).first()

    if not user:
        return {"message": "Si la cuenta existe, se enviara un nuevo codigo de verificacion.", "email_sent": False}

    if user.is_verified:
        raise HTTPException(status_code=400, detail="La cuenta ya esta verificada.")

    code = generate_code()
    user.verification_code = hash_verification_code(code)
    user.verification_code_expires_at = _build_verification_expiration()
    _persist_changes(db)

    email_sent = _send_verification_email_safely(user, code)
    message = "Se genero un nuevo codigo de verificacion."
    if email_sent:
        message = "Se envio un nuevo codigo de verificacion a tu correo."
    else:
        message = (
            "Se genero un nuevo codigo, pero no se pudo enviar el correo. "
            "Verifica tu configuracion SMTP y vuelve a intentarlo."
        )

    return {"message": message, "email_sent": email_sent}


def login_user(db: Session, username: str, password: str, client_ip: str = "unknown") -> dict:
    limiter_key = f"{client_ip}:{username.strip().lower()}"
    allowed, retry_after = login_rate_limiter.check(limiter_key)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos fallidos. Intenta nuevamente en {retry_after} segundos.",
            headers={"Retry-After": str(retry_after)},
        )

    user = _query_user_by_identity(db, username)

    if not user or not verify_password(password, user.password):
        login_rate_limiter.register_failure(limiter_key)
        raise build_unauthorized_exception("Credenciales invalidas.")

    if not user.is_verified:
        raise build_forbidden_exception("Debes verificar tu correo antes de iniciar sesion.")

    login_rate_limiter.reset(limiter_key)
    return _issue_tokens(user)


def refresh_access_token(db: Session, refresh_token: str) -> dict:
    payload = decode_token(refresh_token, expected_type="refresh")
    user_id = payload.get("user_id")
    username = payload.get("username") or payload.get("sub")

    user = db.query(User).filter(User.id == user_id).first()
    if not user and username:
        user = db.query(User).filter(User.username == username).first()

    if not user:
        raise build_unauthorized_exception("El usuario asociado al token ya no existe.")

    if not user.is_verified:
        raise build_forbidden_exception("La cuenta aun no esta verificada.")

    return _issue_tokens(user)
