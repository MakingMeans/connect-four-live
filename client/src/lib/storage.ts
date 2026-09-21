const USERNAME_KEY = 'c4:username';
const SESSION_KEY = 'c4:session';
const THEME_KEY = 'c4:theme';

export type Theme = 'light' | 'dark';
const THEME_DEFAULT: Theme = 'light';

export interface StoredSession {
  code: string;
  playerId: string;
}

export function loadUsername(): string {
  try {
    return window.localStorage.getItem(USERNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveUsername(username: string): void {
  try {
    window.localStorage.setItem(USERNAME_KEY, username);
  } catch {
    // Modo privado o almacenamiento bloqueado: el nombre solo vive en memoria.
  }
}

/**
 * La sesión de sala va en `sessionStorage`: sobrevive a una recarga pero es
 * distinta por pestaña, así dos pestañas pueden ser dos jugadores.
 */
export function loadSession(): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as StoredSession).code === 'string' &&
      typeof (parsed as StoredSession).playerId === 'string'
    ) {
      return { code: (parsed as StoredSession).code, playerId: (parsed as StoredSession).playerId };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Sin almacenamiento no hay reconexión tras recargar; la partida sigue en memoria.
  }
}

export function clearSession(): void {
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nada que limpiar si el almacenamiento no está disponible.
  }
}

export function loadTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === 'dark' || stored === 'light' ? stored : THEME_DEFAULT;
  } catch {
    return THEME_DEFAULT;
  }
}

export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Sin almacenamiento el tema vuelve al claro en la siguiente visita.
  }
}
