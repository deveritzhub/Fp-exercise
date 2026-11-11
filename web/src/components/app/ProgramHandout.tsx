import { Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useLabels } from '@/lib/meta';
import { dose, fmtDate } from '@/lib/format';
import { mediaUrl } from '@/lib/api';
import { Button } from '@/components/ui';
import type { ProgramItem } from '@/lib/types';

/** Only what the patient may see: never the internal description, criteria or evidence. */
export type HandoutProgram = {
  title: string;
  patientInstructions: string;
  startDate: string | null;
  endDate: string | null;
  redFlags?: string[];
  items: ProgramItem[];
};

/**
 * Programme on paper (or "save as PDF"): for patients who prefer a printed sheet on the fridge.
 * One page per few exercises, large readable type, no app chrome when printed.
 */
export function ProgramHandout({ program, patientName, therapistName, practiceName, backTo }: { program: HandoutProgram; patientName?: string; therapistName?: string | null; practiceName?: string; backTo: string }) {
  const { t, locale } = useI18n();
  const L = useLabels();
  const nl = locale === 'nl';
  const days = (d: number[]) => (d.length === 7 ? t('Elke dag', 'Every day') : d.map(L.weekday).join(', '));
  return (
    <article className="mx-auto max-w-3xl bg-white text-ink-900 print:max-w-none print:text-[11pt]" aria-labelledby="handout-title">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={backTo} className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700 hover:text-ink-950">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('Terug', 'Back')}
        </Link>
        <Button size="lg" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
          {t('Afdrukken of opslaan als PDF', 'Print or save as PDF')}
        </Button>
      </div>

      <div className="rounded-xl border border-line p-6 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div className="min-w-0">
            <h1 id="handout-title" className="t-page">{program.title}</h1>
            <p className="mt-1.5 text-[14.5px] text-ink-600">
              {[patientName && `${t('Voor', 'For')} ${patientName}`, therapistName && `${t('Van', 'From')} ${therapistName}`, practiceName].filter(Boolean).join(' · ')}
            </p>
            {(program.startDate || program.endDate) && (
              <p className="mt-0.5 text-[14px] text-ink-500">
                {program.startDate && fmtDate(program.startDate, locale)}
                {program.endDate && ` – ${fmtDate(program.endDate, locale)}`}
              </p>
            )}
          </div>
        </header>

        {program.patientInstructions && (
          <section className="mt-5 rounded-lg bg-sage px-4 py-3 print:border print:border-line print:bg-white">
            <h2 className="t-label">{t('Van je fysiotherapeut', 'From your physiotherapist')}</h2>
            <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{program.patientInstructions}</p>
          </section>
        )}

        <ol className="mt-6 space-y-5">
          {program.items.map((i, n) => {
            const e = i.exercise;
            const img = mediaUrl(e.thumbnailMediaId);
            const start = nl ? e.startingPositionNl : e.startingPositionEn;
            const move = nl ? e.movementNl : e.movementEn;
            const instr = nl ? e.instructionsNl : e.instructionsEn;
            const extra = [i.restS ? `${t('rust', 'rest')} ${i.restS} s` : null, i.tempo ? `${t('tempo', 'tempo')} ${i.tempo}` : null, i.load, i.frequency].filter(Boolean);
            return (
              <li key={i.id ?? `${e.id}-${n}`} className="flex gap-4 border-b border-line pb-5 last:border-0 [break-inside:avoid]">
                {img ? (
                  <img src={img} alt="" className="h-24 w-32 shrink-0 rounded-lg border border-line object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-[16px] font-bold text-accent print:border print:border-ink-300 print:bg-white" aria-hidden>{n + 1}</span>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="t-section text-[17px]">
                    <span className="sr-only">{n + 1}. </span>
                    {nl ? e.nameNl : e.nameEn}
                  </h3>
                  <p className="mt-1 text-[15px] font-semibold text-ink-900">
                    {dose(i, locale) || '—'}
                    {extra.length > 0 && <span className="font-normal text-ink-600"> · {extra.join(' · ')}</span>}
                  </p>
                  <p className="text-[14px] text-ink-600">{days(i.days)}</p>
                  <dl className="mt-2 space-y-1.5 text-[14.5px] leading-relaxed">
                    {start && <div><dt className="inline font-semibold">{t('Start', 'Start')}: </dt><dd className="inline">{start}</dd></div>}
                    {(move || instr) && <div><dt className="inline font-semibold">{t('Uitvoering', 'How to')}: </dt><dd className="inline">{move || instr}</dd></div>}
                    {i.notes && <div><dt className="inline font-semibold">{t('Let op', 'Note')}: </dt><dd className="inline">{i.notes}</dd></div>}
                  </dl>
                  {/* Paper tick boxes for the week (not stored; the app keeps the real log). */}
                  <div className="mt-3 hidden gap-1.5 print:flex" aria-hidden>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <span key={d} className={i.days.includes(d) ? 'flex h-7 w-9 items-end justify-center rounded border border-ink-500 pb-0.5 text-[8pt] text-ink-700' : 'flex h-7 w-9 items-end justify-center rounded border border-dashed border-ink-200 pb-0.5 text-[8pt] text-ink-300'}>{L.weekday(d)}</span>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {(program.redFlags ?? []).length > 0 && (
          <section className="mt-6 rounded-lg border border-bad/30 px-4 py-3 [break-inside:avoid]">
            <h2 className="text-[15px] font-bold text-bad">{t('Stop met oefenen en neem contact op bij:', 'Stop exercising and get in touch if you notice:')}</h2>
            <ul className="mt-1 list-disc pl-5 text-[14.5px]">
              {program.redFlags!.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <p className="mt-1.5 text-[13.5px] text-ink-600">{t('Bij spoed: bel 112.', 'In an emergency: call 112.')}</p>
          </section>
        )}

        <footer className="mt-6 text-[12px] text-ink-500">
          {t(`Afgedrukt op ${fmtDate(new Date().toISOString(), locale)}. De app bevat altijd de nieuwste versie van je programma.`, `Printed on ${fmtDate(new Date().toISOString(), locale)}. The app always has the latest version of your programme.`)}
        </footer>
      </div>
    </article>
  );
}
