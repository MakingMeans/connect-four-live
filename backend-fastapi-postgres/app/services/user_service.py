from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User


def serialize_user(user: User) -> dict:
    return {
        "user": user.username,
        "user_id": user.id,
        "email": user.email,
        "is_verified": user.is_verified,
    }


def _persist_changes(db: Session) -> None:
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="No fue posible actualizar el perfil.") from exc


def update_current_user(db: Session, current_user: User, data) -> dict:
    new_username = data.username.strip() if data.username else None
    new_email = data.email.strip().lower() if data.email else None

    if new_username and new_username.lower() != current_user.username.lower():
        username_taken = (
            db.query(User)
            .filter(func.lower(User.username) == new_username.lower(), User.id != current_user.id)
            .first()
        )
        if username_taken:
            raise HTTPException(status_code=400, detail="El username ya esta en uso.")
        current_user.username = new_username

    if new_email and new_email.lower() != current_user.email.lower():
        email_taken = (
            db.query(User)
            .filter(func.lower(User.email) == new_email.lower(), User.id != current_user.id)
            .first()
        )
        if email_taken:
            raise HTTPException(status_code=400, detail="El email ya esta en uso.")
        current_user.email = new_email

    _persist_changes(db)
    db.refresh(current_user)
    return serialize_user(current_user)


def change_current_user_password(db: Session, current_user: User, current_password: str, new_password: str) -> dict:
    if not verify_password(current_password, current_user.password):
        raise HTTPException(status_code=400, detail="La contrasena actual es incorrecta.")

    if verify_password(new_password, current_user.password):
        raise HTTPException(status_code=400, detail="La nueva contrasena debe ser diferente a la actual.")

    current_user.password = hash_password(new_password)
    current_user.password_reset_token = None
    current_user.password_reset_expires_at = None
    current_user.password_reset_used_at = None
    _persist_changes(db)

    return {"message": "Contrasena actualizada correctamente."}
