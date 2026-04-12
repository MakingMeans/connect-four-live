from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import TOKEN_URL
from app.core.jwt_utils import build_forbidden_exception, build_unauthorized_exception, decode_token
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=TOKEN_URL)


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme),
) -> User:
    payload = decode_token(token, expected_type="access")
    user_id = payload.get("user_id")
    username = payload.get("username") or payload.get("sub")

    user = None
    if user_id is not None:
        user = db.query(User).filter(User.id == user_id).first()
    if user is None and username:
        user = db.query(User).filter(User.username == username).first()

    if user is None:
        raise build_unauthorized_exception("El usuario autenticado ya no existe.")

    if not user.is_verified:
        raise build_forbidden_exception("La cuenta no esta autorizada para acceder a este recurso.")

    return user
