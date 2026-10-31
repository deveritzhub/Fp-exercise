import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getActivePractice, setActivePractice } from './api';
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
  });
  const user = q.data ?? null;
  let practice = user?.memberships[0];
  const stored = getActivePractice();
  if (user && stored) practice = user.memberships.find((m) => m.practiceId === stored) ?? practice;
  if (practice && stored !== practice.practiceId) setActivePractice(practice.practiceId);
  return { user, loading: q.isLoading, practice, isStaff: !!user?.memberships.length, isPatient: !!user?.patient };
}

export function useLogout() {
  const qc = useQueryClient();
  return useCallback(
    async (reason?: 'inactief') => {
      // A shared device must not keep this person's reminders, cached data or unsent workouts.
      // Never let a stuck service worker keep the person logged in: give it at most 2 seconds.
      await Promise.race([forgetDevice(), new Promise((r) => setTimeout(r, 2000))]);
      await api.post('/auth/logout').catch(() => undefined);
      qc.clear();
      window.location.assign(reason ? `/login?reden=${reason}` : '/login');
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
