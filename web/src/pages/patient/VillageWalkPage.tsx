import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Backpack, ChevronRight, DoorOpen, Map as MapIcon, Play, ScrollText, Swords, Tv } from 'lucide-react';
import { api, mediaUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { Button, Dialog, ErrorState } from '@/components/ui';
import { LevelBadge } from '@/components/hero/GameFx';
import { useHero } from '@/pages/patient/HeroPages';
import { openToday, type PatientHomeData } from '@/pages/patient/PatientHome';
import { bodyShape, levelTier } from '@shared/hero';
import { villageBuildings } from '@shared/worldMap';
import { EXIT_KEY, PRACTICE_KEY, TV_KEY, type WorldApi } from '@/components/patient/WalkVillage3D';
import { VILLAGE_LAYOUT, slotPosition } from '@/components/patient/walk';
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

type Track = { x: number; z: number; facing: number };

/** Round map of the village, north up: roads, buildings, the gym and an arrow for the hero. */
function Minimap({ track, count }: { track: RefObject<Track>; count: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext('2d');
    if (!c || !g) return;
    const S = c.width;
    const k = S / 2 / (VILLAGE_LAYOUT.bound + 2.5);
    const at = (x: number, z: number) => [S / 2 + x * k, S / 2 + z * k] as const;
    const draw = () => {
      g.save();
      g.clearRect(0, 0, S, S);
      g.beginPath();
      g.arc(S / 2, S / 2, S / 2, 0, 7);
      g.clip();
      g.fillStyle = '#4d7a36';
      g.fillRect(0, 0, S, S);
      g.strokeStyle = '#b4915f';
      g.lineCap = 'round';
      g.lineWidth = S * 0.045;
      const line = (x1: number, z1: number, x2: number, z2: number) => {
        g.beginPath();
        g.moveTo(...at(x1, z1));
        g.lineTo(...at(x2, z2));
        g.stroke();
      };
      for (let i = 0; i < count; i++) line(0, 0, slotPosition(i).door.x, slotPosition(i).door.z);
      line(0, 0, VILLAGE_LAYOUT.gym.x, VILLAGE_LAYOUT.gym.z + 1.9);
      line(0, 0, 0, 30);
      g.fillStyle = '#b4915f';
      g.beginPath();
      g.arc(S / 2, S / 2, 3.2 * k, 0, 7);
      g.fill();
      g.fillStyle = '#e4bc63';
      g.strokeStyle = '#1c2420';
      g.lineWidth = 2;
      for (let i = 0; i < count; i++) {
        const [x, y] = at(slotPosition(i).x, slotPosition(i).z);
        g.fillRect(x - S * 0.045, y - S * 0.045, S * 0.09, S * 0.09);
        g.strokeRect(x - S * 0.045, y - S * 0.045, S * 0.09, S * 0.09);
      }
      const [gx, gy] = at(VILLAGE_LAYOUT.gym.x, VILLAGE_LAYOUT.gym.z - 1);
      g.fillStyle = '#ffffff';
      g.fillRect(gx - S * 0.075, gy - S * 0.04, S * 0.15, S * 0.08);
      g.strokeRect(gx - S * 0.075, gy - S * 0.04, S * 0.15, S * 0.08);
      const h = track.current ?? { x: 0, z: 0, facing: 0 };
      const [hx, hy] = at(h.x, h.z);
      g.translate(hx, hy);
      g.rotate(-h.facing);
      g.fillStyle = '#9dff9a';
      g.beginPath();
      g.moveTo(0, S * 0.085);
      g.lineTo(S * 0.055, -S * 0.055);
      g.lineTo(0, -S * 0.025);
      g.lineTo(-S * 0.055, -S * 0.055);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    };
    draw();
    const id = window.setInterval(draw, 120);
    return () => window.clearInterval(id);
  }, [track, count]);
  return <canvas ref={ref} width={192} height={192} aria-hidden className="h-[88px] w-[88px] rounded-full border-2 border-[#e4bc63] shadow-lift" />;
}

const SLOT = 'tap grid h-[46px] w-[46px] place-items-center rounded-lg border border-[#e4bc63]/70 bg-[linear-gradient(180deg,#2c3832,#141c18)] text-[#f6e2a6] shadow-[inset_0_0_0_1px_rgba(0,0,0,.6),0_2px_6px_rgba(0,0,0,.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a]';
const PANEL = 'rounded-xl border border-[#e4bc63]/60 bg-[#141c18]/85 text-white shadow-lift backdrop-blur-[2px]';

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
  const track = useRef<Track>({ x: 0, z: 0, facing: 0 });
  const world = useRef<WorldApi | null>(null);

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

  const quests = todo.flatMap((p) => p.today.items.map((i) => (nl ? i.exercise.nameNl : i.exercise.nameEn)));
  const pct = L ? Math.max(0, Math.min(100, Math.round(((L.xp - L.from) / Math.max(1, L.to - L.from)) * 100))) : 0;

  return (
    <div className="space-y-3">
      <h1 className="sr-only">{t('Je dorp', 'Your village')}</h1>
      <section aria-label={t('Je dorp in 3D. Tik op de grond om te lopen, of kies een gebouw.', 'Your village in 3D. Tap the ground to walk, or pick a building.')} className="relative">
        <Suspense fallback={<div className="h-[calc(100dvh-13.5rem)] min-h-[440px] animate-pulse rounded-2xl bg-[#26342c]" />}>
          <WalkVillage3D
            className="h-[calc(100dvh-13.5rem)] min-h-[440px]"
            buildings={buildings}
            tvLabel={t('Oefenzaal · tv', 'Gym · TV')}
            tvTitle={t('Vandaag', 'Today')}
            tvLines={tvLines}
            look={look}
            heroColor={L ? levelTier(L.level).glow : undefined}
            cheer={back && !heroQ.isLoading ? back.xp : null}
            startAtTv={!!back}
            heroName={d?.hero?.heroName}
            questOpen={todo.length > 0}
            api={world}
            practiceLabel={home.data?.patient.practiceName ?? t('De praktijk', 'The practice')}
            track={track}
            onNear={setNear}
            onArrive={(k) => { if (k === TV_KEY) setTvOpen(true); }}
          />
        </Suspense>

        {/* Unit frame: who you are, your level and the way to the next one. */}
        <Link to="/p/held" aria-label={L ? t(`Naar je held, level ${L.level}, ${pct}% naar het volgende level`, `To your hero, level ${L.level}, ${pct}% to the next level`) : t('Naar je held', 'To your hero')}
          className={`${PANEL} absolute left-2 top-2 flex items-center gap-2 py-1 pl-1 pr-3`}>
          {L && <LevelBadge level={L.level} size={38} />}
          <span className="min-w-0">
            <span className="block max-w-[120px] truncate font-display text-[13.5px] font-bold leading-tight text-[#f6e2a6]">{d?.hero?.heroName ?? t('Je dorp', 'Your village')}</span>
            {L && (
              <>
                <span className="mt-0.5 block h-[9px] w-[112px] overflow-hidden rounded-sm border border-black/70 bg-black/60">
                  <span className="block h-full bg-[linear-gradient(180deg,#ffe27a,#c9912a)]" style={{ width: `${pct}%` }} />
                </span>
                <span className="mt-0.5 block text-[10.5px] leading-none text-white/85">{t(`Level ${L.level} · ${L.xp - L.from}/${L.to - L.from} XP`, `Level ${L.level} · ${L.xp - L.from}/${L.to - L.from} XP`)}</span>
              </>
            )}
          </span>
        </Link>

        {/* Minimap and today's quest. */}
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
          <Minimap track={track} count={buildings.length} />
          <button type="button" onClick={() => world.current?.goTo(TV_KEY)} data-testid="quest-tracker" className={`${PANEL} max-w-[158px] px-2.5 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a]`}>
            <span className="flex items-center gap-1 font-display text-[12.5px] font-bold text-[#ffd76a]"><ScrollText className="h-3.5 w-3.5" aria-hidden />{t('Dagtaak', 'Daily quest')}</span>
            {quests.length > 0 ? (
              <>
                {quests.slice(0, 3).map((q, i) => <span key={i} className="mt-0.5 block truncate text-[11.5px] leading-snug text-white/90">◦ {q}</span>)}
                {quests.length > 3 && <span className="block text-[11px] text-white/70">{t(`+ ${quests.length - 3} meer`, `+ ${quests.length - 3} more`)}</span>}
                <span className="mt-0.5 block text-[10.5px] text-[#b8f0a8]">{t('Ga naar de coach', 'Go to the coach')}</span>
              </>
            ) : (
              <span className="mt-0.5 block text-[11.5px] leading-snug text-white/90">{todo.length ? t('Je training wacht bij de coach', 'Your workout waits at the coach') : doneToday ? t('Voltooid voor vandaag', 'Completed for today') : t('Vandaag vrij', 'Nothing today')}</span>
            )}
          </button>
        </div>

        {back && (
          <p role="status" className={`${PANEL} reward-in absolute inset-x-6 bottom-[124px] px-3 py-2 text-center font-display text-[14.5px] font-bold text-[#ffe27a]`}>
            {back.xp > 0 ? t(`Training gedaan! Je held kreeg +${back.xp} XP.`, `Workout done! Your hero earned +${back.xp} XP.`) : t('Training gedaan! Welkom terug in je dorp.', 'Workout done! Welcome back to your village.')}
          </p>
        )}

        {/* What you can do where you stand. */}
        <div className="pointer-events-none absolute inset-x-2 bottom-[64px] flex justify-center">
          {near === TV_KEY ? (
            <Button size="lg" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<Tv className="h-5 w-5" />} onClick={() => setTvOpen(true)}>{t('Bekijk de tv', 'Watch the TV')}</Button>
          ) : near === PRACTICE_KEY ? (
            <Button size="lg" data-testid="enter-practice" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<DoorOpen className="h-5 w-5" />} onClick={() => world.current?.use(PRACTICE_KEY)}>{t('Naar binnen: de oefenzaal', 'Go in: the exercise room')}</Button>
          ) : near === EXIT_KEY ? (
            <Button size="lg" variant="secondary" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<DoorOpen className="h-5 w-5" />} onClick={() => world.current?.use(EXIT_KEY)}>{t('Naar buiten: het dorp', 'Go out: the village')}</Button>
          ) : nearBuilding ? (
            <Link to={nearBuilding.to} data-testid="enter-building" className="tap pointer-events-auto inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#e4bc63] bg-accent px-4 text-[15.5px] font-semibold text-white shadow-lift">
              <DoorOpen className="h-5 w-5" aria-hidden />{t(`Naar binnen: ${nearBuilding.label}`, `Go in: ${nearBuilding.label}`)}
            </Link>
          ) : null}
        </div>

        {/* Action bar. */}
        <nav aria-label={t('Snelbalk', 'Action bar')} className="absolute bottom-2 left-2 flex gap-1.5">
          <button type="button" className={SLOT} aria-label={t('Naar de tv met je oefeningen', 'To the TV with your exercises')} onClick={() => (near === TV_KEY ? setTvOpen(true) : world.current?.goTo(TV_KEY))} data-testid="slot-tv"><Tv className="h-5 w-5" aria-hidden /></button>
          <Link to="/p/held/inventaris" className={SLOT} aria-label={t('Rugzak: je uitrusting', 'Backpack: your gear')}><Backpack className="h-5 w-5" aria-hidden /></Link>
          <Link to="/p/held" className={SLOT} aria-label={t('Skills en je held', 'Skills and your hero')}><Swords className="h-5 w-5" aria-hidden /></Link>
          <Link to="/p/wereld" className={SLOT} aria-label={t('Wereldkaart', 'World map')}><MapIcon className="h-5 w-5" aria-hidden /></Link>
        </nav>
      </section>

      <p className="text-[13.5px] leading-relaxed text-ink-700">
        {t('Tik op de grond om te lopen en sleep opzij om rond te kijken. In de oefenzaal van je praktijk staan de coach en de tv met je oefeningen van vandaag.', 'Tap the ground to walk and drag sideways to look around. In the exercise room of your practice you find the coach and the TV with your exercises for today.')}
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
