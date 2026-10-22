import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Dumbbell, FlaskConical, HeartPulse, Info, Move, Ruler, Siren } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { fmtDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { CriteriaCheck, CriteriaGroup, ProgramModule } from '@/lib/types';

export function useModules() {
  const { t } = useI18n();
  return {
    revalidatie: { label: t('Revalidatie', 'Rehabilitation'), icon: HeartPulse },
    kracht: { label: t('Kracht', 'Strength'), icon: Dumbbell },
    mobiliteit: { label: t('Mobiliteit', 'Mobility'), icon: Move },
  } satisfies Record<ProgramModule, { label: string; icon: typeof HeartPulse }>;
}

export function ModuleBadge({ module, className }: { module: ProgramModule; className?: string }) {
  const m = useModules()[module];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md bg-ink-100 px-1.5 py-0.5 text-[12px] font-medium text-ink-700', className)}>
      <m.icon className="h-3.5 w-3.5" aria-hidden />
      {m.label}
    </span>
  );
}

/**
 * Criteria for the next phase: each with the test (measurement method), threshold and source.
 * With `onToggle`, the therapist ticks them for one patient (name + date are stored).
 */
export function CriteriaList({ groups, checks, onToggle, busy }: { groups: CriteriaGroup[]; checks?: CriteriaCheck[]; onToggle?: (key: string, checked: boolean) => void; busy?: string | null }) {
  const { t, locale } = useI18n();
  if (!groups.length) return null;
  const byKey = new Map((checks ?? []).map((c) => [c.key, c]));
  return (
    <div className="space-y-4">
      {groups.map((g, gi) => {
        const done = g.items.filter((_, ii) => byKey.has(`${gi}.${ii}`)).length;
        return (
          <section key={gi} aria-label={g.title}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h4 className="text-[13.5px] font-semibold text-ink-900">{g.title}</h4>
              {checks && <span className={cn('text-[12px] font-medium tabular-nums', done === g.items.length ? 'text-ok' : 'text-ink-500')}>{done}/{g.items.length}</span>}
            </div>
            <ul className="space-y-2">
              {g.items.map((c, ii) => {
                const key = `${gi}.${ii}`;
                const check = byKey.get(key);
                const Inner = (
                  <>
                    {onToggle ? (
                      check ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" aria-hidden /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-ink-300" aria-hidden />
                    ) : (
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium leading-snug text-ink-900">{c.label}</span>
                      {(c.threshold || c.test) && (
                        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-ink-600">
                          {c.threshold && (
                            <span className="inline-flex items-start gap-1">
                              <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
                              <span><span className="sr-only">{t('Drempel', 'Threshold')}: </span>{c.threshold}</span>
                            </span>
                          )}
                          {c.test && (
                            <span className="inline-flex items-start gap-1">
                              <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden />
                              <span><span className="font-medium text-ink-700">{t('Test', 'Test')}:</span> {c.test}</span>
                            </span>
                          )}
                        </span>
                      )}
                      {c.source && <span className="mt-0.5 block text-[11.5px] text-ink-400">{t('Bron', 'Source')}: {c.source}</span>}
                      {check && (
                        <span className="mt-1 block text-[12px] font-medium text-ok">
                          ✓ {check.checkedBy ?? '—'} · {fmtDate(check.checkedAt, locale)}
                          {check.note && <span className="font-normal text-ink-600"> — {check.note}</span>}
                        </span>
                      )}
                    </span>
                  </>
                );
                return (
                  <li key={key}>
                    {onToggle ? (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={!!check}
                        disabled={busy === key}
                        onClick={() => onToggle(key, !check)}
                        className={cn(
                          'tap flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-60',
                          check ? 'border-ok/30 bg-ok-soft/50' : 'border-line bg-white hover:border-ink-300 active:bg-ink-50',
                        )}
                      >
                        {Inner}
                      </button>
                    ) : (
                      <div className="flex items-start gap-2.5">{Inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function RedFlags({ flags }: { flags: string[] }) {
  const { t } = useI18n();
  if (!flags.length) return null;
  return (
    <div className="rounded-xl border border-bad/20 bg-bad-soft/50 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-bad">
        <Siren className="h-4 w-4" aria-hidden />
        {t('Rode vlaggen — stoppen en contact', 'Red flags — stop and get in touch')}
      </div>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13.5px] text-ink-800">
        {flags.map((f) => <li key={f}>{f}</li>)}
      </ul>
    </div>
  );
}

export function Warnings({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((w) => (
        <li key={w} className="flex items-start gap-2 rounded-lg bg-warn-soft/60 px-3 py-2 text-[13px] text-ink-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
          {w}
        </li>
      ))}
    </ul>
  );
}

export function Evidence({ text }: { text: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div className="text-[13px]">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="tap inline-flex items-center gap-1.5 font-medium text-ink-600 hover:text-ink-900">
        <Info className="h-4 w-4" aria-hidden />
        {open ? t('Onderbouwing verbergen', 'Hide evidence') : t('Onderbouwing tonen', 'Show evidence')}
      </button>
      {open && <p className="mt-1.5 whitespace-pre-line leading-relaxed text-ink-600">{text}</p>}
    </div>
  );
}
