import { isColumnFull, type Board as BoardState, type PlayerSlot, type Position } from '@c4/shared';
import type { CSSProperties } from 'react';

interface BoardProps {
  board: BoardState;
  /** Hex de cada slot, resuelto por el padre con `getColor`. */
  colors: Record<PlayerSlot, string>;
  winningLine: Position[];
  /** `true` cuando es el turno del espectador y la partida está en curso. */
  canPlay: boolean;
  onPlay: (col: number) => void;
}

/**
 * Tablero presentacional. Cada columna es un botón: la ficha cae donde el
 * servidor decida, el cliente solo pide "jugar en esta columna".
 */
export function Board({ board, colors, winningLine, canPlay, onPlay }: BoardProps) {
  const size = board.length;
  const isWinning = (row: number, col: number) => winningLine.some((pos) => pos.row === row && pos.col === col);

  return (
    <div className="board" style={{ '--cols': size } as CSSProperties} role="grid" aria-label="Tablero">
      {Array.from({ length: size }, (_, col) => (
        <button
          key={col}
          type="button"
          className="board__column"
          aria-label={`Columna ${col + 1}`}
          disabled={!canPlay || isColumnFull(board, col)}
          onClick={() => onPlay(col)}
        >
          {board.map((cells, row) => {
            const cell = cells[col] ?? 0;
            return (
              <span
                key={row}
                data-testid={`cell-${row}-${col}`}
                className={`board__cell${cell ? ' board__cell--filled' : ''}${isWinning(row, col) ? ' board__cell--winning' : ''}`}
                style={cell ? { backgroundColor: colors[cell] } : undefined}
              />
            );
          })}
        </button>
      ))}
    </div>
  );
}
