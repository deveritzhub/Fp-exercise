import { useCallback } from 'react';
import { Clock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useIdleLogout } from '@/lib/idle';
import { useLogout, useSession } from '@/lib/session';
import { Button, Dialog } from '@/components/ui';

/** Warns a minute before a staff login ends for inactivity, then logs out (see lib/idle.ts). */
export function IdleGuard() {
  const { t } = useI18n();
  const { user } = useSession();
  const logout = useLogout();
  const onTimeout = useCallback(() => void logout('inactief'), [logout]);
  const { secondsLeft, stay } = useIdleLogout(user?.idleMinutes ?? null, onTimeout);
  return (
    <Dialog
      open={secondsLeft !== null}
      onClose={stay}
      size="sm"
      title={t('Ben je er nog?', 'Are you still there?')}
      description={t('Je bent een tijd niet actief geweest.', 'You have been inactive for a while.')}
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => logout()}>{t('Uitloggen', 'Log out')}</Button>
          <Button data-autofocus onClick={stay}>{t('Ingelogd blijven', 'Stay logged in')}</Button>
        </div>
      }
    >
      <p className="flex items-center gap-2 text-[15px] text-ink-800" role="timer" aria-live="polite">
        <Clock className="h-5 w-5 shrink-0 text-warn" aria-hidden />
        {t(`Je wordt over ${secondsLeft ?? 0} seconden uitgelogd om de gegevens van patiënten te beschermen.`, `You will be logged out in ${secondsLeft ?? 0} seconds to protect patient data.`)}
      </p>
    </Dialog>
  );
}
