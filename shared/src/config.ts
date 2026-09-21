import { z } from 'zod';

import type { GameConfig, TimeoutRule } from './types.js';

export const BOARD_SIZE_MIN = 4;
export const BOARD_SIZE_MAX = 20;
export const BOARD_SIZE_DEFAULT = 7;

export const TURN_SECONDS_MIN = 5;
export const TURN_SECONDS_MAX = 300;
export const TURN_SECONDS_DEFAULT = 30;

export const BEST_OF_MIN = 1;
export const BEST_OF_MAX = 5;
export const BEST_OF_DEFAULT = 1;

export const TIMEOUT_RULES: readonly TimeoutRule[] = ['skip', 'lose'];
export const TIMEOUT_RULE_DEFAULT: TimeoutRule = 'skip';

export const USERNAME_MIN = 2;
export const USERNAME_MAX = 20;

export const CONNECT_LENGTH = 4;

export const gameConfigSchema = z.object({
  boardSize: z.number().int().min(BOARD_SIZE_MIN).max(BOARD_SIZE_MAX),
  turnSeconds: z.number().int().min(TURN_SECONDS_MIN).max(TURN_SECONDS_MAX),
  bestOf: z.number().int().min(BEST_OF_MIN).max(BEST_OF_MAX),
  timeoutRule: z.enum(TIMEOUT_RULES),
});

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN)
  .max(USERNAME_MAX)
  .regex(/^[\p{L}\p{N} _.-]+$/u, 'Solo letras, números, espacios y . _ -');

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, 'El código tiene 6 caracteres');

export const playerIdSchema = z.string().uuid();

export const DEFAULT_GAME_CONFIG: GameConfig = {
  boardSize: BOARD_SIZE_DEFAULT,
  turnSeconds: TURN_SECONDS_DEFAULT,
  bestOf: BEST_OF_DEFAULT,
  timeoutRule: TIMEOUT_RULE_DEFAULT,
};

/** Partidas que hay que ganar para llevarse una serie al mejor de `bestOf`. */
export function winsNeeded(bestOf: number): number {
  return Math.floor(bestOf / 2) + 1;
}
