from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from jose import ExpiredSignatureError, JWTError, jwt

from app.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
    SECRET_KEY,
)

ACCESS_TOKEN_EXPIRE_SECONDS = ACCESS_TOKEN_EXPIRE_MINUTES * 60
REFRESH_TOKEN_EXPIRE_SECONDS = REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def build_unauthorized_exception(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def build_forbidden_exception(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def _create_token(payload: dict[str, Any], expires_delta: timedelta, token_type: str) -> str:
    now = _utcnow()
    token_payload = payload.copy()
    token_payload.update({"type": token_type, "iat": now, "exp": now + expires_delta})
    return jwt.encode(token_payload, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(*, user_id: int, username: str) -> str:
    return _create_token(
        {"sub": username, "user_id": user_id, "username": username},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "access",
    )


def create_refresh_token(*, user_id: int, username: str) -> str:
    return _create_token(
        {"sub": username, "user_id": user_id, "username": username},
        timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "refresh",
    )


def decode_token(token: str, expected_type: str | None = None) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except ExpiredSignatureError as exc:
        raise build_unauthorized_exception("El token expiro.") from exc
    except JWTError as exc:
        raise build_unauthorized_exception("Token invalido.") from exc

    token_type = payload.get("type")
    if expected_type == "refresh" and token_type != "refresh":
        raise build_unauthorized_exception("Se requiere un refresh token valido.")

    if expected_type == "access" and token_type not in (None, "access"):
        raise build_unauthorized_exception("Se requiere un access token valido.")

    has_user_id = payload.get("user_id") is not None
    has_identity = bool(payload.get("username") or payload.get("sub"))
    if not has_user_id and not has_identity:
        raise build_unauthorized_exception("El token no contiene identidad de usuario.")

    return payload
