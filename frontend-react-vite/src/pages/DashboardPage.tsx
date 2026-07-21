import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GameCard } from '../components/GameCard';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../services/api';
import { gameService } from '../services/gameService';
import type { Game, GameStatus } from '../types/game';

type DashboardFilter = 'all' | GameStatus;

const FILTER_OPTIONS: Array<{ value: DashboardFilter; label: string }> = [
  { value: 'all', label: 'All games' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'finished', label: 'Finished' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [games, setGames] = useState<Game[]>([]);
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [joinGameId, setJoinGameId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGames() {
      setIsLoading(true);

      try {
        const nextGames = await gameService.listGames(filter === 'all' ? undefined : filter);
        if (isMounted) {
          setGames(nextGames);
          setError(null);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(getErrorMessage(requestError, 'Unable to load your games.'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadGames();

    return () => {
      isMounted = false;
    };
  }, [filter]);

  async function handleCreateGame(vsAi: boolean) {
    setActionError(null);
    setIsCreating(true);

    try {
      const game = await gameService.createGame(vsAi);
      navigate(`/game/${game.id}`);
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, 'Unable to create a new game.'));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);

    const trimmedId = joinGameId.trim();
    if (!trimmedId) {
      setActionError('Enter a game ID before trying to join.');
      return;
    }

    setIsJoining(true);

    try {
      const game = await gameService.joinGame(trimmedId);
      navigate(`/game/${game.id}`);
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, 'Unable to join this game.'));
    } finally {
      setIsJoining(false);
    }
  }

  function handleOpenGame(gameId: string) {
    navigate(`/game/${gameId}`);
  }

  return (
    <div className="page-stack">
      <section className="page-hero">
        <div className="page-hero__copy">
          <span className="eyebrow">Dashboard</span>
          <h1 className="page-title">Manage your matches and jump back into play</h1>
          <p className="page-subtitle">
            Track every Connect Four session, start a fresh challenge against another player or the AI,
            and reopen any match from your personal dashboard.
          </p>
        </div>
      </section>

      <div className="page-grid page-grid--dashboard">
        <aside className="page-stack">
          <section className="panel panel--padded">
            <div className="panel__header">
              <div>
                <h2 className="panel__title">Quick actions</h2>
                <p className="panel__subtitle">Start or join a match in a couple of clicks.</p>
              </div>
            </div>

            <div className="button-row">
              <button
                className="button button--primary"
                disabled={isCreating}
                type="button"
                onClick={() => handleCreateGame(false)}
              >
                {isCreating ? 'Creating...' : 'Create vs Player'}
              </button>

              <button
                className="button button--secondary"
                disabled={isCreating}
                type="button"
                onClick={() => handleCreateGame(true)}
              >
                {isCreating ? 'Creating...' : 'Create vs AI'}
              </button>
            </div>

            <form className="form" onSubmit={handleJoinGame}>
              <label className="field">
                <span className="field__label">Join by game ID</span>
                <input
                  className="field__input"
                  onChange={(event) => setJoinGameId(event.target.value)}
                  placeholder="Paste a game ID"
                  value={joinGameId}
                />
                <span className="field__hint">
                  Use this when another player shares a waiting game with you.
                </span>
              </label>

              <button className="button button--ghost" disabled={isJoining} type="submit">
                {isJoining ? 'Joining...' : 'Join game'}
              </button>
            </form>

            {actionError ? <div className="message message--error">{actionError}</div> : null}
          </section>

          <section className="panel panel--padded">
            <div className="panel__header">
              <div>
                <h2 className="panel__title">Account snapshot</h2>
                <p className="panel__subtitle">Quick status from your authenticated session.</p>
              </div>
            </div>

            <div className="dashboard-meta">
              <div className="dashboard-meta__item">
                <div className="dashboard-meta__label">Player</div>
                <div className="dashboard-meta__value">{user?.user}</div>
              </div>

              <div className="dashboard-meta__item">
                <div className="dashboard-meta__label">Email</div>
                <div className="dashboard-meta__value">{user?.email}</div>
              </div>

              <div className="dashboard-meta__item">
                <div className="dashboard-meta__label">Account status</div>
                <div className="dashboard-meta__value">
                  {user?.is_verified ? 'Verified and ready to play' : 'Verification pending'}
                </div>
              </div>
            </div>
          </section>
        </aside>

        <section className="panel panel--padded">
          <div className="dashboard-toolbar">
            <div>
              <h2 className="panel__title">Your game list</h2>
              <p className="panel__subtitle">Filter active, waiting, or finished matches.</p>
            </div>

            <div className="dashboard-toolbar__group">
              <label className="field">
                <span className="field__label">Status filter</span>
                <select
                  className="field__select"
                  onChange={(event) => setFilter(event.target.value as DashboardFilter)}
                  value={filter}
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error ? <div className="message message--error">{error}</div> : null}

          {isLoading ? (
            <div className="empty-state">
              <strong>Loading games</strong>
              Fetching the latest state from the backend.
            </div>
          ) : games.length === 0 ? (
            <div className="empty-state">
              <strong>No matches found</strong>
              Create a new game or switch the filter to see more results.
            </div>
          ) : (
            <div className="game-list">
              {games.map((game) => (
                <GameCard
                  currentUserId={user?.user_id ?? 0}
                  game={game}
                  key={game.id}
                  onOpen={handleOpenGame}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
