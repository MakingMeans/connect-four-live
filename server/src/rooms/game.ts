import {
  createBoard,
  dropDisc,
  findWinningLine,
  isBoardFull,
  winsNeeded,
  type GameResult,
  type PlayerSlot,
  type RoomState,
} from '@c4/shared';

import { fail, succeed, type RoomResult } from './result.js';
import { findPlayer, isHost, MAX_PLAYERS } from './room.js';

/**
 * Transiciones puras de la partida y de la serie. El servidor es la única
 * autoridad: aquí se decide quién mueve, quién gana y cuándo termina la serie.
 * `now` se inyecta (epoch ms) para que el reloj sea determinista en tests.
 */

const SECOND_MS = 1000;

function rival(slot: PlayerSlot): PlayerSlot {
  return slot === 1 ? 2 : 1;
}

/** El slot 1 abre la partida 1 y se alterna en las siguientes. */
function openingSlot(gameNumber: number): PlayerSlot {
  return gameNumber % 2 === 1 ? 1 : 2;
}

function turnDeadline(room: RoomState, now: number): number {
  return now + room.config.turnSeconds * SECOND_MS;
}

function isReadyToStart(room: RoomState): boolean {
  return (
    room.players.length === MAX_PLAYERS &&
    room.players.every((player) => player.colorId !== null && player.isConnected)
  );
}

export function startGame(room: RoomState, playerId: string, now: number): RoomResult {
  if (!isHost(room, playerId)) {
    return fail('NOT_HOST', 'Solo el host puede empezar la partida.');
  }

  if (room.phase !== 'lobby' && room.phase !== 'between_games') {
    return fail('WRONG_PHASE', 'No se puede empezar una partida ahora.');
  }

  if (!isReadyToStart(room)) {
    return fail('NOT_READY', 'Hacen falta dos jugadores conectados y con color.');
  }

  const gameNumber = room.gameNumber + 1;
  return succeed({
    ...room,
    phase: 'playing',
    board: createBoard(room.config.boardSize),
    gameNumber,
    currentTurn: openingSlot(gameNumber),
    turnEndsAt: turnDeadline(room, now),
    pausedTurnMs: null,
    lastResult: null,
  });
}

/** Cierra la partida actual y decide si la serie continúa o ha terminado. */
function finishGame(room: RoomState, result: GameResult): RoomState {
  const score =
    result.winner === null ? room.score : { ...room.score, [result.winner]: room.score[result.winner] + 1 };
  const seriesOver = result.winner !== null && score[result.winner] >= winsNeeded(room.config.bestOf);

  return {
    ...room,
    phase: seriesOver ? 'finished' : 'between_games',
    score,
    currentTurn: null,
    turnEndsAt: null,
    pausedTurnMs: null,
    lastResult: result,
  };
}

export function playMove(room: RoomState, playerId: string, col: number, now: number): RoomResult {
  if (room.phase !== 'playing') {
    return fail('WRONG_PHASE', 'No hay ninguna partida en curso.');
  }

  const player = findPlayer(room, playerId);
  if (!player) {
    return fail('NOT_IN_ROOM', 'No estás en esta sala.');
  }

  if (room.currentTurn !== player.slot) {
    return fail('NOT_YOUR_TURN', 'No es tu turno.');
  }

  const drop = dropDisc(room.board, col, player.slot);
  if (!drop) {
    return fail('INVALID_MOVE', 'Esa columna no está disponible.');
  }

  const played = { ...room, board: drop.board };

  const winningLine = findWinningLine(drop.board, drop.position);
  if (winningLine) {
    return succeed(finishGame(played, { winner: player.slot, winningLine, reason: 'connect_four' }));
  }

  if (isBoardFull(drop.board)) {
    return succeed(finishGame(played, { winner: null, winningLine: [], reason: 'draw' }));
  }

  return succeed({
    ...played,
    currentTurn: rival(player.slot),
    turnEndsAt: turnDeadline(room, now),
    pausedTurnMs: null,
  });
}

/**
 * El jugador que agota el reloj pierde el turno (`skip`) o la partida (`lose`),
 * según la regla que fijó el host al crear la sala.
 */
export function timeoutTurn(room: RoomState, now: number): RoomResult {
  if (room.phase !== 'playing' || room.currentTurn === null) {
    return fail('WRONG_PHASE', 'No hay ningún turno en curso.');
  }

  if (room.config.timeoutRule === 'skip') {
    return succeed({
      ...room,
      currentTurn: rival(room.currentTurn),
      turnEndsAt: turnDeadline(room, now),
      pausedTurnMs: null,
    });
  }

  return succeed(finishGame(room, { winner: rival(room.currentTurn), winningLine: [], reason: 'timeout' }));
}

/** Abandonar durante la serie la entrega entera al rival. */
export function forfeit(room: RoomState, playerId: string): RoomResult {
  if (room.phase !== 'playing' && room.phase !== 'between_games') {
    return fail('WRONG_PHASE', 'No hay ninguna serie en curso.');
  }

  const player = findPlayer(room, playerId);
  if (!player) {
    return fail('NOT_IN_ROOM', 'No estás en esta sala.');
  }

  return succeed({
    ...room,
    phase: 'finished',
    currentTurn: null,
    turnEndsAt: null,
    pausedTurnMs: null,
    lastResult: { winner: rival(player.slot), winningLine: [], reason: 'forfeit' },
  });
}

/** Congela el reloj del turno (p. ej. mientras un jugador reconecta). */
export function pauseTurn(room: RoomState, now: number): RoomState {
  if (room.phase !== 'playing' || room.turnEndsAt === null) {
    return room;
  }

  return { ...room, turnEndsAt: null, pausedTurnMs: Math.max(0, room.turnEndsAt - now) };
}

export function resumeTurn(room: RoomState, now: number): RoomState {
  if (room.phase !== 'playing' || room.pausedTurnMs === null) {
    return room;
  }

  return { ...room, turnEndsAt: now + room.pausedTurnMs, pausedTurnMs: null };
}

/** Con la serie terminada, el host devuelve la sala al lobby con el marcador a cero. */
export function resetSeries(room: RoomState, playerId: string): RoomResult {
  if (!isHost(room, playerId)) {
    return fail('NOT_HOST', 'Solo el host puede reiniciar la serie.');
  }

  if (room.phase !== 'finished') {
    return fail('WRONG_PHASE', 'La serie todavía no ha terminado.');
  }

  return succeed({
    ...room,
    phase: 'lobby',
    board: createBoard(room.config.boardSize),
    currentTurn: null,
    turnEndsAt: null,
    pausedTurnMs: null,
    score: { 1: 0, 2: 0 },
    gameNumber: 0,
    lastResult: null,
  });
}
