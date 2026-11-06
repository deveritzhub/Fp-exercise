import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { useSession } from '@/lib/session';
import { Button } from '@/components/ui';
import { CHAINS, complaintOf, compensationOf, regionOf, type Compensation } from '@shared/complaints';

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
  const region = regionOf(c.region)!;
  const comps = c.compensations.map(compensationOf).filter((x): x is Compensation => !!x);
  const chain = CHAINS.find((x) => x.key === c.chains[0]);
  return (
    <div className="mx-auto max-w-2xl space-y-6 print:max-w-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={`/app/klachtwijzer?regio=${c.region}&klacht=${c.key}`} className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Klachtwijzer', 'Complaint guide')}</Link>
        <Button variant="secondary" onClick={() => window.print()} icon={<Printer className="h-4 w-4" />}>{t('Printen of PDF', 'Print or PDF')}</Button>
      </div>
      <header className="border-b border-line pb-3">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-500">{practice?.practiceName ?? 'FP Flow'}</p>
        <h1 className="t-page">{L(c.name)}</h1>
        <p className="mt-1 text-[16px] text-ink-800">{L(c.what)}</p>
      </header>
      {chain && (
        <section aria-labelledby="h-chain">
          <h2 id="h-chain" className="t-section">{t('Hoe je lichaam hier samenwerkt', 'How your body works together here')}</h2>
          <p className="mt-1 text-[15.5px] text-ink-800">{L(chain.what)}</p>
        </section>
      )}
      {comps.length > 0 && (
        <section aria-labelledby="h-why">
          <h2 id="h-why" className="t-section">{t('Waarom deze oefeningen', 'Why these exercises')}</h2>
          <ul className="mt-1 list-disc space-y-1.5 pl-5 text-[15.5px] text-ink-800">{comps.map((x) => <li key={x.key}>{L(x.patientWhy)}</li>)}</ul>
        </section>
      )}
      {c.avoid && (
        <section aria-labelledby="h-avoid">
          <h2 id="h-avoid" className="t-section">{t('Waar je even op let', 'What to watch for now')}</h2>
          <p className="mt-1 text-[15.5px] text-ink-800">{L(c.avoid.why)}</p>
        </section>
      )}
      <section aria-labelledby="h-pain">
        <h2 id="h-pain" className="t-section">{t('Pijn tijdens het oefenen', 'Pain while exercising')}</h2>
        <p className="mt-1 text-[15.5px] text-ink-800">{t('Een beetje pijn of ongemak mag, tot ongeveer 3 à 4 op een schaal van 10. Is het de volgende ochtend weer rustig, dan zit je goed. Wordt het steeds erger, doe dan minder en laat het je fysiotherapeut weten.', 'Some pain or discomfort is fine, up to about 3 or 4 on a scale of 10. If it has settled by the next morning, you are doing well. If it keeps getting worse, do less and let your physiotherapist know.')}</p>
      </section>
      <section aria-labelledby="h-flags" className="rounded-xl border border-bad/30 p-4">
        <h2 id="h-flags" className="t-section">{t('Neem direct contact op met je fysiotherapeut of huisarts bij', 'Contact your physiotherapist or GP straight away with')}</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-ink-800">{region.redFlags.map((f, i) => <li key={i}>{L(f)}</li>)}</ul>
      </section>
      <footer className="border-t border-line pt-3 text-[12.5px] text-ink-500">{t('Algemene uitleg; je fysiotherapeut past je programma aan op jou.', 'General explanation; your physiotherapist tailors your programme to you.')}</footer>
    </div>
  );
}
