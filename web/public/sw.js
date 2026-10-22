/* FP Exercise service worker: offline patient app + push reminders.
 *
 * Caching rules
 * - App shell (HTML): network first, last copy used offline.
 * - Built assets (/assets/*, fonts, icons): cache first; file names contain a content hash.
 * - Patient data (GET /api/patient/*, /api/auth/me, exercise images): network first, last copy
 *   used offline. Only on this device, and deleted on logout (message "clear-user-data").
 * - Everything else (therapist app, uploads, videos, POSTs): straight to the network.
 */
const VERSION = 'v1';
const SHELL = `fp-shell-${VERSION}`;
const STATIC = `fp-static-${VERSION}`;
const DATA = 'fp-data';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL, STATIC, DATA];
      for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

const isStatic = (url) =>
  url.pathname.startsWith('/assets/') || /\.(woff2?|png|svg|webmanifest)$/.test(url.pathname);
const isPatientData = (url) =>
  url.pathname.startsWith('/api/patient/') || url.pathname === '/api/auth/me' || url.pathname === '/api/reminders';

async function networkFirst(request, cacheName, cacheKey = request) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok && res.type === 'basic') await cache.put(cacheKey, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
    throw e;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === 'basic') await cache.put(request, res.clone());
  return res;
}

async function image(request) {
  const cache = await caches.open(DATA);
  try {
    const res = await fetch(request);
    if (res.status === 200 && (res.headers.get('content-type') || '').startsWith('image/')) await cache.put(request, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw e;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Every page is the same single-page app shell.
    event.respondWith(networkFirst(req, SHELL, '/'));
  } else if (isStatic(url)) {
    event.respondWith(cacheFirst(req));
  } else if (isPatientData(url)) {
    event.respondWith(networkFirst(req, DATA));
  } else if (url.pathname.startsWith('/api/media/') && !req.headers.has('range')) {
    event.respondWith(image(req));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'clear-user-data') event.waitUntil(caches.delete(DATA));
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* ignore malformed payloads */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'FP Exercise', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'fp-reminder',
      data: { url: data.url || '/p' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/p', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of all) {
        if (new URL(c.url).origin === self.location.origin) {
          await c.focus();
          return c.navigate(target);
        }
      }
      return self.clients.openWindow(target);
    })(),
  );
});
