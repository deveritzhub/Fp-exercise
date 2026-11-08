import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { isClinical } from '@shared/accountKind';
import { MOBILITY_TESTS } from '@shared/mobilityTests';
import { Button, Input } from '@/components/ui';

type Goal = {
  source: 'outcome' | 'mobility' | 'lsi';
  domain: string | null;
  metric: string | null;
  unit: string;
  side: string;
  testKey: string | null;
  comparator: 'gte' | 'lte' | 'recorded';
  target: number;
  labelNl: string;
  labelEn: string;
  defeatedAt: string | null;
  slot?: number;
  measureKey?: string | null;
  clinicalNl?: string;
  clinicalEn?: string;
  mode?: string;
  bossNl?: string;
  bossEn?: string;
};

/** Therapist sets the measurable target for this phase's boss. Saving never releases the next phase. */
export function BossGoalForm({ programId }: { programId: string }) {
  const { t, locale, kind } = useI18n();
  const clinical = isClinical(kind);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['boss-goal', programId], queryFn: () => api.get<{ goal: Goal; goals?: Goal[] }>(`/programs/${programId}/boss`) });
  const existing = q.data?.goal;
  const goals = (q.data?.goals ?? []).filter((g): g is Goal => !!g);
  const acl = goals.some((g) => g.measureKey);
  const [source, setSource] = useState<'outcome' | 'mobility'>(clinical ? 'outcome' : 'mobility');
  const [domain, setDomain] = useState('rom');
  const [metric, setMetric] = useState('');
  const [unit, setUnit] = useState('degrees');
  const [side, setSide] = useState(clinical ? 'not_applicable' : 'none');
  const [testKey, setTestKey] = useState<string>(MOBILITY_TESTS[0].key);
  const [comparator, setComparator] = useState<'gte' | 'lte'>('gte');
  const [target, setTarget] = useState('');
  const [labelNl, setLabelNl] = useState('');
  const [labelEn, setLabelEn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const n = Number(target);
    if (!labelNl.trim() || !labelEn.trim() || !Number.isFinite(n)) {
      setError(t('Vul een doel, een getal en een gewone-taalnaam in.', 'Enter a target, a number and a plain-language name.'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body = source === 'mobility' || !clinical
        ? { source: 'mobility' as const, testKey, side: side === 'not_applicable' ? 'none' : side, comparator, target: n, labelNl: labelNl.trim(), labelEn: labelEn.trim() }
        : { source: 'outcome' as const, domain, metric: metric.trim(), unit, side, comparator, target: n, labelNl: labelNl.trim(), labelEn: labelEn.trim() };
      await api.put(`/programs/${programId}/boss`, body);
      await qc.invalidateQueries({ queryKey: ['boss-goal', programId] });
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };

  if (acl) return <AclGoalEditor programId={programId} goals={goals} />;

  return (
    <form className="space-y-3 rounded-xl border border-line bg-canvas p-3" aria-labelledby="boss-goal-title" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div>
        <h3 id="boss-goal-title" className="text-[15px] font-bold text-ink-950">{t('Meting-boss', 'Measurement boss')}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{t('Het doel verslaan opent de volgende fase niet. Jij geeft die zelf vrij.', 'Beating the goal does not open the next phase. You release that yourself.')}</p>
      </div>
      {existing?.defeatedAt && <p className="rounded-lg bg-ok-soft px-3 py-2 text-[14px] font-semibold text-ok">{t('Doel gehaald. De volgende fase staat nog niet open.', 'Goal met. The next phase is not open yet.')}</p>}
      {clinical && (
        <label className="grid gap-1 text-[13px] font-medium">{t('Soort meting', 'Measurement')}
          <select className="min-h-[44px] rounded-lg border border-line bg-white p-2" value={source} onChange={(e) => setSource(e.target.value as 'outcome' | 'mobility')}>
            <option value="outcome">{t('Meting van de therapeut', 'Therapist measurement')}</option>
            <option value="mobility">{t('Zelftest, na jouw bevestiging', 'Self-test, after you confirm it')}</option>
          </select>
        </label>
      )}
      {(source === 'mobility' || !clinical) ? (
        <label className="grid gap-1 text-[13px] font-medium">{t('Zelftest', 'Self-test')}
          <select className="min-h-[44px] rounded-lg border border-line bg-white p-2" value={testKey} onChange={(e) => setTestKey(e.target.value)}>
            {MOBILITY_TESTS.map((m) => <option key={m.key} value={m.key}>{locale === 'nl' ? m.name[0] : m.name[1]}</option>)}
          </select>
        </label>
      ) : (
        <>
          <label className="grid gap-1 text-[13px] font-medium">{t('Domein', 'Domain')}
            <select className="min-h-[44px] rounded-lg border border-line bg-white p-2" value={domain} onChange={(e) => { setDomain(e.target.value); setUnit(e.target.value === 'rom' ? 'degrees' : e.target.value === 'strength' ? 'kg' : 'score_0_10'); }}>
              <option value="rom">ROM</option>
              <option value="strength">{t('Kracht', 'Strength')}</option>
              <option value="function">{t('Functie', 'Function')}</option>
              <option value="confidence">{t('Vertrouwen', 'Confidence')}</option>
            </select>
          </label>
          <Input label={t('Naam van de meting', 'Measurement name')} value={metric} onChange={(e) => setMetric(e.target.value)} maxLength={80} placeholder={t('Bijv. kniebuiging', 'E.g. knee flexion')} />
          <label className="grid gap-1 text-[13px] font-medium">{t('Eenheid', 'Unit')}
            <select className="min-h-[44px] rounded-lg border border-line bg-white p-2" value={unit} onChange={(e) => setUnit(e.target.value)}>
              {domain === 'rom' && <option value="degrees">°</option>}
              {domain === 'strength' && <><option value="kg">kg</option><option value="N">N</option></>}
              {(domain === 'function' || domain === 'confidence') && <><option value="score_0_10">0–10</option><option value="percent">%</option></>}
            </select>
          </label>
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-[13px] font-medium">{t('Zijde', 'Side')}
          <select className="min-h-[44px] rounded-lg border border-line bg-white p-2" value={side} onChange={(e) => setSide(e.target.value)}>
            <option value={clinical && source === 'outcome' ? 'not_applicable' : 'none'}>{t('Niet van toepassing', 'Not applicable')}</option>
            <option value="left">{t('Links', 'Left')}</option>
            <option value="right">{t('Rechts', 'Right')}</option>
            {source === 'outcome' && clinical && <option value="bilateral">{t('Beide', 'Both')}</option>}
          </select>
        </label>
        <label className="grid gap-1 text-[13px] font-medium">{t('Vergelijking', 'Comparison')}
          <select className="min-h-[44px] rounded-lg border border-line bg-white p-2" value={comparator} onChange={(e) => setComparator(e.target.value as 'gte' | 'lte')}>
            <option value="gte">{t('minstens', 'at least')}</option>
            <option value="lte">{t('hoogstens', 'at most')}</option>
          </select>
        </label>
        <Input label={t('Streefwaarde', 'Target')} type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
      </div>
      <Input label={t('Naam voor de patiënt', 'Name for the patient')} value={labelNl} onChange={(e) => setLabelNl(e.target.value)} maxLength={80} placeholder={t('Bijv. knie buigen', 'E.g. bend the knee')} />
      <Input label={t('Engelse naam', 'English name')} value={labelEn} onChange={(e) => setLabelEn(e.target.value)} maxLength={80} />
      {error && <p role="alert" className="text-[13px] text-bad">{error}</p>}
      <Button type="submit" loading={busy}>{existing ? t('Doel bijwerken', 'Update goal') : t('Doel opslaan', 'Save goal')}</Button>
    </form>
  );
}

function AclGoalEditor({ programId, goals }: { programId: string; goals: Goal[] }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [rows, setRows] = useState(goals.map((g) => ({ slot: g.slot ?? 1, comparator: g.comparator, target: String(g.target), labelNl: g.labelNl, labelEn: g.labelEn, mode: g.mode ?? 'value' })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const defeated = goals.every((g) => g.defeatedAt);
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await api.put(`/programs/${programId}/boss`, {
        criteria: rows.map((r) => ({ slot: r.slot, comparator: r.mode === 'recorded' ? 'recorded' : r.comparator, target: Number(r.target), labelNl: r.labelNl.trim(), labelEn: r.labelEn.trim() })),
      });
      await qc.invalidateQueries({ queryKey: ['boss-goal', programId] });
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="space-y-3 rounded-xl border border-line bg-canvas p-3" aria-labelledby="boss-goal-title" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div>
        <h3 id="boss-goal-title" className="text-[15px] font-bold text-ink-950">{t('Meting-boss', 'Measurement boss')}{goals[0]?.bossNl ? ` · ${locale === 'nl' ? goals[0].bossNl : goals[0].bossEn}` : ''}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{t('Standaardwaarden — door de fysiotherapeut te beoordelen en aan te passen. Het doel verslaan opent de volgende fase niet.', 'Default values — for the physiotherapist to judge and change. Beating the goal does not open the next phase.')}</p>
      </div>
      {defeated && <p className="rounded-lg bg-ok-soft px-3 py-2 text-[14px] font-semibold text-ok">{t('Doel gehaald. De volgende fase staat nog niet open.', 'Goal met. The next phase is not open yet.')}</p>}
      {goals.map((g, i) => (
        <fieldset key={g.slot ?? i} className="space-y-2 rounded-lg border border-line bg-white p-3">
          <legend className="px-1 text-[13px] font-semibold text-ink-900">{locale === 'nl' ? g.labelNl : g.labelEn}</legend>
          <p className="text-[13px] leading-relaxed text-ink-700">{locale === 'nl' ? g.clinicalNl : g.clinicalEn}</p>
          <Input label={t('Naam voor de patiënt', 'Name for the patient')} value={rows[i]?.labelNl ?? ''} onChange={(e) => setRows((list) => list.map((r, n) => n === i ? { ...r, labelNl: e.target.value } : r))} maxLength={80} />
          <Input label={t('Engelse naam', 'English name')} value={rows[i]?.labelEn ?? ''} onChange={(e) => setRows((list) => list.map((r, n) => n === i ? { ...r, labelEn: e.target.value } : r))} maxLength={80} />
          {g.mode === 'recorded' ? (
            <p className="text-[13px] text-ink-600">{t('Deze baas telt zodra de meting er is. Er is geen streefgetal.', 'This boss counts once the measurement exists. There is no target number.')}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-[13px] font-medium">{t('Vergelijking', 'Comparison')}
                <select className="min-h-[44px] rounded-lg border border-line bg-white p-2" value={rows[i]?.comparator ?? 'gte'} onChange={(e) => setRows((list) => list.map((r, n) => n === i ? { ...r, comparator: e.target.value as 'gte' | 'lte' } : r))}>
                  <option value="gte">{t('minstens', 'at least')}</option>
                  <option value="lte">{t('hoogstens', 'at most')}</option>
                </select>
              </label>
              <Input label={t('Streefwaarde', 'Target')} type="number" value={rows[i]?.target ?? ''} onChange={(e) => setRows((list) => list.map((r, n) => n === i ? { ...r, target: e.target.value } : r))} />
            </div>
          )}
        </fieldset>
      ))}
      {error && <p role="alert" className="text-[13px] text-bad">{error}</p>}
      <Button type="submit" loading={busy}>{t('Doel bijwerken', 'Update goal')}</Button>
    </form>
  );
}
