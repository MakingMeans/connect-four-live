export type GameStatus = 'waiting' | 'in_progress' | 'finished';
export type PlayerSlot = 'player1' | 'player2';

export interface Game {
  id: string;
  player1_id: number;
  player2_id: number | null;
  is_vs_ai: boolean;
  board_state: number[][];
  current_turn: PlayerSlot | null;
  status: GameStatus;
  winner: PlayerSlot | null;
  is_draw: boolean;
  created_at: string;
  updated_at: string;
}
