import type { ErrorPayload, RoomState } from '@c4/shared';

/** Resultado de una transición de sala: nunca se lanza por errores de dominio. */
export type RoomResult<T = RoomState> = { ok: true; value: T } | { ok: false; error: ErrorPayload };

export function fail<T = RoomState>(code: ErrorPayload['code'], message: string): RoomResult<T> {
  return { ok: false, error: { code, message } };
}

export function succeed<T>(value: T): RoomResult<T> {
  return { ok: true, value };
}
