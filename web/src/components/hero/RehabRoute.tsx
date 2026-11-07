import { useState } from 'react';
import { Check, ChevronRight, Flag, LockKeyhole, MapPin, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { inspectedPhase, rehabRoute, type RehabPhase } from '@shared/rehabRoute';
import { chapterBossState } from '@shared/chapterBoss';

/**
 * Read-only map of the existing treatment phases.
 * Selecting a node opens an explanation; it does not promote, approve or unlock a phase.
 * The professional's separate criteria checklist remains authoritative.
 */
export function RehabRoute({ phases, currentNo }: { phases: readonly RehabPhase[]; currentNo: number | null }) {
  const { t } = useI18n();
  const [selectedNo, setSelectedNo] = useState<number | null>(null);
  const route = rehabRoute(phases, currentNo);
  const selected = inspectedPhase(route.ordered, selectedNo, currentNo);
  if (!route.ordered.length || !selected) return null;

  const statusName = (status: RehabPhase['status']) =>
    status === 'done'
      ? t('Eerdere fase', 'Earlier phase')
      : status === 'current'
        ? t('Huidige fase', 'Current phase')
        : t('Vooruitblik · nog vergrendeld', 'Preview · still locked');

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-white" aria-labelledby="rehab-route-heading">
      <div className="bg-[#343F2A] px-4 py-4 text-white sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="rehab-route-heading" className="flex items-center gap-2 font-display text-[17px] font-bold text-white">
            <MapPin className="h-5 w-5 text-[#E8DFCD]" aria-hidden="true" />
            {t('Jouw revalidatieroute', 'Your rehabilitation route')}
          </h3>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-[#E8DFCD]">
            {t(`${route.completed} van ${route.total} hoofdstukken achter de rug`, `${route.completed} of ${route.total} chapters behind you`)}
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-[#E9E9DF]">
          {t('Bekijk je hoofdstukken. Alleen je fysiotherapeut kan een volgende fase vrijgeven.', 'Explore your chapters. Only your physiotherapist can clear the next phase.')}
        </p>
      </div>

      <ol className="space-y-0 px-3 pt-3 sm:px-5" aria-label={t('Hoofdstukken van je behandeltraject', 'Chapters of your rehabilitation plan')}>
        {route.ordered.map((ph, index) => {
          const isCurrent = ph.status === 'current';
          const isSelected = selected.no === ph.no;
          const past = ph.status === 'done';
          return (
            <li key={ph.no} className="relative pb-3 last:pb-1">
              {index < route.ordered.length - 1 && (
                <span aria-hidden="true" className={cn('absolute left-[19px] top-11 bottom-0 w-0.5 rounded-full', past ? 'bg-[#869A75]' : 'bg-ink-200')} />
              )}
              <button
                type="button"
                aria-pressed={isSelected}
                aria-current={isCurrent ? 'step' : undefined}
                aria-controls="rehab-route-detail"
                onClick={() => setSelectedNo(ph.no)}
                className={cn(
                  'relative flex min-h-[64px] w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-accent',
                  isSelected ? 'border-accent/40 bg-accent-soft' : 'border-line bg-white hover:border-ink-300 hover:bg-canvas',
                )}
              >
                <span aria-hidden="true" className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-bold',
                  past ? 'border-[#496246] bg-[#496246] text-white' :
                  isCurrent ? 'border-[#496246] bg-white text-[#343F2A]' :
                  'border-ink-200 bg-ink-50 text-ink-500',
                )}>
                  {past ? <Check className="h-5 w-5" /> : isCurrent ? <MapPin className="h-5 w-5" /> : <LockKeyhole className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-600">
                    {t(`Hoofdstuk ${ph.no}`, `Chapter ${ph.no}`)} · {statusName(ph.status)}
                  </span>
                  <span className="block text-[14.5px] font-bold text-ink-950">{ph.name || t(`Fase ${ph.no}`, `Phase ${ph.no}`)}</span>
                </span>
                <ChevronRight aria-hidden="true" className={cn('h-5 w-5 shrink-0', isSelected ? 'text-accent' : 'text-ink-400')} />
              </button>
            </li>
          );
        })}
      </ol>

      <div id="rehab-route-detail" className="border-t border-line bg-sand-soft/60 px-4 py-4 sm:px-5" role="region" aria-label={t('Geselecteerd hoofdstuk', 'Selected chapter')}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-ink-800">
            {selected.status === 'next' ? <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> : selected.status === 'current' ? <MapPin aria-hidden="true" className="h-3.5 w-3.5" /> : <Check aria-hidden="true" className="h-3.5 w-3.5" />}
            {statusName(selected.status)}
          </span>
          {selected.weeks && <span className="text-[12px] text-ink-600">{t('Indicatieve weken:', 'Indicative weeks:')} {selected.weeks}</span>}
        </div>
        <h4 className="mt-2 font-display text-[17px] font-bold text-ink-950">{selected.name || t(`Fase ${selected.no}`, `Phase ${selected.no}`)}</h4>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-800">
          {selected.goal
            ? <><strong>{t('Doel:', 'Goal:')}</strong> {selected.goal}</>
            : t('Voor deze fase is nog geen patiëntdoel ingevuld.', 'No patient-facing goal has been set for this phase.')}
        </p>
        <div className="mt-3 rounded-xl border border-[#D5C8AF] bg-[#343F2A] p-3 text-white">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#E8DFCD]">
            <Flag className="h-4 w-4" aria-hidden="true" />{t('Hoofdstukbaas · klinische mijlpaal', 'Chapter boss · clinical milestone')}
          </p>
          <p className="mt-1 text-[14px] font-semibold text-white">
            {chapterBossState(selected.status)==='past'
              ? t('Dit hoofdstuk ligt achter je', 'This chapter is behind you')
              : chapterBossState(selected.status)==='review'
                ? t('Laat je voortgang beoordelen', 'Have your progress assessed')
                : t('Nog niet beschikbaar', 'Not available yet')}
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#E8DFCD]">
            {t('Je fysiotherapeut gebruikt de afgesproken meetcriteria voor de faseovergang. Deze kaart geeft geen vrijgave, en XP of weken tellen niet als test.', 'Your physiotherapist uses your agreed assessment criteria for the phase transition. This card never grants clearance, and XP or elapsed weeks are not tests.')}
          </p>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#E0D5BF] bg-white p-3 text-[13px] leading-relaxed text-ink-800">
          {selected.status === 'done'
            ? <Flag aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            : selected.status === 'current'
              ? <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              : <LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-600" />}
          <span>
            {selected.status === 'done'
              ? t('Dit hoofdstuk ligt achter je in het behandeltraject. Bekijk je huidige fase voor je volgende stap.', 'This chapter is behind you in your plan. Check your current phase for the next step.')
              : selected.status === 'current'
                ? t('De volgende fase opent pas na beoordeling door je fysiotherapeut. Waar van toepassing gebruikt die de vastgelegde klinische overgangscriteria. XP of verstreken weken geven geen vrijgave.', 'Only your physiotherapist can move you on, using recorded clinical criteria where applicable. XP and elapsed weeks never grant clearance.')
                : t('Dit hoofdstuk is alleen een vooruitblik. Oefeningen en doelen worden niet automatisch vrijgegeven; je fysiotherapeut beoordeelt de overgang.', 'This chapter is a preview only. Exercises and goals are not automatically unlocked; your physiotherapist approves progression.')}
          </span>
        </div>
      </div>
    </section>
  );
}
