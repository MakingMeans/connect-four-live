from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class VerifyCode(BaseModel):
    email: EmailStr
    code: str


class ResendVerificationCode(BaseModel):
    email: EmailStr


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ActionMessage(BaseModel):
    message: str
    email_sent: bool | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    access_token_expires_in: int
    refresh_token_expires_in: int


class UserMeResponse(BaseModel):
    user: str
    user_id: int
    email: EmailStr
    is_verified: bool
