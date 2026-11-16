import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { I18nProvider } from '@/lib/i18n';
import { ToastProvider } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { router } from './router';
import { installErrorReporting } from '@/lib/reportError';
import { applyTheme, readTheme } from '@/lib/theme';

installErrorReporting();
// Light or dark before the first paint (no inline script: the CSP allows only our own files).
// A visit that starts anywhere but the 3D village (for example at the login page) has started: going to
// the village later is a choice. Only a visit that starts in the village opens on Today (PatientLayout).
try {
  if (!/^\/p\/(dorp|wereld)(\/|$)/.test(window.location.pathname)) sessionStorage.setItem('fp.p.open', '1');
} catch {
  /* storage optional */
}
applyTheme(readTheme());
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme(readTheme()));
window.addEventListener('fp-theme', () => applyTheme(readTheme()));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

// The app always stays at its own size, like a native app: no pinch or double-tap zoom. iOS Safari
// ignores user-scalable=no in the viewport, so its pinch gesture is stopped here. People who need
// bigger text use the text-size setting in the app.
for (const g of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(g, (e) => e.preventDefault(), { passive: false });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </I18nProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);

// Offline support and push reminders (production builds only; dev uses the plain network).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* unsupported or blocked: the app works without it */
    });
  });
}

// An app left open on a phone keeps running the old version after a release. When it comes back to
// the foreground (at most once a minute), compare the page's entry script with the live one and
// reload if a newer release is out. Only on resume, so nobody loses what they are typing.
if (import.meta.env.PROD) {
  const current = (document.querySelector('script[type="module"][src*="/assets/"]') as HTMLScriptElement | null)?.getAttribute('src');
  let lastCheck = Date.now();
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !current || Date.now() - lastCheck < 60_000) return;
    lastCheck = Date.now();
    try {
      const html = await (await fetch('/', { cache: 'no-store' })).text();
      const live = html.match(/<script[^>]+type="module"[^>]+src="([^"]*\/assets\/[^"]+)"/)?.[1];
      if (live && live !== current) window.location.reload();
    } catch {
      /* offline: keep the running version */
    }
  });
}
