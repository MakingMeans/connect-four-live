from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.types import JSON

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()), index=True)
    player1_id = Column(Integer, nullable=False, index=True)
    player2_id = Column(Integer, nullable=True, index=True)
    is_vs_ai = Column(Boolean, default=False, nullable=False)
    board_state = Column(JSON, nullable=False)
    current_turn = Column(String, nullable=True)
    status = Column(String, nullable=False, default="waiting")
    winner = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False)
