import { isClinical } from '@shared/accountKind';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, getActivePractice, setActivePractice } from './api';
import type { SessionUser } from './types';
import { clearOutbox } from './outbox';

async function forgetDevice() {
  clearOutbox();
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) {
      await api.post('/reminders/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe();
    }
    reg?.active?.postMessage('clear-user-data');
    if ('caches' in window) await Promise.all([caches.delete('fp-data'), caches.delete('fp-media')]);
  } catch {
    /* best effort */
  }
}

export function useSession() {
  const q = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await api.get<{ user: SessionUser | null }>('/auth/me')).user,
    staleTime: 60_000,
    // Offline: one quick retry, then the offline screen (it reconnects by itself when online again).
    retry: (n, e) => (e instanceof ApiError && e.status === 0 ? n < 1 : n < 3),
  });
  const user = q.data ?? null;
  let practice = user?.memberships[0];
  const stored = getActivePractice();
  if (user && stored) practice = user.memberships.find((m) => m.practiceId === stored) ?? practice;
  if (practice && stored !== practice.practiceId) setActivePractice(practice.practiceId);
  // No connection while checking the login: not the same as being logged out.
  const offline = !q.data && q.error instanceof ApiError && q.error.status === 0;
  return { user, loading: q.isLoading, offline, retry: () => void q.refetch(), practice, isStaff: !!user?.memberships.length, isPatient: !!user?.patient };
}

export function useLogout() {
  const qc = useQueryClient();
  return useCallback(
    async (reason?: 'inactief') => {
      const to = reason ? `/login?reden=${reason}` : '/login';
      // Whatever hangs below, the person ends up on the login screen within 5 seconds.
      const fallback = setTimeout(() => window.location.assign(to), 5000);
      // A shared device must not keep this person's reminders, cached data or unsent workouts (this
      // needs the session still, to unsubscribe reminders). Then end the session on the server.
      // Never let a stuck service worker or request keep the person logged in: at most 2 s each.
      const within = (p: Promise<unknown>) => Promise.race([p.catch(() => undefined), new Promise((r) => setTimeout(r, 2000))]);
      await within(forgetDevice());
      await within(api.post('/auth/logout'));
      qc.clear();
      clearTimeout(fallback);
      window.location.assign(to);
    },
    [qc],
  );
}

export function homePathFor(u: SessionUser | null) {
  if (!u) return '/login';
  if (u.memberships.length) return '/app';
  if (u.patient) return '/p';
  if (u.isPlatformAdmin) return '/admin';
  return '/login';
}

/** Whether the active practice is a physiotherapy practice (clinical tools such as the complaint guide). */
export function useClinicalPractice() {
  const { practice } = useSession();
  return isClinical(practice?.kind);
}
