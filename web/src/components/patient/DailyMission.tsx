import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Flag, Play, ShieldAlert, Sparkles } from 'lucide-react';
import type { PatientHomeData } from '@/pages/patient/PatientHome';
import { useI18n } from '@/lib/i18n';
import { dailyMission } from '@shared/dailyMission';

/**
 * A motivational overview of the real, prescribed day.
 * XP and clinical phase advancement are deliberately NOT calculated here.
 * The therapist's existing safety pause always takes precedence over celebration.
 */
export function DailyMissionCard({ programs }: { programs: PatientHomeData['programs'] }) {
  const { t } = useI18n();
  const mission = dailyMission(programs);
  if (mission.status === 'none') return null;

  const isReady = mission.status === 'ready';
  const isPaused = mission.status === 'paused';
  const isDone = mission.status === 'done';

  return (
    <section aria-labelledby="fp-daily-mission" className="relative overflow-hidden rounded-2xl bg-[#343F2A] p-5 text-[#F5F0E7] shadow-card sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full border-[26px] border-white/[0.05]" aria-hidden="true" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#E8DFCD]">
            <Flag className="h-4 w-4" aria-hidden="true" />{t('Missie van vandaag', "Today's mission")}
          </span>
          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-semibold text-white">
            {isPaused ? t('Tijdelijk gepauzeerd', 'Temporarily paused') : isDone ? t('Voltooid', 'Completed') : t('Klaar om te starten', 'Ready to start')}
          </span>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#E8DFCD]">
            {isPaused ? <ShieldAlert className="h-6 w-6" aria-hidden="true" /> : isDone ? <CheckCircle2 className="h-6 w-6" aria-hidden="true" /> : <Sparkles className="h-6 w-6" aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="fp-daily-mission" className="font-display text-[22px] font-bold leading-tight text-white">
              {isPaused ? t('Veiligheid gaat voor', 'Safety comes first') : isDone ? t('Missie volbracht!', 'Mission complete!') : t('Jouw volgende stap', 'Your next step')}
            </h2>
            <p className="mt-1 text-[14px] leading-relaxed text-[#E9E9DF]">
              {isPaused
                ? t('Een programma staat stil. Volg eerst het advies van je fysiotherapeut.', 'A programme is paused. Follow your physiotherapist’s advice first.')
                : isDone
                  ? t('Je geplande trainingen zijn afgerond. Extra oefenen is niet nodig.', 'Your prescribed workouts are complete. No extra training is needed.')
                  : mission.next?.title}
            </p>
          </div>
        </div>

        {mission.total > 0 && (
          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="text-[#E9E9DF]">{t('Geplande trainingen', 'Prescribed workouts')}</span>
              <span className="font-semibold tabular-nums text-white">
                {t(`${mission.completed} van ${mission.total} afgerond`, `${mission.completed} of ${mission.total} completed`)}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={t('Voortgang dagmissie', 'Daily mission progress')}
              aria-valuemin={0}
              aria-valuemax={mission.total}
              aria-valuenow={mission.completed}
              className="h-2.5 overflow-hidden rounded-full bg-white/20"
            >
              <div className="h-full rounded-full bg-[#E8DFCD] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${mission.progress}%` }} />
            </div>
          </div>
        )}

        {mission.paused > 0 && !isPaused && (
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-white/20 bg-white/10 p-3 text-[13px] leading-relaxed text-white">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t('Let op: een ander programma is gepauzeerd. Controleer de melding hieronder voordat je oefent.', 'Note: another programme is paused. Check the warning below before exercising.')}
          </p>
        )}

        {isReady && mission.next && (
          <Link
            to={`/p/sessie/${mission.next.id}`}
            className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#E8DFCD] px-4 py-3 text-[15px] font-bold text-[#273622] transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white sm:w-auto"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            {mission.next.openSession ? t('Missie hervatten', 'Resume mission') : t('Start mijn missie', 'Start my mission')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
        {isPaused && (
          <p className="mt-4 rounded-lg border border-white/20 bg-white/10 p-3 text-[14px] leading-relaxed text-white" role="status">
            {t('Start geen nieuwe training voor het gepauzeerde programma. Bekijk de veiligheidsmelding hieronder.', 'Do not start a new workout in the paused programme. Read the safety warning below.')}
          </p>
        )}
        {isDone && (
          <Link to="/p/held" className="mt-5 inline-flex min-h-[44px] items-center gap-2 font-semibold text-[#E8DFCD] underline-offset-4 hover:underline">
            {t('Bekijk je sportheld', 'See your sports hero')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
