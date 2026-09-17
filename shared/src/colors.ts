export interface PaletteColor {
  id: string;
  name: string;
  hex: string;
}

/**
 * Paleta amplia para elegir ficha. Los ids son estables: el estado de sala
 * guarda el `id`, nunca el hex, para poder retocar tonos sin romper nada.
 */
export const PALETTE: readonly PaletteColor[] = [
  { id: 'red', name: 'Rojo', hex: '#e53935' },
  { id: 'orange', name: 'Naranja', hex: '#fb8c00' },
  { id: 'amber', name: 'Ámbar', hex: '#ffb300' },
  { id: 'yellow', name: 'Amarillo', hex: '#fdd835' },
  { id: 'lime', name: 'Lima', hex: '#c0ca33' },
  { id: 'green', name: 'Verde', hex: '#43a047' },
  { id: 'teal', name: 'Turquesa', hex: '#00897b' },
  { id: 'cyan', name: 'Cian', hex: '#00acc1' },
  { id: 'sky', name: 'Celeste', hex: '#039be5' },
  { id: 'blue', name: 'Azul', hex: '#1e88e5' },
  { id: 'indigo', name: 'Índigo', hex: '#3949ab' },
  { id: 'violet', name: 'Violeta', hex: '#8e24aa' },
  { id: 'pink', name: 'Rosa', hex: '#d81b60' },
  { id: 'brown', name: 'Marrón', hex: '#6d4c41' },
  { id: 'slate', name: 'Pizarra', hex: '#546e7a' },
  { id: 'black', name: 'Negro', hex: '#212121' },
];

export type ColorId = (typeof PALETTE)[number]['id'];

export function isColorId(value: unknown): value is ColorId {
  return typeof value === 'string' && PALETTE.some((color) => color.id === value);
}

export function getColor(id: string): PaletteColor | undefined {
  return PALETTE.find((color) => color.id === id);
}
