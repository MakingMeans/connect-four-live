import type { Ack, ClientToServerEvents, ServerToClientEvents } from '@c4/shared';
import { io, type Socket } from 'socket.io-client';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Un único socket para toda la app; se conecta al mismo origen (Vite hace proxy en dev). */
export const socket: GameSocket = io({ autoConnect: false });

export class SocketRequestError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SocketRequestError';
    this.code = code;
  }
}

type AckData<T> = T extends Ack<infer D> ? D : never;
type AckOf<E extends keyof ClientToServerEvents> = Parameters<ClientToServerEvents[E]> extends [...infer _Args, infer A]
  ? A
  : never;
type ArgsOf<E extends keyof ClientToServerEvents> = Parameters<ClientToServerEvents[E]> extends [...infer Args, unknown]
  ? Args
  : never;

/**
 * Envuelve `emit` + ack en una promesa tipada. Rechaza con `SocketRequestError`
 * cuando el servidor responde `ok: false`.
 */
export function request<E extends keyof ClientToServerEvents>(
  event: E,
  ...args: ArgsOf<E>
): Promise<AckData<AckOf<E>>> {
  return new Promise((resolve, reject) => {
    const ack = (response: { ok: true; data: AckData<AckOf<E>> } | { ok: false; error: { code: string; message: string } }) => {
      if (response.ok) {
        resolve(response.data);
      } else {
        reject(new SocketRequestError(response.error.code, response.error.message));
      }
    };
    // Socket.IO tipa emit con tuplas por evento; el spread genérico necesita esta cast.
    (socket.emit as (event: E, ...payload: unknown[]) => void)(event, ...args, ack);
  });
}
