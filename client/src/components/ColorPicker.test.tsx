import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ColorPicker } from './ColorPicker';

describe('ColorPicker', () => {
  it('marks the selected color as pressed', () => {
    render(<ColorPicker selectedId="red" takenIds={[]} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Rojo' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Azul' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables colors taken by the rival', () => {
    render(<ColorPicker selectedId={null} takenIds={['blue']} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Azul' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Rojo' })).toBeEnabled();
  });

  it('calls onSelect with the color id when clicked', async () => {
    const onSelect = vi.fn();
    render(<ColorPicker selectedId={null} takenIds={[]} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: 'Verde' }));

    expect(onSelect).toHaveBeenCalledWith('green');
  });

  it('disables everything while busy', () => {
    render(<ColorPicker selectedId={null} takenIds={[]} onSelect={vi.fn()} isBusy />);

    expect(screen.getByRole('button', { name: 'Rojo' })).toBeDisabled();
  });
});
