import type { Player, PlayerSlot, RoomState } from '@c4/shared';

interface ScoreboardProps {
  room: RoomState;
  viewerId: string;
  colors: Record<PlayerSlot, string>;
}

function slotOf(room: RoomState, slot: PlayerSlot): Player | undefined {
  return room.players.find((player) => player.slot === slot);
}

/** Marcador de la serie: nombre, color, victorias y quién tiene el turno. */
export function Scoreboard({ room, viewerId, colors }: ScoreboardProps) {
  const seriesLabel = room.config.bestOf === 1 ? 'Partida única' : `Mejor de ${room.config.bestOf}`;

  return (
    <div className="scoreboard" aria-label="Marcador">
      {([1, 2] as const).map((slot) => {
        const player = slotOf(room, slot);
        const isTurn = room.phase === 'playing' && room.currentTurn === slot;
        return (
          <div key={slot} className={`scoreboard__player${isTurn ? ' scoreboard__player--turn' : ''}`}>
            <span className="players__swatch" style={{ backgroundColor: colors[slot] }} aria-hidden="true" />
            <span className="scoreboard__name">
              {player?.username ?? '—'}
              {player?.id === viewerId && <span className="muted"> (tú)</span>}
              {player && !player.isConnected && <span className="muted"> · desconectado</span>}
            </span>
            <span className="scoreboard__score">{room.score[slot]}</span>
          </div>
        );
      })}
      <p className="scoreboard__series muted">
        {seriesLabel} · Partida {Math.max(room.gameNumber, 1)}
      </p>
    </div>
  );
}
