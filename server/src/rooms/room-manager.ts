import { randomInt, randomUUID } from 'node:crypto';

import { generateRoomCode, ROOM_CODE_ALPHABET, type GameConfig, type RoomState } from '@c4/shared';

import { createRoom } from './room.js';

const MAX_CODE_ATTEMPTS = 20;

function secureRandom(): number {
  return randomInt(ROOM_CODE_ALPHABET.length) / ROOM_CODE_ALPHABET.length;
}

/**
 * Almacén en memoria de salas. No hay persistencia por diseño: una sala vive
 * mientras alguien esté dentro.
 */
export class RoomManager {
  private readonly rooms = new Map<string, RoomState>();

  get size(): number {
    return this.rooms.size;
  }

  get(code: string): RoomState | undefined {
    return this.rooms.get(code);
  }

  create(hostUsername: string, config: GameConfig): { room: RoomState; hostId: string } {
    const code = this.uniqueCode();
    const hostId = randomUUID();
    const room = createRoom({ code, hostId, hostUsername, config });
    this.rooms.set(code, room);
    return { room, hostId };
  }

  /** Reemplaza el estado de una sala existente (las transiciones son inmutables). */
  update(room: RoomState): RoomState {
    this.rooms.set(room.code, room);
    return room;
  }

  delete(code: string): void {
    this.rooms.delete(code);
  }

  newPlayerId(): string {
    return randomUUID();
  }

  private uniqueCode(): string {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
      const code = generateRoomCode(secureRandom);
      if (!this.rooms.has(code)) {
        return code;
      }
    }
    throw new Error('No se pudo generar un código de sala único.');
  }
}
