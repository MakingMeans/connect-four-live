import { useCallback, useEffect, useState } from 'react';

import { loadTheme, saveTheme, type Theme } from '@/lib/storage';

export interface UseTheme {
  theme: Theme;
  toggle: () => void;
}

/**
 * Tema claro/oscuro elegido a mano. Por defecto claro; no sigue al sistema a
 * propósito. El valor se refleja en `<html data-theme>` para que el CSS lo lea.
 */
export function useTheme(): UseTheme {
  const [theme, setTheme] = useState<Theme>(loadTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme((current) => (current === 'light' ? 'dark' : 'light')), []);

  return { theme, toggle };
}
