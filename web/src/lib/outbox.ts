import { useEffect, useSyncExternalStore } from 'react';
import { api, ApiError } from './api';

/**
 * Offline outbox for the patient app. Workout steps that cannot reach the server are kept (in order)
 * and sent as soon as there is a connection again. The server endpoints are idempotent, so sending
 * something twice is harmless.
 *
 * Health data is never written to the device: the outbox lives in memory only. Closing the app before
 * the connection returns loses the unsent workout; the app warns about that while items are pending.
 */
type Entry = { id: string; userId: string; path: string; body: unknown; at: string };

const listeners = new Set<() => void>();
let flushing = false;
let items: Entry[] = [];

// Earlier versions kept the outbox in localStorage: remove anything left behind.
try {
  localStorage.removeItem('fp.outbox');
} catch {
  /* storage unavailable */
}

const read = () => items;
function write(next: Entry[]) {
  items = next;
  snapshot = next.length;
  listeners.forEach((l) => l());
}
let snapshot = 0;

export const isNetworkError = (e: unknown) => e instanceof ApiError && e.status === 0;

/**
 * POSTs now, or queues when offline. Anything already queued goes first so the order
 * (start → exercises → finish) is always kept.
 */
export async function postOrQueue(userId: string, path: string, body: unknown): Promise<'sent' | 'queued'> {
  const queued = read().filter((e) => e.userId === userId);
  if (!queued.length && navigator.onLine !== false) {
    try {
      await api.post(path, body);
      return 'sent';
    } catch (e) {
      if (!isNetworkError(e)) throw e;
    }
  }
  write([...read(), { id: crypto.randomUUID(), userId, path, body, at: new Date().toISOString() }]);
  if (navigator.onLine !== false) void flushOutbox(userId);
  return 'queued';
}

/** Sends queued entries in order; stops at the first network error. Returns how many were sent. */
export async function flushOutbox(userId: string): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (;;) {
      const next = read().find((e) => e.userId === userId);
      if (!next) break;
      try {
        await api.post(next.path, next.body);
        sent++;
      } catch (e) {
        if (isNetworkError(e)) break;
        // Signed out: keep everything until the same person signs in again.
        if (e instanceof ApiError && e.status === 401) break;
        // Rejected for good (e.g. programme was stopped): drop it, keep the rest flowing.
        console.warn('outbox: dropped', next.path, e instanceof ApiError ? e.code : e);
      }
      write(read().filter((x) => x.id !== next.id));
    }
  } finally {
    flushing = false;
  }
  return sent;
}

export function clearOutbox() {
  write([]);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Number of workout steps waiting to be sent. */
export const usePendingCount = () => useSyncExternalStore(subscribe, () => snapshot);

const onlineSubscribe = (l: () => void) => {
  window.addEventListener('online', l);
  window.addEventListener('offline', l);
  return () => {
    window.removeEventListener('online', l);
    window.removeEventListener('offline', l);
  };
};
export const useOnline = () => useSyncExternalStore(onlineSubscribe, () => navigator.onLine);

/** Keeps trying to send the outbox: on start, when the connection returns, and every 30 s. */
export function useOutboxSync(userId: string | undefined, onSent?: () => void) {
  useEffect(() => {
    if (!userId) return;
    const run = () => flushOutbox(userId).then((n) => n > 0 && onSent?.());
    run();
    window.addEventListener('online', run);
    // Unsent workouts only live in memory: ask before the page is closed or reloaded.
    const warn = (e: BeforeUnloadEvent) => {
      if (read().some((x) => x.userId === userId)) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    const timer = setInterval(() => read().length && run(), 30_000);
    return () => {
      window.removeEventListener('online', run);
      window.removeEventListener('beforeunload', warn);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
