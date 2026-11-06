import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { useSession } from '@/lib/session';
import { complaintOf } from '@shared/complaints';
import { ComplaintExplanation } from '@/components/app/ComplaintExplanation';

/** The explanation of a complaint that the physiotherapist sent (from Messages). */
export function ComplaintExplanationPage() {
  const { t, locale } = useI18n();
  const [params] = useSearchParams();
  const { user } = useSession();
  const c = complaintOf(params.get('klacht') ?? '');
  useDocumentMeta(c ? (locale === 'nl' ? c.name[0] : c.name[1]) : t('Uitleg', 'Explanation'));
  return (
    <div className="space-y-6">
      <Link to="/p/berichten" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700 print:hidden"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Berichten', 'Messages')}</Link>
      {c ? <ComplaintExplanation complaint={c} practiceName={user?.patient?.practiceName} /> : <p className="text-ink-600">{t('Deze uitleg bestaat niet (meer).', 'This explanation does not exist (any more).')}</p>}
    </div>
  );
}
