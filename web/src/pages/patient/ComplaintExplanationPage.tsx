import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ArrowLeft, Printer } from 'lucide-react';
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
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link to="/p/berichten" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Berichten', 'Messages')}</Link>
        {c && <button type="button" onClick={() => window.print()} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[14.5px] font-medium text-accent hover:bg-accent-soft"><Printer className="h-4 w-4" aria-hidden />{t('Printen of PDF', 'Print or PDF')}</button>}
      </div>
      {c ? <ComplaintExplanation complaint={c} practiceName={user?.patient?.practiceName} /> : <p className="text-ink-600">{t('Deze uitleg bestaat niet (meer).', 'This explanation does not exist (any more).')}</p>}
      {c && <MyExercises complaint={c.key} />}
    </div>
  );
}

/** The patient's own rehabilitation exercises that fit this complaint, each with why it helps. */
function MyExercises({ complaint }: { complaint: string }) {
  const { t, locale } = useI18n();
  const q = useQuery({ queryKey: ['complaint-exercises', complaint, locale], queryFn: () => api.get<{ items: { id: string; name: string; why: string }[] }>(`/patient/complaint-exercises?klacht=${complaint}&lang=${locale}`) });
  if (!q.data?.items.length) return null;
  return (
    <section aria-labelledby="h-mine" className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <h2 id="h-mine" className="t-section">{t('Jouw oefeningen en waarom ze helpen', 'Your exercises and why they help')}</h2>
      <ul className="mt-2 space-y-3">
        {q.data.items.map((x) => (
          <li key={x.id}>
            <p className="font-semibold text-ink-900">{x.name}</p>
            <p className="text-[15px] text-ink-800">{x.why}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
