import { createBoard, isColorId, type GameConfig, type Player, type RoomState } from '@c4/shared';

import { fail, succeed, type RoomResult } from './result.js';

/**
 * Transiciones puras del lobby (crear, entrar, salir, elegir color). Ninguna
 * función muta: todas devuelven un `RoomState` nuevo. Las de partida y serie
 * están en `game.ts`.
 */

export type { RoomResult } from './result.js';

export const MAX_PLAYERS = 2;

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
    pausedTurnMs: null,
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
 * En el lobby el jugador se elimina de la sala (y si era el host, el que queda
 * hereda el rol). Fuera del lobby solo se marca desconectado para permitir
 * reconexión con el mismo `playerId`.
 */
export function removePlayer(room: RoomState, playerId: string): RoomState {
  if (room.phase !== 'lobby') {
    return setConnected(room, playerId, false);
  }

  const players = room.players.filter((player) => player.id !== playerId);
  const hostId = room.hostId === playerId ? (players[0]?.id ?? room.hostId) : room.hostId;
  return { ...room, players, hostId };
}

export function chooseColor(room: RoomState, playerId: string, colorId: string): RoomResult {
  if (room.phase !== 'lobby') {
    return fail('WRONG_PHASE', 'Solo se puede elegir color en el lobby.');
  }

  if (!findPlayer(room, playerId)) {
    return fail('NOT_IN_ROOM', 'No estás en esta sala.');
  }

  if (!isColorId(colorId)) {
    return fail('INVALID_INPUT', 'Ese color no existe.');
  }

  const takenByRival = room.players.some((player) => player.id !== playerId && player.colorId === colorId);
  if (takenByRival) {
    return fail('COLOR_TAKEN', 'Tu rival ya eligió ese color.');
  }

  return succeed({
    ...room,
    players: room.players.map((player) => (player.id === playerId ? { ...player, colorId } : player)),
  });
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
