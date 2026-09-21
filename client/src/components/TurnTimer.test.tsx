import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TurnTimer } from './TurnTimer';

const NOW = 1_700_000_000_000;

describe('TurnTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the whole seconds left until the deadline', () => {
    render(<TurnTimer turnEndsAt={NOW + 12_400} pausedTurnMs={null} />);

    expect(screen.getByText('13 s')).toBeInTheDocument();
  });

  it('counts down as time passes', () => {
    render(<TurnTimer turnEndsAt={NOW + 5_000} pausedTurnMs={null} />);

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(screen.getByText('3 s')).toBeInTheDocument();
  });

  it('never goes below zero', () => {
    render(<TurnTimer turnEndsAt={NOW + 1_000} pausedTurnMs={null} />);

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.getByText('0 s')).toBeInTheDocument();
  });

  it('shows the frozen time while paused', () => {
    render(<TurnTimer turnEndsAt={null} pausedTurnMs={7_000} />);

    expect(screen.getByText('7 s')).toBeInTheDocument();
    expect(screen.getByText(/pausado/i)).toBeInTheDocument();
  });
});
