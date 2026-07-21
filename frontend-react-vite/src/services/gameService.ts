import type { Game, GameStatus } from '../types/game';
import { apiClient } from './api';

export const gameService = {
  listGames(status?: GameStatus) {
    const query = status ? `?status=${status}` : '';
    return apiClient.get<Game[]>(`/games${query}`);
  },

  createGame(vsAi: boolean) {
    return apiClient.post<Game>('/games', { vs_ai: vsAi });
  },

  joinGame(gameId: string) {
    return apiClient.post<Game>(`/games/${gameId}/join`);
  },

  getGame(gameId: string) {
    return apiClient.get<Game>(`/games/${gameId}`);
  },

  makeMove(gameId: string, column: number) {
    return apiClient.post<Game>(`/games/${gameId}/move`, { column });
  },
};
