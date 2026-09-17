const USERNAME_KEY = 'c4:username';

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
