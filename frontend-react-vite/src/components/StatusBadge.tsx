import type { GameStatus } from '../types/game';

const STATUS_LABELS: Record<GameStatus, string> = {
  waiting: 'Waiting',
  in_progress: 'In Progress',
  finished: 'Finished',
};

interface StatusBadgeProps {
  status: GameStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`badge badge--${status.replace('_', '-')}`}>{STATUS_LABELS[status]}</span>;
}
