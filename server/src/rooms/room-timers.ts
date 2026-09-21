/** Tipos de temporizador que puede tener una sala. */
export type TimerKind = 'turn' | 'grace';

/**
 * Temporizadores por sala. Cada sala tiene como mucho uno de cada tipo: el
 * reloj del turno y el periodo de gracia para reconectar. Programar uno nuevo
 * cancela el anterior del mismo tipo, así nunca quedan callbacks huérfanos.
 */
export class RoomTimers {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  set(roomCode: string, kind: TimerKind, delayMs: number, onExpire: () => void): void {
    const key = this.key(roomCode, kind);
    this.clearKey(key);
    const handle = setTimeout(() => {
      this.timers.delete(key);
      onExpire();
    }, Math.max(0, delayMs));
    this.timers.set(key, handle);
  }

  clear(roomCode: string, kind: TimerKind): void {
    this.clearKey(this.key(roomCode, kind));
  }

  clearRoom(roomCode: string): void {
    this.clear(roomCode, 'turn');
    this.clear(roomCode, 'grace');
  }

  private key(roomCode: string, kind: TimerKind): string {
    return `${roomCode}:${kind}`;
  }

  private clearKey(key: string): void {
    const handle = this.timers.get(key);
    if (handle) {
      clearTimeout(handle);
      this.timers.delete(key);
    }
  }
}
