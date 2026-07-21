from datetime import datetime
from pydantic import BaseModel, Field


class GameCreateRequest(BaseModel):
    vs_ai: bool = False


class GameJoinRequest(BaseModel):
    pass


class GameMoveRequest(BaseModel):
    column: int = Field(ge=0, le=6)


class GameResponse(BaseModel):
    id: str
    player1_id: int
    player2_id: int | None
    is_vs_ai: bool
    board_state: list[list[int]]
    current_turn: str | None
    status: str
    winner: str | None
    is_draw: bool
    created_at: datetime
    updated_at: datetime
