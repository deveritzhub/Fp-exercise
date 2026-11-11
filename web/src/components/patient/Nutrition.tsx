import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Info, Minus, Plus, Scale, Trash2 } from 'lucide-react';
import { PROTEIN_FOODS, PROTEIN_SOURCES, PROTEIN_TIERS, type ProteinTier, type ProteinZone } from '@shared/protein';
import { LOG_XP, PROTEIN } from '@shared/patientLogs';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Button, Notice, useToast } from '@/components/ui';
import type { HeroState } from '@/lib/types';

const ZONE_COLOUR: Record<ProteinTier, string> = { minimum: '#c9a24a', suboptimal: '#5f9c7d', optimal: '#29483C' };
/** Darker text versions (contrast ≥ 4.5:1 on white and on the soft green). */
const ZONE_TEXT: Record<ProteinTier, string> = { minimum: '#7a5a0e', suboptimal: '#2f6b4f', optimal: '#29483C' };
const buzz = () => {
  try {
    navigator.vibrate?.(12);
  } catch {
    /* not supported */
  }
};

/** Refetch the hero and return how much XP the last action earned. */
export async function refreshHero(qc: ReturnType<typeof useQueryClient>, beforeXp: number) {
  const after = await qc.fetchQuery({ queryKey: ['patient-hero'], queryFn: () => api.get<HeroState>('/patient/hero'), staleTime: 0 });
  return { xp: after.level.xp - beforeXp, state: after };
}

export function zoneLabel(z: ProteinZone | null, nl: boolean) {
  if (z === 'optimal') return nl ? 'Optimaal' : 'Optimal';
  if (z === 'suboptimal') return nl ? 'Suboptimaal' : 'Sub-optimal';
  if (z === 'minimum') return nl ? 'Minimaal' : 'Minimum';
  return nl ? 'Nog onder het minimum' : 'Below the minimum';
}

/**
 * Today's protein as a ring with the three levels as marks. The ring's full circle is the top of
 * the useful range (2,2 g/kg), so "optimal" sits at about three quarters.
 */
export function ProteinRing({ d, size = 168 }: { d: HeroState; size?: number }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const p = d.logs.protein;
  const tg = p.targets;
  const full = tg ? tg.optimalUpper : p.goal ?? p.suggested;
  const frac = Math.min(1, p.grams / Math.max(1, full));
  const r = 44;
  const c = 2 * Math.PI * r;
  const zoneColour = p.zone && p.zone !== 'below' ? ZONE_COLOUR[p.zone] : '#9aa7a1';
  const marks = tg ? (['minimum', 'suboptimal', 'optimal'] as const).map((k) => ({ k, at: tg[k] / full })) : [];
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={t(`Eiwit vandaag: ${p.grams} gram, ${zoneLabel(p.zone, true)}`, `Protein today: ${p.grams} grams, ${zoneLabel(p.zone, false)}`)}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(var(--accent-soft))" strokeWidth="9" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={zoneColour} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${c * frac} ${c}`}
          className="transition-[stroke-dasharray,stroke] duration-700 ease-out motion-reduce:transition-none"
        />
        {marks.map((m) => {
          const a = m.at * 2 * Math.PI;
          const x1 = 50 + (r - 7) * Math.cos(a);
          const y1 = 50 + (r - 7) * Math.sin(a);
          const x2 = 50 + (r + 7) * Math.cos(a);
          const y2 = 50 + (r + 7) * Math.sin(a);
          return <line key={m.k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ZONE_COLOUR[m.k]} strokeWidth="2.2" strokeLinecap="round" />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden>
        <span className="font-display text-[34px] font-extrabold leading-none tabular-nums text-ink-950">{p.grams}<span className="text-[15px] font-semibold text-ink-500"> g</span></span>
        <span className="mt-1 text-[12.5px] font-semibold" style={{ color: p.zone && p.zone !== 'below' ? ZONE_TEXT[p.zone] : '#55625c' }}>{p.zone === 'below' || !p.zone ? t('onder minimum', 'below minimum') : zoneLabel(p.zone, nl)}</span>
        {p.goal !== null && <span className="text-[11.5px] text-ink-500">{t(`doel ${p.goal} g`, `goal ${p.goal} g`)}</span>}
      </div>
    </div>
  );
}

/** One tap per food or amount. Used on the logbook and in the + sheet. */
export function ProteinQuickAdd({ d, onDone }: { d: HeroState; onDone?: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [custom, setCustom] = useState(20);
  const add = async (key: string, grams: number, label?: string) => {
    setBusy(key);
    buzz();
    const before = d.logs.protein.zone;
    try {
      await api.post('/patient/logs/protein', { grams, label });
      const { xp, state } = await refreshHero(qc, d.level.xp);
      const zone = state.logs.protein.zone;
      const levelUp = zone && zone !== before && zone !== 'below';
      toast(
        levelUp
          ? t(`+${grams} g · ${zoneLabel(zone, true)} bereikt!${xp > 0 ? ` +${xp} XP` : ''}`, `+${grams} g · ${zoneLabel(zone, false)} reached!${xp > 0 ? ` +${xp} XP` : ''}`)
          : t(`+${grams} g eiwit${xp > 0 ? ` · +${xp} XP` : ''}`, `+${grams} g protein${xp > 0 ? ` · +${xp} XP` : ''}`),
        'ok',
      );
      onDone?.();
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('Snel grammen toevoegen', 'Quickly add grams')}>
        {[10, 20, 30].map((g) => (
          <button key={g} type="button" disabled={!!busy} onClick={() => add(`g${g}`, g)}
            className="tap flex h-14 items-center justify-center gap-1 rounded-2xl bg-accent text-[18px] font-bold text-accent-ink shadow-xs active:scale-95 disabled:opacity-60 motion-reduce:active:scale-100">
            <Plus className="h-4 w-4" aria-hidden />{g} g
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-white p-2">
        <button type="button" aria-label={t('5 gram minder', '5 grams less')} onClick={() => setCustom((n) => Math.max(PROTEIN.perEntryMin, n - 5))} className="tap flex h-11 w-11 items-center justify-center rounded-xl bg-canvas"><Minus className="h-4 w-4" /></button>
        <output className="min-w-0 flex-1 text-center font-display text-[20px] font-bold tabular-nums" aria-live="polite">{custom} g</output>
        <button type="button" aria-label={t('5 gram meer', '5 grams more')} onClick={() => setCustom((n) => Math.min(PROTEIN.perEntryMax, n + 5))} className="tap flex h-11 w-11 items-center justify-center rounded-xl bg-canvas"><Plus className="h-4 w-4" /></button>
        <Button loading={busy === 'custom'} onClick={() => add('custom', custom)}>{t('Toevoegen', 'Add')}</Button>
      </div>
      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-ink-700">{t('Of kies wat je at (ongeveer)', 'Or pick what you ate (approx.)')}</p>
        <ul className="flex flex-wrap gap-2">
          {PROTEIN_FOODS.map((f) => (
            <li key={f.key}>
              <button type="button" disabled={!!busy} onClick={() => add(f.key, f.grams, (nl ? f.nl : f.en).slice(0, 40))}
                className="tap inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[14px] hover:border-accent active:scale-95 disabled:opacity-60 motion-reduce:active:scale-100">
                <span>{nl ? f.nl : f.en}</span>
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[12.5px] font-bold tabular-nums text-accent">{f.grams} g</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Levels card: minimum / suboptimal / optimal for this person, and which one is the goal. */
export function ProteinLevels({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const p = d.logs.protein;
  const w = d.logs.weight;
  const tg = p.targets;
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      await refreshHero(qc, d.level.xp);
      toast(ok, 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };
  if (!tg) {
    return (
      <Notice tone="info" title={t('Vul je gewicht in', 'Enter your weight')}>
        {t('Dan rekenen we uit wat minimaal, suboptimaal en optimaal is voor jouw lichaam.', 'Then we work out what minimum, sub-optimal and optimal mean for your body.')}
      </Notice>
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t('Kies je dagdoel', 'Choose your daily goal')}>
        {PROTEIN_TIERS.map((tier) => {
          const grams = tg[tier.key];
          const chosen = p.tier === tier.key;
          const reached = p.grams >= grams;
          return (
            <button
                key={tier.key}
                type="button"
                role="radio"
                aria-checked={chosen}
                disabled={!!busy}
                onClick={() => run(tier.key, () => api.put('/patient/logs/protein-goal', { tier: tier.key }), t(`Doel: ${tier.nl.toLowerCase()} (${grams} g)`, `Goal: ${tier.en.toLowerCase()} (${grams} g)`))}
                className={cn('tap relative flex w-full flex-col items-start rounded-2xl border-2 p-3 text-left transition-colors', chosen ? 'border-accent bg-accent-soft' : 'border-line bg-white hover:border-ink-300')}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[14px] font-bold" style={{ color: ZONE_TEXT[tier.key] }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: ZONE_COLOUR[tier.key] }} aria-hidden />{nl ? tier.nl : tier.en}
                  </span>
                  {reached && <Check className="h-4 w-4 text-ok" aria-label={t('vandaag gehaald', 'reached today')} />}
                </span>
                <span className="mt-1 font-display text-[22px] font-extrabold tabular-nums text-ink-950">{grams} g</span>
                <span className="text-[12.5px] text-ink-600">{(w.olderAdult ? tier.gPerKgOlder : tier.gPerKg).toLocaleString(nl ? 'nl-NL' : 'en-GB')} g/kg · {nl ? tier.whyNl : tier.whyEn}</span>
                {chosen && <span className="mt-1.5 rounded-full bg-accent px-2 py-0.5 text-[11.5px] font-bold text-accent-ink">{t('jouw doel', 'your goal')}</span>}
            </button>
          );
        })}
      </div>
      <p className="text-[13.5px] text-ink-700">
        {t(`Verdeel het over de dag: ongeveer ${tg.perMeal} g per maaltijd, 4 keer per dag. Meer dan ${tg.optimalUpper} g per dag levert geen extra spier op.`, `Spread it over the day: about ${tg.perMeal} g per meal, 4 times a day. More than ${tg.optimalUpper} g a day does not add extra muscle.`)}
        {tg.adjusted && t(` Gerekend met een aangepast gewicht van ${tg.referenceKg} kg (gebruikelijk bij een BMI boven 30).`, ` Calculated with an adjusted weight of ${tg.referenceKg} kg (usual with a BMI above 30).`)}
      </p>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[14.5px]">
        <input type="checkbox" className="h-5 w-5 accent-[rgb(var(--accent))]" checked={w.olderAdult} disabled={!!busy}
          onChange={(e) => run('older', () => api.put('/patient/logs/older-adult', { olderAdult: e.target.checked }), t('Bijgewerkt', 'Updated'))} />
        {t('Ik ben 65 jaar of ouder (minimum gaat naar 1,0 g/kg)', 'I am 65 or older (minimum becomes 1.0 g/kg)')}
      </label>
      <details className="text-[13px] text-ink-600">
        <summary className="flex min-h-[44px] cursor-pointer items-center gap-1.5 font-medium text-ink-700"><Info className="h-4 w-4" aria-hidden />{t('Waar komt dit vandaan?', 'Where does this come from?')}</summary>
        <p className="mb-1">{t('Gebaseerd op recente richtlijnen en onderzoek voor gezonde volwassenen. Heb je een nierziekte of een voorgeschreven dieet? Volg dan het advies van je arts of diëtist.', 'Based on recent guidelines and research for healthy adults. Do you have kidney disease or a prescribed diet? Follow your doctor or dietitian.')}</p>
        <ul className="list-disc space-y-0.5 pl-5">{PROTEIN_SOURCES.map((s) => <li key={s}>{s}</li>)}</ul>
      </details>
      <p className="text-[12.5px] text-ink-500">{t(`Je dagdoel halen levert één keer per dag +${LOG_XP.proteinGoal} XP op.`, `Reaching your daily goal earns +${LOG_XP.proteinGoal} XP once a day.`)}</p>
    </div>
  );
}

export function ProteinEntries({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const entries = d.logs.protein.entries;
  if (!entries.length) return null;
  return (
    <ul className="divide-y divide-line rounded-xl border border-line" aria-label={t('Eiwit vandaag', 'Protein today')}>
      {entries.map((e) => (
        <li key={e.id} className="flex items-center gap-2 px-3 py-1">
          <span className="min-w-0 flex-1 text-[14.5px]"><strong className="tabular-nums">{e.grams} g</strong>{e.label ? <span className="text-ink-600"> · {e.label}</span> : null}</span>
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-500 hover:bg-canvas" aria-label={t(`Verwijder ${e.grams} g`, `Remove ${e.grams} g`)}
            onClick={async () => {
              try {
                await api.del(`/patient/logs/protein/${e.id}`);
                await refreshHero(qc, d.level.xp);
                toast(t('Verwijderd', 'Removed'));
              } catch (err) {
                toast(describeError(err, locale), 'bad');
              }
            }}><Trash2 className="h-4 w-4" /></button>
        </li>
      ))}
    </ul>
  );
}

/** Weight: log today's value, see the last 90 days. No XP and no judgement. */
export function WeightLog({ d, onDone }: { d: HeroState; onDone?: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const w = d.logs.weight;
  const [kg, setKg] = useState<number>(w.latestKg ?? 75);
  const [busy, setBusy] = useState(false);
  const step = (n: number) => setKg((v) => Math.min(300, Math.max(20, Math.round((v + n) * 10) / 10)));
  const save = async () => {
    setBusy(true);
    buzz();
    try {
      await api.post('/patient/logs/weight', { kg });
      const { state } = await refreshHero(qc, d.level.xp);
      const tg = state.logs.protein.targets;
      toast(tg ? t(`Opgeslagen. Optimaal eiwit voor jou: ${tg.optimal} g per dag`, `Saved. Optimal protein for you: ${tg.optimal} g a day`) : t('Opgeslagen', 'Saved'), 'ok');
      onDone?.();
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  const h = w.history;
  const fmt = (n: number) => n.toLocaleString(nl ? 'nl-NL' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-white p-2">
        <button type="button" aria-label={t('0,1 kg minder', '0.1 kg less')} onClick={() => step(-0.1)} className="tap flex h-12 w-12 items-center justify-center rounded-xl bg-canvas"><Minus className="h-5 w-5" /></button>
        <label className="min-w-0 flex-1 text-center">
          <span className="sr-only">{t('Gewicht in kg', 'Weight in kg')}</span>
          <input
            inputMode="decimal"
            value={fmt(kg)}
            onChange={(e) => {
              const n = Number(e.target.value.replace(',', '.'));
              if (Number.isFinite(n) && n > 0) setKg(n);
            }}
            className="w-full bg-transparent text-center font-display text-[28px] font-extrabold tabular-nums text-ink-950 focus:outline-none"
          />
          <span className="block text-[12px] text-ink-500">kg</span>
        </label>
        <button type="button" aria-label={t('0,1 kg meer', '0.1 kg more')} onClick={() => step(0.1)} className="tap flex h-12 w-12 items-center justify-center rounded-xl bg-canvas"><Plus className="h-5 w-5" /></button>
      </div>
      <Button size="lg" className="w-full" loading={busy} icon={<Scale className="h-4 w-4" aria-hidden />} onClick={save}>{t('Gewicht opslaan', 'Save weight')}</Button>
      {h.length > 1 && <WeightSpark history={h} />}
      <p className="text-[12.5px] text-ink-500">{t('Alleen jij ziet je gewicht; je praktijk niet. Wegen levert geen XP op.', 'Only you see your weight; your practice does not. Weighing earns no XP.')}</p>
    </div>
  );
}

function WeightSpark({ history }: { history: { day: string; kg: number }[] }) {
  const { t, locale } = useI18n();
  const min = Math.min(...history.map((p) => p.kg));
  const max = Math.max(...history.map((p) => p.kg));
  const span = Math.max(1, max - min);
  const W = 300;
  const H = 64;
  const pts = history.map((p, i) => [8 + (i / (history.length - 1)) * (W - 16), 8 + (1 - (p.kg - min) / span) * (H - 16)] as const);
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const last = history[history.length - 1];
  const first = history[0];
  const diff = Math.round((last.kg - first.kg) * 10) / 10;
  const fmt = (n: number) => n.toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB', { maximumFractionDigits: 1 });
  return (
    <figure className="rounded-xl border border-line bg-white p-3">
      <figcaption className="flex justify-between text-[13px] text-ink-600">
        <span>{t(`Laatste ${history.length} metingen`, `Last ${history.length} measurements`)}</span>
        <span className="tabular-nums">{diff === 0 ? t('gelijk', 'unchanged') : `${diff > 0 ? '+' : ''}${fmt(diff)} kg`}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 h-16 w-full" role="img" aria-label={t(`Gewicht van ${fmt(first.kg)} naar ${fmt(last.kg)} kg`, `Weight from ${fmt(first.kg)} to ${fmt(last.kg)} kg`)}>
        <path d={`${path} L${pts[pts.length - 1][0]},${H} L${pts[0][0]},${H} Z`} fill="rgb(var(--accent-soft))" />
        <path d={path} fill="none" stroke="rgb(var(--accent))" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.6" fill="rgb(var(--accent))" />
      </svg>
    </figure>
  );
}
