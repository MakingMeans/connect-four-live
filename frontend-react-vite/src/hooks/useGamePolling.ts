import { useEffect, useState } from 'react';

import { getErrorMessage } from '../services/api';
import { gameService } from '../services/gameService';
import type { Game } from '../types/game';

export function useGamePolling(gameId: string, enabled: boolean) {
  const [game, setGame] = useState<Game | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let isActive = true;

    async function loadGame(showLoader: boolean) {
      if (showLoader) {
        setIsLoading(true);
      }

      try {
          const nextGame = await gameService.getGame(gameId);
        if (isActive) {
          setGame(nextGame);
          setError(null);
        }
      } catch (requestError) {
        if (isActive) {
          setError(getErrorMessage(requestError, 'Unable to load the game right now.'));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadGame(true);

    const intervalId = window.setInterval(() => {
      void loadGame(false);
    }, 2500);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [enabled, gameId, reloadCount]);

  function refreshGame() {
    setReloadCount((current) => current + 1);
  }

  return {
    game,
    setGame,
    isLoading,
    error,
    refreshGame,
  };
}
