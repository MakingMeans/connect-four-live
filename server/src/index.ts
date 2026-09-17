import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import { Server } from 'socket.io';

import { env } from './config.js';
import { logger } from './logger.js';
import { RoomManager } from './rooms/room-manager.js';
import { registerHandlers, type GameServer } from './socket/handlers.js';

const app = express();
const httpServer = createServer(app);

// En producción cliente y servidor comparten origen; en dev Vite corre aparte.
const io: GameServer = new Server(httpServer, {
  ...(env.NODE_ENV === 'production' ? {} : { cors: { origin: env.CLIENT_ORIGIN } }),
});

const rooms = new RoomManager();
registerHandlers(io, rooms);

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', rooms: rooms.size });
});

// En producción el servidor sirve el build del cliente (client/dist) y hace
// fallback a index.html para que el enrutado del SPA funcione al recargar.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_request, response) => {
    response.sendFile(path.join(clientDist, 'index.html'));
  });
}

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'servidor escuchando');
});
