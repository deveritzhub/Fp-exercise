import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { useClinicalPractice, useSession } from '@/lib/session';
import { BODY_AREAS } from '@shared/hero';
import { fmtDate, pct } from '@/lib/format';
import { Button, ErrorState, Spinner } from '@/components/ui';
import type { PatientDetail, Progress } from '@/lib/types';
import { MOBILITY_TESTS, mobilityTrends, type MobilityResult } from '@shared/mobilityTests';

/** Pain map: the first check-in against the latest, per area (physio only). */
function ReportPainMap({ patientId }: { patientId: string }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  type Entry = { area: string; score: number };
  type Map = { baseline: { recordedAt: string; entries: Entry[] } | null; current: { recordedAt: string; entries: Entry[] } | null; checkins: number };
  const q = useQuery({ queryKey: ['patient', patientId, 'hero'], queryFn: () => api.get<{ painMap: Map }>(`/patients/${patientId}/hero`) });
  const m = q.data?.painMap;
  if (!m?.baseline || !m.current || m.checkins < 2) return null;
  const areas = [...new Set([...m.baseline.entries, ...m.current.entries].map((e) => e.area))];
  const score = (list: Entry[], a: string) => list.find((e) => e.area === a)?.score ?? 0;
  const d = (x: string) => fmtDate(x, locale, { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <section className="mt-6 [break-inside:avoid]" aria-labelledby="r-pain">
      <h2 id="r-pain" className="t-section">{t('Pijnkaart', 'Pain map')}</h2>
      <table className="mt-2 w-full text-[13.5px]">
        <thead className="border-b border-line text-left text-[12px] text-ink-500">
          <tr><th className="py-1.5 font-medium">{t('Plek', 'Area')}</th><th className="py-1.5 font-medium">{t(`Start (${d(m.baseline.recordedAt)})`, `Start (${d(m.baseline.recordedAt)})`)}</th><th className="py-1.5 font-medium">{t(`Laatste (${d(m.current.recordedAt)})`, `Latest (${d(m.current.recordedAt)})`)}</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {areas.map((a) => {
            const meta = BODY_AREAS.find((x) => x.key === a);
            return (
              <tr key={a}>
                <td className="py-1.5">{meta ? (nl ? meta.nl : meta.en) : a}</td>
                <td className="py-1.5 tabular-nums">{score(m.baseline!.entries, a)}/10</td>
                <td className="py-1.5 tabular-nums">{score(m.current!.entries, a)}/10</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[12px] text-ink-500">{t(`Door de patiënt zelf aangegeven op de pijnkaart in de app (${m.checkins} metingen).`, `Reported by the patient on the pain map in the app (${m.checkins} check-ins).`)}</p>
    </section>
  );
}

/** Self-measured mobility (only when the patient shares mobility): first and latest per test and side. */
function ReportMobility({ patientId }: { patientId: string }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const q = useQuery({ queryKey: ['mobility-tests', `/patients/${patientId}`], queryFn: () => api.get<{ results: MobilityResult[]; sharedByPatient: boolean }>(`/patients/${patientId}/mobility-tests`) });
  const rows = MOBILITY_TESTS.flatMap((test) => mobilityTrends(test, q.data?.results ?? []).filter((x) => x.points.length > 0).map((tr) => ({ test, tr })));
  if (!rows.length) return null;
  const d = (day: string) => fmtDate(day, locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const c = (v: number) => `${String(v).replace('.', nl ? ',' : '.')} cm`;
  const side = (s: string) => (s === 'left' ? t('links', 'left') : s === 'right' ? t('rechts', 'right') : '');
  return (
    <section className="mt-6 [break-inside:avoid]" aria-labelledby="r-mob">
      <h2 id="r-mob" className="t-section">{t('Mobiliteit (zelf gemeten)', 'Mobility (self-measured)')}</h2>
      <table className="mt-2 w-full text-[13.5px]">
        <thead className="border-b border-line text-left text-[12px] text-ink-500">
          <tr><th className="py-1.5 font-medium">{t('Test', 'Test')}</th><th className="py-1.5 font-medium">{t('Eerste', 'First')}</th><th className="py-1.5 font-medium">{t('Laatste', 'Latest')}</th><th className="py-1.5 font-medium">{t('Verschil', 'Change')}</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(({ test, tr }) => (
            <tr key={test.key + tr.side}>
              <td className="py-1.5">{nl ? test.name[0] : test.name[1]}{tr.side !== 'none' ? ` · ${side(tr.side)}` : ''}</td>
              <td className="py-1.5 tabular-nums">{c(tr.points[0].cm)} <span className="text-ink-500">({d(tr.points[0].day)})</span></td>
              <td className="py-1.5 tabular-nums">{c(tr.points.at(-1)!.cm)} <span className="text-ink-500">({d(tr.points.at(-1)!.day)})</span></td>
              <td className="py-1.5 tabular-nums">{tr.gain === null ? '—' : tr.gain === 0 ? '0' : `${tr.gain > 0 ? t('soepeler', 'more supple') : t('stijver', 'stiffer')} ${c(Math.abs(tr.gain))}${tr.verdict === 'same' ? t(' (binnen meetfout)', ' (within error)') : ''}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[12px] text-ink-500">{t('Thuis gemeten door de patiënt met een meetlint; vergelijk alleen met eerdere eigen metingen.', 'Measured at home by the patient with a tape measure; compare only with their own earlier results.')}</p>
    </section>
  );
}

function ReportAcl({ patientId }: { patientId: string }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const q = useQuery({ queryKey: ['acl-criteria', patientId], queryFn: () => api.get<{ assigned: boolean; phases: { no: number; name: string; bossNl: string; met: number; total: number; criteria: { slot: number; active: boolean; labelNl: string; labelEn: string; status: string; target: number; unit: string; latest: number | null; latestOn: string | null; lsi: number | null; mode: string }[] }[] }>(`/patients/${patientId}/acl-criteria`) });
  if (!q.data?.assigned) return null;
  const status = (s: string) => (s === 'met' ? t('gehaald', 'met') : s === 'open' ? t('nog niet', 'not yet') : t('niet gemeten', 'not measured'));
  return (
    <section className="mt-6" aria-labelledby="r-acl">
      <h2 id="r-acl" className="t-section">{t('VKB-fasedoelen', 'ACL phase goals')}</h2>
      <p className="mt-1 text-[12px] text-ink-500">{t('Standaardwaarden, door de fysiotherapeut te beoordelen. Een gehaald doel geeft de volgende fase niet vrij.', 'Default values, for the physiotherapist to judge. A met goal does not release the next phase.')}</p>
      {q.data.phases.map((phase) => (
        <div key={phase.no} className="mt-3 [break-inside:avoid]">
          <h3 className="text-[14px] font-semibold">{t(`Fase ${phase.no}`, `Phase ${phase.no}`)} · {phase.name} · {phase.bossNl} · {phase.met}/{phase.total}</h3>
          <table className="mt-1 w-full text-[13px]">
            <thead className="border-b border-line text-left text-[12px] text-ink-500"><tr><th className="py-1">{t('Criterium', 'Criterion')}</th><th>{t('Streef', 'Target')}</th><th>{t('Laatste', 'Latest')}</th><th>LSI</th><th>{t('Status', 'Status')}</th></tr></thead>
            <tbody>
              {phase.criteria.filter((c) => c.active).map((c) => (
                <tr key={c.slot} className="border-b border-line">
                  <td className="py-1">{nl ? c.labelNl : c.labelEn}</td>
                  <td>{c.mode === 'recorded' ? '—' : c.target}</td>
                  <td>{c.latest == null ? '—' : `${c.latest}${c.latestOn ? ` (${c.latestOn})` : ''}`}</td>
                  <td>{c.lsi == null ? '—' : `${c.lsi}%`}</td>
                  <td>{status(c.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

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
  const clinical = useClinicalPractice();
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

        {clinical && <ReportAcl patientId={id} />}
        <ReportMobility patientId={id} />
        {clinical && <ReportPainMap patientId={id} />}

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
            `Gegenereerd op ${d(new Date().toISOString())} uit FP Flow. Scores zijn door de patiënt zelf gemeld; indicatief, geen klinische meting.`,
            `Generated on ${d(new Date().toISOString())} from FP Flow. Scores are self-reported by the patient; indicative, not a clinical measurement.`,
          )}
        </footer>
      </div>
    </article>
  );
}
