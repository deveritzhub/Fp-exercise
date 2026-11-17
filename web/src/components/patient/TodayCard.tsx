import type { ReactNode } from 'react';
import { CalendarClock, CheckCircle2, MessageCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { dose, fmtDate } from '@/lib/format';
import { useLabels } from '@/lib/meta';
import { ExerciseThumb } from '@/components/app/ExerciseThumb';
import type { ProgramItem } from '@/lib/types';

/**
 * Screens shared by the patient app and the therapist's patient preview, so the preview can never
 * show something different from what the patient sees. The caller decides the action (a real
 * "Start training" link in the app, an inert button in the preview).
 */
type ThumbItem = { id?: string; exercise: Pick<ProgramItem['exercise'], 'thumbnailMediaId' | 'videoMediaId' | 'bodyRegion'> };

export function TodayProgramCard({ id, title, items, done, action, lead }: { id: string; title: string; items: ThumbItem[]; done: boolean; action: ReactNode; lead?: { label: string; reward?: string } }) {
  const { t } = useI18n();
  const meta = `${items.length} ${items.length === 1 ? t('oefening', 'exercise') : t('oefeningen', 'exercises')} · ±${Math.max(5, Math.round(items.length * 4))} ${t('minuten', 'minutes')}`;
  // The lead card: the one thing to do today, dark with the action inside it.
  if (lead && !done) {
    return (
      <section className="relative isolate overflow-hidden rounded-[28px] bg-[#1E3A30] bg-[radial-gradient(130%_100%_at_0%_0%,#34604e_0%,#1E3A30_48%,#11231c_100%)] p-5 text-white shadow-[0_0_0_1px_rgba(255,255,255,.06)_inset,0_28px_56px_-24px_rgba(17,35,28,.7),0_8px_18px_-10px_rgba(17,35,28,.4)]" aria-labelledby={`today-${id}`} data-testid="lead-card">
        {/* Soft light in the corners: gold where the reward is, sage below. */}
        <div aria-hidden className="pointer-events-none absolute -right-14 -top-16 -z-10 h-44 w-44 rounded-full bg-[#E3B655] opacity-[.16] blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-10 -z-10 h-48 w-48 rounded-full bg-[#7fd0aa] opacity-[.12] blur-3xl" />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white/75">{lead.label} · {t('vandaag', 'today')}</p>
          {lead.reward && <span className="gold rounded-full bg-[#E3B655] px-2.5 py-0.5 text-[12.5px] font-extrabold shadow-[0_4px_12px_-4px_rgba(227,182,85,.8)]">{lead.reward}</span>}
        </div>
        <h2 id={`today-${id}`} className="mt-2 font-display text-[24px] font-extrabold leading-[1.15] tracking-[-0.02em] !text-white">{title}</h2>
        <p className="mt-1 text-[15px] text-white/80">{meta}</p>
        <div className="mt-4 [&_.text-ink-700]:text-white/85">{action}</div>
      </section>
    );
  }
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card" aria-labelledby={`today-${id}`}>
      <div className="p-5">
        <div className="text-[13px] font-medium uppercase tracking-wide text-accent">{lead ? lead.label : t('Vandaag', 'Today')}</div>
        <h2 id={`today-${id}`} className="mt-1 text-xl font-bold">{title}</h2>
        <p className="mt-1 text-[15px] text-ink-500">{meta}</p>
        <div className="mt-4 flex -space-x-2">
          {items.slice(0, 5).map((i, n) => (
            <ExerciseThumb key={i.id ?? n} thumbnailId={i.exercise.thumbnailMediaId} videoId={i.exercise.videoMediaId} region={i.exercise.bodyRegion} className="h-12 w-12 border-2 border-white" rounded="rounded-xl" />
          ))}
        </div>
      </div>
      {done ? (
        <div className="flex items-center gap-3 border-t border-line bg-ok-soft px-5 py-4 text-ok">
          <CheckCircle2 className="h-6 w-6" />
          <span className="font-semibold">{t('Klaar voor vandaag — goed gedaan!', 'Done for today — well done!')}</span>
        </div>
      ) : (
        <div className="border-t border-line p-4">{action}</div>
      )}
    </section>
  );
}

export function RestDayCard({ status = 'rest', nextSession, startDate }: { status?: 'rest' | 'not_started' | 'ended'; nextSession: string | null; startDate?: string | null }) {
  const { t, locale } = useI18n();
  const title = status === 'not_started' ? t('Je programma start later', 'Your programme starts later') : status === 'ended' ? t('Je programma is afgelopen', 'Your programme has ended') : t('Vandaag een rustdag', 'Rest day today');
  const body =
    status === 'not_started' && startDate
      ? t(`Je eerste oefendag is ${fmtDate(startDate, locale, { weekday: 'long', day: 'numeric', month: 'long' })}.`, `Your first exercise day is ${fmtDate(startDate, locale, { weekday: 'long', day: 'numeric', month: 'long' })}.`)
      : status === 'ended'
        ? t('Neem contact op met je fysiotherapeut als je wilt doorgaan.', 'Contact your physiotherapist if you want to continue.')
        : t('Er staan vandaag geen oefeningen gepland.', 'No exercises are scheduled today.');
  return (
    <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-ink-500">{body}</p>
      {nextSession && status !== 'ended' && (
        <p className="mt-3 flex items-center gap-2 text-[15px] text-ink-700">
          <CalendarClock className="h-5 w-5 text-accent" />
          {t('Volgende sessie', 'Next session')}: {fmtDate(nextSession, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      )}
    </div>
  );
}

/** The programme overview as the patient sees it: every exercise with dose and weekdays. */
export function ProgramItemsList<T extends Pick<ProgramItem, 'sets' | 'reps' | 'holdS' | 'days'> & { id?: string; key?: string; exercise: ProgramItem['exercise'] }>({
  items,
  instructions,
  renderLink,
}: {
  items: T[];
  instructions?: string | null;
  renderLink?: (item: T, content: ReactNode) => ReactNode;
}) {
  const { t, locale } = useI18n();
  const L = useLabels();
  return (
    <div className="space-y-4">
      {instructions && (
        <div className="rounded-2xl border border-accent/15 bg-accent-soft p-4 text-[15.5px] leading-relaxed text-ink-800">
          <div className="mb-1 flex items-center gap-2 font-semibold text-accent"><MessageCircle className="h-5 w-5" />{t('Van je fysiotherapeut', 'From your physiotherapist')}</div>
          {instructions}
        </div>
      )}
      <ol className="space-y-2">
        {items.map((i, n) => {
          const content = (
            <>
              <ExerciseThumb thumbnailId={i.exercise.thumbnailMediaId} videoId={i.exercise.videoMediaId} region={i.exercise.bodyRegion} className="h-16 w-16 shrink-0" rounded="rounded-xl" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{n + 1}. {locale === 'nl' ? i.exercise.nameNl : i.exercise.nameEn}</span>
                <span className="block text-[14.5px] text-ink-500">{dose(i, locale)}</span>
                <span className="block text-[13px] text-ink-500">{i.days.length === 7 ? t('Elke dag', 'Every day') : i.days.map(L.weekday).join(', ')}</span>
              </span>
            </>
          );
          return (
            <li key={i.id ?? i.key ?? n}>
              {renderLink ? renderLink(i, content) : <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-3 shadow-card">{content}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
