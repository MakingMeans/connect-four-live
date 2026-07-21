from copy import deepcopy

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.game import Game
from app.models.user import User

ROWS = 6
COLUMNS = 7
EMPTY_CELL = 0
PLAYER1_SLOT = "player1"
PLAYER2_SLOT = "player2"
STATUS_WAITING = "waiting"
STATUS_IN_PROGRESS = "in_progress"
STATUS_FINISHED = "finished"


def _create_empty_board() -> list[list[int]]:
    return [[EMPTY_CELL for _ in range(COLUMNS)] for _ in range(ROWS)]


def _copy_board(board_state: list[list[int]]) -> list[list[int]]:
    return deepcopy(board_state)


def _token_for_slot(slot: str) -> int:
    return 1 if slot == PLAYER1_SLOT else 2


def _other_slot(slot: str) -> str:
    return PLAYER2_SLOT if slot == PLAYER1_SLOT else PLAYER1_SLOT


def _get_user_slot(game: Game, user: User) -> str | None:
    if game.player1_id == user.id:
        return PLAYER1_SLOT
    if game.player2_id == user.id:
        return PLAYER2_SLOT
    return None


def _is_draw(board_state: list[list[int]]) -> bool:
    return all(cell != EMPTY_CELL for cell in board_state[0])


def _find_available_row(board_state: list[list[int]], column: int) -> int | None:
    for row in range(ROWS - 1, -1, -1):
        if board_state[row][column] == EMPTY_CELL:
            return row
    return None


def _count_direction(board_state: list[list[int]], row: int, col: int, token: int, row_step: int, col_step: int) -> int:
    total = 0
    current_row = row + row_step
    current_col = col + col_step

    while 0 <= current_row < ROWS and 0 <= current_col < COLUMNS:
        if board_state[current_row][current_col] != token:
            break
        total += 1
        current_row += row_step
        current_col += col_step

    return total


def _has_connect_four(board_state: list[list[int]], row: int, col: int, token: int) -> bool:
    directions = ((0, 1), (1, 0), (1, 1), (1, -1))
    for row_step, col_step in directions:
        connected = 1
        connected += _count_direction(board_state, row, col, token, row_step, col_step)
        connected += _count_direction(board_state, row, col, token, -row_step, -col_step)
        if connected >= 4:
            return True
    return False


def _persist_game(db: Session, game: Game) -> Game:
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


def _serialize_game(game: Game) -> dict:
    return {
        "id": game.id,
        "player1_id": game.player1_id,
        "player2_id": game.player2_id,
        "is_vs_ai": game.is_vs_ai,
        "board_state": game.board_state,
        "current_turn": game.current_turn,
        "status": game.status,
        "winner": game.winner,
        "is_draw": game.status == STATUS_FINISHED and game.winner is None,
        "created_at": game.created_at,
        "updated_at": game.updated_at,
    }


def _get_game_or_404(db: Session, game_id: str) -> Game:
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="La partida no existe.")
    return game


def _ensure_user_is_player(game: Game, user: User) -> str:
    user_slot = _get_user_slot(game, user)
    if not user_slot:
        raise HTTPException(status_code=403, detail="Solo los jugadores de la partida pueden realizar esta accion.")
    return user_slot


def _available_columns(board_state: list[list[int]]) -> list[int]:
    return [column for column in range(COLUMNS) if _find_available_row(board_state, column) is not None]


def _apply_token_to_column(board_state: list[list[int]], column: int, slot: str) -> tuple[list[list[int]], int]:
    if column < 0 or column >= COLUMNS:
        raise HTTPException(status_code=400, detail="La columna esta fuera de rango.")

    row = _find_available_row(board_state, column)
    if row is None:
        raise HTTPException(status_code=400, detail="La columna esta llena.")

    updated_board = _copy_board(board_state)
    updated_board[row][column] = _token_for_slot(slot)
    return updated_board, row


def _finalize_game_state(game: Game, board_state: list[list[int]], row: int, column: int, slot: str) -> None:
    token = _token_for_slot(slot)
    if _has_connect_four(board_state, row, column, token):
        game.board_state = board_state
        game.status = STATUS_FINISHED
        game.winner = slot
        game.current_turn = None
        return

    if _is_draw(board_state):
        game.board_state = board_state
        game.status = STATUS_FINISHED
        game.winner = None
        game.current_turn = None
        return

    game.board_state = board_state
    game.current_turn = _other_slot(slot)


def _would_be_winning_move(board_state: list[list[int]], column: int, slot: str) -> bool:
    try:
        simulated_board, row = _apply_token_to_column(board_state, column, slot)
    except HTTPException:
        return False

    return _has_connect_four(simulated_board, row, column, _token_for_slot(slot))


def _choose_ai_column(board_state: list[list[int]]) -> int | None:
    available_columns = _available_columns(board_state)
    if not available_columns:
        return None

    for column in available_columns:
        if _would_be_winning_move(board_state, column, PLAYER2_SLOT):
            return column

    for column in available_columns:
        if _would_be_winning_move(board_state, column, PLAYER1_SLOT):
            return column

    preferred_columns = sorted(available_columns, key=lambda current_column: abs(3 - current_column))
    return preferred_columns[0] if preferred_columns else None


def _run_ai_turn_if_needed(game: Game) -> None:
    if not game.is_vs_ai or game.status != STATUS_IN_PROGRESS or game.current_turn != PLAYER2_SLOT:
        return

    ai_column = _choose_ai_column(game.board_state)
    if ai_column is None:
        game.status = STATUS_FINISHED
        game.winner = None
        game.current_turn = None
        return

    board_state, row = _apply_token_to_column(game.board_state, ai_column, PLAYER2_SLOT)
    _finalize_game_state(game, board_state, row, ai_column, PLAYER2_SLOT)


def list_games(db: Session, current_user: User, status_filter: str | None = None) -> list[dict]:
    query = db.query(Game).filter(or_(Game.player1_id == current_user.id, Game.player2_id == current_user.id))

    if status_filter is not None:
        query = query.filter(Game.status == status_filter)

    games = query.order_by(Game.updated_at.desc(), Game.created_at.desc()).all()
    return [_serialize_game(game) for game in games]


def create_game(db: Session, current_user: User, vs_ai: bool = False) -> dict:
    game = Game(
        player1_id=current_user.id,
        player2_id=None,
        is_vs_ai=vs_ai,
        board_state=_create_empty_board(),
        current_turn=PLAYER1_SLOT,
        status=STATUS_IN_PROGRESS if vs_ai else STATUS_WAITING,
        winner=None,
    )
    _persist_game(db, game)
    return _serialize_game(game)


def join_game(db: Session, game_id: str, current_user: User) -> dict:
    game = _get_game_or_404(db, game_id)

    if game.is_vs_ai:
        raise HTTPException(status_code=400, detail="No se puede unir a una partida configurada contra la IA.")

    if game.player1_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes unirte a tu propia partida como segundo jugador.")

    if game.player2_id == current_user.id:
        raise HTTPException(status_code=400, detail="Ya formas parte de esta partida.")

    if game.status == STATUS_FINISHED:
        raise HTTPException(status_code=400, detail="La partida ya finalizo y no acepta nuevos jugadores.")

    if game.status == STATUS_IN_PROGRESS or game.player2_id is not None:
        raise HTTPException(status_code=400, detail="La partida ya tiene dos jugadores y esta en curso.")

    if game.status != STATUS_WAITING:
        raise HTTPException(status_code=400, detail="La partida no esta disponible para unirse en este momento.")

    game.player2_id = current_user.id
    game.status = STATUS_IN_PROGRESS
    game.current_turn = PLAYER1_SLOT
    _persist_game(db, game)
    return _serialize_game(game)


def get_game_state(db: Session, game_id: str, current_user: User) -> dict:
    game = _get_game_or_404(db, game_id)
    _ensure_user_is_player(game, current_user)
    return _serialize_game(game)


def make_move(db: Session, game_id: str, current_user: User, column: int) -> dict:
    game = _get_game_or_404(db, game_id)
    user_slot = _ensure_user_is_player(game, current_user)

    if game.status == STATUS_FINISHED:
        raise HTTPException(status_code=400, detail="La partida ya finalizo. No se pueden realizar mas movimientos.")

    if game.status == STATUS_WAITING:
        raise HTTPException(status_code=400, detail="La partida aun esta esperando a otro jugador.")

    if game.status != STATUS_IN_PROGRESS:
        raise HTTPException(status_code=400, detail="La partida no esta disponible para jugar en este momento.")

    if user_slot != game.current_turn:
        raise HTTPException(status_code=400, detail="No es tu turno para jugar.")

    board_state, row = _apply_token_to_column(game.board_state, column, user_slot)
    _finalize_game_state(game, board_state, row, column, user_slot)
    _run_ai_turn_if_needed(game)
    _persist_game(db, game)
    return _serialize_game(game)
