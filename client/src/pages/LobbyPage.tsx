import { getColor, type RoomState } from '@c4/shared';

import { ColorPicker } from '@/components/ColorPicker';
import { TIMEOUT_RULE_LABELS } from '@/lib/labels';

interface LobbyPageProps {
  room: RoomState;
  playerId: string;
  isBusy: boolean;
  error: string | null;
  onLeave: () => Promise<void>;
  onChooseColor: (colorId: string) => Promise<void>;
  onStart: () => Promise<void>;
  onDismissError: () => void;
}

export function LobbyPage({
  room,
  playerId,
  isBusy,
  error,
  onLeave,
  onChooseColor,
  onStart,
  onDismissError,
}: LobbyPageProps) {
  const isHost = room.hostId === playerId;
  const seriesLabel = room.config.bestOf === 1 ? 'Una partida' : `Mejor de ${room.config.bestOf}`;
  const me = room.players.find((player) => player.id === playerId);
  const rivalColorIds = room.players
    .filter((player) => player.id !== playerId && player.colorId !== null)
    .map((player) => player.colorId as string);
  const canStart =
    room.players.length === 2 && room.players.every((player) => player.colorId !== null && player.isConnected);

  return (
    <div className="lobby">
      {error && (
        <p className="notice notice--error" role="alert">
          {error}{' '}
          <button type="button" className="link" onClick={onDismissError}>
            cerrar
          </button>
        </p>
      )}

      <section className="panel lobby__code">
        <h2>Código de sala</h2>
        <p className="code" aria-label={`Código ${room.code.split('').join(' ')}`}>
          {room.code}
        </p>
        <p className="muted">Compártelo con tu rival para que entre desde la pantalla de inicio.</p>
      </section>

      <section className="panel">
        <h2>Configuración</h2>
        <dl className="config">
          <dt>Tablero</dt>
          <dd>
            {room.config.boardSize}×{room.config.boardSize}
          </dd>
          <dt>Tiempo por turno</dt>
          <dd>{room.config.turnSeconds} s</dd>
          <dt>Si se agota</dt>
          <dd>{TIMEOUT_RULE_LABELS[room.config.timeoutRule]}</dd>
          <dt>Serie</dt>
          <dd>{seriesLabel}</dd>
        </dl>
      </section>

      <section className="panel">
        <h2>Jugadores</h2>
        <ul className="players">
          {room.players.map((player) => {
            const color = player.colorId ? getColor(player.colorId) : undefined;
            return (
              <li key={player.id} className="players__item">
                <span
                  className="players__swatch"
                  style={{ backgroundColor: color?.hex ?? 'transparent' }}
                  aria-hidden="true"
                />
                <span>
                  {player.username}
                  {player.id === room.hostId && ' (host)'}
                  {player.id === playerId && ' — tú'}
                  {!player.isConnected && <span className="muted"> · reconectando…</span>}
                </span>
                <span className="muted">{color ? color.name : 'sin color'}</span>
              </li>
            );
          })}
          {room.players.length < 2 && <li className="players__item muted">Esperando al segundo jugador…</li>}
        </ul>
      </section>

      <section className="panel">
        <h2>Tu color</h2>
        <ColorPicker
          selectedId={me?.colorId ?? null}
          takenIds={rivalColorIds}
          isBusy={isBusy}
          onSelect={(colorId) => void onChooseColor(colorId)}
        />
      </section>

      <div className="lobby__actions">
        {isHost ? (
          <button
            type="button"
            className="button button--primary"
            onClick={() => void onStart()}
            disabled={isBusy || !canStart}
            title={canStart ? undefined : 'Hacen falta dos jugadores con color'}
          >
            Empezar partida
          </button>
        ) : (
          <span className="muted">{canStart ? 'Esperando a que el host empiece…' : 'Elige tu color para estar listo'}</span>
        )}
        <button type="button" className="button" onClick={() => void onLeave()} disabled={isBusy}>
          Salir de la sala
        </button>
      </div>
    </div>
  );
}
