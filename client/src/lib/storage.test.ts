import { beforeEach, describe, expect, it } from 'vitest';

import { clearSession, loadSession, loadTheme, loadUsername, saveSession, saveTheme, saveUsername } from './storage';

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('round-trips the username through localStorage', () => {
    saveUsername('Ana');

    expect(loadUsername()).toBe('Ana');
  });

  it('returns an empty username when nothing is stored', () => {
    expect(loadUsername()).toBe('');
  });

  it('round-trips the room session through sessionStorage', () => {
    saveSession({ code: 'ABC234', playerId: 'player-1' });

    expect(loadSession()).toEqual({ code: 'ABC234', playerId: 'player-1' });
  });

  it('returns null for a missing or malformed session', () => {
    expect(loadSession()).toBeNull();

    window.sessionStorage.setItem('c4:session', '{"code":42}');
    expect(loadSession()).toBeNull();

    window.sessionStorage.setItem('c4:session', 'not json');
    expect(loadSession()).toBeNull();
  });

  it('round-trips the theme and falls back to light for unknown values', () => {
    expect(loadTheme()).toBe('light');

    saveTheme('dark');
    expect(loadTheme()).toBe('dark');

    window.localStorage.setItem('c4:theme', 'neon');
    expect(loadTheme()).toBe('light');
  });

  it('clears the stored session', () => {
    saveSession({ code: 'ABC234', playerId: 'player-1' });

    clearSession();

    expect(loadSession()).toBeNull();
  });
});
