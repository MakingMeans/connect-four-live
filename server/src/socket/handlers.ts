import {
  gameConfigSchema,
  playerIdSchema,
  roomCodeSchema,
  usernameSchema,
  type Ack,
  type ClientToServerEvents,
  type ErrorPayload,
  type RoomJoined,
  type RoomState,
  type ServerToClientEvents,
  type SocketData,
} from '@c4/shared';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';

import { logger } from '../logger.js';
import { forfeit, pauseTurn, playMove, resetSeries, resumeTurn, startGame, timeoutTurn } from '../rooms/game.js';
import type { RoomManager } from '../rooms/room-manager.js';
import { RoomTimers } from '../rooms/room-timers.js';
import { addPlayer, chooseColor, findPlayer, isEmpty, removePlayer, setConnected, type RoomResult } from '../rooms/room.js';

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/**
 * Tiempo que se espera a un jugador desconectado antes de darlo por ido: en el
 * lobby se libera su asiento; en plena serie pierde la serie.
 */
export const DISCONNECT_GRACE_MS = 30_000;

const createRoomSchema = z.object({ username: usernameSchema, config: gameConfigSchema });
const joinRoomSchema = z.object({ username: usernameSchema, code: roomCodeSchema });
const rejoinRoomSchema = z.object({ code: roomCodeSchema, playerId: playerIdSchema });
const colorIdSchema = z.string().min(1);
const columnSchema = z.number().int().nonnegative();

const NOT_IN_ROOM: ErrorPayload = { code: 'NOT_IN_ROOM', message: 'No estás en ninguna sala.' };

function invalidInput(error: z.ZodError): ErrorPayload {
  const first = error.issues[0];
  return { code: 'INVALID_INPUT', message: first ? `${first.path.join('.')}: ${first.message}` : 'Datos inválidos.' };
}

function isSeriesRunning(room: RoomState): boolean {
  return room.phase === 'playing' || room.phase === 'between_games';
}

export interface HandlerDeps {
  timers?: RoomTimers;
  now?: () => number;
}

export function registerHandlers(io: GameServer, rooms: RoomManager, deps: HandlerDeps = {}): void {
  const timers = deps.timers ?? new RoomTimers();
  const now = deps.now ?? (() => Date.now());

  const closeRoom = (roomCode: string, reason: string): void => {
    rooms.delete(roomCode);
    timers.clearRoom(roomCode);
    io.to(roomCode).emit('room:closed', reason);
    io.in(roomCode).socketsLeave(roomCode);
    logger.info({ roomCode }, 'sala cerrada');
  };

  /** El reloj de turno vive aquí: se reprograma con cada estado nuevo y se cancela si no hay turno. */
  const syncTurnTimer = (room: RoomState): void => {
    if (room.phase !== 'playing' || room.turnEndsAt === null) {
      timers.clear(room.code, 'turn');
      return;
    }

    timers.set(room.code, 'turn', room.turnEndsAt - now(), () => {
      const current = rooms.get(room.code);
      if (!current) return;
      const result = timeoutTurn(current, now());
      if (result.ok) {
        logger.info({ roomCode: room.code, gameNumber: current.gameNumber }, 'turno agotado');
        commit(result.value);
      }
    });
  };

  /** Persiste un estado nuevo, lo emite a toda la sala y sincroniza el reloj. */
  const commit = (room: RoomState): void => {
    rooms.update(room);
    io.to(room.code).emit('room:state', room);
    syncTurnTimer(room);
  };

  /** Quita al jugador de la sala; si estaba en plena serie, la pierde. Cierra la sala si queda vacía. */
  const dropPlayer = (room: RoomState, playerId: string): void => {
    const forfeited = isSeriesRunning(room) ? forfeit(room, playerId) : null;
    const next = removePlayer(forfeited?.ok ? forfeited.value : room, playerId);
    if (isEmpty(next)) {
      closeRoom(room.code, 'Todos los jugadores salieron.');
      return;
    }
    commit(next);
  };

  /** Si el jugador no vuelve dentro del periodo de gracia, se le da por ido. */
  const scheduleGrace = (roomCode: string, playerId: string): void => {
    timers.set(roomCode, 'grace', DISCONNECT_GRACE_MS, () => {
      const current = rooms.get(roomCode);
      const player = current ? findPlayer(current, playerId) : undefined;
      if (!current || !player || player.isConnected) return;

      logger.info({ roomCode, playerId, phase: current.phase }, 'jugador no reconectó');
      dropPlayer(current, playerId);
    });
  };

  const detachSocket = (socket: GameSocket, roomCode: string): void => {
    socket.data.roomCode = null;
    socket.data.playerId = null;
    void socket.leave(roomCode);
  };

  const attachSocket = (socket: GameSocket, roomCode: string, playerId: string): void => {
    socket.data.roomCode = roomCode;
    socket.data.playerId = playerId;
    void socket.join(roomCode);
  };

  /**
   * Salida de la sala actual. Salir a propósito es definitivo (y en plena serie
   * es abandonar); perder la conexión solo marca al jugador como ausente, pausa
   * el reloj si corría y abre un periodo de gracia para volver con `room:rejoin`.
   */
  const leaveCurrentRoom = (socket: GameSocket, { voluntary }: { voluntary: boolean }): void => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    detachSocket(socket, roomCode);
    if (!room) return;

    if (voluntary) {
      dropPlayer(room, playerId);
      return;
    }

    commit(pauseTurn(setConnected(room, playerId, false), now()));
    scheduleGrace(roomCode, playerId);
  };

  /**
   * Aplica una transición pura a la sala del socket: resuelve sala y jugador,
   * ejecuta `transition`, persiste el resultado y lo emite a toda la sala.
   */
  const applyTransition = (
    socket: GameSocket,
    ack: Ack,
    transition: (room: RoomState, playerId: string) => RoomResult,
  ): void => {
    const { roomCode, playerId } = socket.data;
    const room = roomCode ? rooms.get(roomCode) : undefined;
    if (!room || !playerId) {
      ack({ ok: false, error: NOT_IN_ROOM });
      return;
    }

    const result = transition(room, playerId);
    if (!result.ok) {
      ack({ ok: false, error: result.error });
      return;
    }

    ack({ ok: true, data: undefined });
    commit(result.value);
  };

  io.on('connection', (socket) => {
    socket.data.playerId = null;
    socket.data.roomCode = null;
    logger.debug({ socketId: socket.id }, 'socket conectado');

    socket.on('room:create', (input, ack: Ack<RoomJoined>) => {
      const parsed = createRoomSchema.safeParse(input);
      if (!parsed.success) {
        ack({ ok: false, error: invalidInput(parsed.error) });
        return;
      }

      leaveCurrentRoom(socket, { voluntary: true });
      const { room, hostId } = rooms.create(parsed.data.username, parsed.data.config);
      attachSocket(socket, room.code, hostId);

      logger.info({ roomCode: room.code, config: room.config }, 'sala creada');
      ack({ ok: true, data: { playerId: hostId, room } });
      commit(room);
    });

    socket.on('room:join', (input, ack: Ack<RoomJoined>) => {
      const parsed = joinRoomSchema.safeParse(input);
      if (!parsed.success) {
        ack({ ok: false, error: invalidInput(parsed.error) });
        return;
      }

      const room = rooms.get(parsed.data.code);
      if (!room) {
        ack({ ok: false, error: { code: 'ROOM_NOT_FOUND', message: 'No existe ninguna sala con ese código.' } });
        return;
      }

      leaveCurrentRoom(socket, { voluntary: true });
      const playerId = rooms.newPlayerId();
      const result = addPlayer(room, playerId, parsed.data.username);
      if (!result.ok) {
        ack({ ok: false, error: result.error });
        return;
      }

      attachSocket(socket, room.code, playerId);
      logger.info({ roomCode: room.code, playerId }, 'jugador unido');
      ack({ ok: true, data: { playerId, room: result.value } });
      commit(result.value);
    });

    socket.on('room:rejoin', (input, ack: Ack<RoomJoined>) => {
      const parsed = rejoinRoomSchema.safeParse(input);
      if (!parsed.success) {
        ack({ ok: false, error: invalidInput(parsed.error) });
        return;
      }

      const room = rooms.get(parsed.data.code);
      const player = room ? findPlayer(room, parsed.data.playerId) : undefined;
      if (!room || !player) {
        ack({ ok: false, error: { code: 'ROOM_NOT_FOUND', message: 'La sala ya no existe o expiró.' } });
        return;
      }

      leaveCurrentRoom(socket, { voluntary: true });
      attachSocket(socket, room.code, player.id);
      timers.clear(room.code, 'grace');
      const next = resumeTurn(setConnected(room, player.id, true), now());

      // Si el otro jugador sigue desconectado, su periodo de gracia vuelve a correr.
      const stillAway = next.players.find((candidate) => !candidate.isConnected);
      if (stillAway) {
        scheduleGrace(room.code, stillAway.id);
      }

      logger.info({ roomCode: room.code, playerId: player.id }, 'jugador reconectado');
      ack({ ok: true, data: { playerId: player.id, room: next } });
      commit(next);
    });

    socket.on('room:choose-color', (colorId, ack: Ack) => {
      const parsed = colorIdSchema.safeParse(colorId);
      if (!parsed.success) {
        ack({ ok: false, error: invalidInput(parsed.error) });
        return;
      }
      applyTransition(socket, ack, (room, playerId) => chooseColor(room, playerId, parsed.data));
    });

    socket.on('room:reset', (ack: Ack) => {
      applyTransition(socket, ack, (room, playerId) => resetSeries(room, playerId));
    });

    socket.on('game:start', (ack: Ack) => {
      applyTransition(socket, ack, (room, playerId) => startGame(room, playerId, now()));
    });

    socket.on('game:move', (col, ack: Ack) => {
      const parsed = columnSchema.safeParse(col);
      if (!parsed.success) {
        ack({ ok: false, error: invalidInput(parsed.error) });
        return;
      }
      applyTransition(socket, ack, (room, playerId) => playMove(room, playerId, parsed.data, now()));
    });

    socket.on('room:leave', (ack: Ack) => {
      leaveCurrentRoom(socket, { voluntary: true });
      ack({ ok: true, data: undefined });
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'socket desconectado');
      leaveCurrentRoom(socket, { voluntary: false });
    });
  });
}
