import { DEFAULT_GAME_CONFIG } from '@c4/shared';
import { describe, expect, it } from 'vitest';

import { addPlayer, chooseColor, createRoom, isEmpty, isHost, removePlayer, setConnected } from './room.js';

function makeRoom() {
  return createRoom({ code: 'ABC234', hostId: 'host-1', hostUsername: 'Ana', config: DEFAULT_GAME_CONFIG });
}

describe('createRoom', () => {
  it('starts in lobby with the host as player 1 and an empty NxN board', () => {
    const room = createRoom({
      code: 'ABC234',
      hostId: 'host-1',
      hostUsername: 'Ana',
      config: { ...DEFAULT_GAME_CONFIG, boardSize: 5 },
    });

    expect(room.phase).toBe('lobby');
    expect(room.players).toEqual([{ id: 'host-1', username: 'Ana', slot: 1, colorId: null, isConnected: true }]);
    expect(room.board).toHaveLength(5);
    expect(room.board[0]).toHaveLength(5);
    expect(isHost(room, 'host-1')).toBe(true);
  });
});

describe('addPlayer', () => {
  it('adds the guest as player 2 without mutating the original room', () => {
    const room = makeRoom();

    const result = addPlayer(room, 'guest-1', 'Bruno');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players.map((player) => player.slot)).toEqual([1, 2]);
    expect(room.players).toHaveLength(1);
  });

  it('is idempotent for a player already in the room', () => {
    const room = makeRoom();

    const result = addPlayer(room, 'host-1', 'Ana');

    expect(result).toEqual({ ok: true, value: room });
  });

  it('rejects a third player with ROOM_FULL', () => {
    const withGuest = addPlayer(makeRoom(), 'guest-1', 'Bruno');
    if (!withGuest.ok) throw new Error('setup');

    const result = addPlayer(withGuest.value, 'guest-2', 'Carla');

    expect(result).toMatchObject({ ok: false, error: { code: 'ROOM_FULL' } });
  });

  it('rejects joining once the game started with WRONG_PHASE', () => {
    const room = { ...makeRoom(), phase: 'playing' as const };

    const result = addPlayer(room, 'guest-1', 'Bruno');

    expect(result).toMatchObject({ ok: false, error: { code: 'WRONG_PHASE' } });
  });
});

describe('removePlayer', () => {
  it('drops the player entirely while in lobby', () => {
    const withGuest = addPlayer(makeRoom(), 'guest-1', 'Bruno');
    if (!withGuest.ok) throw new Error('setup');

    const room = removePlayer(withGuest.value, 'guest-1');

    expect(room.players.map((player) => player.id)).toEqual(['host-1']);
  });

  it('promotes the remaining player to host when the host leaves the lobby', () => {
    const withGuest = addPlayer(makeRoom(), 'guest-1', 'Bruno');
    if (!withGuest.ok) throw new Error('setup');

    const room = removePlayer(withGuest.value, 'host-1');

    expect(room.hostId).toBe('guest-1');
    expect(isHost(room, 'guest-1')).toBe(true);
  });

  it('only marks the player disconnected during a game', () => {
    const withGuest = addPlayer(makeRoom(), 'guest-1', 'Bruno');
    if (!withGuest.ok) throw new Error('setup');
    const playing = { ...withGuest.value, phase: 'playing' as const };

    const room = removePlayer(playing, 'guest-1');

    expect(room.players).toHaveLength(2);
    expect(room.players[1]?.isConnected).toBe(false);
  });
});

describe('isEmpty', () => {
  it('is true when nobody is connected', () => {
    const room = setConnected(makeRoom(), 'host-1', false);

    expect(isEmpty(room)).toBe(true);
    expect(isEmpty(makeRoom())).toBe(false);
  });
});

describe('chooseColor', () => {
  function lobbyWithGuest() {
    const withGuest = addPlayer(makeRoom(), 'guest-1', 'Bruno');
    if (!withGuest.ok) throw new Error('setup');
    return withGuest.value;
  }

  it('assigns a palette color to the player without mutating the room', () => {
    const room = lobbyWithGuest();

    const result = chooseColor(room, 'guest-1', 'blue');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[1]?.colorId).toBe('blue');
    expect(room.players[1]?.colorId).toBeNull();
  });

  it('lets a player change their own color', () => {
    const first = chooseColor(lobbyWithGuest(), 'host-1', 'red');
    if (!first.ok) throw new Error('setup');

    const result = chooseColor(first.value, 'host-1', 'green');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.players[0]?.colorId).toBe('green');
  });

  it('rejects a color already taken by the rival with COLOR_TAKEN', () => {
    const first = chooseColor(lobbyWithGuest(), 'host-1', 'red');
    if (!first.ok) throw new Error('setup');

    const result = chooseColor(first.value, 'guest-1', 'red');

    expect(result).toMatchObject({ ok: false, error: { code: 'COLOR_TAKEN' } });
  });

  it('rejects an unknown color id with INVALID_INPUT', () => {
    const result = chooseColor(lobbyWithGuest(), 'host-1', 'magenta');

    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });

  it('rejects a player that is not in the room with NOT_IN_ROOM', () => {
    const result = chooseColor(lobbyWithGuest(), 'stranger', 'red');

    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_IN_ROOM' } });
  });

  it('rejects choosing a color outside the lobby with WRONG_PHASE', () => {
    const room = { ...lobbyWithGuest(), phase: 'playing' as const };

    const result = chooseColor(room, 'host-1', 'red');

    expect(result).toMatchObject({ ok: false, error: { code: 'WRONG_PHASE' } });
  });
});
