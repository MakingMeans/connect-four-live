from pydantic import BaseModel, EmailStr, model_validator


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


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    email: EmailStr
    token: str
    new_password: str


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


class UserUpdateRequest(BaseModel):
    username: str | None = None
    email: EmailStr | None = None

    @model_validator(mode="after")
    def validate_at_least_one_field(self):
        if self.username is None and self.email is None:
            raise ValueError("Debes enviar al menos username o email.")
        return self


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
