import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { useSession } from '@/lib/session';
import { Button } from '@/components/ui';
import { complaintOf } from '@shared/complaints';
import { ComplaintExplanation } from '@/components/app/ComplaintExplanation';

type Fn = readonly [string, string];

/**
 * A one-page explanation of a complaint for the patient, in plain words: what it is, how the body
 * works together here, why the exercises help, and when to call the practice. Printable, no patient data.
 */
export function ComplaintHandoutPage() {
  const { t, locale } = useI18n();
  const L = (f: Fn) => (locale === 'nl' ? f[0] : f[1]);
  const [params] = useSearchParams();
  const { practice } = useSession();
  const c = complaintOf(params.get('klacht') ?? '');
  useDocumentMeta(c ? `${L(c.name)} — ${t('uitleg', 'explanation')}` : t('Uitleg', 'Explanation'));
  if (!c) return <p className="text-ink-600">{t('Deze klacht bestaat niet.', 'This complaint does not exist.')}</p>;
  return (
    <div className="mx-auto max-w-2xl space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={`/app/klachtwijzer?regio=${c.region}&klacht=${c.key}`} className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Klachtwijzer', 'Complaint guide')}</Link>
        <Button variant="secondary" onClick={() => window.print()} icon={<Printer className="h-4 w-4" />}>{t('Printen of PDF', 'Print or PDF')}</Button>
      </div>
      <ComplaintExplanation complaint={c} practiceName={practice?.practiceName} />
    </div>
  );
}
