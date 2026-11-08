import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useClinicalPractice } from '@/lib/session';
import { ACL_REVIEW_BANNER } from '@shared/aclRoute';
import { Button, Input } from '@/components/ui';

type Index = { key: string; lsi: number | null; involved: number; uninvolved: number; better: 'higher' | 'lower' };
type Criterion = {
  slot: number; active: boolean; labelNl: string; labelEn: string; clinicalNl: string; clinicalEn: string;
  comparator: string; target: number; unit: string; mode: string; status: 'met' | 'open' | 'unmeasured';
  latest: number | null; latestOn: string | null;
  involved: { value: number; on: string } | null; uninvolved: { value: number; on: string } | null;
  lsi: number | null; ratio: number; points: { at: string; value: number }[];
};
type Phase = {
  programId: string; no: number; name: string; status: string; bossNl: string; bossEn: string;
  ratio: number; defeated: boolean; met: number; total: number; criteria: Criterion[];
};
type Board = { assigned: boolean; side: 'left' | 'right' | null; surgeryOn: string | null; startOn: string | null; phases: Phase[] };

const emptyPair = { left: '', right: '' };

/** One action: five phases, bosses and default criteria. The therapist still releases each phase. */
export function AclAssignDialog({ patientId, open, onClose }: { patientId: string; open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [side, setSide] = useState<'right' | 'left'>('right');
  const [surgeryOn, setSurgeryOn] = useState('');
  const [startOn, setStartOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!open) return null;
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/patients/${patientId}/acl-route`, { side, surgeryOn: surgeryOn || null, startOn: startOn || null });
      await qc.invalidateQueries({ queryKey: ['acl-criteria', patientId] });
      await qc.invalidateQueries({ queryKey: ['acl-route', patientId] });
      await qc.invalidateQueries({ queryKey: ['patient', patientId] });
      await qc.invalidateQueries({ queryKey: ['patients'] });
      onClose();
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 p-0 sm:items-center sm:p-4" role="presentation" onClick={onClose}>
      <form role="dialog" aria-labelledby="acl-assign-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <h2 id="acl-assign-title" className="text-[18px] font-bold text-ink-950">{t('VKB-route toewijzen', 'Assign ACL route')}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-700">{locale === 'nl' ? ACL_REVIEW_BANNER.nl : ACL_REVIEW_BANNER.en}</p>
        <p className="mt-2 text-[13px] text-ink-600">{t('Dit maakt vijf fases met zones, bazen en standaardcriteria. Jij geeft elke volgende fase zelf vrij.', 'This creates five phases with zones, bosses and default criteria. You release each next phase yourself.')}</p>
        <div className="mt-3 grid gap-3">
          <label className="grid gap-1 text-[13px] font-medium">{t('Geopereerde zijde', 'Operated side')}
            <select className="min-h-[44px] rounded-lg border border-line bg-white p-2" value={side} onChange={(e) => setSide(e.target.value as 'right' | 'left')}>
              <option value="right">{t('Rechts', 'Right')}</option>
              <option value="left">{t('Links', 'Left')}</option>
            </select>
          </label>
          <Input label={t('Operatiedatum', 'Surgery date')} type="date" optional={t('optioneel', 'optional')} value={surgeryOn} onChange={(e) => setSurgeryOn(e.target.value)} />
          <Input label={t('Startdatum van fase 1', 'Start date of phase 1')} type="date" optional={t('optioneel', 'optional')} value={startOn} onChange={(e) => setStartOn(e.target.value)} />
        </div>
        {error && <p role="alert" className="mt-2 text-[13px] text-bad">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" loading={busy}>{t('VKB-route toewijzen', 'Assign ACL route')}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>{t('Annuleren', 'Cancel')}</Button>
        </div>
      </form>
    </div>
  );
}

export function AclAssignButton({ patientId }: { patientId: string | null }) {
  const clinical = useClinicalPractice();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ['acl-route', patientId],
    queryFn: () => api.get<{ assigned: boolean }>(`/patients/${patientId}/acl-route`),
    enabled: clinical && !!patientId,
  });
  if (!clinical || !patientId || q.data?.assigned) return null;
  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>{t('VKB-route toewijzen', 'Assign ACL route')}</Button>
      <AclAssignDialog patientId={patientId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function Trend({ points, target }: { points: { at: string; value: number }[]; target: number }) {
  if (points.length < 1) return null;
  const values = [...points.map((p) => p.value), target];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 220;
  const h = 64;
  const x = (i: number) => (points.length === 1 ? w / 2 : (i / (points.length - 1)) * (w - 8) + 4);
  const y = (v: number) => h - 8 - ((v - min) / span) * (h - 16);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.value)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-16 w-full max-w-[220px]" role="img" aria-label="trend">
      <line x1="4" x2={w - 4} y1={y(target)} y2={y(target)} stroke="#8C3A32" strokeDasharray="3 3" />
      <path d={d} fill="none" stroke="#343F2A" strokeWidth="2" />
      {points.map((p, i) => <circle key={p.at} cx={x(i)} cy={y(p.value)} r="3" fill="#496246" />)}
    </svg>
  );
}

function statusText(status: Criterion['status'], t: (nl: string, en: string) => string) {
  if (status === 'met') return t('gehaald', 'met');
  if (status === 'open') return t('nog niet', 'not yet');
  return t('niet gemeten', 'not measured');
}

/** Per phase: every criterion, both sides, LSI, boss health. Current phase open. */
export function AclCriteriaPanel({ patientId }: { patientId: string }) {
  const clinical = useClinicalPractice();
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['acl-criteria', patientId], queryFn: () => api.get<Board>(`/patients/${patientId}/acl-criteria`), enabled: clinical });
  const [openNo, setOpenNo] = useState<number | null>(null);
  const [assign, setAssign] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  useEffect(() => {
    const current = q.data?.phases.find((p) => p.status === 'active');
    if (current && openNo == null) setOpenNo(current.no);
  }, [q.data, openNo]);
  if (!clinical) return null;
  if (!q.data) return <p className="text-[14px] text-ink-600">{t('Laden…', 'Loading…')}</p>;
  if (!q.data.assigned) {
    return (
      <section className="rounded-2xl border border-line bg-white p-4" aria-labelledby="acl-criteria-title">
        <h2 id="acl-criteria-title" className="text-[16px] font-bold">{t('VKB-criteria', 'ACL criteria')}</h2>
        <p className="mt-1 text-[14px] text-ink-700">{t('Nog geen VKB-route. Wijs hem in één keer toe.', 'No ACL route yet. Assign it in one go.')}</p>
        <Button className="mt-3" onClick={() => setAssign(true)}>{t('VKB-route toewijzen', 'Assign ACL route')}</Button>
        <AclAssignDialog patientId={patientId} open={assign} onClose={() => setAssign(false)} />
      </section>
    );
  }
  const board = q.data;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-white p-4" aria-labelledby="acl-criteria-title">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="acl-criteria-title" className="text-[16px] font-bold">{t('VKB-criteria', 'ACL criteria')}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-700">{locale === 'nl' ? ACL_REVIEW_BANNER.nl : ACL_REVIEW_BANNER.en}</p>
            <p className="mt-1 text-[13px] text-ink-600">
              {t('Geopereerde zijde', 'Operated side')}: {board.side === 'left' ? t('links', 'left') : t('rechts', 'right')}
              {board.surgeryOn ? ` · ${t('operatie', 'surgery')} ${board.surgeryOn}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setTestOpen(true)}>{t('Testsessie invoeren', 'Enter test session')}</Button>
            <Link to={`/app/patienten/${patientId}/rapport`} className="inline-flex min-h-[44px] items-center rounded-xl border border-line px-3 text-[14px] font-semibold">{t('Afdrukken of PDF', 'Print or PDF')}</Link>
          </div>
        </div>
      </section>
      {board.phases.map((phase) => {
        const open = openNo === phase.no;
        return (
          <section key={phase.programId} className="rounded-2xl border border-line bg-white" aria-labelledby={`acl-phase-${phase.no}`}>
            <button type="button" className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={open} onClick={() => setOpenNo(open ? null : phase.no)}>
              <span>
                <span id={`acl-phase-${phase.no}`} className="block text-[15px] font-bold">{t(`Fase ${phase.no}`, `Phase ${phase.no}`)} · {phase.name}</span>
                <span className="text-[13px] text-ink-600">{phase.bossNl} · {phase.met}/{phase.total} {t('gehaald', 'met')}</span>
              </span>
              <span className="text-[13px] font-semibold text-ink-700">{Math.round(phase.ratio * 100)}%</span>
            </button>
            {open && (
              <div className="space-y-3 border-t border-line p-4">
                <div className="h-2.5 overflow-hidden rounded-full bg-ink-100" aria-hidden>
                  <div className="h-full bg-[#8C3A32]" style={{ width: `${Math.round(phase.ratio * 100)}%` }} />
                </div>
                <PhaseEditor patientId={patientId} phase={phase} onSaved={() => qc.invalidateQueries({ queryKey: ['acl-criteria', patientId] })} />
                <ul className="space-y-3">
                  {phase.criteria.map((c) => (
                    <li key={c.slot} className="rounded-xl border border-line p-3 text-[14px]">
                      <p className="font-semibold text-ink-950">{nl ? c.labelNl : c.labelEn} · {statusText(c.active ? c.status : 'unmeasured', t)}{!c.active ? ` (${t('telt niet mee', 'does not count')})` : ''}</p>
                      <p className="text-[13px] text-ink-600">{nl ? c.clinicalNl : c.clinicalEn}</p>
                      <p className="mt-1 text-ink-800">
                        {t('Streef', 'Target')}: {c.mode === 'recorded' ? t('een meting', 'a measurement') : `${c.comparator === 'lte' ? '≤' : '≥'} ${c.target} ${c.unit}`}
                        {c.latest != null ? ` · ${t('laatste', 'latest')} ${c.latest} (${c.latestOn})` : ''}
                        {c.lsi != null ? ` · LSI ${c.lsi}%` : ''}
                      </p>
                      {(c.involved || c.uninvolved) && (
                        <p className="text-[13px] text-ink-700">
                          {t('Aangedane zijde', 'Injured side')}: {c.involved ? `${c.involved.value} (${c.involved.on})` : '—'}
                          {' · '}{t('andere zijde', 'other side')}: {c.uninvolved ? `${c.uninvolved.value} (${c.uninvolved.on})` : '—'}
                        </p>
                      )}
                      <Trend points={c.points} target={c.target} />
                    </li>
                  ))}
                </ul>
                <Link to={`/app/programmas/${phase.programId}`} className="inline-flex min-h-[44px] items-center text-[14px] font-semibold text-accent">{t('Oefeningen van deze fase', 'Exercises for this phase')}</Link>
              </div>
            )}
          </section>
        );
      })}
      {testOpen && <AclTestForm patientId={patientId} onClose={() => { setTestOpen(false); void qc.invalidateQueries({ queryKey: ['acl-criteria', patientId] }); }} />}
    </div>
  );
}

function PhaseEditor({ phase, onSaved }: { patientId: string; phase: Phase; onSaved: () => void }) {
  const { t, locale } = useI18n();
  const [name, setName] = useState(phase.name);
  const [rows, setRows] = useState(phase.criteria.map((c) => ({ ...c, targetText: String(c.target) })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api.put(`/programs/${phase.programId}/boss`, {
        phaseName: name.trim(),
        criteria: rows.map((r) => ({ slot: r.slot, comparator: r.mode === 'recorded' ? 'recorded' : r.comparator, target: Number(r.targetText), labelNl: r.labelNl, labelEn: r.labelEn, active: r.active })),
      });
      onSaved();
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <Input label={t('Fasenaam', 'Phase name')} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      {rows.map((r, i) => (
        <label key={r.slot} className="flex min-h-[44px] items-center gap-2 text-[14px]">
          <input type="checkbox" className="h-4 w-4" checked={r.active} onChange={(e) => setRows((list) => list.map((row, n) => n === i ? { ...row, active: e.target.checked } : row))} />
          {locale === 'nl' ? r.labelNl : r.labelEn}
          {r.mode !== 'recorded' && (
            <input aria-label={t('Streefwaarde', 'Target')} className="ml-auto w-20 min-h-[44px] rounded-lg border border-line p-2" value={r.targetText} onChange={(e) => setRows((list) => list.map((row, n) => n === i ? { ...row, targetText: e.target.value } : row))} />
          )}
        </label>
      ))}
      {error && <p role="alert" className="text-[13px] text-bad">{error}</p>}
      <Button type="submit" variant="secondary" loading={busy}>{t('Fase bijwerken', 'Update phase')}</Button>
    </form>
  );
}

const FIELDS: { key: string; nl: string; en: string; unit: string }[] = [
  { key: 'extension', nl: 'Extensie (tekort tot 0°)', en: 'Extension (short of 0°)', unit: '°' },
  { key: 'flexion', nl: 'Flexie', en: 'Flexion', unit: '°' },
  { key: 'extensionLag', nl: 'Extensielag', en: 'Extension lag', unit: '°' },
  { key: 'effusion', nl: 'Zwelling 0–4', en: 'Swelling 0–4', unit: '' },
  { key: 'quad', nl: 'Quadriceps', en: 'Quadriceps', unit: '' },
  { key: 'hamstring', nl: 'Hamstrings', en: 'Hamstrings', unit: '' },
  { key: 'hopSingle', nl: 'Single hop', en: 'Single hop', unit: 'cm' },
  { key: 'hopTriple', nl: 'Triple hop', en: 'Triple hop', unit: 'cm' },
  { key: 'hopCrossover', nl: 'Crossover hop', en: 'Crossover hop', unit: 'cm' },
  { key: 'hopTimed', nl: 'Timed hop 6 m', en: 'Timed hop 6 m', unit: 's' },
];

function AclTestForm({ patientId, onClose }: { patientId: string; onClose: () => void }) {
  const { t, locale } = useI18n();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [measuredOn, setMeasuredOn] = useState(today);
  const [device, setDevice] = useState('');
  const [strengthUnit, setStrengthUnit] = useState<'kg' | 'Nm'>('kg');
  const [pairs, setPairs] = useState<Record<string, { left: string; right: string }>>(Object.fromEntries(FIELDS.map((f) => [f.key, { ...emptyPair }])));
  const [aclRsi, setAclRsi] = useState('');
  const [indexes, setIndexes] = useState<Index[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const body = () => {
    const num = (s: string) => (s.trim() === '' ? undefined : Number(s));
    const pair = (key: string) => ({ left: num(pairs[key].left), right: num(pairs[key].right) });
    return {
      measuredOn, device, strengthUnit,
      extension: pair('extension'), flexion: pair('flexion'), extensionLag: pair('extensionLag'), effusion: pair('effusion'),
      quad: pair('quad'), hamstring: pair('hamstring'), hopSingle: pair('hopSingle'), hopTriple: pair('hopTriple'),
      hopCrossover: pair('hopCrossover'), hopTimed: pair('hopTimed'),
      aclRsi: aclRsi.trim() === '' ? null : Number(aclRsi),
    };
  };
  useEffect(() => {
    const handle = setTimeout(() => {
      void api.post<{ indexes: Index[] }>(`/patients/${patientId}/acl-tests/preview`, body()).then((r) => setIndexes(r.indexes)).catch(() => setIndexes([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [pairs, aclRsi, strengthUnit, measuredOn, device, patientId]);
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api.post<{ indexes: Index[] }>(`/patients/${patientId}/acl-tests`, body());
      setIndexes(r.indexes);
      onClose();
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  const lsiFor = (key: string) => indexes.find((i) => i.key === key);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/40 sm:items-center sm:p-4" role="presentation" onClick={onClose}>
      <form role="dialog" aria-labelledby="acl-test-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <h2 id="acl-test-title" className="text-[18px] font-bold">{t('Testsessie', 'Test session')}</h2>
        <p className="mt-1 text-[13px] text-ink-600">{t('LSI wordt op de server uitgerekend, ook bij de timed hop (daar telt een kortere tijd).', 'LSI is calculated on the server, including the timed hop (a shorter time counts there).')}</p>
        <div className="mt-3 grid gap-3">
          <Input label={t('Datum', 'Date')} type="date" value={measuredOn} onChange={(e) => setMeasuredOn(e.target.value)} />
          <Input label={t('Apparaat', 'Device')} optional={t('optioneel', 'optional')} value={device} onChange={(e) => setDevice(e.target.value)} maxLength={80} placeholder={t('bijv. handdynamometer', 'e.g. hand dynamometer')} />
          <label className="grid gap-1 text-[13px] font-medium">{t('Eenheid kracht', 'Strength unit')}
            <select className="min-h-[44px] rounded-lg border border-line p-2" value={strengthUnit} onChange={(e) => setStrengthUnit(e.target.value as 'kg' | 'Nm')}>
              <option value="kg">kg</option>
              <option value="Nm">Nm</option>
            </select>
          </label>
          {FIELDS.map((f) => {
            const hit = lsiFor(f.key === 'quad' ? 'quad_strength' : f.key === 'hamstring' ? 'hamstring_strength' : f.key === 'hopSingle' ? 'hop_single' : f.key === 'hopTriple' ? 'hop_triple' : f.key === 'hopCrossover' ? 'hop_crossover' : f.key === 'hopTimed' ? 'hop_timed_6m' : '');
            return (
              <fieldset key={f.key} className="rounded-xl border border-line p-3">
                <legend className="px-1 text-[13px] font-semibold">{locale === 'nl' ? f.nl : f.en}</legend>
                <div className="grid grid-cols-2 gap-2">
                  <Input label={t('Links', 'Left')} type="number" value={pairs[f.key].left} onChange={(e) => setPairs((p) => ({ ...p, [f.key]: { ...p[f.key], left: e.target.value } }))} />
                  <Input label={t('Rechts', 'Right')} type="number" value={pairs[f.key].right} onChange={(e) => setPairs((p) => ({ ...p, [f.key]: { ...p[f.key], right: e.target.value } }))} />
                </div>
                {hit && <p className="mt-1 text-[13px] font-semibold text-ink-800" data-lsi={f.key}>LSI {hit.lsi == null ? '—' : `${hit.lsi}%`}{f.key === 'hopTimed' ? t(' (omgekeerd)', ' (inverted)') : ''}</p>}
              </fieldset>
            );
          })}
          <Input label="ACL-RSI (0–100)" type="number" value={aclRsi} onChange={(e) => setAclRsi(e.target.value)} />
        </div>
        {error && <p role="alert" className="mt-2 text-[13px] text-bad">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="submit" loading={busy}>{t('Metingen opslaan', 'Save measurements')}</Button>
          <Button type="button" variant="secondary" onClick={onClose}>{t('Sluiten', 'Close')}</Button>
        </div>
      </form>
    </div>
  );
}
