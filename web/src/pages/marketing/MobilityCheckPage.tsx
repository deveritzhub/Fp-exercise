import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ruler, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { MOBILITY_TESTS, roundCm, type MobilityTest } from '@shared/mobilityTests';

type Fn = readonly [string, string];

/**
 * Public mobility check: the four published tape-measure tests, with an instant result. Nothing is
 * sent or stored (no request, no browser storage): the numbers stay on the screen. The result only
 * compares left with right, never with norms (norms differ by age, sex and sport).
 */
export function MobilityCheckPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Mobiliteitstest', 'Mobility check'), t('Meet in tien minuten hoe soepel je enkels, rug, schouders en hamstrings zijn, met een meetlint. Gratis en zonder account.', 'Measure in ten minutes how mobile your ankles, back, shoulders and hamstrings are, with a tape measure. Free and without an account.'));
  return (
    <>
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:py-16">
          <div className="text-[13px] font-semibold uppercase tracking-wider text-accent">{t('Gratis mobiliteitstest', 'Free mobility check')}</div>
          <h1 className="mt-3 text-[34px] font-bold leading-[1.12] tracking-[-0.015em] sm:text-[44px]">{t('Hoe soepel ben jij?', 'How mobile are you?')}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-600">{t('Vier bekende tests met een meetlint, in ongeveer tien minuten. Je ziet direct of er verschil is tussen links en rechts.', 'Four well-known tests with a tape measure, in about ten minutes. You see straight away whether there is a difference between left and right.')}</p>
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-white p-3 text-[14px] text-ink-700"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />{t('Je getallen blijven op dit scherm: er wordt niets verstuurd of bewaard.', 'Your numbers stay on this screen: nothing is sent or stored.')}</p>
        </div>
      </section>
      <div className="mx-auto max-w-4xl space-y-6 px-5 py-12">
        {MOBILITY_TESTS.map((x, i) => <TestCard key={x.key} test={x} no={i + 1} />)}
        <section className="rounded-2xl bg-ink-950 p-6 text-white" aria-labelledby="mc-next">
          <h2 id="mc-next" className="text-[22px] font-bold">{t('Wil je hier gericht mee aan de slag?', 'Want to work on this?')}</h2>
          <p className="mt-2 text-[15.5px] text-white/80">{t('Een fysiotherapeut kijkt wat erachter zit en geeft je een programma in de FP Flow-app. Daarin meet je ook zelf je mobiliteit en zie je je vooruitgang.', 'A physiotherapist looks at what is behind it and gives you a programme in the FP Flow app. There you also measure your mobility yourself and see your progress.')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/contact?onderwerp=vraag" className="inline-flex min-h-[48px] items-center rounded-xl bg-white px-5 font-semibold text-ink-950">{t('Neem contact op', 'Get in touch')}</Link>
            <Link to="/hoe-het-werkt" className="inline-flex min-h-[48px] items-center rounded-xl border border-white/30 px-5 font-semibold text-white">{t('Zo werkt de app', 'How the app works')}</Link>
          </div>
        </section>
        <p className="text-[13px] text-ink-600">{t('Doe een test niet bij pijn, een recente blessure of operatie zonder overleg met je fysiotherapeut of huisarts. Dit is geen diagnose.', 'Do not do a test with pain, a recent injury or surgery without talking to your physiotherapist or GP. This is not a diagnosis.')}</p>
      </div>
    </>
  );
}

function TestCard({ test, no }: { test: MobilityTest; no: number }) {
  const { t, locale } = useI18n();
  const L = (f: Fn) => (locale === 'nl' ? f[0] : f[1]);
  const sides = test.sides ? (['left', 'right'] as const) : (['none'] as const);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [neg, setNeg] = useState<Record<string, boolean>>({});
  const value = (s: string) => {
    const raw = vals[s];
    if (raw === undefined || raw.trim() === '') return null;
    const n = Number(raw.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return null;
    return roundCm(test.sign && neg[s] ? -n : n);
  };
  const l = value('left');
  const r = value('right');
  const diff = l !== null && r !== null ? roundCm(Math.abs(l - r)) : null;
  // A side difference counts when it is beyond measurement error (or 2 cm where none is published).
  const limit = test.realChange ?? 2;
  const weaker = diff !== null && diff > limit ? ((test.better === 'higher' ? l! < r! : l! > r!) ? t('links', 'left') : t('rechts', 'right')) : null;
  const single = value('none');
  const sideLabel = { left: t('Links', 'Left'), right: t('Rechts', 'Right'), none: t('Afstand', 'Distance') };
  return (
    <section aria-labelledby={`mc-${test.key}`} className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 id={`mc-${test.key}`} className="flex items-center gap-2 text-[19px] font-bold text-ink-950"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[14px] text-accent">{no}</span>{L(test.name)}</h2>
      <p className="mt-1 text-[15px] text-ink-700">{L(test.measures)}</p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-[15px] text-ink-800">{test.steps.map((s, i) => <li key={i}>{L(s)}</li>)}</ol>
      {test.sideNote && <p className="mt-2 text-[13.5px] text-ink-600">{L(test.sideNote)}</p>}
      <div className="mt-4 flex flex-wrap gap-4">
        {sides.map((s) => (
          <div key={s} className="min-w-[150px]">
            <label htmlFor={`mc-${test.key}-${s}`} className="block text-[14px] font-medium text-ink-800">{sideLabel[s]} (cm)</label>
            {test.sign && (
              <div className="mt-1 flex gap-1" role="group" aria-label={t(`${sideLabel[s]}: richting`, `${sideLabel[s]}: direction`)}>
                {([false, true] as const).map((m) => (
                  <button key={String(m)} type="button" aria-pressed={!!neg[s] === m} onClick={() => setNeg({ ...neg, [s]: m })}
                    className={cn('min-h-[40px] rounded-lg border px-2.5 text-[13px]', !!neg[s] === m ? 'border-accent bg-accent-soft font-semibold text-accent' : 'border-line text-ink-700')}>
                    {m ? L(test.sign!.minus) : L(test.sign!.plus)}
                  </button>
                ))}
              </div>
            )}
            <input id={`mc-${test.key}-${s}`} inputMode="decimal" autoComplete="off" value={vals[s] ?? ''} onChange={(e) => setVals({ ...vals, [s]: e.target.value })}
              className="mt-1 h-12 w-full rounded-xl border border-line px-3 text-[16px] focus:border-accent focus:outline-none" />
          </div>
        ))}
      </div>
      <div aria-live="polite" className="mt-3">
        {test.sides && diff !== null && (
          <p className={cn('flex items-start gap-2 rounded-xl p-3 text-[15px]', weaker ? 'bg-warn-soft/70 text-ink-900' : 'bg-accent-soft text-ink-900')}>
            <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            {weaker
              ? t(`${diff} cm verschil tussen links en rechts: ${weaker} is stijver. Dat is meer dan de meetfout en de moeite waard om naar te laten kijken, zeker als je er klachten bij hebt.`, `${diff} cm difference between left and right: ${weaker} is stiffer. That is more than measurement error and worth having looked at, especially if you have complaints.`)
              : t(`${diff} cm verschil tussen links en rechts: dat valt binnen de meetfout. Mooi in balans.`, `${diff} cm difference between left and right: within measurement error. Nicely balanced.`)}
          </p>
        )}
        {!test.sides && single !== null && <p className="rounded-xl bg-accent-soft p-3 text-[15px] text-ink-900">{L(test.howToRead)} {t('Meet over een paar weken opnieuw om te zien of het verandert.', 'Measure again in a few weeks to see whether it changes.')}</p>}
      </div>
      <p className="mt-3 text-[13px] text-ink-600">{t('Let op', 'Note')}: {L(test.caution)} · {t('Bron', 'Source')}: {test.source}</p>
    </section>
  );
}
