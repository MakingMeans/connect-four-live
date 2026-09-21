import { DEFAULT_GAME_CONFIG, type RoomState } from '@c4/shared';
import { describe, expect, it } from 'vitest';

import { forfeit, pauseTurn, playMove, resetSeries, resumeTurn, startGame, timeoutTurn } from './game.js';
import { addPlayer, chooseColor, createRoom, setConnected } from './room.js';

const NOW = 1_700_000_000_000;

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`setup failed: ${JSON.stringify(result.error)}`);
  return result.value;
}

/** Sala lista para empezar: dos jugadores conectados y con color. */
function readyLobby(overrides: Partial<RoomState['config']> = {}): RoomState {
  const room = createRoom({
    code: 'ABC234',
    hostId: 'host-1',
    hostUsername: 'Ana',
    config: { ...DEFAULT_GAME_CONFIG, boardSize: 5, turnSeconds: 10, ...overrides },
  });
  const withGuest = unwrap(addPlayer(room, 'guest-1', 'Bruno'));
  const withHostColor = unwrap(chooseColor(withGuest, 'host-1', 'red'));
  return unwrap(chooseColor(withHostColor, 'guest-1', 'yellow'));
}

function playing(overrides: Partial<RoomState['config']> = {}): RoomState {
  return unwrap(startGame(readyLobby(overrides), 'host-1', NOW));
}

/** Juega una secuencia de columnas alternando turnos, empezando por quien tenga el turno. */
function playAll(room: RoomState, cols: number[]): RoomState {
  return cols.reduce((current, col) => {
    const player = current.players.find((candidate) => candidate.slot === current.currentTurn);
    if (!player) throw new Error('no current player');
    return unwrap(playMove(current, player.id, col, NOW));
  }, room);
}

describe('startGame', () => {
  it('starts game 1 with player 1 to move and a running clock', () => {
    const room = readyLobby({ turnSeconds: 10 });

    const result = startGame(room, 'host-1', NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      phase: 'playing',
      gameNumber: 1,
      currentTurn: 1,
      turnEndsAt: NOW + 10_000,
      pausedTurnMs: null,
      lastResult: null,
    });
    expect(room.phase).toBe('lobby');
  });

  it('rejects a non-host with NOT_HOST', () => {
    const result = startGame(readyLobby(), 'guest-1', NOW);

    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_HOST' } });
  });

  it('rejects starting without a second player with NOT_READY', () => {
    const room = createRoom({ code: 'ABC234', hostId: 'host-1', hostUsername: 'Ana', config: DEFAULT_GAME_CONFIG });

    const result = startGame(unwrap(chooseColor(room, 'host-1', 'red')), 'host-1', NOW);

    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_READY' } });
  });

  it('rejects starting when a player has no color with NOT_READY', () => {
    const room = readyLobby();
    const missingColor = { ...room, players: room.players.map((player) => ({ ...player, colorId: null })) };

    const result = startGame(missingColor, 'host-1', NOW);

    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_READY' } });
  });

  it('rejects starting when the rival is disconnected with NOT_READY', () => {
    const result = startGame(setConnected(readyLobby(), 'guest-1', false), 'host-1', NOW);

    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_READY' } });
  });

  it('rejects starting while a game is in progress with WRONG_PHASE', () => {
    const result = startGame(playing(), 'host-1', NOW);

    expect(result).toMatchObject({ ok: false, error: { code: 'WRONG_PHASE' } });
  });
});

describe('playMove', () => {
  it('drops the disc, passes the turn and resets the clock', () => {
    const room = playing({ turnSeconds: 10 });

    const result = playMove(room, 'host-1', 2, NOW + 3_000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.board[4]?.[2]).toBe(1);
    expect(result.value.currentTurn).toBe(2);
    expect(result.value.turnEndsAt).toBe(NOW + 13_000);
    expect(room.board[4]?.[2]).toBe(0);
  });

  it('rejects a move out of turn with NOT_YOUR_TURN', () => {
    const result = playMove(playing(), 'guest-1', 0, NOW);

    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_YOUR_TURN' } });
  });

  it('rejects a move on a full column with INVALID_MOVE', () => {
    const room = playAll(playing(), [0, 0, 0, 0, 0]);

    const result = playMove(room, 'guest-1', 0, NOW);

    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_MOVE' } });
  });

  it('rejects a move out of range with INVALID_MOVE', () => {
    const result = playMove(playing(), 'host-1', 5, NOW);

    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_MOVE' } });
  });

  it('rejects a move outside of playing phase with WRONG_PHASE', () => {
    const result = playMove(readyLobby(), 'host-1', 0, NOW);

    expect(result).toMatchObject({ ok: false, error: { code: 'WRONG_PHASE' } });
  });

  it('rejects a player that is not in the room with NOT_IN_ROOM', () => {
    const result = playMove(playing(), 'stranger', 0, NOW);

    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_IN_ROOM' } });
  });

  it('ends the game with a winning line when a player connects four', () => {
    // Player 1 stacks column 0 while player 2 stacks column 1.
    const room = playAll(playing(), [0, 1, 0, 1, 0, 1, 0]);

    expect(room.phase).toBe('finished');
    expect(room.lastResult).toMatchObject({ winner: 1, reason: 'connect_four' });
    expect(room.lastResult?.winningLine).toHaveLength(4);
    expect(room.score).toEqual({ 1: 1, 2: 0 });
    expect(room.currentTurn).toBeNull();
    expect(room.turnEndsAt).toBeNull();
  });

  it('goes to between_games when the series is not decided yet', () => {
    const room = playAll(playing({ bestOf: 3 }), [0, 1, 0, 1, 0, 1, 0]);

    expect(room.phase).toBe('between_games');
    expect(room.score).toEqual({ 1: 1, 2: 0 });
  });

  it('declares a draw without scoring when the board fills up', () => {
    // 4x4 board; column order chosen so nobody connects four.
    const room = playAll(playing({ boardSize: 4, bestOf: 3 }), [0, 1, 2, 3, 0, 1, 2, 3, 1, 0, 3, 2, 1, 0, 3, 2]);

    expect(room.phase).toBe('between_games');
    expect(room.lastResult).toMatchObject({ winner: null, reason: 'draw' });
    expect(room.score).toEqual({ 1: 0, 2: 0 });
  });
});

describe('series (best of N)', () => {
  it('alternates who starts each game', () => {
    const afterGame1 = playAll(playing({ bestOf: 3 }), [0, 1, 0, 1, 0, 1, 0]);

    const game2 = unwrap(startGame(afterGame1, 'host-1', NOW));

    expect(game2).toMatchObject({ phase: 'playing', gameNumber: 2, currentTurn: 2 });
    expect(game2.board.flat().every((cell) => cell === 0)).toBe(true);
    expect(game2.score).toEqual({ 1: 1, 2: 0 });
  });

  it('finishes the series when a player reaches the wins needed', () => {
    const afterGame1 = playAll(playing({ bestOf: 3 }), [0, 1, 0, 1, 0, 1, 0]);
    const game2 = unwrap(startGame(afterGame1, 'host-1', NOW));

    // Player 2 starts game 2 and wins by stacking column 0.
    const afterGame2 = playAll(game2, [0, 1, 0, 1, 0, 1, 0]);

    expect(afterGame2.phase).toBe('between_games');
    expect(afterGame2.score).toEqual({ 1: 1, 2: 1 });

    const game3 = unwrap(startGame(afterGame2, 'host-1', NOW));
    const afterGame3 = playAll(game3, [0, 1, 0, 1, 0, 1, 0]);

    expect(afterGame3.phase).toBe('finished');
    expect(afterGame3.score).toEqual({ 1: 2, 2: 1 });
  });
});

describe('timeoutTurn', () => {
  it('passes the turn to the rival with a fresh clock under the skip rule', () => {
    const room = playing({ timeoutRule: 'skip', turnSeconds: 10 });

    const result = timeoutTurn(room, NOW + 10_000);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.phase).toBe('playing');
    expect(result.value.currentTurn).toBe(2);
    expect(result.value.turnEndsAt).toBe(NOW + 20_000);
    expect(result.value.board).toEqual(room.board);
    expect(result.value.lastResult).toBeNull();
  });

  it('gives the game to the rival under the lose rule', () => {
    const result = timeoutTurn(playing({ timeoutRule: 'lose' }), NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.lastResult).toMatchObject({ winner: 2, reason: 'timeout' });
    expect(result.value.score).toEqual({ 1: 0, 2: 1 });
  });

  it('is rejected outside of playing phase with WRONG_PHASE', () => {
    expect(timeoutTurn(readyLobby(), NOW)).toMatchObject({ ok: false, error: { code: 'WRONG_PHASE' } });
  });
});

describe('forfeit', () => {
  it('ends the whole series in favour of the rival', () => {
    const result = forfeit(playing({ bestOf: 5 }), 'host-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.phase).toBe('finished');
    expect(result.value.lastResult).toMatchObject({ winner: 2, reason: 'forfeit' });
    expect(result.value.turnEndsAt).toBeNull();
  });

  it('is rejected in lobby or once finished with WRONG_PHASE', () => {
    expect(forfeit(readyLobby(), 'host-1')).toMatchObject({ ok: false, error: { code: 'WRONG_PHASE' } });
  });
});

describe('pauseTurn / resumeTurn', () => {
  it('stores the remaining time and clears the deadline when paused', () => {
    const room = playing({ turnSeconds: 10 });

    const paused = pauseTurn(room, NOW + 4_000);

    expect(paused.turnEndsAt).toBeNull();
    expect(paused.pausedTurnMs).toBe(6_000);
  });

  it('restores the deadline from the remaining time when resumed', () => {
    const paused = pauseTurn(playing({ turnSeconds: 10 }), NOW + 4_000);

    const resumed = resumeTurn(paused, NOW + 60_000);

    expect(resumed.turnEndsAt).toBe(NOW + 66_000);
    expect(resumed.pausedTurnMs).toBeNull();
  });

  it('leaves the room untouched when there is nothing to pause or resume', () => {
    const lobby = readyLobby();

    expect(pauseTurn(lobby, NOW)).toBe(lobby);
    expect(resumeTurn(lobby, NOW)).toBe(lobby);
  });
});

describe('resetSeries', () => {
  it('returns to the lobby with a clean score once the series is finished', () => {
    const finished = playAll(playing(), [0, 1, 0, 1, 0, 1, 0]);

    const result = resetSeries(finished, 'host-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ phase: 'lobby', gameNumber: 0, score: { 1: 0, 2: 0 }, lastResult: null });
    expect(result.value.players.map((player) => player.colorId)).toEqual(['red', 'yellow']);
  });

  it('rejects a non-host with NOT_HOST', () => {
    const finished = playAll(playing(), [0, 1, 0, 1, 0, 1, 0]);

    expect(resetSeries(finished, 'guest-1')).toMatchObject({ ok: false, error: { code: 'NOT_HOST' } });
  });

  it('rejects resetting an unfinished series with WRONG_PHASE', () => {
    expect(resetSeries(playing(), 'host-1')).toMatchObject({ ok: false, error: { code: 'WRONG_PHASE' } });
  });
});
