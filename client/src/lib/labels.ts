import type { TimeoutRule } from '@c4/shared';

/** Textos de UI para valores del dominio que viajan por socket como ids. */
export const TIMEOUT_RULE_LABELS: Record<TimeoutRule, string> = {
  skip: 'Pierde el turno',
  lose: 'Pierde la partida',
};
