import { useI18n } from '@/lib/i18n';
import { CHAINS, compensationOf, regionOf, type Compensation, type Complaint } from '@shared/complaints';

type Fn = readonly [string, string];

/**
 * A complaint explained in plain words: what it is, how the body works together here, why the
 * exercises help, pain while exercising and when to call. Used on paper (therapist) and in the app (patient).
 */
export function ComplaintExplanation({ complaint: c, practiceName }: { complaint: Complaint; practiceName?: string | null }) {
  const { t, locale } = useI18n();
  const L = (f: Fn) => (locale === 'nl' ? f[0] : f[1]);
  const region = regionOf(c.region)!;
  const comps = c.compensations.map(compensationOf).filter((x): x is Compensation => !!x);
  const chain = CHAINS.find((x) => x.key === c.chains[0]);
  return (
    <>
      <header className="border-b border-line pb-3">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-500">{practiceName ?? 'FP Flow'}</p>
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
    </>
  );
}
