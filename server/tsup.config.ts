import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // El paquete shared se empaqueta dentro para que Node no resuelva .ts en runtime.
  noExternal: ['@c4/shared'],
});
