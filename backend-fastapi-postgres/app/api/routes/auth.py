from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.user import UserCreate, UserLogin, VerifyCode
from app.api.deps import get_db
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):
    return auth_service.register_user(db, user)

@router.post("/verify")
def verify(data: VerifyCode, db: Session = Depends(get_db)):
    return auth_service.verify_user(db, data.email, data.code)

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    return auth_service.login_user(db, user.username, user.password)