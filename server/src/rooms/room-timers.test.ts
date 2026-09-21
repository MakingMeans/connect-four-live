import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomTimers } from './room-timers.js';

describe('RoomTimers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires the callback once the delay elapses', () => {
    const timers = new RoomTimers();
    const onExpire = vi.fn();

    timers.set('ABC234', 'turn', 1_000, onExpire);
    vi.advanceTimersByTime(999);
    expect(onExpire).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('replaces a pending timer with the same key instead of firing both', () => {
    const timers = new RoomTimers();
    const first = vi.fn();
    const second = vi.fn();

    timers.set('ABC234', 'turn', 1_000, first);
    timers.set('ABC234', 'turn', 2_000, second);
    vi.advanceTimersByTime(2_000);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clears a single timer', () => {
    const timers = new RoomTimers();
    const onExpire = vi.fn();

    timers.set('ABC234', 'turn', 1_000, onExpire);
    timers.clear('ABC234', 'turn');
    vi.advanceTimersByTime(1_000);

    expect(onExpire).not.toHaveBeenCalled();
  });

  it('clears every timer of a room and leaves other rooms alone', () => {
    const timers = new RoomTimers();
    const turn = vi.fn();
    const grace = vi.fn();
    const other = vi.fn();

    timers.set('ABC234', 'turn', 1_000, turn);
    timers.set('ABC234', 'grace', 1_000, grace);
    timers.set('XYZ789', 'turn', 1_000, other);
    timers.clearRoom('ABC234');
    vi.advanceTimersByTime(1_000);

    expect(turn).not.toHaveBeenCalled();
    expect(grace).not.toHaveBeenCalled();
    expect(other).toHaveBeenCalledTimes(1);
  });

  it('never schedules a negative delay', () => {
    const timers = new RoomTimers();
    const onExpire = vi.fn();

    timers.set('ABC234', 'turn', -500, onExpire);
    vi.advanceTimersByTime(0);

    expect(onExpire).toHaveBeenCalledTimes(1);
  });
});
