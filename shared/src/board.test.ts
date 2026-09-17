import { describe, expect, it } from 'vitest';

import {
  availableColumns,
  createBoard,
  dropDisc,
  findDropRow,
  findWinningLine,
  hasConnectFour,
  isBoardFull,
  isColumnFull,
} from './board.js';
import type { Board, PlayerSlot } from './types.js';

/** Aplica una secuencia de columnas alternando jugadores (1 empieza). */
function play(board: Board, columns: number[], first: PlayerSlot = 1): Board {
  let current = board;
  let slot: PlayerSlot = first;
  for (const col of columns) {
    const result = dropDisc(current, col, slot);
    if (!result) {
      throw new Error(`columna ${col} invalida`);
    }
    current = result.board;
    slot = slot === 1 ? 2 : 1;
  }
  return current;
}

describe('createBoard', () => {
  it('creates an NxN board full of empty cells', () => {
    const board = createBoard(5);

    expect(board).toHaveLength(5);
    expect(board.every((row) => row.length === 5)).toBe(true);
    expect(board.flat().every((cell) => cell === 0)).toBe(true);
  });

  it('supports the 20x20 maximum', () => {
    expect(createBoard(20).flat()).toHaveLength(400);
  });
});

describe('dropDisc', () => {
  it('places the disc on the bottom row of an empty column', () => {
    const result = dropDisc(createBoard(4), 2, 1);

    expect(result?.position).toEqual({ row: 3, col: 2 });
    expect(result?.board[3]?.[2]).toBe(1);
  });

  it('stacks discs upward', () => {
    const board = play(createBoard(4), [0, 0]);
    const result = dropDisc(board, 0, 1);

    expect(result?.position).toEqual({ row: 1, col: 0 });
  });

  it('does not mutate the input board', () => {
    const board = createBoard(4);
    const snapshot = structuredClone(board);

    dropDisc(board, 0, 1);

    expect(board).toEqual(snapshot);
  });

  it('returns null for a full column', () => {
    const board = play(createBoard(4), [1, 1, 1, 1]);

    expect(dropDisc(board, 1, 1)).toBeNull();
  });

  it.each([-1, 4, 1.5, Number.NaN])('returns null for out-of-range column %s', (col) => {
    expect(dropDisc(createBoard(4), col, 1)).toBeNull();
  });
});

describe('column and board helpers', () => {
  it('reports drop row, full column and available columns', () => {
    const board = play(createBoard(4), [0, 0, 0, 0, 1]);

    expect(findDropRow(board, 0)).toBeNull();
    expect(isColumnFull(board, 0)).toBe(true);
    expect(findDropRow(board, 1)).toBe(2);
    expect(availableColumns(board)).toEqual([1, 2, 3]);
  });

  it('detects a full board', () => {
    const board = createBoard(4).map((row) => row.map(() => 1 as const));

    expect(isBoardFull(board)).toBe(true);
    expect(isBoardFull(createBoard(4))).toBe(false);
  });
});

describe('findWinningLine', () => {
  it('detects a horizontal four', () => {
    // 1 juega columnas 0-3 en la fila inferior; 2 apila en columna 5.
    const board = play(createBoard(7), [0, 5, 1, 5, 2, 5, 3]);

    const line = findWinningLine(board, { row: 6, col: 3 });

    expect(line).toEqual([
      { row: 6, col: 0 },
      { row: 6, col: 1 },
      { row: 6, col: 2 },
      { row: 6, col: 3 },
    ]);
  });

  it('detects a vertical four', () => {
    const board = play(createBoard(6), [0, 1, 0, 1, 0, 1, 0]);

    expect(hasConnectFour(board, { row: 2, col: 0 })).toBe(true);
  });

  it('detects a down-right diagonal four', () => {
    // Escalera: jugador 1 acaba en (5,0) (4,1) (3,2) (2,3).
    const board = play(createBoard(6), [0, 1, 1, 2, 2, 3, 2, 3, 3, 5, 3]);

    expect(hasConnectFour(board, { row: 2, col: 3 })).toBe(true);
  });

  it('detects a down-left diagonal four', () => {
    const board = play(createBoard(6), [3, 2, 2, 1, 1, 0, 1, 0, 0, 5, 0]);

    expect(hasConnectFour(board, { row: 2, col: 0 })).toBe(true);
  });

  it('detects the four when the last disc lands in the middle of the line', () => {
    // Jugador 1: columnas 0,1,3 y luego 2 (la ultima cae en medio).
    const board = play(createBoard(7), [0, 6, 1, 6, 3, 6, 2]);

    expect(hasConnectFour(board, { row: 6, col: 2 })).toBe(true);
  });

  it('returns null when there are only three in a row', () => {
    const board = play(createBoard(7), [0, 6, 1, 6, 2]);

    expect(findWinningLine(board, { row: 6, col: 2 })).toBeNull();
  });

  it('returns null for an empty cell', () => {
    expect(findWinningLine(createBoard(4), { row: 3, col: 0 })).toBeNull();
  });

  it('does not count opponent discs', () => {
    const board = play(createBoard(7), [0, 1, 2, 3, 4]);

    expect(findWinningLine(board, { row: 6, col: 4 })).toBeNull();
  });

  it('works on the smallest board (4x4)', () => {
    const board = play(createBoard(4), [0, 0, 1, 1, 2, 2, 3]);

    expect(hasConnectFour(board, { row: 3, col: 3 })).toBe(true);
  });
});
