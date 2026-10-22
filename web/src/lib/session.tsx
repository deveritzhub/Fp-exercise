import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, getActivePractice, setActivePractice } from './api';
import type { SessionUser } from './types';

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
  return async () => {
    await api.post('/auth/logout');
    qc.clear();
    window.location.assign('/login');
  };
}

export function homePathFor(u: SessionUser | null) {
  if (!u) return '/login';
  if (u.memberships.length) return '/app';
  if (u.patient) return '/p';
  if (u.isPlatformAdmin) return '/admin';
  return '/login';
}
