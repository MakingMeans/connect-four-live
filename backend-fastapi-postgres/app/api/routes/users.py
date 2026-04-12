from fastapi import APIRouter, Depends

from app.api.deps_auth import get_current_user
from app.models.user import User
from app.schemas.user import UserMeResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "user": current_user.username,
        "user_id": current_user.id,
        "email": current_user.email,
        "is_verified": current_user.is_verified,
    }
