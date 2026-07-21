import type { Game } from '../types/game';
import { StatusBadge } from './StatusBadge';

interface GameCardProps {
  game: Game;
  currentUserId: number;
  onOpen: (gameId: string) => void;
}

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateValue));
}

function getSlotLabel(game: Game, slot: 'player1' | 'player2' | null) {
  if (!slot) {
    return 'Pending';
  }

  if (game.is_vs_ai && slot === 'player2') {
    return 'AI';
  }

  return slot === 'player1' ? 'Player 1' : 'Player 2';
}

function getOpponentLabel(game: Game, currentUserId: number) {
  if (game.is_vs_ai) {
    return 'AI opponent';
  }

  if (game.player1_id === currentUserId) {
    return game.player2_id ? `Player 2 joined (#${game.player2_id})` : 'Waiting for another player';
  }

  return `Player 1 is user #${game.player1_id}`;
}

function getOutcomeLabel(game: Game, currentUserId: number) {
  if (game.status !== 'finished') {
    return game.current_turn === null ? 'Waiting for the next update.' : `Current turn: ${getSlotLabel(game, game.current_turn)}`;
  }

  if (game.is_draw) {
    return 'Draw';
  }

  const winnerId = game.winner === 'player1' ? game.player1_id : game.player2_id;
  if (winnerId === currentUserId) {
    return 'You won';
  }

  if (game.is_vs_ai && game.winner === 'player2') {
    return 'AI won';
  }

  return `Winner: ${getSlotLabel(game, game.winner)}`;
}

export function GameCard({ game, currentUserId, onOpen }: GameCardProps) {
  return (
    <article className="panel panel--padded game-card">
      <div className="game-card__header">
        <div>
          <p className="eyebrow">Game</p>
          <h3 className="game-card__title">{game.id}</h3>
        </div>
        <StatusBadge status={game.status} />
      </div>

      <div className="game-card__details">
        <span>{game.is_vs_ai ? 'Mode: vs AI' : 'Mode: vs Player'}</span>
        <span>{getOpponentLabel(game, currentUserId)}</span>
        <span>{getOutcomeLabel(game, currentUserId)}</span>
        <span>Updated {formatDate(game.updated_at)}</span>
      </div>

      <div className="button-row">
        <button className="button button--primary" type="button" onClick={() => onOpen(game.id)}>
          {game.status === 'finished' ? 'View result' : 'Open game'}
        </button>
      </div>
    </article>
  );
}
