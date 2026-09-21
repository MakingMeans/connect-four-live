import { createBoard, DEFAULT_GAME_CONFIG, type RoomState } from '@c4/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GamePage } from './GamePage';

function makeRoom(overrides: Partial<RoomState> = {}): RoomState {
  return {
    code: 'ABC234',
    hostId: 'host-1',
    config: { ...DEFAULT_GAME_CONFIG, boardSize: 5, bestOf: 3 },
    phase: 'playing',
    players: [
      { id: 'host-1', username: 'Ana', slot: 1, colorId: 'red', isConnected: true },
      { id: 'guest-1', username: 'Bruno', slot: 2, colorId: 'yellow', isConnected: true },
    ],
    board: createBoard(5),
    currentTurn: 1,
    turnEndsAt: Date.now() + 30_000,
    pausedTurnMs: null,
    score: { 1: 0, 2: 0 },
    gameNumber: 1,
    lastResult: null,
    ...overrides,
  };
}

function renderPage(room: RoomState, playerId = 'host-1') {
  const handlers = {
    onPlay: vi.fn().mockResolvedValue(undefined),
    onNextGame: vi.fn().mockResolvedValue(undefined),
    onReset: vi.fn().mockResolvedValue(undefined),
    onLeave: vi.fn().mockResolvedValue(undefined),
    onDismissError: vi.fn(),
  };
  render(<GamePage room={room} playerId={playerId} isBusy={false} error={null} {...handlers} />);
  return handlers;
}

describe('GamePage', () => {
  it('lets the player on turn drop a disc', async () => {
    const handlers = renderPage(makeRoom());

    expect(screen.getByText('Tu turno')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Columna 1' }));

    expect(handlers.onPlay).toHaveBeenCalledWith(0);
  });

  it('blocks the board for the player waiting for their turn', () => {
    renderPage(makeRoom(), 'guest-1');

    expect(screen.getByText('Turno de Ana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Columna 1' })).toBeDisabled();
  });

  it('blocks the board and explains while the rival is reconnecting', () => {
    const room = makeRoom({ turnEndsAt: null, pausedTurnMs: 12_000 });
    renderPage({ ...room, players: [room.players[0]!, { ...room.players[1]!, isConnected: false }] });

    expect(screen.getByText(/vuelva a conectarse/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Columna 1' })).toBeDisabled();
  });

  it('offers the host the next game between games', async () => {
    const handlers = renderPage(
      makeRoom({
        phase: 'between_games',
        currentTurn: null,
        turnEndsAt: null,
        score: { 1: 1, 2: 0 },
        lastResult: { winner: 1, winningLine: [], reason: 'connect_four' },
      }),
    );

    expect(screen.getByText(/Has ganado con 4 en línea/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente partida' }));

    expect(handlers.onNextGame).toHaveBeenCalled();
  });

  it('tells the guest to wait for the host between games', () => {
    renderPage(
      makeRoom({
        phase: 'between_games',
        currentTurn: null,
        turnEndsAt: null,
        lastResult: { winner: null, winningLine: [], reason: 'draw' },
      }),
      'guest-1',
    );

    expect(screen.getByText('Empate: tablero lleno.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Siguiente partida' })).not.toBeInTheDocument();
  });

  it('shows the series result and lets the host go back to the lobby', async () => {
    const handlers = renderPage(
      makeRoom({
        phase: 'finished',
        currentTurn: null,
        turnEndsAt: null,
        score: { 1: 1, 2: 2 },
        lastResult: { winner: 2, winningLine: [], reason: 'timeout' },
      }),
    );

    expect(screen.getByText(/Bruno gana por tiempo/)).toBeInTheDocument();
    expect(screen.getByText(/Bruno se lleva la serie 2–1/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Volver al lobby' }));

    expect(handlers.onReset).toHaveBeenCalled();
  });

  it('describes a forfeit', () => {
    renderPage(
      makeRoom({
        phase: 'finished',
        currentTurn: null,
        turnEndsAt: null,
        lastResult: { winner: 1, winningLine: [], reason: 'forfeit' },
      }),
      'guest-1',
    );

    expect(screen.getByText(/Ana gana la serie por abandono/)).toBeInTheDocument();
  });
});
