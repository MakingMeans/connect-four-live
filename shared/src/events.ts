import type { GameConfig, RoomState } from './types.js';

/**
 * Contrato de eventos Socket.IO. Cliente y servidor importan estos tipos, así
 * un cambio aquí rompe la compilación en ambos lados en lugar de en runtime.
 *
 * Toda petición del cliente responde con `Ack<T>` (callback de Socket.IO) y,
 * cuando cambia el estado de la sala, el servidor emite `room:state` a todos.
 */

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'NOT_IN_ROOM'
  | 'NOT_HOST'
  /** Faltan condiciones para empezar: jugador, color o conexión del rival. */
  | 'NOT_READY'
  | 'NOT_YOUR_TURN'
  | 'INVALID_MOVE'
  | 'COLOR_TAKEN'
  | 'WRONG_PHASE'
  | 'INTERNAL';

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}

export type Ack<T = void> = (response: { ok: true; data: T } | { ok: false; error: ErrorPayload }) => void;

export interface CreateRoomInput {
  username: string;
  config: GameConfig;
}

export interface JoinRoomInput {
  username: string;
  code: string;
}

export interface RejoinRoomInput {
  code: string;
  playerId: string;
}

export interface RoomJoined {
  /** Id de jugador que el cliente debe conservar para reconectar. */
  playerId: string;
  room: RoomState;
}

export interface ClientToServerEvents {
  'room:create': (input: CreateRoomInput, ack: Ack<RoomJoined>) => void;
  'room:join': (input: JoinRoomInput, ack: Ack<RoomJoined>) => void;
  /** Vuelve a una sala tras perder la conexión, con el `playerId` recibido al entrar. */
  'room:rejoin': (input: RejoinRoomInput, ack: Ack<RoomJoined>) => void;
  'room:leave': (ack: Ack) => void;
  'room:choose-color': (colorId: string, ack: Ack) => void;
  /** Solo el host. Con la serie terminada, vuelve al lobby con el marcador a cero. */
  'room:reset': (ack: Ack) => void;
  /** Solo el host. Arranca la primera partida o la siguiente de la serie. */
  'game:start': (ack: Ack) => void;
  'game:move': (col: number, ack: Ack) => void;
}

export interface ServerToClientEvents {
  'room:state': (room: RoomState) => void;
  /** La sala dejó de existir (el host se fue o expiró). */
  'room:closed': (reason: string) => void;
}

/** Datos que el servidor asocia a cada socket. */
export interface SocketData {
  playerId: string | null;
  roomCode: string | null;
}
