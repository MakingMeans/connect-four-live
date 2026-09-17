import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// El servidor Socket.IO corre en :3000 en desarrollo; el cliente habla siempre
// con el mismo origen y Vite hace de proxy (también para WebSocket).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
      '/health': 'http://localhost:3000',
    },
  },
});
