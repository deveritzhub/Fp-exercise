import { useEffect, useSyncExternalStore } from 'react';
import { api, ApiError } from './api';

/**
 * Offline outbox for the patient app. Workout steps that cannot reach the server are kept on the
 * device (in order) and sent as soon as there is a connection again. The server endpoints are
 * idempotent, so sending something twice is harmless.
 *
 * Only small workout answers live here (no names). The outbox is tied to the signed-in user and
 * wiped on logout.
 */
type Entry = { id: string; userId: string; path: string; body: unknown; at: string };

const KEY = 'fp.outbox';
const listeners = new Set<() => void>();
let flushing = false;

function read(): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}
function write(items: Entry[]) {
  try {
    if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: nothing we can do */
  }
  snapshot = items.length;
  listeners.forEach((l) => l());
}
let snapshot = read().length;

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
  const onStorage = (e: StorageEvent) => e.key === KEY && ((snapshot = read().length), l());
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
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
    const timer = setInterval(() => read().length && run(), 30_000);
    return () => {
      window.removeEventListener('online', run);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
