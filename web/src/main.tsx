import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import { I18nProvider } from '@/lib/i18n';
import { ToastProvider } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

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
