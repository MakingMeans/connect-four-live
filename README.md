# Connect Four Live

Conecta 4 multijugador en tiempo real. Creas una sala privada, compartes un código de 6 caracteres y la otra persona entra con él. Sin cuentas ni base de datos: la sala vive mientras haya alguien dentro.

## Qué se puede hacer

- Elegir tu nombre de usuario (se recuerda en el navegador).
- Crear una sala y configurarla como host:
  - tablero cuadrado de **4×4 a 20×20**,
  - **segundos por turno**,
  - **una partida o mejor de 3 / 5** (cualquier N de 1 a 5).
- Unirse a una sala con su código.
- Elegir el color de tus fichas de una paleta amplia (sin repetir el del rival).
- Solo el host puede empezar la partida.
- Gana quien haga **cuatro en línea**; tablero lleno es empate.

> Estado: crear sala, unirse por código y lobby en tiempo real ya funcionan. Elección de color, partida, temporizador y series están en desarrollo.

## Stack

- **Servidor:** Node 22, Express 5, Socket.IO 4. Estado en memoria.
- **Cliente:** React 19, Vite 8, socket.io-client.
- **Compartido:** TypeScript estricto y Zod; tipos, lógica de tablero y contrato de eventos viven en `shared/` y los usan ambos lados.

```
shared/   tipos, esquemas, lógica de tablero, paleta, eventos socket
server/   API en tiempo real (salas, turnos, reglas)
client/   interfaz web
```

## Ejecutar

Requiere Node ≥ 22.

```bash
npm install
npm run dev        # servidor en :3000 y cliente en :5173
```

Otros comandos:

```bash
npm run check      # typecheck + lint + tests
npm run build      # build de servidor y cliente
npm start          # sirve el cliente compilado desde el servidor (NODE_ENV=production)
```

Variables de entorno del servidor en [server/.env.example](server/.env.example).

## Licencia

MIT — ver [LICENSE](LICENSE).
