import { createBoard, type Board as BoardState } from '@c4/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Board } from './Board';

const colors = { 1: '#e53935', 2: '#fdd835' };

describe('Board', () => {
  it('renders one column button per column', () => {
    render(<Board board={createBoard(5)} colors={colors} winningLine={[]} canPlay onPlay={vi.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(5);
  });

  it('calls onPlay with the column index when a column is clicked', async () => {
    const onPlay = vi.fn();
    render(<Board board={createBoard(4)} colors={colors} winningLine={[]} canPlay onPlay={onPlay} />);

    await userEvent.click(screen.getByRole('button', { name: 'Columna 3' }));

    expect(onPlay).toHaveBeenCalledWith(2);
  });

  it('disables every column when it is not the viewer turn', () => {
    render(<Board board={createBoard(4)} colors={colors} winningLine={[]} canPlay={false} onPlay={vi.fn()} />);

    for (const column of screen.getAllByRole('button')) {
      expect(column).toBeDisabled();
    }
  });

  it('disables a full column even when the viewer can play', () => {
    const board: BoardState = createBoard(4).map((row) => row.map((cell, col) => (col === 0 ? 1 : cell)));
    render(<Board board={board} colors={colors} winningLine={[]} canPlay onPlay={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Columna 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Columna 2' })).toBeEnabled();
  });

  it('highlights the winning cells', () => {
    const board = createBoard(4);
    const withDisc: BoardState = board.map((row, r) => row.map((cell, c) => (r === 3 && c === 0 ? 1 : cell)));
    render(
      <Board board={withDisc} colors={colors} winningLine={[{ row: 3, col: 0 }]} canPlay={false} onPlay={vi.fn()} />,
    );

    expect(screen.getByTestId('cell-3-0')).toHaveClass('board__cell--winning');
    expect(screen.getByTestId('cell-3-1')).not.toHaveClass('board__cell--winning');
  });
});
