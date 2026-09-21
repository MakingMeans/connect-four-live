import { useEffect, useState } from 'react';

interface TurnTimerProps {
  /** Epoch ms fijado por el servidor; `null` si el reloj no corre. */
  turnEndsAt: number | null;
  /** Milisegundos congelados cuando el rival está reconectando. */
  pausedTurnMs: number | null;
}

const TICK_MS = 250;
const SECOND_MS = 1000;

function secondsLeft(turnEndsAt: number, now: number): number {
  return Math.max(0, Math.ceil((turnEndsAt - now) / SECOND_MS));
}

/**
 * Cuenta atrás visual. El servidor manda la hora límite y el cliente solo la
 * pinta: cuando llega a cero no pasa nada aquí, el servidor decide el timeout.
 */
export function TurnTimer({ turnEndsAt, pausedTurnMs }: TurnTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (turnEndsAt === null) return undefined;
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, [turnEndsAt]);

  if (pausedTurnMs !== null) {
    return (
      <span className="timer timer--paused">
        <strong>{Math.ceil(pausedTurnMs / SECOND_MS)} s</strong> <span className="muted">(pausado)</span>
      </span>
    );
  }

  if (turnEndsAt === null) {
    return null;
  }

  const seconds = secondsLeft(turnEndsAt, now);
  return (
    <span className={`timer${seconds <= 5 ? ' timer--urgent' : ''}`} aria-live="polite">
      <strong>{seconds} s</strong>
    </span>
  );
}
