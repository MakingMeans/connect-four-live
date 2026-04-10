from fastapi import APIRouter, Depends
from app.api.deps_auth import get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
def get_me(current_user: str = Depends(get_current_user)):
    return {"user": current_user}