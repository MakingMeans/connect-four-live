import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { ClientToServerEvents, RoomJoined, RoomState, ServerToClientEvents } from '@c4/shared';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { RoomManager } from '../rooms/room-manager.js';
import { RoomTimers } from '../rooms/room-timers.js';
import { registerHandlers, type GameServer } from './handlers.js';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const CONFIG = { boardSize: 5, turnSeconds: 5, bestOf: 1, timeoutRule: 'lose' } as const;

/** Temporizadores que no corren solos: el test decide cuándo expiran. */
class ManualTimers extends RoomTimers {
  private readonly pending = new Map<string, () => void>();

  override set(roomCode: string, kind: 'turn' | 'grace', _delayMs: number, onExpire: () => void): void {
    this.pending.set(`${roomCode}:${kind}`, onExpire);
  }

  override clear(roomCode: string, kind: 'turn' | 'grace'): void {
    this.pending.delete(`${roomCode}:${kind}`);
  }

  fire(roomCode: string, kind: 'turn' | 'grace'): void {
    const onExpire = this.pending.get(`${roomCode}:${kind}`);
    this.pending.delete(`${roomCode}:${kind}`);
    onExpire?.();
  }
}

/**
 * Test de integración: servidor Socket.IO real en un puerto efímero y clientes
 * reales. El reloj del servidor se controla con `clock` para que los timeouts
 * no dependan del tiempo real.
 */
describe('socket handlers', () => {
  let http: HttpServer;
  let io: GameServer;
  let rooms: RoomManager;
  let timers: ManualTimers;
  let clock: number;
  let url: string;
  const clients: ClientSocket[] = [];

  beforeEach(async () => {
    http = createServer();
    io = new Server(http);
    rooms = new RoomManager();
    timers = new ManualTimers();
    clock = 1_700_000_000_000;
    registerHandlers(io, rooms, { timers, now: () => clock });
    await new Promise<void>((resolve) => http.listen(0, resolve));
    url = `http://localhost:${(http.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
    await io.close();
  });

  function newClient(): Promise<ClientSocket> {
    const client: ClientSocket = connect(url, { forceNew: true, transports: ['websocket'] });
    clients.push(client);
    return new Promise((resolve) => client.on('connect', () => resolve(client)));
  }

  function request<T>(client: ClientSocket, event: keyof ClientToServerEvents, ...args: unknown[]): Promise<T> {
    return new Promise((resolve, reject) => {
      (client.emit as (event: string, ...payload: unknown[]) => void)(event, ...args, (response: unknown) => {
        const typed = response as { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
        if (typed.ok) resolve(typed.data);
        else reject(new Error(typed.error.code));
      });
    });
  }

  function nextState(client: ClientSocket, predicate: (room: RoomState) => boolean = () => true): Promise<RoomState> {
    return new Promise((resolve) => {
      const handler = (room: RoomState) => {
        if (predicate(room)) {
          client.off('room:state', handler);
          resolve(room);
        }
      };
      client.on('room:state', handler);
    });
  }

  async function readyRoom() {
    const host = await newClient();
    const guest = await newClient();
    const created = await request<RoomJoined>(host, 'room:create', { username: 'Ana', config: CONFIG });
    const joined = await request<RoomJoined>(guest, 'room:join', { username: 'Bruno', code: created.room.code });
    await request(host, 'room:choose-color', 'red');
    await request(guest, 'room:choose-color', 'yellow');
    return { host, guest, code: created.room.code, hostId: created.playerId, guestId: joined.playerId };
  }

  it('plays a full game: start, moves and a connect-four win broadcast to both players', async () => {
    const { host, guest } = await readyRoom();

    const started = nextState(guest, (room) => room.phase === 'playing');
    await request(host, 'game:start');
    expect((await started).currentTurn).toBe(1);

    await expect(request(guest, 'game:move', 0)).rejects.toThrow('NOT_YOUR_TURN');

    const finished = nextState(guest, (room) => room.phase === 'finished');
    for (const [player, col] of [
      [host, 0],
      [guest, 1],
      [host, 0],
      [guest, 1],
      [host, 0],
      [guest, 1],
      [host, 0],
    ] as const) {
      await request(player, 'game:move', col);
    }

    const room = await finished;
    expect(room.lastResult).toMatchObject({ winner: 1, reason: 'connect_four' });
    expect(room.score).toEqual({ 1: 1, 2: 0 });
  });

  it('rejects starting before both players chose a color', async () => {
    const host = await newClient();
    const guest = await newClient();
    const created = await request<RoomJoined>(host, 'room:create', { username: 'Ana', config: CONFIG });
    await request(guest, 'room:join', { username: 'Bruno', code: created.room.code });

    await expect(request(host, 'game:start')).rejects.toThrow('NOT_READY');
    await expect(request(guest, 'game:start')).rejects.toThrow('NOT_HOST');
  });

  it('passes the turn when the clock expires under the skip rule', async () => {
    const host = await newClient();
    const guest = await newClient();
    const created = await request<RoomJoined>(host, 'room:create', {
      username: 'Ana',
      config: { ...CONFIG, timeoutRule: 'skip' },
    });
    await request(guest, 'room:join', { username: 'Bruno', code: created.room.code });
    await request(host, 'room:choose-color', 'red');
    await request(guest, 'room:choose-color', 'yellow');
    await request(host, 'game:start');

    const skipped = nextState(guest, (room) => room.currentTurn === 2);
    timers.fire(created.room.code, 'turn');

    expect((await skipped).phase).toBe('playing');
  });

  it('gives the game to the rival when the turn clock expires', async () => {
    const { host, guest, code } = await readyRoom();
    await request(host, 'game:start');

    const timedOut = nextState(guest, (room) => room.phase === 'finished');
    timers.fire(code, 'turn');

    const room = await timedOut;
    expect(room.lastResult).toMatchObject({ winner: 2, reason: 'timeout' });
  });

  it('forfeits the series when a disconnected player does not come back in time', async () => {
    const { host, guest, code } = await readyRoom();
    await request(host, 'game:start');

    const paused = nextState(host, (room) => room.turnEndsAt === null);
    guest.disconnect();
    await paused;

    const finished = nextState(host, (room) => room.phase === 'finished');
    timers.fire(code, 'grace');

    expect((await finished).lastResult).toMatchObject({ winner: 1, reason: 'forfeit' });
  });

  it('pauses the clock while a player is away and resumes it on rejoin', async () => {
    const { host, guest, code, guestId } = await readyRoom();
    await request(host, 'game:start');

    const paused = nextState(host, (room) => room.turnEndsAt === null);
    guest.disconnect();
    const pausedRoom = await paused;
    expect(pausedRoom.pausedTurnMs).toBe(CONFIG.turnSeconds * 1000);
    expect(pausedRoom.players[1]?.isConnected).toBe(false);

    clock += 60_000;
    const rejoinClient = await newClient();
    const resumed = nextState(host, (room) => room.turnEndsAt !== null);
    const rejoined = await request<RoomJoined>(rejoinClient, 'room:rejoin', { code, playerId: guestId });

    expect(rejoined.playerId).toBe(guestId);
    expect((await resumed).turnEndsAt).toBe(clock + CONFIG.turnSeconds * 1000);
  });

  it('keeps the lobby seat for a player who reconnects within the grace period', async () => {
    const { host, guest, code, guestId } = await readyRoom();

    const away = nextState(host, (room) => room.players[1]?.isConnected === false);
    guest.disconnect();
    expect((await away).players).toHaveLength(2);

    const back = nextState(host, (room) => room.players[1]?.isConnected === true);
    const rejoinClient = await newClient();
    await request<RoomJoined>(rejoinClient, 'room:rejoin', { code, playerId: guestId });

    expect((await back).players[1]?.colorId).toBe('yellow');
  });

  it('frees the lobby seat when the grace period expires without a rejoin', async () => {
    const { host, guest, code } = await readyRoom();

    const away = nextState(host, (room) => room.players[1]?.isConnected === false);
    guest.disconnect();
    await away;

    const freed = nextState(host, (room) => room.players.length === 1);
    timers.fire(code, 'grace');

    expect((await freed).players[0]?.id).toBe((await freed).hostId);
  });

  it('keeps a lobby alive while its only player reloads, and closes it if they never return', async () => {
    const host = await newClient();
    const created = await request<RoomJoined>(host, 'room:create', { username: 'Ana', config: CONFIG });
    const code = created.room.code;

    host.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(rooms.get(code)).toBeDefined();

    timers.fire(code, 'grace');
    expect(rooms.get(code)).toBeUndefined();
  });

  it('rejects rejoining with an unknown player id', async () => {
    const { code } = await readyRoom();
    const stranger = await newClient();

    await expect(
      request(stranger, 'room:rejoin', { code, playerId: '00000000-0000-4000-8000-000000000000' }),
    ).rejects.toThrow('ROOM_NOT_FOUND');
  });

  it('forfeits the series when a player leaves on purpose mid-game', async () => {
    const { host, guest } = await readyRoom();
    await request(host, 'game:start');

    const finished = nextState(host, (room) => room.phase === 'finished');
    await request(guest, 'room:leave');

    const room = await finished;
    expect(room.lastResult).toMatchObject({ winner: 1, reason: 'forfeit' });
  });

  it('lets the host reset a finished series back to the lobby', async () => {
    const { host, guest } = await readyRoom();
    await request(host, 'game:start');
    await request(guest, 'room:leave');

    const lobby = nextState(host, (room) => room.phase === 'lobby');
    await request(host, 'room:reset');

    expect((await lobby).score).toEqual({ 1: 0, 2: 0 });
  });
});
