import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { useSession } from '@/lib/session';
import { fmtDate, pct } from '@/lib/format';
import { Button, ErrorState, Spinner } from '@/components/ui';
import type { PatientDetail, Progress } from '@/lib/types';

const PERIODS = [4, 8, 12, 26];

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
};

/**
 * Progress report for one patient, to print or save as PDF (for the record, a referrer or the
 * patient). Reads the same figures as the record; patient comments are left out unless chosen.
 */
export function ProgressReportPage() {
  const { id = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const weeks = PERIODS.includes(Number(sp.get('weken'))) ? Number(sp.get('weken')) : 8;
  const [withFeedback, setWithFeedback] = useState(false);
  const { t, locale } = useI18n();
  const { practice } = useSession();
  const p = useQuery({ queryKey: ['patient', id], queryFn: () => api.get<PatientDetail>(`/patients/${id}`) });
  const prog = useQuery({ queryKey: ['patient', id, 'progress', weeks], queryFn: () => api.get<Progress>(`/patients/${id}/progress?weeks=${weeks}`) });
  useDocumentMeta(p.data ? `${t('Voortgangsrapport', 'Progress report')} — ${p.data.firstName} ${p.data.lastName}` : t('Voortgangsrapport', 'Progress report'));
  if (p.isError || prog.isError) return <ErrorState error={p.error ?? prog.error} />;
  if (!p.data || !prog.data) return <Spinner />;
  const pt = p.data;
  const pr = prog.data;
  const since = new Date(Date.now() - weeks * 7 * 86400_000);
  const sessions = pr.sessions.filter((s) => s.completedAt && new Date(s.completedAt) >= since).sort((a, b) => a.completedAt!.localeCompare(b.completedAt!));
  const totals = pr.weekly.reduce((a, w) => ({ planned: a.planned + w.planned, completed: a.completed + w.completed }), { planned: 0, completed: 0 });
  const periodRate = totals.planned ? totals.completed / totals.planned : null;
  const active = pt.programs.filter((x) => x.status === 'active');
  const d = (x: string | null) => fmtDate(x, locale);

  return (
    <article className="mx-auto max-w-4xl print:max-w-none" aria-labelledby="report-title">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={`/app/patienten/${id}`} className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700 hover:text-ink-950">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('Terug naar dossier', 'Back to record')}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[14px] text-ink-700">
            <span>{t('Periode', 'Period')}</span>
            <select className="input h-11 w-auto" value={weeks} onChange={(e) => setSp({ weken: e.target.value }, { replace: true })}>
              {PERIODS.map((w) => <option key={w} value={w}>{t(`${w} weken`, `${w} weeks`)}</option>)}
            </select>
          </label>
          <label className="flex min-h-[44px] items-center gap-2 text-[14px] text-ink-700">
            <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={withFeedback} onChange={(e) => setWithFeedback(e.target.checked)} />
            {t('Opmerkingen van de patiënt opnemen', 'Include patient comments')}
          </label>
          <Button size="lg" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>{t('Afdrukken of PDF', 'Print or PDF')}</Button>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-white p-6 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-8">
        <header className="border-b border-line pb-5">
          <p className="t-label">{t('Voortgangsrapport', 'Progress report')}</p>
          <h1 id="report-title" className="t-page mt-1">{pt.firstName} {pt.lastName}</h1>
          <dl className="mt-2 grid gap-x-6 gap-y-1 text-[14px] text-ink-700 sm:grid-cols-2">
            <div><dt className="inline text-ink-500">{t('Periode', 'Period')}: </dt><dd className="inline">{d(since.toISOString())} – {d(new Date().toISOString())} ({t(`${weeks} weken`, `${weeks} weeks`)})</dd></div>
            {pt.externalRef && <div><dt className="inline text-ink-500">{t('Kenmerk', 'Reference')}: </dt><dd className="inline">{pt.externalRef}</dd></div>}
            <div><dt className="inline text-ink-500">{t('Fysiotherapeut', 'Physiotherapist')}: </dt><dd className="inline">{pt.therapists.map((x) => x.fullName).join(', ') || '—'}</dd></div>
            {practice && <div><dt className="inline text-ink-500">{t('Praktijk', 'Practice')}: </dt><dd className="inline">{practice.practiceName}</dd></div>}
          </dl>
        </header>

        <section className="mt-6" aria-labelledby="r-summary">
          <h2 id="r-summary" className="t-section">{t('Samenvatting', 'Summary')}</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [t('Therapietrouw periode', 'Adherence period'), pct(periodRate), t(`${totals.completed} van ${totals.planned} geplande dagen`, `${totals.completed} of ${totals.planned} planned days`)],
              [t('Afgeronde sessies', 'Completed sessions'), String(sessions.length), t('in deze periode', 'in this period')],
              [t('Gem. pijn', 'Avg. pain'), avg(sessions.map((s) => s.pain))?.toString() ?? '—', t('schaal 0–10, na de training', 'scale 0–10, after the workout')],
              [t('Gem. zwaarte', 'Avg. difficulty'), avg(sessions.map((s) => s.difficulty))?.toString() ?? '—', t('schaal 0–10', 'scale 0–10')],
            ].map(([k, v, h]) => (
              <div key={k} className="rounded-lg border border-line px-3 py-2.5 [break-inside:avoid]">
                <dt className="text-[13px] text-ink-600">{k}</dt>
                <dd className="font-display text-[22px] font-bold tabular-nums text-ink-950">{v}</dd>
                <dd className="text-[12px] text-ink-500">{h}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-6 [break-inside:avoid]" aria-labelledby="r-weeks">
          <h2 id="r-weeks" className="t-section">{t('Therapietrouw per week', 'Adherence per week')}</h2>
          <table className="mt-2 w-full text-left text-[14px]">
            <thead className="text-[12.5px] text-ink-600"><tr className="border-b border-line"><th className="py-1.5 pr-3 font-semibold">{t('Week vanaf', 'Week from')}</th><th className="py-1.5 pr-3 font-semibold">{t('Gedaan / gepland', 'Done / planned')}</th><th className="py-1.5 pr-3 font-semibold">%</th></tr></thead>
            <tbody>
              {pr.weekly.map((w) => (
                <tr key={w.weekStart} className="border-b border-line/70">
                  <td className="whitespace-nowrap py-1.5 pr-3">{d(w.weekStart)}</td>
                  <td className="py-1.5 tabular-nums">{w.planned ? `${w.completed} / ${w.planned}` : t('niets gepland', 'nothing planned')}</td>
                  <td className="py-1.5 tabular-nums">{pct(w.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6" aria-labelledby="r-sessions">
          <h2 id="r-sessions" className="t-section">{t('Sessies', 'Sessions')}</h2>
          {sessions.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-600">{t('Geen afgeronde sessies in deze periode.', 'No completed sessions in this period.')}</p>
          ) : (
            <table className="mt-2 w-full text-left text-[14px]">
              <thead className="text-[12.5px] text-ink-600"><tr className="border-b border-line"><th className="py-1.5 pr-3 font-semibold">{t('Datum', 'Date')}</th><th className="py-1.5 pr-3 font-semibold">{t('Programma', 'Programme')}</th><th className="py-1.5 pr-3 font-semibold">{t('Oefeningen', 'Exercises')}</th><th className="py-1.5 pr-3 font-semibold">{t('Pijn', 'Pain')}</th><th className="py-1.5 pr-3 font-semibold">{t('Zwaarte', 'Difficulty')}</th></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-line/70 align-top [break-inside:avoid]">
                    <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">{d(s.completedAt)}</td>
                    <td className="py-1.5 pr-3">
                      {s.programTitle}
                      {withFeedback && s.feedback && <span className="mt-0.5 block text-[13px] italic text-ink-600">“{s.feedback}”</span>}
                    </td>
                    <td className="py-1.5 pr-3 tabular-nums">{s.logs.filter((l) => l.completed).length}/{s.logs.length}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{s.pain ?? '—'}</td>
                    <td className="py-1.5 tabular-nums">{s.difficulty ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {pr.perExercise.length > 0 && (
          <section className="mt-6" aria-labelledby="r-ex">
            <h2 id="r-ex" className="t-section">{t('Per oefening', 'Per exercise')}</h2>
            <table className="mt-2 w-full text-left text-[14px]">
              <thead className="text-[12.5px] text-ink-600"><tr className="border-b border-line"><th className="py-1.5 pr-3 font-semibold">{t('Oefening', 'Exercise')}</th><th className="py-1.5 pr-3 font-semibold">{t('Uitgevoerd', 'Done')}</th><th className="py-1.5 pr-3 font-semibold">{t('Gem. zwaarte', 'Avg. difficulty')}</th><th className="py-1.5 pr-3 font-semibold">{t('Gem. pijn', 'Avg. pain')}</th><th className="py-1.5 pr-3 font-semibold">{t('Max. pijn', 'Max. pain')}</th></tr></thead>
              <tbody>
                {pr.perExercise.map((e) => (
                  <tr key={e.exerciseId} className="border-b border-line/70">
                    <td className="py-1.5 pr-3">{locale === 'nl' ? e.nameNl : e.nameEn}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{e.completed}/{e.logged}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{e.avgDifficulty ?? '—'}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{e.avgPain ?? '—'}</td>
                    <td className="py-1.5 tabular-nums">{e.maxPain ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="mt-6 [break-inside:avoid]" aria-labelledby="r-prog">
          <h2 id="r-prog" className="t-section">{t('Actieve programma’s', 'Active programmes')}</h2>
          {active.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-600">{t('Geen actief programma.', 'No active programme.')}</p>
          ) : (
            <ul className="mt-2 space-y-1 text-[14px]">
              {active.map((x) => <li key={x.id}>{x.title} · {x.itemCount} {t('oefeningen', 'exercises')} · {t('versie', 'version')} {x.version}{x.startDate ? ` · ${t('sinds', 'since')} ${d(x.startDate)}` : ''}</li>)}
            </ul>
          )}
        </section>

        <footer className="mt-8 border-t border-line pt-3 text-[12px] text-ink-500">
          {t(
            `Gegenereerd op ${d(new Date().toISOString())} uit FP Exercise. Scores zijn door de patiënt zelf gemeld; indicatief, geen klinische meting.`,
            `Generated on ${d(new Date().toISOString())} from FP Exercise. Scores are self-reported by the patient; indicative, not a clinical measurement.`,
          )}
        </footer>
      </div>
    </article>
  );
}
