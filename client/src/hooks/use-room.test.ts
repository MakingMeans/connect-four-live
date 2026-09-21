import { createBoard, DEFAULT_GAME_CONFIG, type RoomState } from '@c4/shared';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRoom } from './use-room';

type Listener = (...args: unknown[]) => void;

/** Emisor mínimo que imita la superficie de socket.io-client que usa el hook. */
const { fakeSocket, request } = vi.hoisted(() => ({
  request: vi.fn(),
  fakeSocket: {
    connected: false,
    listeners: new Map<string, Set<Listener>>(),
    on(event: string, listener: Listener) {
      const set = this.listeners.get(event) ?? new Set<Listener>();
      set.add(listener);
      this.listeners.set(event, set);
    },
    off(event: string, listener: Listener) {
      this.listeners.get(event)?.delete(listener);
    },
    emit(event: string, ...args: unknown[]) {
      for (const listener of this.listeners.get(event) ?? []) listener(...args);
    },
    connect() {
      this.connected = true;
    },
    disconnect() {
      this.connected = false;
    },
  },
}));

vi.mock('@/lib/socket', () => ({
  socket: fakeSocket,
  request: (...args: unknown[]) => request(...args),
  SocketRequestError: class SocketRequestError extends Error {
    constructor(
      readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

function makeRoom(): RoomState {
  return {
    code: 'ABC234',
    hostId: 'host-1',
    config: DEFAULT_GAME_CONFIG,
    phase: 'lobby',
    players: [
      {
        id: 'host-1',
        username: 'Ana',
        slot: 1,
        colorId: null,
        isConnected: true,
      },
    ],
    board: createBoard(DEFAULT_GAME_CONFIG.boardSize),
    currentTurn: null,
    turnEndsAt: null,
    pausedTurnMs: null,
    score: { 1: 0, 2: 0 },
    gameNumber: 0,
    lastResult: null,
  };
}

describe('useRoom', () => {
  beforeEach(() => {
    request.mockReset();
    fakeSocket.listeners.clear();
    fakeSocket.connected = false;
    window.sessionStorage.clear();
  });

  it('stores the session after creating a room and follows room:state updates', async () => {
    const room = makeRoom();
    request.mockResolvedValueOnce({ playerId: 'host-1', room });
    const { result } = renderHook(() => useRoom());

    await act(() => result.current.createRoom('Ana', DEFAULT_GAME_CONFIG));

    expect(request).toHaveBeenCalledWith('room:create', {
      username: 'Ana',
      config: DEFAULT_GAME_CONFIG,
    });
    expect(result.current.session?.room.code).toBe('ABC234');
    expect(window.sessionStorage.getItem('c4:session')).toContain('host-1');

    act(() => fakeSocket.emit('room:state', { ...room, phase: 'playing' }));
    expect(result.current.session?.room.phase).toBe('playing');
  });

  it('surfaces request errors without dropping the session', async () => {
    request.mockResolvedValueOnce({ playerId: 'host-1', room: makeRoom() });
    request.mockRejectedValueOnce(new Error('No es tu turno.'));
    const { result } = renderHook(() => useRoom());
    await act(() => result.current.createRoom('Ana', DEFAULT_GAME_CONFIG));

    await act(() => result.current.playMove(3));

    expect(request).toHaveBeenLastCalledWith('game:move', 3);
    expect(result.current.error).toBe('No es tu turno.');
    expect(result.current.session).not.toBeNull();
  });

  it('rejoins the stored room when the socket connects', async () => {
    window.sessionStorage.setItem('c4:session', JSON.stringify({ code: 'ABC234', playerId: 'host-1' }));
    request.mockResolvedValueOnce({ playerId: 'host-1', room: makeRoom() });
    const { result } = renderHook(() => useRoom());

    act(() => fakeSocket.emit('connect'));

    await waitFor(() => expect(result.current.session?.playerId).toBe('host-1'));
    expect(request).toHaveBeenCalledWith('room:rejoin', {
      code: 'ABC234',
      playerId: 'host-1',
    });
    expect(result.current.isConnected).toBe(true);
  });

  it('forgets the stored session when the room no longer exists', async () => {
    window.sessionStorage.setItem('c4:session', JSON.stringify({ code: 'ABC234', playerId: 'host-1' }));
    request.mockRejectedValueOnce(new Error('La sala ya no existe o expiró.'));
    const { result } = renderHook(() => useRoom());

    act(() => fakeSocket.emit('connect'));

    await waitFor(() => expect(result.current.closedReason).toBe('La sala ya no existe o expiró.'));
    expect(window.sessionStorage.getItem('c4:session')).toBeNull();
  });

  it('clears everything when the server closes the room', async () => {
    request.mockResolvedValueOnce({ playerId: 'host-1', room: makeRoom() });
    const { result } = renderHook(() => useRoom());
    await act(() => result.current.createRoom('Ana', DEFAULT_GAME_CONFIG));

    act(() => fakeSocket.emit('room:closed', 'Todos los jugadores salieron.'));

    expect(result.current.session).toBeNull();
    expect(result.current.closedReason).toBe('Todos los jugadores salieron.');
    expect(window.sessionStorage.getItem('c4:session')).toBeNull();
  });

  it('leaves the room and clears the stored session', async () => {
    request.mockResolvedValueOnce({ playerId: 'host-1', room: makeRoom() });
    request.mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useRoom());
    await act(() => result.current.createRoom('Ana', DEFAULT_GAME_CONFIG));

    await act(() => result.current.leaveRoom());

    expect(result.current.session).toBeNull();
    expect(window.sessionStorage.getItem('c4:session')).toBeNull();
  });
});
