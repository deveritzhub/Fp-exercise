import { ApiError } from '@/lib/api';

/**
 * Tell the server that a screen crashed (one short line in its log), so problems testers run into
 * are not invisible. Sends only the error text and the path; never user data or form input.
 * At most a few per page load, and each message once.
 */
const sent = new Set<string>();
const MAX = 5;

export function reportError(err: unknown, kind: 'render' | 'window' | 'promise') {
  try {
    // Server errors are already logged by the server; network drops are not crashes.
    if (err instanceof ApiError) return;
    const e = err instanceof Error ? err : new Error(String(err));
    if (/Failed to fetch|NetworkError|Load failed|dynamically imported module|Importing a module script failed/i.test(e.message)) return;
    const message = `${e.name}: ${e.message}`.slice(0, 400);
    if (sent.has(message) || sent.size >= MAX) return;
    sent.add(message);
    const release = (document.querySelector('script[type="module"][src*="/assets/"]') as HTMLScriptElement | null)?.getAttribute('src')?.split('/').pop() ?? undefined;
    void fetch('/api/public/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, message, path: window.location.pathname, release }),
      keepalive: true,
      credentials: 'omit',
    }).catch(() => undefined);
  } catch {
    /* reporting must never break the app */
  }
}

export function installErrorReporting() {
  window.addEventListener('error', (ev) => reportError(ev.error ?? ev.message, 'window'));
  window.addEventListener('unhandledrejection', (ev) => reportError(ev.reason, 'promise'));
}
