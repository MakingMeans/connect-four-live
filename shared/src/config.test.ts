import { describe, expect, it } from 'vitest';

import { DEFAULT_GAME_CONFIG, gameConfigSchema, roomCodeSchema, usernameSchema, winsNeeded } from './config.js';

describe('gameConfigSchema', () => {
  it('accepts the defaults', () => {
    expect(gameConfigSchema.safeParse(DEFAULT_GAME_CONFIG).success).toBe(true);
  });

  it.each([
    ['boardSize below min', { boardSize: 3 }],
    ['boardSize above max', { boardSize: 21 }],
    ['non-integer boardSize', { boardSize: 7.5 }],
    ['bestOf above max', { bestOf: 6 }],
    ['bestOf below min', { bestOf: 0 }],
    ['turnSeconds below min', { turnSeconds: 1 }],
  ])('rejects %s', (_label, override) => {
    expect(gameConfigSchema.safeParse({ ...DEFAULT_GAME_CONFIG, ...override }).success).toBe(false);
  });
});

describe('usernameSchema', () => {
  it('trims and accepts letters, numbers and separators', () => {
    expect(usernameSchema.parse('  Ana_Lopez-2 ')).toBe('Ana_Lopez-2');
  });

  it.each(['a', 'x'.repeat(21), '<script>', ''])('rejects %j', (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(false);
  });
});

describe('roomCodeSchema', () => {
  it('normalises to uppercase', () => {
    expect(roomCodeSchema.parse('abc234')).toBe('ABC234');
  });

  it('rejects wrong length', () => {
    expect(roomCodeSchema.safeParse('ABC').success).toBe(false);
  });
});

describe('winsNeeded', () => {
  it.each([
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 3],
    [5, 3],
  ])('best of %i needs %i wins', (bestOf, expected) => {
    expect(winsNeeded(bestOf)).toBe(expected);
  });
});
