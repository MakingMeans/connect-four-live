import { createBoard, DEFAULT_GAME_CONFIG, type Player, type RoomState } from '@c4/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LobbyPage } from './LobbyPage';

const host: Player = { id: 'host-1', username: 'Ana', slot: 1, colorId: null, isConnected: true };
const guest: Player = { id: 'guest-1', username: 'Bruno', slot: 2, colorId: null, isConnected: true };

function makeRoom(players: Player[]): RoomState {
  return {
    code: 'ABC234',
    hostId: 'host-1',
    config: DEFAULT_GAME_CONFIG,
    phase: 'lobby',
    players,
    board: createBoard(DEFAULT_GAME_CONFIG.boardSize),
    currentTurn: null,
    turnEndsAt: null,
    pausedTurnMs: null,
    score: { 1: 0, 2: 0 },
    gameNumber: 0,
    lastResult: null,
  };
}

function renderLobby(room: RoomState, playerId = 'host-1') {
  const handlers = {
    onLeave: vi.fn().mockResolvedValue(undefined),
    onChooseColor: vi.fn().mockResolvedValue(undefined),
    onStart: vi.fn().mockResolvedValue(undefined),
    onDismissError: vi.fn(),
  };
  render(<LobbyPage room={room} playerId={playerId} isBusy={false} error={null} {...handlers} />);
  return handlers;
}

describe('LobbyPage', () => {
  it('keeps the start button disabled until both players have a color', () => {
    renderLobby(makeRoom([host, { ...guest, colorId: 'yellow' }]));

    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeDisabled();
  });

  it('lets the host start once both players chose a color', async () => {
    const handlers = renderLobby(makeRoom([{ ...host, colorId: 'red' }, { ...guest, colorId: 'yellow' }]));

    await userEvent.click(screen.getByRole('button', { name: 'Empezar partida' }));

    expect(handlers.onStart).toHaveBeenCalled();
  });

  it('does not show the start button to the guest', () => {
    renderLobby(makeRoom([{ ...host, colorId: 'red' }, { ...guest, colorId: 'yellow' }]), 'guest-1');

    expect(screen.queryByRole('button', { name: 'Empezar partida' })).not.toBeInTheDocument();
    expect(screen.getByText(/Esperando a que el host/)).toBeInTheDocument();
  });

  it('sends the chosen color and blocks the rival color', async () => {
    const handlers = renderLobby(makeRoom([host, { ...guest, colorId: 'yellow' }]));

    await userEvent.click(screen.getByRole('button', { name: 'Rojo' }));

    expect(handlers.onChooseColor).toHaveBeenCalledWith('red');
    expect(screen.getByRole('button', { name: 'Amarillo' })).toBeDisabled();
  });

  it('shows the timeout rule and flags a player who is reconnecting', () => {
    renderLobby(makeRoom([{ ...host, colorId: 'red' }, { ...guest, colorId: 'yellow', isConnected: false }]));

    expect(screen.getByText('Pierde el turno')).toBeInTheDocument();
    expect(screen.getByText(/reconectando/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeDisabled();
  });

  it('shows the room code and waits for the second player', () => {
    renderLobby(makeRoom([host]));

    expect(screen.getByText('ABC234')).toBeInTheDocument();
    expect(screen.getByText(/Esperando al segundo jugador/)).toBeInTheDocument();
  });
});
