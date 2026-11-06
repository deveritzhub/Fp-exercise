import { useCallback, useEffect, useState } from 'react';

/**
 * Text size in the patient app (Normaal / Groot / Extra groot), for patients who find the default
 * small. A display preference per device, not health data, so it lives in localStorage.
 */
export type TextSize = 'normal' | 'large' | 'xlarge';
const KEY = 'fp.textSize';
const SIZES: TextSize[] = ['normal', 'large', 'xlarge'];

function read(): TextSize {
  try {
    const v = localStorage.getItem(KEY) as TextSize | null;
    return v && SIZES.includes(v) ? v : 'normal';
  } catch {
    return 'normal';
  }
}

function apply(v: TextSize) {
  if (v === 'normal') delete document.documentElement.dataset.textSize;
  else document.documentElement.dataset.textSize = v;
}

/** Applies the stored size while the patient app is open; returns the size and a setter. */
export function useTextSize() {
  const [size, setSize] = useState<TextSize>(read);
  useEffect(() => {
    apply(size);
    return () => apply('normal');
  }, [size]);
  const set = useCallback((v: TextSize) => {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* private mode: applies for this visit only */
    }
    setSize(v);
    window.dispatchEvent(new Event('fp-text-size'));
  }, []);
  // Keep the layout and the settings card in sync.
  useEffect(() => {
    const on = () => setSize(read());
    window.addEventListener('fp-text-size', on);
    return () => window.removeEventListener('fp-text-size', on);
  }, []);
  return [size, set] as const;
}
