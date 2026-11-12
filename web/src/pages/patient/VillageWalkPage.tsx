import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, DoorOpen, Footprints, Play, Tv } from 'lucide-react';
import { api, mediaUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { Button, Dialog, ErrorState } from '@/components/ui';
import { LevelBadge, XpBar } from '@/components/hero/GameFx';
import { useHero } from '@/pages/patient/HeroPages';
import { openToday, type PatientHomeData } from '@/pages/patient/PatientHome';
import { bodyShape, levelTier } from '@shared/hero';
import { villageBuildings } from '@shared/worldMap';
import { TV_KEY } from '@/components/patient/WalkVillage3D';
// three.js only loads on the 3D pages.
const WalkVillage3D = lazy(() => import('@/components/patient/WalkVillage3D'));

const LABEL: Record<string, [string, string]> = {
  smithy: ['Smederij', 'Smithy'],
  library: ['Bibliotheek', 'Library'],
  hall: ['Trofeeënhal', 'Trophy hall'],
  board: ['Prikbord', 'Notice board'],
  guild: ['Gildehal', 'Guild hall'],
};

const dose = (i: { sets: number | null; reps: number | null; holdS: number | null }) =>
  [i.sets && i.reps ? `${i.sets} × ${i.reps}` : i.sets ? `${i.sets} ×` : i.reps ? `${i.reps} ×` : null, i.holdS ? `${i.holdS} s` : null].filter(Boolean).join(' · ');

/**
 * The village to walk around in. The gym has a TV with today's exercises; a workout started there
 * ends back at the TV, where the hero gets the XP.
 */
export function VillageWalkPage() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  useDocumentMeta(t('Je dorp', 'Your village'));
  const home = useQuery({ queryKey: ['patient-home'], queryFn: () => api.get<PatientHomeData>('/patient/home'), refetchOnMount: 'always' });
  const heroQ = useHero();
  const location = useLocation();
  const navigate = useNavigate();
  // Back from a workout that was started at the TV: celebrate once.
  const [back] = useState<{ xp: number } | null>(() => (location.state as { fromWorkout?: { xp: number } } | null)?.fromWorkout ?? null);
  useEffect(() => {
    if (back) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [near, setNear] = useState<string | null>(null);
  const [tvOpen, setTvOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);

  const d = heroQ.data;
  const look = useMemo(
    () => (d?.hero ? { ...d.hero, gear: [...d.gear.equipped, ...(d.aids ?? [])], body: d.metrics ? bodyShape(d.metrics, d.hero.frame) : null } : null),
    [d],
  );
  const buildings = useMemo(() => villageBuildings({ hero: true, atlas: true, mission: true, guild: true }).map((b) => ({ key: b.key, to: b.to, label: nl ? LABEL[b.key][0] : LABEL[b.key][1] })), [nl]);
  const todo = useMemo(() => (home.data?.programs ?? []).filter(openToday), [home.data]);
  const doneToday = (home.data?.programs ?? []).some((p) => p.today.scheduled > 0 && p.today.done);
  const tvLines = useMemo(() => {
    if (!home.data) return [t('Laden…', 'Loading…')];
    const names = todo.flatMap((p) => p.today.items.map((i) => (nl ? i.exercise.nameNl : i.exercise.nameEn)));
    if (names.length) return names;
    if (todo.length) return todo.map((p) => p.title);
    return [doneToday ? t('Alles gedaan voor vandaag!', 'All done for today!') : t('Vandaag geen oefeningen', 'No exercises today')];
  }, [home.data, todo, doneToday, nl, t]);

  if (home.isError) return <ErrorState error={home.error} onRetry={() => home.refetch()} />;
  const L = d?.level;
  const nearBuilding = buildings.find((b) => b.key === near) ?? null;
  const exercise = todo.flatMap((p) => p.today.items).find((i) => i.id === playing) ?? null;

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3">
        {L && <LevelBadge level={L.level} size={40} />}
        <div className="min-w-0 flex-1">
          <h1 className="t-page truncate">{d?.hero?.heroName ?? t('Je dorp', 'Your village')}</h1>
          {L ? (
            <>
              <p className="text-[13px] text-ink-700">{t(`Level ${L.level} · nog ${L.to - L.xp} XP tot level ${L.level + 1}`, `Level ${L.level} · ${L.to - L.xp} XP to level ${L.level + 1}`)}</p>
              <XpBar xp={L.xp} compact className="mt-1" label={t(`Voortgang naar level ${L.level + 1}`, `Progress to level ${L.level + 1}`)} />
            </>
          ) : (
            <p className="text-[13.5px] text-ink-700">{t('Loop rond en bekijk je oefeningen op de tv.', 'Walk around and see your exercises on the TV.')}</p>
          )}
        </div>
      </header>

      {back && (
        <p role="status" className="reward-in rounded-2xl border border-[#e4bc63] bg-[#fbf0d9] px-3 py-2.5 text-[14.5px] font-semibold text-[#855806]">
          {back.xp > 0 ? t(`Training gedaan! Je held kreeg +${back.xp} XP.`, `Workout done! Your hero earned +${back.xp} XP.`) : t('Training gedaan! Welkom terug in je dorp.', 'Workout done! Welcome back to your village.')}
        </p>
      )}

      <section aria-label={t('Je dorp in 3D. Tik op de grond om te lopen, of kies een gebouw.', 'Your village in 3D. Tap the ground to walk, or pick a building.')} className="relative">
        <Suspense fallback={<div className="h-[min(62dvh,560px)] min-h-[360px] animate-pulse rounded-2xl bg-[#E7EFE3]" />}>
          <WalkVillage3D
            className="h-[min(62dvh,560px)] min-h-[360px]"
            buildings={buildings}
            tvLabel={t('Oefenzaal · tv', 'Gym · TV')}
            tvTitle={t('Vandaag', 'Today')}
            tvLines={tvLines}
            look={look}
            heroColor={L ? levelTier(L.level).glow : undefined}
            cheer={back && !heroQ.isLoading ? back.xp : null}
            startAtTv={!!back}
            onNear={setNear}
            onArrive={(k) => { if (k === TV_KEY) setTvOpen(true); }}
          />
        </Suspense>
        <div className="pointer-events-none absolute inset-x-2 bottom-2 flex justify-start pr-[104px]">
          {near === TV_KEY ? (
            <Button size="lg" className="pointer-events-auto shadow-lift" icon={<Tv className="h-5 w-5" />} onClick={() => setTvOpen(true)}>{t('Bekijk de tv', 'Watch the TV')}</Button>
          ) : nearBuilding ? (
            <Link to={nearBuilding.to} data-testid="enter-building" className="tap pointer-events-auto inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-accent px-4 text-[15.5px] font-semibold text-white shadow-lift">
              <DoorOpen className="h-5 w-5" aria-hidden />{t(`Naar binnen: ${nearBuilding.label}`, `Go in: ${nearBuilding.label}`)}
            </Link>
          ) : (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-medium text-ink-800 shadow-card">
              <Footprints className="h-4 w-4" aria-hidden />{t('Tik op de grond om te lopen', 'Tap the ground to walk')}
            </p>
          )}
        </div>
      </section>

      <p className="text-[13.5px] leading-relaxed text-ink-700">
        {t('Sleep opzij om rond te kijken. In de oefenzaal staat de tv met je oefeningen van vandaag.', 'Drag sideways to look around. The gym has the TV with your exercises for today.')}{' '}
        <Link to="/p/wereld" className="font-semibold text-accent underline-offset-2 hover:underline">{t('Naar de wereldkaart', 'To the world map')}</Link>
      </p>

      <Dialog open={tvOpen} onClose={() => { setTvOpen(false); setPlaying(null); }} title={t('Je oefeningen van vandaag', "Today's exercises")} size="md" sheet>
        <div data-testid="tv-panel" className="space-y-4">
          {exercise && (
            <div className="overflow-hidden rounded-xl border-4 border-[#1c2420] bg-black">
              {mediaUrl(exercise.exercise.videoMediaId) ? (
                <video key={exercise.id} src={mediaUrl(exercise.exercise.videoMediaId)!} poster={mediaUrl(exercise.exercise.thumbnailMediaId) ?? undefined} controls autoPlay muted loop playsInline className="aspect-video w-full" />
              ) : mediaUrl(exercise.exercise.thumbnailMediaId) ? (
                <img src={mediaUrl(exercise.exercise.thumbnailMediaId)!} alt="" className="aspect-video w-full object-contain" />
              ) : (
                <p className="grid aspect-video place-items-center px-4 text-center text-[14.5px] text-white/85">{t('Van deze oefening is nog geen video.', 'There is no video of this exercise yet.')}</p>
              )}
              <p className="bg-[#1c2420] px-3 py-2 text-[14.5px] font-semibold text-white">{nl ? exercise.exercise.nameNl : exercise.exercise.nameEn}</p>
            </div>
          )}
          {todo.length === 0 && (
            <p className="rounded-xl bg-[#F3F7F1] px-3 py-3 text-[15px] text-ink-800">
              {doneToday ? t('Je hebt alles voor vandaag gedaan. Goed bezig!', 'You did everything for today. Well done!') : t('Vandaag staan er geen oefeningen op je schema.', 'There are no exercises on your schedule today.')}
            </p>
          )}
          {todo.map((p) => (
            <section key={p.id} aria-label={p.title}>
              <h3 className="t-section">{p.title}</h3>
              {p.today.items.length > 0 && (
                <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line">
                  {p.today.items.map((i) => (
                    <li key={i.id}>
                      <button type="button" onClick={() => setPlaying(i.id)} aria-pressed={playing === i.id} className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#F3F7F1] aria-pressed:bg-[#F3F7F1]">
                        {mediaUrl(i.exercise.thumbnailMediaId) ? (
                          <img src={mediaUrl(i.exercise.thumbnailMediaId)!} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#E7EFE3] text-ink-700"><Tv className="h-5 w-5" aria-hidden /></span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-ink-900">{nl ? i.exercise.nameNl : i.exercise.nameEn}</span>
                          {dose(i) && <span className="block text-[13px] text-ink-600">{dose(i)}</span>}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button size="xl" className="mt-3 w-full" icon={<Play className="h-5 w-5 fill-current" />} onClick={() => navigate(`/p/sessie/${p.id}`, { state: { from: 'dorp' } })}>
                {p.openSession ? t('Training hervatten', 'Resume workout') : t('Start training', 'Start workout')}
              </Button>
            </section>
          ))}
          <p className="text-[13px] text-ink-600">{t('Na je training kom je terug bij de tv en krijgt je held de XP.', 'After your workout you return to the TV and your hero gets the XP.')}</p>
        </div>
      </Dialog>
    </div>
  );
}
