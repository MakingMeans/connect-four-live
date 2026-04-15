import os

from dotenv import load_dotenv

load_dotenv()


def _get_env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name, default)
    if value is None or value == "":
        return default
    return value


def _require_env(name: str) -> str:
    value = _get_env(name)
    if value is None:
        raise RuntimeError(f"La variable de entorno {name} es obligatoria.")
    return value


def _get_int_env(name: str, default: int) -> int:
    value = _get_env(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise RuntimeError(f"La variable de entorno {name} debe ser numerica.") from exc


PROJECT_NAME = "Connect Four Auth API"
TOKEN_URL = "/auth/login"

DATABASE_URL = _require_env("DATABASE_URL")
SECRET_KEY = _require_env("SECRET_KEY")
ALGORITHM = _get_env("ALGORITHM", "HS256")

ACCESS_TOKEN_EXPIRE_MINUTES = _get_int_env("ACCESS_TOKEN_EXPIRE_MINUTES", 30)
REFRESH_TOKEN_EXPIRE_DAYS = _get_int_env("REFRESH_TOKEN_EXPIRE_DAYS", 7)
VERIFICATION_CODE_EXPIRE_MINUTES = _get_int_env("VERIFICATION_CODE_EXPIRE_MINUTES", 10)
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = _get_int_env("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", 15)

LOGIN_RATE_LIMIT_MAX_ATTEMPTS = _get_int_env("LOGIN_RATE_LIMIT_MAX_ATTEMPTS", 5)
LOGIN_RATE_LIMIT_WINDOW_SECONDS = _get_int_env("LOGIN_RATE_LIMIT_WINDOW_SECONDS", 300)

EMAIL_USER = _get_env("EMAIL_USER")
EMAIL_PASSWORD = _get_env("EMAIL_PASSWORD")
SMTP_HOST = _get_env("SMTP_HOST")
SMTP_PORT = _get_int_env("SMTP_PORT", 587)
EMAIL_FROM_NAME = _get_env("EMAIL_FROM_NAME", "Connect Four AI")
