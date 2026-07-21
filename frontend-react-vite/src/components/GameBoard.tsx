interface GameBoardProps {
  board: number[][];
  disabled: boolean;
  isSubmitting: boolean;
  onPlay: (column: number) => void;
}

function getDiscClass(token: number) {
  if (token === 1) {
    return 'game-board__disc game-board__disc--player1';
  }

  if (token === 2) {
    return 'game-board__disc game-board__disc--player2';
  }

  return 'game-board__disc';
}

export function GameBoard({ board, disabled, isSubmitting, onPlay }: GameBoardProps) {
  return (
    <div className="game-board">
      <div className="game-board__controls">
        {Array.from({ length: 7 }, (_, column) => {
          const isColumnFull = board[0][column] !== 0;

          return (
            <button
              key={`column-${column + 1}`}
              className="game-board__control"
              type="button"
              disabled={disabled || isSubmitting || isColumnFull}
              onClick={() => onPlay(column)}
            >
              Drop {column + 1}
            </button>
          );
        })}
      </div>

      <div className="game-board__grid">
        {board.map((row, rowIndex) =>
          row.map((cell, columnIndex) => (
            <div className="game-board__cell" key={`cell-${rowIndex}-${columnIndex}`}>
              <span className={getDiscClass(cell)} />
            </div>
          )),
        )}
      </div>
    </div>
  );
}
