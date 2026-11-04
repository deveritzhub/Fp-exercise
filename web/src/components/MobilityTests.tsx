import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, Ruler, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { Button, Dialog, ErrorState, Input, Notice, Segmented, Spinner, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { Link } from 'react-router-dom';
import { useModes } from '@/components/patient/Modules';
import { MOBILITY_MEASURE_XP, MOBILITY_TESTS, mobilityDue, mobilityTrends, suggestedProgram, sideDifference, validMobilityValue, type MobilityResult, type MobilitySide, type MobilityTest, type MobilityTrend } from '@shared/mobilityTests';

type Row = MobilityResult & { id: string };
type Data = { results: Row[]; sharedByPatient?: boolean };

const SIDE: Record<MobilitySide, [string, string]> = { left: ['Links', 'Left'], right: ['Rechts', 'Right'], none: ['', ''] };
export const localToday = () => new Date().toLocaleDateString('sv-SE');
const cm = (v: number) => `${String(v).replace('.', ',')} cm`;

/**
 * Mobility self-tests with the person's own trend. `base` is '/patient' (own results, can measure)
 * or '/patients/:id' (staff, read only, only what the patient shares).
 */
export function MobilityTests({ base, staff = false }: { base: string; staff?: boolean }) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['mobility-tests', base], queryFn: () => api.get<Data>(`${base}/mobility-tests`) });
  if (q.isLoading) return <Spinner className="min-h-[30vh]" />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (staff && !q.data.sharedByPatient) {
    return <Notice tone="info">{t('Deze patiënt deelt het onderdeel Mobiliteit niet. Mobiliteitsmetingen blijven dan privé.', 'This patient does not share the mobility part. Mobility measurements then stay private.')}</Notice>;
  }
  const results = q.data.results;
  return (
    <div className="space-y-3">
      {!staff && <DueBanner days={results.map((r) => r.day)} />}
      {!staff && (
        <p className="text-[14px] text-ink-600">
          {t('Meet elke 2 tot 4 weken, steeds op dezelfde manier en rond hetzelfde moment van de dag. Je vergelijkt met jezelf, niet met anderen. Je fysiotherapeut ziet dit alleen als je Mobiliteit deelt.', 'Measure every 2 to 4 weeks, always the same way and around the same time of day. You compare with yourself, not with others. Your physiotherapist only sees this if you share Mobility.')}
        </p>
      )}
      {staff && results.length === 0 && <p className="text-[15px] text-ink-600">{t('Nog geen mobiliteitsmetingen.', 'No mobility measurements yet.')}</p>}
      {MOBILITY_TESTS.map((test) => (staff && !results.some((r) => r.test === test.key) ? null : <TestCard key={test.key} test={test} results={results} base={base} staff={staff} />))}
    </div>
  );
}

/** When to measure again, and whether this measurement still earns XP. */
function DueBanner({ days }: { days: string[] }) {
  const { t } = useI18n();
  const d = mobilityDue(days, localToday());
  const left = d.daysSince === null ? 0 : Math.max(0, 14 - d.daysSince);
  return (
    <p className={cn('rounded-xl px-3 py-2 text-[14px]', d.due ? 'bg-accent-soft text-ink-900' : 'bg-canvas text-ink-700')} role="status">
      {d.last === null
        ? t(`Nog niet gemeten. Je eerste meting is je startpunt: +${MOBILITY_MEASURE_XP} XP.`, `Not measured yet. Your first measurement is your starting point: +${MOBILITY_MEASURE_XP} XP.`)
        : d.due
          ? t(`Tijd om opnieuw te meten: je laatste meting is ${d.daysSince} dagen oud. +${MOBILITY_MEASURE_XP} XP.`, `Time to measure again: your last measurement is ${d.daysSince} days old. +${MOBILITY_MEASURE_XP} XP.`)
          : d.daysSince === 0
            ? t('Vandaag gemeten. Over 2 weken weer.', 'Measured today. Again in 2 weeks.')
            : t(`Laatst gemeten ${d.daysSince} ${d.daysSince === 1 ? 'dag' : 'dagen'} geleden. Over ${left} ${left === 1 ? 'dag' : 'dagen'} weer${d.xpAvailable ? '' : ', dan ook weer XP'}.`, `Last measured ${d.daysSince} ${d.daysSince === 1 ? 'day' : 'days'} ago. Again in ${left} ${left === 1 ? 'day' : 'days'}${d.xpAvailable ? '' : ', with XP again'}.`)}
    </p>
  );
}

function TestCard({ test, results, base, staff }: { test: MobilityTest; results: Row[]; base: string; staff: boolean }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [open, setOpen] = useState(false);
  const trends = mobilityTrends(test, results);
  const diff = sideDifference(trends);
  const any = trends.some((x) => x.points.length > 0);
  const name = nl ? test.name[0] : test.name[1];
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby={`mt-${test.key}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent" aria-hidden><Ruler className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 id={`mt-${test.key}`} className="font-semibold text-ink-900">{name}</h3>
          <p className="text-[13.5px] text-ink-600">{nl ? test.measures[0] : test.measures[1]}</p>
        </div>
      </div>
      {any ? (
        <>
          <dl className={cn('mt-3 grid gap-2', trends.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {trends.map((tr) => <Latest key={tr.side} test={test} tr={tr} />)}
          </dl>
          {diff !== null && <p className="mt-2 text-[13px] text-ink-600">{t(`Verschil links-rechts: ${cm(diff)}`, `Left-right difference: ${cm(diff)}`)}</p>}
          <TrendChart test={test} trends={trends} />
        </>
      ) : (
        <p className="mt-3 text-[14px] text-ink-600">{t('Nog niet gemeten.', 'Not measured yet.')}</p>
      )}
      {!staff && any && <Suggestion test={test} trends={trends} />}
      {!staff && <Button variant={any ? 'secondary' : 'primary'} className="mt-3 w-full" onClick={() => setOpen(true)}>{any ? t('Opnieuw meten', 'Measure again') : t('Meten', 'Measure')}</Button>}
      {any && <History test={test} results={results} base={base} staff={staff} />}
      {!staff && open && <MeasureDialog test={test} base={base} onClose={() => setOpen(false)} />}
    </section>
  );
}

/**
 * A gentle pointer to an existing mobility programme that works on this movement. Stronger wording
 * only when the person got stiffer or one side clearly lags (beyond the published error).
 */
function Suggestion({ test, trends }: { test: MobilityTest; trends: MobilityTrend[] }) {
  const { t } = useI18n();
  const modes = useModes();
  const prog = modes.data ? suggestedProgram(test, modes.data.templates) : null;
  if (!prog) return null;
  const stiffer = trends.some((x) => x.verdict === 'worse');
  const diff = sideDifference(trends);
  const lagging = diff !== null && !!test.realChange && diff >= test.realChange;
  const lead = stiffer
    ? t('Je bent stijver dan bij je eerste meting.', 'You are stiffer than at your first measurement.')
    : lagging
      ? t('De ene kant blijft achter bij de andere.', 'One side lags behind the other.')
      : t('Wil je hier soepeler in worden?', 'Want to become more supple here?');
  return (
    <p className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-[14px] text-ink-800">
      {lead} {t('Het programma', 'The programme')} <strong>{prog.title}</strong> {t('werkt aan deze beweging.', 'works on this movement.')}{' '}
      <Link to="/p/mobiliteit#mod-start" className="font-semibold text-accent underline-offset-2 hover:underline">{t('Bekijken', 'View')}</Link>
      {(stiffer || lagging) && <span className="mt-1 block text-[13px] text-ink-600">{t('Heb je er pijn of klachten bij? Bespreek het met je fysiotherapeut.', 'Pain or symptoms with it? Discuss it with your physiotherapist.')}</span>}
    </p>
  );
}

function Latest({ test, tr }: { test: MobilityTest; tr: MobilityTrend }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const label = tr.side === 'none' ? t('Laatste meting', 'Latest') : nl ? SIDE[tr.side][0] : SIDE[tr.side][1];
  const up = tr.gain !== null && tr.gain > 0;
  const down = tr.gain !== null && tr.gain < 0;
  return (
    <div className="rounded-xl bg-canvas px-3 py-2">
      <dt className="text-[12.5px] font-medium text-ink-600">{label}</dt>
      <dd>
        <span className="font-display text-[20px] font-bold tabular-nums text-ink-950">{tr.latest === null ? '–' : cm(tr.latest)}</span>
        {tr.gain !== null && (tr.verdict === 'same' && tr.gain !== 0 ? (
          <span className="mt-0.5 block text-[12.5px] text-ink-600">{t(`${cm(Math.abs(tr.gain))} verschil met je eerste meting: binnen de meetfout (±${String(test.realChange).replace('.', ',')} cm)`, `${cm(Math.abs(tr.gain))} from your first: within measurement error (±${test.realChange} cm)`)}</span>
        ) : (
          <span className={cn('mt-0.5 flex items-start gap-1 text-[12.5px]', tr.verdict === 'better' ? 'text-ok' : tr.verdict === 'worse' ? 'text-bad' : 'text-ink-600')}>
            {up ? <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> : down ? <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
            <span>{tr.gain === 0
              ? t('gelijk aan je eerste meting', 'same as your first')
              : t(`${tr.gain > 0 ? 'beweeglijker' : 'stijver'} dan je eerste meting (${cm(Math.abs(tr.gain))})`, `${tr.gain > 0 ? 'more mobile' : 'stiffer'} than your first (${cm(Math.abs(tr.gain))})`)}</span>
          </span>
        ))}
      </dd>
    </div>
  );
}

/** Small line chart: one line per side, oldest left. "Better" is always up. */
function TrendChart({ test, trends }: { test: MobilityTest; trends: MobilityTrend[] }) {
  const { t } = useI18n();
  const days = [...new Set(trends.flatMap((x) => x.points.map((p) => p.day)))].sort();
  if (days.length < 2) return null;
  const vals = trends.flatMap((x) => x.points.map((p) => p.cm));
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 4) {
    const mid = (hi + lo) / 2;
    lo = mid - 2;
    hi = mid + 2;
  }
  const W = 300;
  const H = 90;
  const x = (d: string) => 8 + (days.indexOf(d) / (days.length - 1)) * (W - 16);
  // Lower is better for some tests: flip so that up always means more mobile.
  const y = (v: number) => {
    const f = (v - lo) / (hi - lo);
    return 8 + (test.better === 'higher' ? 1 - f : f) * (H - 16);
  };
  const styles: Record<MobilitySide, { stroke: string; dash?: string }> = { left: { stroke: 'rgb(var(--accent))' }, right: { stroke: '#b07a2a', dash: '5 4' }, none: { stroke: 'rgb(var(--accent))' } };
  return (
    <figure className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[90px] w-full" role="img" aria-label={t('Verloop van je metingen; omhoog is beweeglijker', 'Trend of your measurements; up is more mobile')}>
        <line x1="0" x2={W} y1={H - 4} y2={H - 4} stroke="currentColor" className="text-line" />
        {trends.map((tr) =>
          tr.points.length > 0 ? (
            <g key={tr.side}>
              {tr.points.length > 1 && <polyline fill="none" strokeWidth="2.5" strokeLinejoin="round" stroke={styles[tr.side].stroke} strokeDasharray={styles[tr.side].dash} points={tr.points.map((p) => `${x(p.day)},${y(p.cm)}`).join(' ')} />}
              {tr.points.map((p) => <circle key={p.day} cx={x(p.day)} cy={y(p.cm)} r="3.5" fill={styles[tr.side].stroke} />)}
            </g>
          ) : null,
        )}
      </svg>
      <figcaption className="flex flex-wrap justify-between gap-2 text-[12px] text-ink-500">
        <span>{days[0].slice(8, 10)}-{days[0].slice(5, 7)}</span>
        {trends.length > 1 && (
          <span className="flex gap-3">
            <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-accent" aria-hidden />{t('links', 'left')}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-[#b07a2a]" aria-hidden />{t('rechts', 'right')}</span>
          </span>
        )}
        <span>{days.at(-1)!.slice(8, 10)}-{days.at(-1)!.slice(5, 7)}</span>
      </figcaption>
    </figure>
  );
}

function History({ test, results, base, staff }: { test: MobilityTest; results: Row[]; base: string; staff: boolean }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const rows = results.filter((r) => r.test === test.key).sort((a, b) => b.day.localeCompare(a.day) || a.side.localeCompare(b.side));
  const remove = async (id: string) => {
    try {
      await api.del(`${base}/mobility-tests/${id}`);
      await qc.invalidateQueries({ queryKey: ['mobility-tests', base] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    }
  };
  return (
    <details className="group mt-2">
      <summary className="tap flex min-h-[44px] cursor-pointer list-none items-center gap-1 text-[14px] font-medium text-accent">
        {t(`Alle metingen (${rows.length})`, `All measurements (${rows.length})`)}
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="divide-y divide-line text-[14px]">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 py-1.5">
            <span className="w-24 shrink-0 text-ink-600">{new Date(r.day + 'T12:00:00').toLocaleDateString(nl ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
            <span className="flex-1 text-ink-800">{r.side !== 'none' && `${nl ? SIDE[r.side][0] : SIDE[r.side][1]}: `}<strong className="tabular-nums">{cm(r.cm)}</strong></span>
            {!staff && (
              <button type="button" onClick={() => remove(r.id)} aria-label={t(`Meting van ${r.day} verwijderen`, `Delete measurement of ${r.day}`)} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100">
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function MeasureDialog({ test, base, onClose }: { test: MobilityTest; base: string; onClose: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const sides: MobilitySide[] = test.sides ? ['left', 'right'] : ['none'];
  const [vals, setVals] = useState<Record<string, string>>({});
  const [signs, setSigns] = useState<Record<string, 'minus' | 'plus'>>({ left: 'minus', right: 'minus', none: 'minus' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valueOf = (side: MobilitySide) => {
    const raw = (vals[side] ?? '').trim().replace(',', '.');
    if (!raw) return null;
    const n = Math.abs(Number(raw));
    if (!Number.isFinite(n)) return NaN;
    return test.sign && signs[side] === 'minus' ? -n : n;
  };
  const save = async () => {
    const values = sides.map((side) => ({ side, cm: valueOf(side) })).filter((v): v is { side: MobilitySide; cm: number } => v.cm !== null);
    if (values.length === 0) return setError(t('Vul minstens één meting in.', 'Enter at least one measurement.'));
    if (values.some((v) => !validMobilityValue(test.key, v.side, v.cm))) return setError(t(`Vul een getal in tussen ${test.min} en ${test.max} cm.`, `Enter a number between ${test.min} and ${test.max} cm.`));
    setBusy(true);
    setError(null);
    try {
      const before = qc.getQueryData<{ results: Row[] }>(['mobility-tests', base]);
      const earns = mobilityDue((before?.results ?? []).map((r) => r.day), localToday()).xpAvailable;
      await api.post(`${base}/mobility-tests`, { test: test.key, values });
      await qc.invalidateQueries({ queryKey: ['mobility-tests', base] });
      void qc.invalidateQueries({ queryKey: ['patient-hero'] });
      toast(earns ? t(`Meting opgeslagen: +${MOBILITY_MEASURE_XP} XP`, `Measurement saved: +${MOBILITY_MEASURE_XP} XP`) : t('Meting opgeslagen', 'Measurement saved'));
      onClose();
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title={nl ? test.name[0] : test.name[1]}
      footer={<div className="grid w-full grid-cols-2 gap-2"><Button variant="secondary" onClick={onClose}>{t('Annuleren', 'Cancel')}</Button><Button loading={busy} onClick={save}>{t('Opslaan', 'Save')}</Button></div>}>
      <div className="space-y-4">
        <ol className="list-decimal space-y-1.5 pl-5 text-[15px] text-ink-800">
          {test.steps.map((s, i) => <li key={i}>{nl ? s[0] : s[1]}</li>)}
        </ol>
        <p className="flex items-start gap-2 rounded-xl bg-warn-soft p-3 text-[13.5px] text-ink-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />{t('Stop bij pijn, tintelingen of duizeligheid.', 'Stop if you feel pain, tingling or dizziness.')} {nl ? test.caution[0] : test.caution[1]}</p>
        {test.sideNote && <p className="text-[13.5px] text-ink-600">{nl ? test.sideNote[0] : test.sideNote[1]}</p>}
        {error && <Notice tone="bad">{error}</Notice>}
        <div className={cn('grid gap-3', sides.length > 1 && 'sm:grid-cols-2')}>
          {sides.map((side) => (
            <div key={side} className="space-y-2">
              {test.sign && (
                <Segmented size="lg" label={t(`Richting ${side === 'none' ? '' : nl ? SIDE[side][0].toLowerCase() : SIDE[side][1].toLowerCase()}`, `Direction ${side === 'none' ? '' : SIDE[side][1].toLowerCase()}`)} value={signs[side]} onChange={(v) => setSigns({ ...signs, [side]: v })}
                  options={[{ value: 'minus', label: nl ? test.sign.minus[0] : test.sign.minus[1] }, { value: 'plus', label: nl ? test.sign.plus[0] : test.sign.plus[1] }]} />
              )}
              <Input label={side === 'none' ? t('Afstand in cm', 'Distance in cm') : t(`${SIDE[side][0]} (cm)`, `${SIDE[side][1]} (cm)`)} inputMode="decimal" value={vals[side] ?? ''} onChange={(e) => setVals({ ...vals, [side]: e.target.value })} placeholder={t('bijv. 8,5', 'e.g. 8.5')} />
            </div>
          ))}
        </div>
        <p className="text-[12.5px] text-ink-500">{nl ? test.howToRead[0] : test.howToRead[1]} {t('Bron', 'Source')}: {test.source}.</p>
      </div>
    </Dialog>
  );
}

/** Compact overview for the progress page: per measured test the latest value and the change. */
export function MobilitySummary({ base = '/patient', link = '/p/mobiliteit/meten' }: { base?: string; link?: string }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const staff = base !== '/patient';
  const q = useQuery({ queryKey: ['mobility-tests', base], queryFn: () => api.get<Data>(`${base}/mobility-tests`) });
  if (!q.data) return null;
  const results = q.data.results;
  const measured = MOBILITY_TESTS.filter((x) => results.some((r) => r.test === x.key));
  // Staff: only when the patient shares mobility and has measured something.
  if (staff && measured.length === 0) return null;
  return (
    <section aria-labelledby="mob-summary" className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="mob-summary" className="font-bold">{t('Mobiliteit', 'Mobility')}{staff && <span className="ml-2 text-[13px] font-normal text-ink-600">{t('zelf gemeten door de patiënt', 'measured by the patient')}</span>}</h2>
        <Link to={link} className="inline-flex min-h-[44px] items-center text-[15px] font-medium text-accent">{measured.length ? t('Alle metingen', 'All measurements') : t('Meten', 'Measure')}</Link>
      </div>
      {measured.length === 0 ? (
        <p className="text-[14px] text-ink-600">{t('Nog niet gemeten. Met vier tests en een meetlint zie je of je soepeler wordt.', 'Not measured yet. Four tests and a tape measure show whether you are getting more supple.')}</p>
      ) : (
        <ul className="divide-y divide-line">
          {measured.map((test) => {
            const trends = mobilityTrends(test, results).filter((x) => x.latest !== null);
            return (
              <li key={test.key} className="py-2.5">
                <p className="font-medium text-ink-900">{nl ? test.name[0] : test.name[1]}</p>
                <p className="text-[14px] text-ink-700">
                  {trends.map((tr, i) => (
                    <span key={tr.side}>
                      {i > 0 && ' · '}
                      {tr.side !== 'none' && `${nl ? SIDE[tr.side][0] : SIDE[tr.side][1]} `}
                      <strong className="tabular-nums">{cm(tr.latest!)}</strong>
                      {tr.gain !== null && tr.gain !== 0 && (
                        <span className={tr.verdict === 'better' ? 'text-ok' : tr.verdict === 'worse' ? 'text-bad' : 'text-ink-600'}>
                          {' '}({tr.gain > 0 ? t('soepeler', 'more supple') : t('stijver', 'stiffer')} {cm(Math.abs(tr.gain))})
                        </span>
                      )}
                      {staff && tr.points.length > 0 && <span className="text-ink-500"> · {new Date(tr.points.at(-1)!.day + 'T12:00:00').toLocaleDateString(nl ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'short' })}</span>}
                    </span>
                  ))}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
