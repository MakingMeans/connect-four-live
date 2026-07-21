import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';

import { GameBoard } from '../components/GameBoard';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { useGamePolling } from '../hooks/useGamePolling';
import { getErrorMessage } from '../services/api';
import { gameService } from '../services/gameService';
import type { Game, PlayerSlot } from '../types/game';

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateValue));
}

function getSlotLabel(game: Game, slot: PlayerSlot | null) {
  if (!slot) {
    return 'Completed';
  }

  if (game.is_vs_ai && slot === 'player2') {
    return 'AI';
  }

  return slot === 'player1' ? 'Player 1' : 'Player 2';
}

function getPlayerSlot(game: Game, userId: number | undefined): PlayerSlot | null {
  if (!userId) {
    return null;
  }

  if (game.player1_id === userId) {
    return 'player1';
  }

  if (game.player2_id === userId) {
    return 'player2';
  }

  return null;
}

function getResultMessage(game: Game, playerSlot: PlayerSlot | null) {
  if (game.status !== 'finished') {
    return null;
  }

  if (game.is_draw) {
    return 'The game ended in a draw.';
  }

  if (playerSlot && game.winner === playerSlot) {
    return 'You won this game.';
  }

  if (game.is_vs_ai && game.winner === 'player2') {
    return 'The AI won this game.';
  }

  return `Winner: ${getSlotLabel(game, game.winner)}.`;
}

function getTurnMessage(game: Game, playerSlot: PlayerSlot | null, isMyTurn: boolean) {
  if (game.status === 'waiting') {
    return 'Waiting for a second player to join this lobby.';
  }

  if (game.status === 'finished') {
    return getResultMessage(game, playerSlot) ?? 'This game is complete.';
  }

  if (isMyTurn) {
    return 'It is your turn. Pick the column where you want to drop a disc.';
  }

  if (game.is_vs_ai && game.current_turn === 'player2') {
    return 'The AI is taking its move. The board will refresh automatically.';
  }

  return 'Wait for the other player to move. The board refreshes automatically.';
}

export function GamePage() {
  const { id } = useParams();
  const gameId = id ?? '';
  const { user } = useAuth();
  const { error, game, isLoading, refreshGame, setGame } = useGamePolling(gameId, Boolean(user));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  if (!gameId) {
    return (
      <div className="page-stack">
        <section className="panel panel--padded">
          <h1 className="page-title">Missing game identifier</h1>
          <p className="page-subtitle">
            The route does not include a game id. Head back to the dashboard and open a valid game.
          </p>
          <Link className="link-inline" to="/dashboard">
            Return to dashboard
          </Link>
        </section>
      </div>
    );
  }

  if (isLoading && !game) {
    return (
      <div className="page-stack">
        <section className="panel panel--padded">
          <h1 className="page-title">Loading game</h1>
          <p className="page-subtitle">Fetching the latest state for match {id}.</p>
        </section>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="page-stack">
        <section className="panel panel--padded">
          <h1 className="page-title">Unable to open this game</h1>
          <p className="page-subtitle">{error ?? 'The requested game is not available.'}</p>
          <Link className="link-inline" to="/dashboard">
            Return to dashboard
          </Link>
        </section>
      </div>
    );
  }

  const playerSlot = getPlayerSlot(game, user?.user_id);
  const isMyTurn = Boolean(playerSlot && game.current_turn === playerSlot);
  const isBoardDisabled = !isMyTurn || game.status !== 'in_progress' || isSubmitting;

  async function handleMove(column: number) {
    setMoveError(null);
    setIsSubmitting(true);

    try {
      const updatedGame = await gameService.makeMove(gameId, column);
      setGame(updatedGame);
    } catch (requestError) {
      setMoveError(getErrorMessage(requestError, 'Unable to apply that move right now.'));
      refreshGame();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-hero">
        <div className="page-hero__copy">
          <span className="eyebrow">Game room</span>
          <h1 className="page-title">Play the current match live</h1>
          <p className="page-subtitle">{getTurnMessage(game, playerSlot, isMyTurn)}</p>
        </div>

        <div className="button-row">
          <Link className="button button--ghost" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </section>

      <div className="page-grid page-grid--game">
        <section className="panel panel--padded board-layout">
          <div className="panel__header">
            <div>
              <h2 className="panel__title">Board</h2>
              <p className="panel__subtitle">Click a column to drop a disc when it is your turn.</p>
            </div>

            <StatusBadge status={game.status} />
          </div>

          {moveError ? <div className="message message--error">{moveError}</div> : null}
          {error ? <div className="message message--error">{error}</div> : null}

          <GameBoard
            board={game.board_state}
            disabled={isBoardDisabled}
            isSubmitting={isSubmitting}
            onPlay={handleMove}
          />
        </section>

        <aside className="page-stack">
          <section className="panel panel--padded board-status">
            <div className="panel__header">
              <div>
                <h2 className="panel__title">Match details</h2>
                <p className="panel__subtitle">Use this panel to understand the current state of the game.</p>
              </div>
            </div>

            <div className="stat-list">
              <div className="stat-item">
                <span className="stat-item__label">Game ID</span>
                <span className="stat-item__value">{game.id}</span>
              </div>

              <div className="stat-item">
                <span className="stat-item__label">Mode</span>
                <span className="stat-item__value">{game.is_vs_ai ? 'Player vs AI' : 'Player vs Player'}</span>
              </div>

              <div className="stat-item">
                <span className="stat-item__label">You are</span>
                <span className="stat-item__value">{playerSlot ? getSlotLabel(game, playerSlot) : 'Spectator'}</span>
              </div>

              <div className="stat-item">
                <span className="stat-item__label">Current turn</span>
                <span className="stat-item__value">{getSlotLabel(game, game.current_turn)}</span>
              </div>

              <div className="stat-item">
                <span className="stat-item__label">Winner</span>
                <span className="stat-item__value">
                  {game.is_draw ? 'Draw' : game.winner ? getSlotLabel(game, game.winner) : 'Pending'}
                </span>
              </div>

              <div className="stat-item">
                <span className="stat-item__label">Created</span>
                <span className="stat-item__value">{formatDate(game.created_at)}</span>
              </div>

              <div className="stat-item">
                <span className="stat-item__label">Last update</span>
                <span className="stat-item__value">{formatDate(game.updated_at)}</span>
              </div>
            </div>
          </section>

          <section className="panel panel--padded notice-stack">
            <div>
              <h2 className="panel__title">Helpful notes</h2>
              <p className="panel__subtitle">
                The page refreshes the game state automatically while the match is active.
              </p>
            </div>

            {game.status === 'waiting' ? (
              <div className="message message--success">
                Share this game ID with another player so they can join: <strong>{game.id}</strong>
              </div>
            ) : null}

            {game.status === 'finished' ? (
              <div className="message message--success">{getResultMessage(game, playerSlot)}</div>
            ) : null}

            {!isMyTurn && game.status === 'in_progress' ? (
              <div className="message message--success">Moves are disabled until it becomes your turn.</div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
