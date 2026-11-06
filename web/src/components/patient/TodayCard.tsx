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

export function TodayProgramCard({ id, title, items, done, action }: { id: string; title: string; items: ThumbItem[]; done: boolean; action: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card" aria-labelledby={`today-${id}`}>
      <div className="p-5">
        <div className="text-[13px] font-medium uppercase tracking-wide text-accent">{t('Vandaag', 'Today')}</div>
        <h2 id={`today-${id}`} className="mt-1 text-xl font-bold">{title}</h2>
        <p className="mt-1 text-[15px] text-ink-500">
          {items.length} {items.length === 1 ? t('oefening', 'exercise') : t('oefeningen', 'exercises')} · ±{Math.max(5, Math.round(items.length * 4))} {t('minuten', 'minutes')}
        </p>
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
