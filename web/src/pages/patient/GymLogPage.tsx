import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { GymLog } from '@/components/GymLog';

/** Krachtlog with 1RM meter: in the gym, at home or in the practice. */
export function GymLogPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Krachtlog', 'Strength log'));
  return (
    <div className="space-y-5">
      <Link to="/p/kracht" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Kracht', 'Strength')}</Link>
      <div>
        <h1 className="t-page">{t('Krachtlog', 'Strength log')}</h1>
        <p className="mt-1 text-[15px] text-ink-600">{t('Log je sets in de sportschool, thuis of in de praktijk. Je ziet direct je geschatte 1RM en je records.', 'Log your sets in the gym, at home or in the practice. You immediately see your estimated 1RM and your records.')}</p>
      </div>
      <GymLog base="/patient" />
    </div>
  );
}
