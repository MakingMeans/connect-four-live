import { DEFAULT_GAME_CONFIG } from '@c4/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HomePage } from './HomePage';

function renderHome(overrides: Partial<Parameters<typeof HomePage>[0]> = {}) {
  const handlers = {
    onCreate: vi.fn().mockResolvedValue(undefined),
    onJoin: vi.fn().mockResolvedValue(undefined),
    onDismissError: vi.fn(),
  };
  render(<HomePage isBusy={false} error={null} closedReason={null} {...handlers} {...overrides} />);
  return handlers;
}

describe('HomePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('creates a room with the default config once a username is typed', async () => {
    const handlers = renderHome();

    await userEvent.type(screen.getByLabelText('Nombre de usuario'), 'Ana');
    await userEvent.click(screen.getByRole('button', { name: 'Crear sala' }));

    expect(handlers.onCreate).toHaveBeenCalledWith('Ana', DEFAULT_GAME_CONFIG);
    expect(window.localStorage.getItem('c4:username')).toBe('Ana');
  });

  it('lets the host pick what happens when the clock runs out', async () => {
    const handlers = renderHome();

    await userEvent.type(screen.getByLabelText('Nombre de usuario'), 'Ana');
    await userEvent.selectOptions(screen.getByLabelText('Si se agota el tiempo'), 'lose');
    await userEvent.click(screen.getByRole('button', { name: 'Crear sala' }));

    expect(handlers.onCreate).toHaveBeenCalledWith('Ana', { ...DEFAULT_GAME_CONFIG, timeoutRule: 'lose' });
  });

  it('joins with a normalized room code', async () => {
    const handlers = renderHome();

    await userEvent.type(screen.getByLabelText('Nombre de usuario'), 'Bruno');
    await userEvent.type(screen.getByLabelText('Código de sala'), 'abc 234');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(handlers.onJoin).toHaveBeenCalledWith('Bruno', 'ABC234');
  });

  it('keeps both submit buttons disabled without a username', () => {
    renderHome();

    expect(screen.getByRole('button', { name: 'Crear sala' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  });

  it('shows the closed reason and lets the user dismiss an error', async () => {
    const handlers = renderHome({ error: 'No existe ninguna sala con ese código.', closedReason: 'Sala cerrada.' });

    expect(screen.getByText('Sala cerrada.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'cerrar' }));

    expect(handlers.onDismissError).toHaveBeenCalled();
  });
});
