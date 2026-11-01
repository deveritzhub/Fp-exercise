import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Beef, Dumbbell, Footprints, Minus, Plus, Scale } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Button, Dialog, Spinner, useToast } from '@/components/ui';
import { useHero } from '@/pages/patient/HeroPages';
import { ProteinQuickAdd, ProteinRing, WeightLog, refreshHero, zoneLabel } from './Nutrition';

type Tab = 'protein' | 'weight' | 'steps';

/**
 * The + button: log protein, weight or steps in two taps from anywhere in the patient app.
 * Sits above the tab bar, clear of the phone's home indicator.
 */
export function QuickLogButton() {
  const { t } = useI18n();
  const hero = useHero();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('protein');
  if (!hero.data?.hero) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('Snel loggen: eiwit, gewicht of stappen', 'Quick log: protein, weight or steps')}
        className="tap fixed z-30 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-ink shadow-pop ring-4 ring-white transition-transform hover:scale-105 active:scale-95 motion-reduce:transition-none print:hidden"
        style={{ right: 'max(16px, calc(env(safe-area-inset-right, 0px) + 16px))', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' }}
      >
        <Plus className="h-8 w-8" strokeWidth={2.6} aria-hidden />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} sheet size="md" title={t('Snel loggen', 'Quick log')}>
        <div className="space-y-4">
          <div role="tablist" aria-label={t('Wat wil je loggen?', 'What do you want to log?')} className="grid grid-cols-3 gap-1 rounded-2xl bg-ink-100 p-1">
            {([
              ['protein', Beef, t('Eiwit', 'Protein')],
              ['weight', Scale, t('Gewicht', 'Weight')],
              ['steps', Footprints, t('Stappen', 'Steps')],
            ] as const).map(([k, Icon, label]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={cn('flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl text-[14.5px] font-semibold', tab === k ? 'bg-white text-ink-950 shadow-xs' : 'text-ink-600')}>
                <Icon className="h-4 w-4" aria-hidden />{label}
              </button>
            ))}
          </div>
          {!hero.data ? <Spinner /> : tab === 'protein' ? (
            <div className="space-y-4" role="tabpanel">
              <div className="flex items-center gap-4">
                <ProteinRing d={hero.data} size={112} />
                <p className="min-w-0 flex-1 text-[14px] text-ink-700">
                  {hero.data.logs.protein.targets
                    ? t(`Vandaag: ${zoneLabel(hero.data.logs.protein.zone, true).toLowerCase()}. Optimaal voor jou is ${hero.data.logs.protein.targets.optimal} g.`, `Today: ${zoneLabel(hero.data.logs.protein.zone, false).toLowerCase()}. Optimal for you is ${hero.data.logs.protein.targets.optimal} g.`)
                    : t('Vul je gewicht in, dan zie je wat minimaal, suboptimaal en optimaal is voor jou.', 'Enter your weight to see what minimum, sub-optimal and optimal mean for you.')}
                </p>
              </div>
              <ProteinQuickAdd d={hero.data} />
            </div>
          ) : tab === 'weight' ? (
            <div role="tabpanel"><WeightLog d={hero.data} /></div>
          ) : (
            <div role="tabpanel"><StepsQuick /></div>
          )}
          <Link to="/p/logboek" onClick={() => setOpen(false)} className="flex min-h-[44px] items-center justify-center gap-2 text-[14.5px] font-medium text-accent">
            <Dumbbell className="h-4 w-4" aria-hidden />{t('Eigen training loggen of alles bekijken', 'Log your own workout or see everything')}
          </Link>
        </div>
      </Dialog>
    </>
  );
}

function StepsQuick() {
  const { t, locale } = useI18n();
  const hero = useHero();
  const qc = useQueryClient();
  const toast = useToast();
  const s = hero.data!.logs.steps;
  const [n, setN] = useState(s.today || 1000);
  const [busy, setBusy] = useState(false);
  const fmt = (v: number) => v.toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB');
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-white p-2">
        <button type="button" aria-label={t('500 stappen minder', '500 steps less')} onClick={() => setN((v) => Math.max(0, v - 500))} className="tap flex h-12 w-12 items-center justify-center rounded-xl bg-canvas"><Minus className="h-5 w-5" /></button>
        <output className="min-w-0 flex-1 text-center font-display text-[26px] font-extrabold tabular-nums" aria-live="polite">{fmt(n)}</output>
        <button type="button" aria-label={t('500 stappen meer', '500 steps more')} onClick={() => setN((v) => Math.min(100_000, v + 500))} className="tap flex h-12 w-12 items-center justify-center rounded-xl bg-canvas"><Plus className="h-5 w-5" /></button>
      </div>
      <p className="text-center text-[13px] text-ink-600">{t(`Doel vandaag: ${fmt(s.goal)}`, `Goal today: ${fmt(s.goal)}`)}</p>
      <Button size="lg" className="w-full" loading={busy} icon={<Footprints className="h-4 w-4" aria-hidden />} onClick={async () => {
        setBusy(true);
        try {
          await api.put('/patient/logs/steps', { steps: n });
          const { xp } = await refreshHero(qc, hero.data!.level.xp);
          toast(xp > 0 ? t(`Stappen opgeslagen · +${xp} XP`, `Steps saved · +${xp} XP`) : t('Stappen opgeslagen', 'Steps saved'), 'ok');
        } catch (e) {
          toast(describeError(e, locale), 'bad');
        } finally {
          setBusy(false);
        }
      }}>{t('Stappen opslaan', 'Save steps')}</Button>
    </div>
  );
}
