import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSession, homePathFor } from '@/lib/session';
import { Spinner } from '@/components/ui';

export function RequireAuth({ kind, children }: { kind: 'staff' | 'patient' | 'admin'; children: ReactNode }) {
  const { user, loading } = useSession();
  const loc = useLocation();
  if (loading) return <Spinner className="min-h-screen" />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  const ok = kind === 'staff' ? user.memberships.length > 0 : kind === 'patient' ? !!user.patient : user.isPlatformAdmin;
  if (!ok) return <Navigate to={homePathFor(user)} replace />;
  return <>{children}</>;
}
