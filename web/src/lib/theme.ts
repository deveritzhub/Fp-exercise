import { useCallback, useEffect, useState } from 'react';

/**
 * Light or dark mode: "Licht", "Donker" or "Zoals mijn telefoon" (the system setting). A display
 * preference per device, not health data, so it lives in localStorage. The colours themselves are
 * CSS variables in index.css; this only toggles the `dark` class on <html>.
 */
export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'fp.theme';
const CHOICES: ThemeChoice[] = ['light', 'dark', 'system'];
const META = { light: '#29483c', dark: '#121a16' };

export function readTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY) as ThemeChoice | null;
    return v && CHOICES.includes(v) ? v : 'light';
  } catch {
    return 'light';
  }
}

const systemDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
export const resolveTheme = (c: ThemeChoice): 'light' | 'dark' => (c === 'system' ? (systemDark() ? 'dark' : 'light') : c);

export function applyTheme(c: ThemeChoice) {
  const mode = resolveTheme(c);
  document.documentElement.classList.toggle('dark', mode === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[mode]);
}

/** Current choice, the mode it resolves to now, and a setter. Follows the system while on "system". */
export function useTheme(): { choice: ThemeChoice; mode: 'light' | 'dark'; setChoice: (c: ThemeChoice) => void } {
  const [choice, setChoiceState] = useState<ThemeChoice>(readTheme);
  const [mode, setMode] = useState(() => resolveTheme(readTheme()));
  useEffect(() => {
    const sync = () => {
      const c = readTheme();
      setChoiceState(c);
      setMode(resolveTheme(c));
      applyTheme(c);
    };
    sync();
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    mq?.addEventListener?.('change', sync);
    window.addEventListener('fp-theme', sync);
    return () => {
      mq?.removeEventListener?.('change', sync);
      window.removeEventListener('fp-theme', sync);
    };
  }, []);
  const setChoice = useCallback((c: ThemeChoice) => {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      /* private mode: applies for this visit only */
    }
    window.dispatchEvent(new Event('fp-theme'));
  }, []);
  return { choice, mode, setChoice };
}
