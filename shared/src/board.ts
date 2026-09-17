import { CONNECT_LENGTH } from './config.js';
import type { Board, Cell, PlayerSlot, Position } from './types.js';

export const EMPTY_CELL: Cell = 0;

export interface DropResult {
  board: Board;
  position: Position;
}

export function createBoard(size: number): Board {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => EMPTY_CELL));
}

export function boardSize(board: Board): number {
  return board.length;
}

/** Fila más baja libre de la columna, o `null` si está llena. */
export function findDropRow(board: Board, col: number): number | null {
  for (let row = board.length - 1; row >= 0; row -= 1) {
    if (board[row]?.[col] === EMPTY_CELL) {
      return row;
    }
  }
  return null;
}

export function isColumnFull(board: Board, col: number): boolean {
  return findDropRow(board, col) === null;
}

export function isBoardFull(board: Board): boolean {
  return board[0]?.every((cell) => cell !== EMPTY_CELL) ?? true;
}

export function availableColumns(board: Board): number[] {
  const size = boardSize(board);
  return Array.from({ length: size }, (_, col) => col).filter((col) => !isColumnFull(board, col));
}

/**
 * Deja caer una ficha. Devuelve un tablero nuevo (nunca muta el original) o
 * `null` si la columna está fuera de rango o llena.
 */
export function dropDisc(board: Board, col: number, slot: PlayerSlot): DropResult | null {
  if (!Number.isInteger(col) || col < 0 || col >= boardSize(board)) {
    return null;
  }

  const row = findDropRow(board, col);
  if (row === null) {
    return null;
  }

  const nextBoard = board.map((cells, rowIndex) =>
    rowIndex === row ? cells.map((cell, colIndex) => (colIndex === col ? slot : cell)) : [...cells],
  );

  return { board: nextBoard, position: { row, col } };
}

const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // horizontal
  [1, 0], // vertical
  [1, 1], // diagonal hacia abajo-derecha
  [1, -1], // diagonal hacia abajo-izquierda
];

function collectDirection(board: Board, from: Position, token: Cell, rowStep: number, colStep: number): Position[] {
  const size = boardSize(board);
  const line: Position[] = [];
  let row = from.row + rowStep;
  let col = from.col + colStep;

  while (row >= 0 && row < size && col >= 0 && col < size && board[row]?.[col] === token) {
    line.push({ row, col });
    row += rowStep;
    col += colStep;
  }

  return line;
}

/**
 * Línea ganadora que pasa por `from` (la última ficha colocada), o `null`.
 * Solo hay que comprobar las 4 direcciones desde la última jugada.
 */
export function findWinningLine(board: Board, from: Position): Position[] | null {
  const token = board[from.row]?.[from.col];
  if (token === undefined || token === EMPTY_CELL) {
    return null;
  }

  for (const [rowStep, colStep] of DIRECTIONS) {
    const backward = collectDirection(board, from, token, -rowStep, -colStep).reverse();
    const forward = collectDirection(board, from, token, rowStep, colStep);
    const line = [...backward, from, ...forward];
    if (line.length >= CONNECT_LENGTH) {
      return line;
    }
  }

  return null;
}

export function hasConnectFour(board: Board, from: Position): boolean {
  return findWinningLine(board, from) !== null;
}
