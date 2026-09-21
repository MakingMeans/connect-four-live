import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useTheme } from './use-theme';

describe('useTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('defaults to light and marks the document', () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('toggles to dark, marks the document and persists the choice', () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggle());

    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('c4:theme')).toBe('dark');
  });

  it('restores the persisted theme on mount', () => {
    window.localStorage.setItem('c4:theme', 'dark');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('dark');
  });

  it('ignores garbage in storage', () => {
    window.localStorage.setItem('c4:theme', 'neon');

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe('light');
  });
});
