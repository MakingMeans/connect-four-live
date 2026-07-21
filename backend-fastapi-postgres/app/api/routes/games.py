from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.api.deps_auth import get_current_user
from app.models.user import User
from app.schemas.game import GameCreateRequest, GameMoveRequest, GameResponse
from app.services import game_service

router = APIRouter(prefix="/games", tags=["games"])


@router.get("", response_model=list[GameResponse])
def list_games(
    status_filter: Literal["waiting", "in_progress", "finished"] | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return game_service.list_games(db, current_user, status_filter)


@router.post("", response_model=GameResponse, status_code=status.HTTP_201_CREATED)
def create_game(
    data: GameCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return game_service.create_game(db, current_user, data.vs_ai)


@router.post("/{game_id}/join", response_model=GameResponse)
def join_game(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return game_service.join_game(db, game_id, current_user)


@router.post("/{game_id}/move", response_model=GameResponse)
def make_move(
    game_id: str,
    data: GameMoveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return game_service.make_move(db, game_id, current_user, data.column)


@router.get("/{game_id}", response_model=GameResponse)
def get_game(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return game_service.get_game_state(db, game_id, current_user)
