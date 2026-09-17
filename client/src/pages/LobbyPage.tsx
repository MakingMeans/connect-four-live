import { getColor, type RoomState } from '@c4/shared';

type Props = {
  room: RoomState;
  playerId: string;
  isBusy: boolean;
  onLeave: () => Promise<void>;
};

export function LobbyPage({ room, playerId, isBusy, onLeave }: Props) {
  const isHost = room.hostId === playerId;
  const seriesLabel = room.config.bestOf === 1 ? 'Una partida' : `Mejor de ${room.config.bestOf}`;

  return (
    <div className="lobby">
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
                </span>
                <span className="muted">{color ? color.name : 'sin color'}</span>
              </li>
            );
          })}
          {room.players.length < 2 && <li className="players__item muted">Esperando al segundo jugador…</li>}
        </ul>
      </section>

      <div className="lobby__actions">
        {isHost && (
          <button type="button" className="button button--primary" disabled title="Pendiente de implementar">
            Empezar partida
          </button>
        )}
        <button type="button" className="button" onClick={() => void onLeave()} disabled={isBusy}>
          Salir de la sala
        </button>
      </div>
    </div>
  );
}
