import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

/**
 * Logout after inactivity for staff (shared practice computers). The server ends the session after
 * `minutes` without activity; this hook warns a minute before, keeps the session alive while the
 * person is working (also when they only type and nothing is saved), and logs out in time.
 * The last activity is shared between tabs, so working in one tab keeps the others logged in.
 */
const KEY = 'fp.lastActivity';
const WARN_S = 60;
const PING_MS = 4 * 60_000;

const shared = () => {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
};

export function useIdleLogout(minutes: number | null, onTimeout: () => void) {
  const last = useRef(Date.now());
  const lastPing = useRef(Date.now());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const secondsLeftRef = useRef<number | null>(null);
  secondsLeftRef.current = secondsLeft;

  const touch = useCallback(() => {
    const now = Date.now();
    if (now - last.current < 5000) return;
    last.current = now;
    try {
      localStorage.setItem(KEY, String(now));
    } catch {
      /* storage unavailable: this tab only */
    }
    // Typing without saving does not reach the server: tell it the person is still here.
    if (now - lastPing.current > PING_MS) {
      lastPing.current = now;
      api.get('/auth/me').catch(() => undefined);
    }
  }, []);

  const stay = useCallback(() => {
    last.current = 0;
    lastPing.current = 0;
    touch();
    setSecondsLeft(null);
  }, [touch]);

  useEffect(() => {
    if (!minutes) return;
    touch();
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
    // While the warning is open only an explicit choice counts, so a stray scroll does not hide it.
    const on = () => secondsLeftRef.current === null && touch();
    for (const e of events) window.addEventListener(e, on, { passive: true, capture: true });
    const tick = setInterval(() => {
      const idle = (Date.now() - Math.max(last.current, shared())) / 1000;
      const left = Math.ceil(minutes * 60 - idle);
      if (left <= 0) {
        clearInterval(tick);
        onTimeout();
      } else setSecondsLeft(left <= WARN_S ? left : null);
    }, 1000);
    return () => {
      for (const e of events) window.removeEventListener(e, on, { capture: true });
      clearInterval(tick);
    };
  }, [minutes, onTimeout, touch]);

  return { secondsLeft, stay };
}
