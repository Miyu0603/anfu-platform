import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';
const THEME_KEY = 'anfu-theme';

/** index.html sets data-theme before first paint; this hook just reads and flips it. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (err) {
        console.warn('[anfu] could not save theme', err);
      }
      return next;
    });
  }, []);
  return [theme, toggle];
}
