import { getColor, winsNeeded, type GameResult, type PlayerSlot, type RoomState } from '@c4/shared';

import { Board } from '@/components/Board';
import { Scoreboard } from '@/components/Scoreboard';
import { TurnTimer } from '@/components/TurnTimer';

interface GamePageProps {
  room: RoomState;
  playerId: string;
  isBusy: boolean;
  error: string | null;
  onPlay: (col: number) => Promise<void>;
  onNextGame: () => Promise<void>;
  onReset: () => Promise<void>;
  onLeave: () => Promise<void>;
  onDismissError: () => void;
}

const FALLBACK_COLOR = '#9aa3b8';

function slotColors(room: RoomState): Record<PlayerSlot, string> {
  const hexOf = (slot: PlayerSlot) => {
    const player = room.players.find((candidate) => candidate.slot === slot);
    return (player?.colorId && getColor(player.colorId)?.hex) || FALLBACK_COLOR;
  };
  return { 1: hexOf(1), 2: hexOf(2) };
}

function nameOf(room: RoomState, slot: PlayerSlot | null): string {
  return room.players.find((player) => player.slot === slot)?.username ?? 'Alguien';
}

function describeResult(room: RoomState, result: GameResult, viewerSlot: PlayerSlot | undefined): string {
  if (result.winner === null) {
    return 'Empate: tablero lleno.';
  }
  const who = result.winner === viewerSlot ? 'Has ganado' : `${nameOf(room, result.winner)} gana`;
  switch (result.reason) {
    case 'timeout':
      return `${who} por tiempo.`;
    case 'forfeit':
      return `${who} la serie por abandono del rival.`;
    default:
      return `${who} con 4 en línea.`;
  }
}

/** Fases `playing`, `between_games` y `finished` en una sola página. */
export function GamePage({
  room,
  playerId,
  isBusy,
  error,
  onPlay,
  onNextGame,
  onReset,
  onLeave,
  onDismissError,
}: GamePageProps) {
  const me = room.players.find((player) => player.id === playerId);
  const isHost = room.hostId === playerId;
  const colors = slotColors(room);
  const isMyTurn = room.phase === 'playing' && room.currentTurn === me?.slot;
  const rivalAway = room.players.some((player) => !player.isConnected);
  const seriesWinner = room.phase === 'finished' ? room.lastResult?.winner ?? null : null;

  return (
    <div className="game">
      {error && (
        <p className="notice notice--error" role="alert">
          {error}{' '}
          <button type="button" className="link" onClick={onDismissError}>
            cerrar
          </button>
        </p>
      )}

      <section className="panel game__header">
        <Scoreboard room={room} viewerId={playerId} colors={colors} />

        {room.phase === 'playing' && (
          <p className="game__turn" aria-live="polite">
            {rivalAway ? (
              <span className="muted">Esperando a que tu rival vuelva a conectarse…</span>
            ) : isMyTurn ? (
              <strong>Tu turno</strong>
            ) : (
              <span>Turno de {nameOf(room, room.currentTurn)}</span>
            )}{' '}
            <TurnTimer turnEndsAt={room.turnEndsAt} pausedTurnMs={room.pausedTurnMs} />
          </p>
        )}

        {room.phase !== 'playing' && room.lastResult && (
          <p className="game__result" role="status">
            {describeResult(room, room.lastResult, me?.slot)}
            {room.phase === 'finished' && seriesWinner !== null && room.lastResult.reason !== 'forfeit' && (
              <>
                {' '}
                <strong>
                  {seriesWinner === me?.slot ? 'Te llevas la serie' : `${nameOf(room, seriesWinner)} se lleva la serie`}{' '}
                  {room.score[seriesWinner]}–{room.score[seriesWinner === 1 ? 2 : 1]}
                </strong>
              </>
            )}
          </p>
        )}
      </section>

      <section className="panel game__board">
        <Board
          board={room.board}
          colors={colors}
          winningLine={room.lastResult?.winningLine ?? []}
          canPlay={isMyTurn && !isBusy && !rivalAway}
          onPlay={(col) => void onPlay(col)}
        />
      </section>

      <div className="lobby__actions">
        {room.phase === 'between_games' &&
          (isHost ? (
            <button type="button" className="button button--primary" onClick={() => void onNextGame()} disabled={isBusy}>
              Siguiente partida
            </button>
          ) : (
            <span className="muted">Esperando a que el host inicie la siguiente partida…</span>
          ))}
        {room.phase === 'finished' && isHost && (
          <button type="button" className="button button--primary" onClick={() => void onReset()} disabled={isBusy}>
            Volver al lobby
          </button>
        )}
        <button type="button" className="button" onClick={() => void onLeave()} disabled={isBusy}>
          {room.phase === 'finished' ? 'Salir de la sala' : 'Abandonar'}
        </button>
        {room.phase !== 'finished' && (
          <span className="muted">Serie a {winsNeeded(room.config.bestOf)} victorias</span>
        )}
      </div>
    </div>
  );
}
