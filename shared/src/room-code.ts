/** Sin 0/O ni 1/I para que el código se dicte sin ambigüedad. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

/**
 * Genera un código de sala. `random` se inyecta para que el servidor use
 * `crypto` y los tests sean deterministas.
 */
export function generateRoomCode(random: () => number = Math.random): string {
  let code = '';
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const position = Math.floor(random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET.charAt(position);
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
