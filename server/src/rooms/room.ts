import { createBoard, type ErrorPayload, type GameConfig, type Player, type RoomState } from '@c4/shared';

/**
 * Transiciones puras del estado de sala. Ninguna función muta: todas devuelven
 * un `RoomState` nuevo, lo que hace trivial testearlas y emitirlas por socket.
 */

export type RoomResult<T = RoomState> = { ok: true; value: T } | { ok: false; error: ErrorPayload };

export const MAX_PLAYERS = 2;

function fail<T = RoomState>(code: ErrorPayload['code'], message: string): RoomResult<T> {
  return { ok: false, error: { code, message } };
}

function succeed<T>(value: T): RoomResult<T> {
  return { ok: true, value };
}

export interface CreateRoomParams {
  code: string;
  hostId: string;
  hostUsername: string;
  config: GameConfig;
}

export function createRoom({ code, hostId, hostUsername, config }: CreateRoomParams): RoomState {
  const host: Player = { id: hostId, username: hostUsername, slot: 1, colorId: null, isConnected: true };

  return {
    code,
    hostId,
    config,
    phase: 'lobby',
    players: [host],
    board: createBoard(config.boardSize),
    currentTurn: null,
    turnEndsAt: null,
    score: { 1: 0, 2: 0 },
    gameNumber: 0,
    lastResult: null,
  };
}

export function findPlayer(room: RoomState, playerId: string): Player | undefined {
  return room.players.find((player) => player.id === playerId);
}

export function isHost(room: RoomState, playerId: string): boolean {
  return room.hostId === playerId;
}

export function addPlayer(room: RoomState, playerId: string, username: string): RoomResult {
  if (findPlayer(room, playerId)) {
    return succeed(room);
  }

  if (room.phase !== 'lobby') {
    return fail('WRONG_PHASE', 'La partida ya empezó.');
  }

  if (room.players.length >= MAX_PLAYERS) {
    return fail('ROOM_FULL', 'La sala ya tiene dos jugadores.');
  }

  const guest: Player = { id: playerId, username, slot: 2, colorId: null, isConnected: true };
  return succeed({ ...room, players: [...room.players, guest] });
}

/**
 * En el lobby el jugador se elimina de la sala. Durante una partida solo se
 * marca desconectado para permitir reconexión con el mismo `playerId`.
 */
export function removePlayer(room: RoomState, playerId: string): RoomState {
  if (room.phase === 'lobby') {
    return { ...room, players: room.players.filter((player) => player.id !== playerId) };
  }

  return setConnected(room, playerId, false);
}

export function setConnected(room: RoomState, playerId: string, isConnected: boolean): RoomState {
  return {
    ...room,
    players: room.players.map((player) => (player.id === playerId ? { ...player, isConnected } : player)),
  };
}

export function isEmpty(room: RoomState): boolean {
  return room.players.length === 0 || room.players.every((player) => !player.isConnected);
}
