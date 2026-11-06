import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useSession, homePathFor } from '@/lib/session';
import { Spinner } from '@/components/ui';
import { CloudOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export function RequireAuth({ kind, children }: { kind: 'staff' | 'patient' | 'admin'; children: ReactNode }) {
  const { user, loading, offline, retry } = useSession();
  const loc = useLocation();
  if (loading) return <Spinner className="min-h-screen" />;
  // Opened without internet: say so, instead of sending the person to the login page.
  if (!user && offline) return <OfflineScreen onRetry={retry} />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  const ok = kind === 'staff' ? user.memberships.length > 0 : kind === 'patient' ? !!user.patient : user.isPlatformAdmin;
  if (!ok) return <Navigate to={homePathFor(user)} replace />;
  if (kind !== 'patient' && user.mfaRequired) {
    return <Navigate to={`/tweestapsverificatie?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  return <>{children}</>;
}

/** Shown when the app opens without a connection: nothing is lost, it continues when back online. */
function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
      <CloudOff className="h-10 w-10 text-ink-500" aria-hidden />
      <h1 className="mt-3 text-2xl font-bold text-ink-950">{t('Geen verbinding', 'No connection')}</h1>
      <p className="mt-2 max-w-sm text-[15px] text-ink-700">{t('Je bent niet uitgelogd. Zodra je weer internet hebt, gaat de app vanzelf verder. Een training die je al hebt gedaan wordt dan verstuurd.', 'You are not logged out. As soon as you are back online the app continues by itself. A workout you already did is sent then.')}</p>
      <button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-[48px] items-center rounded-xl bg-accent px-5 font-semibold text-accent-ink">{t('Opnieuw proberen', 'Try again')}</button>
    </div>
  );
}
