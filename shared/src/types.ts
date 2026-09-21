/** Casilla del tablero: 0 vacía, 1 jugador 1, 2 jugador 2. */
export type Cell = 0 | 1 | 2;

/** Matriz `[fila][columna]`. La fila 0 es la superior; las fichas caen hacia el final. */
export type Board = Cell[][];

export type PlayerSlot = 1 | 2;

export interface Position {
  row: number;
  col: number;
}

/**
 * Qué pasa cuando un jugador agota el reloj:
 * - `skip`: pierde el turno y mueve el rival.
 * - `lose`: pierde la partida.
 */
export type TimeoutRule = 'skip' | 'lose';

/** Configuración que fija el creador de la sala antes de que nadie entre. */
export interface GameConfig {
  /** Tablero cuadrado de `boardSize x boardSize`. */
  boardSize: number;
  /** Segundos por turno. */
  turnSeconds: number;
  /** Mejor de N partidas (1..5). */
  bestOf: number;
  timeoutRule: TimeoutRule;
}

export interface Player {
  /** Identificador estable del jugador dentro de la sala (no el socket id). */
  id: string;
  username: string;
  slot: PlayerSlot;
  /** Id de la paleta (`ColorId`) o `null` si aún no ha elegido. */
  colorId: string | null;
  isConnected: boolean;
}

export type RoomPhase =
  /** Esperando jugadores / eligiendo color. Solo el host puede iniciar. */
  | 'lobby'
  /** Partida en curso. */
  | 'playing'
  /** Una partida de la serie terminó; se muestra resultado antes de la siguiente. */
  | 'between_games'
  /** La serie terminó (alguien alcanzó la mayoría de `bestOf`) o se abandonó. */
  | 'finished';

export interface GameResult {
  /** `null` = empate. */
  winner: PlayerSlot | null;
  winningLine: Position[];
  reason: 'connect_four' | 'draw' | 'timeout' | 'forfeit';
}

/** Estado completo de una sala tal y como lo ve el cliente. */
export interface RoomState {
  code: string;
  hostId: string;
  config: GameConfig;
  phase: RoomPhase;
  players: Player[];
  board: Board;
  currentTurn: PlayerSlot | null;
  /** Epoch ms en que expira el turno actual, o `null` si no corre reloj. */
  turnEndsAt: number | null;
  /** Milisegundos que le quedaban al turno cuando se pausó por una desconexión; `null` si no está pausado. */
  pausedTurnMs: number | null;
  /** Partidas ganadas por cada slot dentro de la serie. */
  score: Record<PlayerSlot, number>;
  /** Número de partida dentro de la serie, empezando en 1. */
  gameNumber: number;
  lastResult: GameResult | null;
}
