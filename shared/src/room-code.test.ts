import { describe, expect, it } from 'vitest';

import { ROOM_CODE_ALPHABET, generateRoomCode, normalizeRoomCode } from './room-code.js';

describe('generateRoomCode', () => {
  it('produces 6 characters from the unambiguous alphabet', () => {
    const code = generateRoomCode();

    expect(code).toHaveLength(6);
    expect([...code].every((char) => ROOM_CODE_ALPHABET.includes(char))).toBe(true);
  });

  it('is deterministic given the random source', () => {
    expect(generateRoomCode(() => 0)).toBe('AAAAAA');
    expect(generateRoomCode(() => 0.999999)).toBe('999999');
  });

  it('never contains ambiguous characters', () => {
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[01IO]/);
  });
});

describe('normalizeRoomCode', () => {
  it('uppercases and strips separators and whitespace', () => {
    expect(normalizeRoomCode('  ab-c 2d3 ')).toBe('ABC2D3');
  });
});
