import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pausable countdown in whole seconds, based on the clock (stays correct when the phone is slow
 * or the tab was in the background). Ending only calls `onEnd`; it never marks anything as done.
 */
export function useCountdown(onEnd?: () => void) {
  const [left, setLeft] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);
  const remaining = useRef(0);
  const endCb = useRef(onEnd);
  endCb.current = onEnd;

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const s = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        setRunning(false);
        endCb.current?.();
      }
    };
    tick();
    const h = setInterval(tick, 250);
    return () => clearInterval(h);
  }, [running]);

  const start = useCallback((seconds: number) => {
    endAt.current = Date.now() + seconds * 1000;
    setTotal(seconds);
    setLeft(seconds);
    setRunning(true);
  }, []);
  const pause = useCallback(() => {
    remaining.current = Math.max(0, endAt.current - Date.now());
    setRunning(false);
  }, []);
  const resume = useCallback(() => {
    endAt.current = Date.now() + remaining.current;
    setRunning(true);
  }, []);
  const add = useCallback((seconds: number) => {
    endAt.current += seconds * 1000;
    remaining.current += seconds * 1000;
    setTotal((x) => x + seconds);
    setLeft((x) => (x ?? 0) + seconds);
  }, []);
  const stop = useCallback(() => {
    setRunning(false);
    setLeft(null);
  }, []);
  return { left, total, running, paused: left !== null && left > 0 && !running, start, pause, resume, add, stop };
}
