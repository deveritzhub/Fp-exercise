import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Droplets, Minus, Moon, Plus, Snowflake, Sparkles, Trash2, Zap, Lightbulb } from 'lucide-react';
import { SLEEP, SURVIVAL_XP, WATER } from '@shared/survival';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Button, useToast } from '@/components/ui';
import type { HeroState } from '@/lib/types';
import { refreshHero } from './Nutrition';

/** Open the + sheet on a given tab from anywhere (the button listens for this event). */
export const openQuickLog = (tab: 'protein' | 'water' | 'weight' | 'steps' | 'sleep') => window.dispatchEvent(new CustomEvent('fp:quicklog', { detail: tab }));

const fmtL = (ml: number, nl: boolean) => (ml / 1000).toLocaleString(nl ? 'nl-NL' : 'en-GB', { maximumFractionDigits: 2 }) + ' L';

function Meter({ icon, label, value, pct, tone, action, hint }: { icon: React.ReactNode; label: string; value: string; pct: number; tone: string; action?: React.ReactNode; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-line bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `${tone}22`, color: tone }} aria-hidden>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] font-semibold uppercase tracking-wide text-ink-600">{label}</span>
          <span className="block font-display text-[16px] font-bold leading-tight tabular-nums text-ink-950 [overflow-wrap:anywhere]">{value}</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-100" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-valuetext={value}>
        <div className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tone }} />
      </div>
      {hint && <span className="text-[12px] text-ink-500">{hint}</span>}
      {action}
    </div>
  );
}

/** Water, sleep, energy and stiffness of the hero, with buffs and gentle tips. */
export function SurvivalPanel({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const s = d.logs.survival;
  const [busy, setBusy] = useState<string | null>(null);
  const small = 'inline-flex min-h-[44px] items-center justify-center gap-1 rounded-lg bg-canvas px-2 text-[13px] font-semibold text-accent hover:bg-accent-soft disabled:opacity-60';
  // One tap = one glass of water / one sleep cycle (~90 min), straight from the meter.
  const plus = async (key: string, fn: () => Promise<unknown>, ok: (xp: number) => string) => {
    setBusy(key);
    try {
      navigator.vibrate?.(10);
    } catch {
      /* ignore */
    }
    try {
      await fn();
      const { xp } = await refreshHero(qc, d.level.xp);
      toast(ok(xp), 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };
  const glasses = Math.round(s.water.ml / WATER.glassMl);
  const cycles = s.sleep ? Math.round((s.sleep.hours / 1.5) * 10) / 10 : 0;
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card" aria-labelledby="survival-title">
      <h2 id="survival-title" className="t-section">{t('Conditie van je held', 'Your hero’s condition')}</h2>
      <p className="text-[13px] text-ink-600">{t('Houd je held fit: drinken, slapen en bewegen. Een lage meter kost niets, je krijgt alleen een tip.', 'Keep your hero fit: drink, sleep and move. A low meter costs nothing, you just get a tip.')}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Meter icon={<Droplets className="h-4 w-4" />} label={t('Water', 'Water')} value={`${fmtL(s.water.ml, nl)} / ${fmtL(s.water.target, nl)}`} pct={s.water.ratio * 100} tone="#2f7fb8"
          hint={t(`${glasses} ${glasses === 1 ? 'glas' : 'glazen'} van ${WATER.glassMl} ml`, `${glasses} glass${glasses === 1 ? '' : 'es'} of ${WATER.glassMl} ml`)}
          action={
            <div className="mt-0.5 grid grid-cols-[1fr_auto] gap-1">
              <button type="button" className={small} disabled={busy !== null} aria-label={t('Eén glas water erbij', 'One more glass of water')}
                onClick={() => plus('water', () => api.post('/patient/logs/water', { ml: WATER.glassMl }), (xp) => (xp > 0 ? t(`+1 glas · +${xp} XP`, `+1 glass · +${xp} XP`) : t('+1 glas', '+1 glass')))}>
                <Plus className="h-3.5 w-3.5" aria-hidden />{t('Glas', 'Glass')}
              </button>
              <button type="button" className={small} aria-label={t('Meer opties voor water', 'More water options')} onClick={() => openQuickLog('water')}>…</button>
            </div>
          } />
        <Meter icon={<Moon className="h-4 w-4" />} label={t('Slaap', 'Sleep')} value={s.sleep ? t(`${s.sleep.hours.toLocaleString('nl-NL')} uur`, `${s.sleep.hours} h`) : t('Nog niet ingevuld', 'Not filled in')} pct={s.sleep?.score ?? 0} tone="#6b5ca5"
          hint={t(`${cycles.toLocaleString('nl-NL')} slaapcycli van 90 min`, `${cycles} sleep cycles of 90 min`)}
          action={
            <div className="mt-0.5 grid grid-cols-[1fr_auto] gap-1">
              <button type="button" className={small} disabled={busy !== null} aria-label={t('Eén cyclus slaap erbij (90 minuten)', 'One more sleep cycle (90 minutes)')}
                onClick={() => plus('sleep', () => api.post('/patient/logs/sleep/cycle'), (xp) => (xp > 0 ? t(`+1 cyclus · +${xp} XP`, `+1 cycle · +${xp} XP`) : t('+1 slaapcyclus', '+1 sleep cycle')))}>
                <Plus className="h-3.5 w-3.5" aria-hidden />{t('Cyclus', 'Cycle')}
              </button>
              <button type="button" className={small} aria-label={t('Slaap aanpassen', 'Change sleep')} onClick={() => openQuickLog('sleep')}>…</button>
            </div>
          } />
        <Meter icon={<Zap className="h-4 w-4" />} label={t('Energie', 'Energy')} value={`${s.energy}%`} pct={s.energy} tone="#c98a1a" hint={t('Uit slaap, training en rust', 'From sleep, training and rest')} />
        <Meter icon={<Snowflake className="h-4 w-4" />} label={t('Stijfheid', 'Stiffness')} value={s.stiffness <= 20 ? t('Soepel', 'Loose') : s.stiffness <= 55 ? t('Wat stijf', 'A bit stiff') : t('Stijf', 'Stiff')} pct={s.stiffness} tone="#8a6d5c" hint={t('Daalt na elke beweging', 'Drops after any movement')} />
      </div>
      {s.status.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={t('Status', 'Status')}>
          {s.status.map((x) => (
            <li key={x.key} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium', x.kind === 'buff' ? 'bg-ok-soft text-ok' : 'bg-sand-soft text-sand-ink')}>
              {x.kind === 'buff' ? <Sparkles className="h-3.5 w-3.5" aria-hidden /> : <Lightbulb className="h-3.5 w-3.5" aria-hidden />}
              <span className="sr-only">{x.kind === 'buff' ? t('Bonus:', 'Buff:') : t('Tip:', 'Tip:')} </span>{nl ? x.nl : x.en}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** A water bottle that fills up; tap a glass or bottle to add it. */
export function WaterLog({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const w = d.logs.survival.water;
  const [busy, setBusy] = useState<number | null>(null);
  const fill = Math.min(1, w.ratio);
  const add = async (ml: number) => {
    setBusy(ml);
    try {
      navigator.vibrate?.(10);
    } catch {
      /* ignore */
    }
    try {
      await api.post('/patient/logs/water', { ml });
      const { xp, state } = await refreshHero(qc, d.level.xp);
      const hit = state.logs.survival.water.ratio >= 1 && w.ratio < 1;
      toast(hit ? t(`Waterdoel gehaald! +${xp} XP`, `Water goal reached! +${xp} XP`) : t(`+${ml} ml`, `+${ml} ml`), 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 60 120" className="h-28 w-14 shrink-0" role="img" aria-label={t(`${fmtL(w.ml, true)} van ${fmtL(w.target, true)} gedronken`, `${fmtL(w.ml, false)} of ${fmtL(w.target, false)} drunk`)}>
          <defs><clipPath id="bottle"><path d="M22,4 h16 v14 q14,8 14,24 v66 q0,8 -8,8 h-28 q-8,0 -8,-8 v-66 q0,-16 14,-24 Z" /></clipPath></defs>
          <path d="M22,4 h16 v14 q14,8 14,24 v66 q0,8 -8,8 h-28 q-8,0 -8,-8 v-66 q0,-16 14,-24 Z" fill="#eef5fa" stroke="#9cc3dd" strokeWidth="2" />
          <rect x="0" y={116 - fill * 98} width="60" height={fill * 98 + 4} fill="#2f7fb8" opacity=".85" clipPath="url(#bottle)" className="transition-[y,height] duration-700 ease-out motion-reduce:transition-none" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[26px] font-extrabold tabular-nums text-ink-950">{fmtL(w.ml, nl)}</p>
          <p className="text-[13.5px] text-ink-600">{t(`van ${fmtL(w.target, true)} vandaag (±30 ml per kg). Thee en koffie tellen mee.`, `of ${fmtL(w.target, false)} today (±30 ml per kg). Tea and coffee count.`)}</p>
          <p className="text-[12.5px] text-ink-500">{t(`Doel gehaald: +${SURVIVAL_XP.waterGoal} XP en Herstel, één keer per dag.`, `Goal reached: +${SURVIVAL_XP.waterGoal} XP and Recovery, once a day.`)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          [150, t('Kopje', 'Cup')],
          [WATER.glassMl, t('Glas', 'Glass')],
          [WATER.bottleMl, t('Flesje', 'Bottle')],
        ].map(([ml, label]) => (
          <button key={ml} type="button" disabled={busy !== null} onClick={() => add(ml as number)}
            className="tap flex h-16 flex-col items-center justify-center rounded-2xl bg-[#1f5f8f] text-white shadow-xs active:scale-95 disabled:opacity-60 motion-reduce:active:scale-100">
            <span className="flex items-center gap-1 text-[17px] font-bold"><Plus className="h-4 w-4" aria-hidden />{ml} ml</span>
            <span className="text-[12px] opacity-90">{label}</span>
          </button>
        ))}
      </div>
      {w.entries.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('Vandaag gedronken', 'Drunk today')}>
          {w.entries.map((e) => (
            <li key={e.id}>
              <button type="button" className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-line px-3 text-[13px] hover:border-bad" aria-label={t(`${e.ml} ml verwijderen`, `Remove ${e.ml} ml`)}
                onClick={async () => {
                  try {
                    await api.del(`/patient/logs/water/${e.id}`);
                    await refreshHero(qc, d.level.xp);
                  } catch (err) {
                    toast(describeError(err, locale), 'bad');
                  }
                }}>
                {e.ml} ml<Trash2 className="h-3.5 w-3.5 text-ink-500" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const QUALITY: [string, string][] = [['Slecht', 'Poor'], ['Matig', 'Fair'], ['Oké', 'OK'], ['Goed', 'Good'], ['Top', 'Great']];

export function SleepLog({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const s = d.logs.survival.sleep;
  const [hours, setHours] = useState(s?.hours ?? 7.5);
  const [quality, setQuality] = useState(s?.quality ?? 3);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-[14px] text-ink-700">{t(`Hoe heb je vannacht geslapen? Volwassenen hebben meestal ${SLEEP.minGood}–${SLEEP.maxGood} uur nodig.`, `How did you sleep last night? Adults usually need ${SLEEP.minGood}–${SLEEP.maxGood} hours.`)}</p>
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-white p-2">
        <button type="button" aria-label={t('Half uur minder', 'Half an hour less')} onClick={() => setHours((h) => Math.max(0, h - 0.5))} className="tap flex h-12 w-12 items-center justify-center rounded-xl bg-canvas"><Minus className="h-5 w-5" /></button>
        <output className="min-w-0 flex-1 text-center font-display text-[26px] font-extrabold tabular-nums" aria-live="polite">{hours.toLocaleString(nl ? 'nl-NL' : 'en-GB')} {t('uur', 'h')}</output>
        <button type="button" aria-label={t('Half uur meer', 'Half an hour more')} onClick={() => setHours((h) => Math.min(16, h + 0.5))} className="tap flex h-12 w-12 items-center justify-center rounded-xl bg-canvas"><Plus className="h-5 w-5" /></button>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-[14px] font-semibold text-ink-800">{t('Hoe uitgerust voel je je?', 'How rested do you feel?')}</legend>
        <div className="grid grid-cols-5 gap-1.5">
          {QUALITY.map(([qnl, qen], i) => (
            <label key={qnl} className={cn('relative flex min-h-[48px] cursor-pointer items-center justify-center rounded-xl border text-[13px] font-semibold', quality === i + 1 ? 'border-[#6b5ca5] bg-[#6b5ca5] text-white' : 'border-line bg-white text-ink-700')}>
              <input type="radio" name="sleep-quality" className="absolute inset-0 z-10 cursor-pointer opacity-0" checked={quality === i + 1} onChange={() => setQuality(i + 1)} />
              {nl ? qnl : qen}
            </label>
          ))}
        </div>
      </fieldset>
      <Button size="lg" className="w-full" loading={busy} icon={<Moon className="h-4 w-4" aria-hidden />} onClick={async () => {
        setBusy(true);
        try {
          await api.put('/patient/logs/sleep', { hours, quality });
          const { xp } = await refreshHero(qc, d.level.xp);
          toast(xp > 0 ? t(`Slaap opgeslagen · +${xp} XP`, `Sleep saved · +${xp} XP`) : t('Slaap opgeslagen', 'Sleep saved'), 'ok');
        } catch (e) {
          toast(describeError(e, locale), 'bad');
        } finally {
          setBusy(false);
        }
      }}>{t('Slaap opslaan', 'Save sleep')}</Button>
    </div>
  );
}
