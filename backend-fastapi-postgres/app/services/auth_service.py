from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.user import User
from app.core.security import hash_password, verify_password, create_access_token
from app.utils.code_generator import generate_code
from sqlalchemy.exc import SQLAlchemyError

def register_user(db: Session, user_data):
    existing_user = db.query(User).filter(
        (User.username == user_data.username) |
        (User.email == user_data.email)
    ).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Usuario o email ya existe")

    code = generate_code()

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password=hash_password(user_data.password),
        verification_code=code
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except SQLAlchemyError as e:
        db.rollback()
        print("ERROR DB:", str(e))
        raise HTTPException(status_code=500, detail="Error creando usuario")

    print("Código de verificación:", code)

    return {"message": "Usuario creado. Verifica tu correo."}


def verify_user(db: Session, email: str, code: str):
    user = db.query(User).filter(User.email == email).first()

    if not user or user.verification_code != code:
        raise HTTPException(status_code=400, detail="Código inválido")

    user.is_verified = True
    user.verification_code = None
    db.commit()

    return {"message": "Cuenta verificada"}


def login_user(db: Session, username: str, password: str):
    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=400, detail="Usuario no existe")

    if not verify_password(password, user.password):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta")

    if not user.is_verified:
        raise HTTPException(status_code=400, detail="Cuenta no verificada")

    token = create_access_token({"sub": user.username})

    return {"access_token": token}