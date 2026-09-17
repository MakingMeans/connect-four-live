import {
  gameConfigSchema,
  roomCodeSchema,
  usernameSchema,
  type Ack,
  type ClientToServerEvents,
  type ErrorPayload,
  type RoomState,
  type ServerToClientEvents,
  type SocketData,
} from '@c4/shared';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';

import { logger } from '../logger.js';
import type { RoomManager } from '../rooms/room-manager.js';
import { addPlayer, isEmpty, removePlayer } from '../rooms/room.js';

export type GameServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
export type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const createRoomSchema = z.object({ username: usernameSchema, config: gameConfigSchema });
const joinRoomSchema = z.object({ username: usernameSchema, code: roomCodeSchema });

function invalidInput(error: z.ZodError): ErrorPayload {
  const first = error.issues[0];
  return { code: 'INVALID_INPUT', message: first ? `${first.path.join('.')}: ${first.message}` : 'Datos inválidos.' };
}

export function registerHandlers(io: GameServer, rooms: RoomManager): void {
  const broadcast = (room: RoomState): void => {
    io.to(room.code).emit('room:state', room);
  };

  const leaveCurrentRoom = (socket: GameSocket): void => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) {
      return;
    }

    const room = rooms.get(roomCode);
    socket.data.roomCode = null;
    socket.data.playerId = null;
    void socket.leave(roomCode);

    if (!room) {
      return;
    }

    const next = removePlayer(room, playerId);
    if (isEmpty(next)) {
      rooms.delete(roomCode);
      io.to(roomCode).emit('room:closed', 'Todos los jugadores salieron.');
      logger.info({ roomCode }, 'sala cerrada');
      return;
    }

    rooms.update(next);
    broadcast(next);
  };

  io.on('connection', (socket) => {
    socket.data.playerId = null;
    socket.data.roomCode = null;
    logger.debug({ socketId: socket.id }, 'socket conectado');

    socket.on('room:create', (input, ack: Ack<{ playerId: string; room: RoomState }>) => {
      const parsed = createRoomSchema.safeParse(input);
      if (!parsed.success) {
        ack({ ok: false, error: invalidInput(parsed.error) });
        return;
      }

      leaveCurrentRoom(socket);
      const { room, hostId } = rooms.create(parsed.data.username, parsed.data.config);
      socket.data.playerId = hostId;
      socket.data.roomCode = room.code;
      void socket.join(room.code);

      logger.info({ roomCode: room.code, config: room.config }, 'sala creada');
      ack({ ok: true, data: { playerId: hostId, room } });
      broadcast(room);
    });

    socket.on('room:join', (input, ack: Ack<{ playerId: string; room: RoomState }>) => {
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

      leaveCurrentRoom(socket);
      const playerId = rooms.newPlayerId();
      const result = addPlayer(room, playerId, parsed.data.username);
      if (!result.ok) {
        ack({ ok: false, error: result.error });
        return;
      }

      socket.data.playerId = playerId;
      socket.data.roomCode = room.code;
      void socket.join(room.code);
      rooms.update(result.value);

      logger.info({ roomCode: room.code, playerId }, 'jugador unido');
      ack({ ok: true, data: { playerId, room: result.value } });
      broadcast(result.value);
    });

    socket.on('room:leave', (ack: Ack) => {
      leaveCurrentRoom(socket);
      ack({ ok: true, data: undefined });
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'socket desconectado');
      leaveCurrentRoom(socket);
    });
  });
}
