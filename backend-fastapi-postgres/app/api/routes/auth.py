import json
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.user import (
    ActionMessage,
    RefreshTokenRequest,
    ResendVerificationCode,
    TokenResponse,
    UserCreate,
    VerifyCode,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


async def login_credentials_dependency(
    request: Request,
    grant_type: Annotated[str | None, Form()] = None,
    username: Annotated[str | None, Form()] = None,
    password: Annotated[str | None, Form()] = None,
    scope: Annotated[str, Form()] = "",
    client_id: Annotated[str | None, Form()] = None,
    client_secret: Annotated[str | None, Form()] = None,
) -> OAuth2PasswordRequestForm:
    if username and password:
        return OAuth2PasswordRequestForm(
            grant_type=grant_type,
            username=username,
            password=password,
            scope=scope,
            client_id=client_id,
            client_secret=client_secret,
        )

    try:
        payload = await request.json()
    except (json.JSONDecodeError, ValueError):
        payload = {}

    json_username = payload.get("username")
    json_password = payload.get("password")
    if json_username and json_password:
        return OAuth2PasswordRequestForm(
            grant_type=payload.get("grant_type"),
            username=json_username,
            password=json_password,
            scope=payload.get("scope", ""),
            client_id=payload.get("client_id"),
            client_secret=payload.get("client_secret"),
        )

    raise HTTPException(status_code=422, detail="Debes enviar username y password.")


@router.post("/signup", status_code=status.HTTP_201_CREATED, response_model=ActionMessage, response_model_exclude_none=True)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    return auth_service.register_user(db, user)


@router.post("/verify", response_model=ActionMessage, response_model_exclude_none=True)
def verify(data: VerifyCode, db: Session = Depends(get_db)):
    return auth_service.verify_user(db, data.email, data.code)


@router.post("/resend-code", response_model=ActionMessage, response_model_exclude_none=True)
def resend_verification_code(data: ResendVerificationCode, db: Session = Depends(get_db)):
    return auth_service.resend_verification_code(db, data.email)


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    credentials: OAuth2PasswordRequestForm = Depends(login_credentials_dependency),
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "unknown"
    return auth_service.login_user(db, credentials.username, credentials.password, client_ip)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(data: RefreshTokenRequest, db: Session = Depends(get_db)):
    return auth_service.refresh_access_token(db, data.refresh_token)
