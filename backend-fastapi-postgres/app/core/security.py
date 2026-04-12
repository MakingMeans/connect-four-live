from passlib.context import CryptContext

from app.core.jwt_utils import create_access_token, create_refresh_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password[:72])


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password[:72], hashed_password)


def hash_verification_code(code: str) -> str:
    return pwd_context.hash(code)


def verify_verification_code(code: str, stored_code: str | None) -> bool:
    if not stored_code:
        return False

    try:
        if stored_code.startswith("$"):
            return pwd_context.verify(code, stored_code)
    except ValueError:
        return False

    return code == stored_code
