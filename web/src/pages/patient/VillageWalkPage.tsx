import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Backpack, ChevronRight, ClipboardList, DoorOpen, Footprints, Gamepad2, Map as MapIcon, Play, ScrollText, Swords, Tv } from 'lucide-react';
import { api, mediaUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { Button, Dialog, ErrorState } from '@/components/ui';
import { LevelBadge } from '@/components/hero/GameFx';
import { useHero } from '@/pages/patient/HeroPages';
import { MODULE_PATH, moduleOf, openToday, type PatientHomeData } from '@/pages/patient/PatientHome';
import { SKILLS, bodyShape, levelTier } from '@shared/hero';
import { villageBuildings } from '@shared/worldMap';
import { EXIT_KEY, PRACTICE_KEY, TV_KEY, boardKey, type WorldApi } from '@/components/patient/WalkVillage3D';
import { MODULE_SITES, VILLAGE_LAYOUT, slotPosition, type Site } from '@/components/patient/walk';
// three.js only loads on the 3D pages.
const WalkVillage3D = lazy(() => import('@/components/patient/WalkVillage3D'));

const LABEL: Record<string, [string, string]> = {
  smithy: ['Smederij', 'Smithy'],
  library: ['Bibliotheek', 'Library'],
  hall: ['Trofeeënhal', 'Trophy hall'],
  board: ['Prikbord', 'Notice board'],
  guild: ['Gildehal', 'Guild hall'],
};

const PLACE_HINT: Record<string, [string, string]> = {
  smithy: ['Je uitrusting en de winkel', 'Your gear and the shop'],
  library: ['Spierenatlas en de quiz', 'Muscle atlas and the quiz'],
  hall: ['Je prijzenkast', 'Your trophy cabinet'],
  board: ['Missie van vandaag en weekquests', "Today's mission and weekly quests"],
  guild: ['De raid van je gilde', 'Your guild raid'],
  kracht: ['Krachtprogramma en krachtlog', 'Strength programme and log'],
  mobiliteit: ['Mobiliteitsprogramma en tests', 'Mobility programme and tests'],
};

const dose = (i: { sets: number | null; reps: number | null; holdS: number | null }) =>
  [i.sets && i.reps ? `${i.sets} × ${i.reps}` : i.sets ? `${i.sets} ×` : i.reps ? `${i.reps} ×` : null, i.holdS ? `${i.holdS} s` : null].filter(Boolean).join(' · ');

type Track = { x: number; z: number; facing: number; target?: { x: number; z: number } | null };
/** Something to do, and the place in the village where it is done. */
type Task = { id: string; label: string; hint: string; dest: string; link?: string };
const TIP_KEY = 'fp.village.tip';

/** Round map of the village, north up: roads, buildings, the gym and an arrow for the hero. */
function Minimap({ track, sites }: { track: RefObject<Track>; sites: Site[] }) {
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
      for (const st of sites) line(0, 0, st.door.x, st.door.z);
      line(0, 0, VILLAGE_LAYOUT.gym.x, VILLAGE_LAYOUT.gym.z + 1.9);
      line(0, 0, 0, 30);
      g.fillStyle = '#b4915f';
      g.beginPath();
      g.arc(S / 2, S / 2, 3.2 * k, 0, 7);
      g.fill();
      g.fillStyle = '#e4bc63';
      g.strokeStyle = '#1c2420';
      g.lineWidth = 2;
      for (const st of sites) {
        const [x, y] = at(st.x, st.z);
        g.fillRect(x - S * 0.045, y - S * 0.045, S * 0.09, S * 0.09);
        g.strokeRect(x - S * 0.045, y - S * 0.045, S * 0.09, S * 0.09);
      }
      const [gx, gy] = at(VILLAGE_LAYOUT.gym.x, VILLAGE_LAYOUT.gym.z - 1);
      g.fillStyle = '#ffffff';
      g.fillRect(gx - S * 0.075, gy - S * 0.04, S * 0.15, S * 0.08);
      g.strokeRect(gx - S * 0.075, gy - S * 0.04, S * 0.15, S * 0.08);
      const h = track.current ?? { x: 0, z: 0, facing: 0 };
      // Where the hero is heading: a gold dot that breathes.
      if (h.target) {
        const [tx, ty] = at(h.target.x, h.target.z);
        g.fillStyle = '#ffd76a';
        g.strokeStyle = '#1c2420';
        g.beginPath();
        g.arc(tx, ty, S * (0.05 + 0.015 * Math.sin(Date.now() / 220)), 0, 7);
        g.fill();
        g.stroke();
      }
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
  }, [track, sites]);
  return <canvas ref={ref} width={192} height={192} aria-hidden className="h-[88px] w-[88px] rounded-full border-2 border-[#e4bc63] shadow-lift" />;
}

const STICK_KEY = 'fp.village.joystick';

/** Thumb stick: drag the knob and the hero walks that way; push it to the rim to run. */
function Joystick({ stick, label }: { stick: RefObject<{ x: number; y: number }>; label: string }) {
  const knob = useRef<HTMLSpanElement>(null);
  const R = 34;
  const set = (x: number, y: number) => {
    if (stick.current) {
      stick.current.x = x / R;
      stick.current.y = -y / R;
    }
    if (knob.current) knob.current.style.transform = `translate(${x}px, ${y}px)`;
  };
  useEffect(() => () => set(0, 0), []); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    let x = e.clientX - (box.left + box.width / 2);
    let y = e.clientY - (box.top + box.height / 2);
    const d = Math.hypot(x, y);
    if (d > R) {
      x = (x / d) * R;
      y = (y / d) * R;
    }
    set(x, y);
  };
  return (
    <div
      role="img"
      aria-label={label}
      data-testid="joystick"
      className="pointer-events-auto grid h-[108px] w-[108px] touch-none select-none place-items-center rounded-full border-2 border-[#e4bc63]/70 bg-[#141c18]/55 shadow-lift"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e); }}
      onPointerUp={() => set(0, 0)}
      onPointerCancel={() => set(0, 0)}
    >
      <span ref={knob} className="block h-[46px] w-[46px] rounded-full border border-[#e4bc63] bg-[linear-gradient(180deg,#3a4a42,#1c2420)] shadow-[0_2px_6px_rgba(0,0,0,.5)]" />
    </div>
  );
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
  const [dest, setDest] = useState<string | null>(null);
  const [placesOpen, setPlacesOpen] = useState(false);
  /** The task the hero is walking for: its own link is offered on arrival. */
  const [errand, setErrand] = useState<Task | null>(null);
  const [tip, setTip] = useState(() => {
    try {
      return localStorage.getItem(TIP_KEY) !== '1';
    } catch {
      return false;
    }
  });
  const hideTip = () => {
    setTip(false);
    try {
      localStorage.setItem(TIP_KEY, '1');
    } catch {
      /* storage unavailable */
    }
  };
  const [tvOpen, setTvOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const track = useRef<Track>({ x: 0, z: 0, facing: 0 });
  const world = useRef<WorldApi | null>(null);
  const stick = useRef({ x: 0, y: 0 });
  // Joystick on or off: a choice kept in this browser.
  const [joystick, setJoystick] = useState(() => {
    try {
      return localStorage.getItem(STICK_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggleJoystick = () => {
    setJoystick((on) => {
      try {
        localStorage.setItem(STICK_KEY, on ? '0' : '1');
      } catch {
        /* storage unavailable */
      }
      stick.current.x = 0;
      stick.current.y = 0;
      return !on;
    });
  };

  const d = heroQ.data;
  const look = useMemo(
    () => (d?.hero ? { ...d.hero, gear: [...d.gear.equipped, ...(d.aids ?? [])], body: d.metrics ? bodyShape(d.metrics, d.hero.frame) : null } : null),
    [d],
  );
  const todo = useMemo(() => (home.data?.programs ?? []).filter(openToday), [home.data]);
  const waiting = { kracht: todo.some((p) => moduleOf(p) === 'kracht'), mobiliteit: todo.some((p) => moduleOf(p) === 'mobiliteit') };
  // Round the square: the hero's buildings. Further out, west and east: the houses for strength and mobility.
  const buildings = useMemo(
    () => [
      ...villageBuildings({ hero: true, atlas: true, mission: true, guild: true }).map((b) => ({ key: b.key as string, to: b.to as string, label: nl ? LABEL[b.key][0] : LABEL[b.key][1] })),
      { key: 'kracht', to: MODULE_PATH.kracht, label: nl ? 'Krachthonk' : 'Strength house', site: MODULE_SITES.kracht as Site, roof: 0x7a2f24, kind: 'kracht' as const, alert: waiting.kracht },
      { key: 'mobiliteit', to: MODULE_PATH.mobiliteit, label: nl ? 'Mobiliteitsstudio' : 'Mobility studio', site: MODULE_SITES.mobiliteit as Site, roof: 0x2f7f8a, kind: 'mobiliteit' as const, alert: waiting.mobiliteit },
    ],
    [nl, waiting.kracht, waiting.mobiliteit],
  );
  const sites = useMemo(() => {
    let slot = 0;
    return buildings.map((b) => ('site' in b && b.site ? b.site : slotPosition(slot++)));
  }, [buildings]);
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
  const boardOf = buildings.find((b) => 'kind' in b && boardKey(b.key) === near) ?? null;
  const exercise = todo.flatMap((p) => p.today.items).find((i) => i.id === playing) ?? null;

  // Everything there is to do, each with its place: today's workouts first, then the weekly quests and the day chest.
  const placeFor = (link: string | null | undefined) =>
    !link ? TV_KEY
      : link.startsWith('/p/kracht') ? boardKey('kracht')
      : link.startsWith('/p/mobiliteit') ? boardKey('mobiliteit')
      : link.startsWith('/p/spieren') ? 'library'
      : link.startsWith('/p/held/inventaris') ? 'smithy'
      : link.startsWith('/p/held/vrienden') || link.startsWith('/p/wereld') ? 'guild'
      : link.startsWith('/p/held') ? 'board'
      : TV_KEY;
  const tasks: Task[] = [
    ...todo.map((p): Task => {
      const m = moduleOf(p);
      const n = p.today.items.length;
      return {
        id: `p:${p.id}`,
        label: p.title,
        hint: n ? t(`${n} ${n === 1 ? 'oefening' : 'oefeningen'} vandaag`, `${n} ${n === 1 ? 'exercise' : 'exercises'} today`) : t('Training hervatten', 'Resume workout'),
        dest: m === 'revalidatie' ? TV_KEY : boardKey(m),
        link: m === 'revalidatie' ? undefined : MODULE_PATH[m],
      };
    }),
    ...(d?.weekly.quests ?? []).filter((q) => !q.done && !(q.key === 'train' && todo.length > 0)).map((q): Task => {
      const link = d?.weekly.links?.[q.key] ?? undefined;
      const skill = q.skill ? SKILLS.find((x) => x.key === q.skill) : null;
      return {
        id: `q:${q.key}`,
        label: q.key === 'train' ? t(`Train ${q.target} ${q.target === 1 ? 'dag' : 'dagen'} deze week`, `Train ${q.target} ${q.target === 1 ? 'day' : 'days'} this week`)
          : q.key === 'checkin' ? t('Doe je pijncheck', 'Do your pain check-in')
          : t(`Train je skill ${skill ? skill.nl : ''}`.trim(), `Train your ${skill ? skill.en : ''} skill`.replace('  ', ' ')),
        hint: `${q.progress}/${q.target} · +${d?.weekly.xpPerQuest ?? 0} XP`,
        dest: placeFor(link),
        link: link ?? undefined,
      };
    }),
    ...(d?.chest?.available ? [{ id: 'chest', label: t('Open je dagkist', 'Open your day chest'), hint: t('Ligt klaar in de smederij', 'Ready in the smithy'), dest: 'smithy', link: '/p/held/inventaris' }] : []),
  ];
  const run = (task: Task) => {
    hideTip();
    setErrand(task);
    world.current?.goTo(task.dest);
  };
  const practiceName = home.data?.patient.practiceName ?? t('De praktijk', 'The practice');
  const placeName = (k: string) =>
    k === TV_KEY ? t('de tv in de praktijk', 'the TV in the practice')
      : k === PRACTICE_KEY ? practiceName
      : k === EXIT_KEY ? t('de uitgang', 'the exit')
      : k.startsWith('in:') ? t('het programmabord', 'the programme board')
      : buildings.find((b) => b.key === k)?.label ?? k;
  const places = [
    { key: TV_KEY, label: practiceName, hint: t('Oefenzaal, coach en de tv met je oefeningen', 'Exercise room, coach and the TV with your exercises'), alert: todo.some((p) => moduleOf(p) === 'revalidatie') },
    ...buildings.map((b) => ({ key: 'kind' in b ? boardKey(b.key) : b.key, label: b.label, hint: PLACE_HINT[b.key] ? (nl ? PLACE_HINT[b.key][0] : PLACE_HINT[b.key][1]) : '', alert: 'alert' in b && !!b.alert })),
  ];
  // The link a task brought along wins over the building's own, once the hero stands there.
  const errandHere = errand && errand.link && (near === errand.dest || (errand.dest.startsWith('in:') ? false : near === errand.dest)) ? errand : null;
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
            stick={stick}
            onNear={setNear}
            onDestination={(k) => { setDest(k); if (!k) return; hideTip(); }}
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

        {/* Minimap (tap: pick a place) and what there is to do. Every task walks the hero to its place. */}
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
          <button type="button" onClick={() => setPlacesOpen(true)} aria-label={t('Kaart: kies waar je heen wilt', 'Map: pick where to go')} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a]">
            <Minimap track={track} sites={sites} />
          </button>
          <div className={`${PANEL} w-[172px] px-1.5 py-1.5`} role="group" aria-label={t('Taken', 'Tasks')}>
            <p className="flex items-center gap-1 px-1 font-display text-[12.5px] font-bold text-[#ffd76a]"><ScrollText className="h-3.5 w-3.5" aria-hidden />{t('Taken', 'Tasks')}</p>
            {tasks.length > 0 ? (
              <ul>
                {tasks.slice(0, 4).map((task, i) => (
                  <li key={task.id}>
                    <button type="button" onClick={() => run(task)} data-testid={i === 0 ? 'quest-tracker' : undefined} aria-current={dest && errand?.id === task.id ? 'true' : undefined}
                      className="mt-0.5 flex min-h-[38px] w-full items-start gap-1.5 rounded-lg px-1 py-1 text-left hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a] aria-[current]:bg-[#e4bc63]/25">
                      <span aria-hidden className="mt-px font-display text-[14px] font-black leading-none text-[#ffd21f]">!</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold leading-tight text-white">{task.label}</span>
                        <span className="block truncate text-[10.5px] leading-tight text-white/75">{task.hint}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-1 pt-0.5 text-[11.5px] leading-snug text-white/90">{doneToday ? t('Alles gedaan voor vandaag', 'All done for today') : t('Vandaag niets te doen', 'Nothing to do today')}</p>
            )}
            {tasks.length > 4 && <p className="px-1 text-[10.5px] text-white/70">{t(`+ ${tasks.length - 4} meer`, `+ ${tasks.length - 4} more`)}</p>}
          </div>
        </div>

        {/* On the way: where to, and a way to stop. */}
        {dest ? (
          <p role="status" data-testid="on-the-way" className={`${PANEL} absolute left-2 top-[62px] flex max-w-[190px] items-center gap-2 py-1 pl-2.5 pr-1 text-[12.5px]`}>
            <Footprints className="h-4 w-4 shrink-0 text-[#ffd76a]" aria-hidden />
            <span className="min-w-0 flex-1 leading-tight">{t(`Onderweg naar ${placeName(dest)}`, `On the way to ${placeName(dest)}`)}</span>
            <button type="button" onClick={() => world.current?.stop()} className="min-h-[32px] rounded-md px-2 font-semibold text-[#ffd76a] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a]">{t('Stop', 'Stop')}</button>
          </p>
        ) : tip ? (
          <p className={`${PANEL} absolute left-2 top-[62px] flex max-w-[190px] items-start gap-1 py-1.5 pl-2.5 pr-1 text-[12.5px] leading-snug`}>
            <span className="min-w-0 flex-1">{t('Tik op een taak of op de kaart: je held loopt er vanzelf heen.', 'Tap a task or the map: your hero walks there by itself.')}</span>
            <button type="button" onClick={hideTip} aria-label={t('Tip sluiten', 'Close tip')} className="grid min-h-[32px] min-w-[32px] place-items-center rounded-md text-[#ffd76a] hover:bg-white/10">✕</button>
          </p>
        ) : null}

        {back && (
          <p role="status" className={`${PANEL} reward-in absolute inset-x-6 bottom-[124px] px-3 py-2 text-center font-display text-[14.5px] font-bold text-[#ffe27a]`}>
            {back.xp > 0 ? t(`Training gedaan! Je held kreeg +${back.xp} XP.`, `Workout done! Your hero earned +${back.xp} XP.`) : t('Training gedaan! Welkom terug in je dorp.', 'Workout done! Welcome back to your village.')}
          </p>
        )}

        {/* What you can do where you stand. */}
        {joystick && (
          <div className="pointer-events-none absolute bottom-[64px] left-2">
            <Joystick stick={stick} label={t('Joystick: sleep om te lopen, tot de rand om te rennen', 'Joystick: drag to walk, to the rim to run')} />
          </div>
        )}
        <div className={`pointer-events-none absolute inset-x-2 flex justify-center ${joystick ? 'bottom-[182px]' : 'bottom-[64px]'}`}>
          {near === TV_KEY ? (
            <Button size="lg" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<Tv className="h-5 w-5" />} onClick={() => setTvOpen(true)}>{t('Bekijk de tv', 'Watch the TV')}</Button>
          ) : near === PRACTICE_KEY ? (
            <Button size="lg" data-testid="enter-practice" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<DoorOpen className="h-5 w-5" />} onClick={() => world.current?.use(PRACTICE_KEY)}>{t('Naar binnen: de oefenzaal', 'Go in: the exercise room')}</Button>
          ) : near === EXIT_KEY ? (
            <Button size="lg" variant="secondary" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<DoorOpen className="h-5 w-5" />} onClick={() => world.current?.use(EXIT_KEY)}>{t('Naar buiten: het dorp', 'Go out: the village')}</Button>
          ) : errandHere ? (
            <Link to={errandHere.link!} data-testid="errand-link" className="tap pointer-events-auto inline-flex min-h-[48px] max-w-full items-center gap-2 rounded-xl border border-[#e4bc63] bg-accent px-4 text-[15.5px] font-semibold text-white shadow-lift">
              <DoorOpen className="h-5 w-5 shrink-0" aria-hidden /><span className="truncate">{errandHere.label}</span>
            </Link>
          ) : nearBuilding && 'kind' in nearBuilding ? (
            <Button size="lg" data-testid="enter-house" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<DoorOpen className="h-5 w-5" />} onClick={() => world.current?.use(nearBuilding.key)}>{t(`Naar binnen: ${nearBuilding.label}`, `Go in: ${nearBuilding.label}`)}</Button>
          ) : boardOf ? (
            <Link to={boardOf.to} data-testid="open-programme" className="tap pointer-events-auto inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#e4bc63] bg-accent px-4 text-[15.5px] font-semibold text-white shadow-lift">
              <ClipboardList className="h-5 w-5" aria-hidden />{boardOf.key === 'kracht' ? t('Bekijk je krachtprogramma', 'See your strength programme') : t('Bekijk je mobiliteitsprogramma', 'See your mobility programme')}
            </Link>
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
          <button type="button" data-testid="slot-places" className={SLOT} aria-label={t('Plekken: kies waar je heen wilt', 'Places: pick where to go')} onClick={() => setPlacesOpen(true)}><MapIcon className="h-5 w-5" aria-hidden /></button>
          <button type="button" data-testid="slot-joystick" aria-pressed={joystick} className={`${SLOT} aria-pressed:border-[#ffd76a] aria-pressed:bg-[linear-gradient(180deg,#5a4a1c,#2a2410)]`} aria-label={t('Joystick aan of uit', 'Joystick on or off')} onClick={toggleJoystick}><Gamepad2 className="h-5 w-5" aria-hidden /></button>
        </nav>
      </section>

      <p className="text-[13.5px] leading-relaxed text-ink-700">
        {t('Tik op de grond om te lopen en sleep opzij om rond te kijken. Liever een joystick? Zet hem aan met de knop met de gamepad. In de oefenzaal van je praktijk staan de coach en de tv met je oefeningen van vandaag.', 'Tap the ground to walk and drag sideways to look around. Prefer a joystick? Switch it on with the gamepad button. In the exercise room of your practice you find the coach and the TV with your exercises for today.')}
      </p>

      <Dialog open={placesOpen} onClose={() => setPlacesOpen(false)} title={t('Waar wil je heen?', 'Where do you want to go?')} description={t('Kies een plek: je held loopt er vanzelf heen.', 'Pick a place: your hero walks there by itself.')} size="sm" sheet>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line" data-testid="places">
          {places.map((pl) => (
            <li key={pl.key}>
              <button type="button" className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#F3F7F1]" onClick={() => { setPlacesOpen(false); hideTip(); setErrand(null); world.current?.goTo(pl.key); }}>
                <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[18px] font-black ${pl.alert ? 'bg-[#fbf0d9] text-[#b07a00]' : 'bg-[#E7EFE3] text-ink-600'}`}>{pl.alert ? '!' : <MapIcon className="h-4 w-4" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink-900">{pl.label}{pl.alert && <span className="sr-only">{t(' (hier wacht iets)', ' (something waits here)')}</span>}</span>
                  {pl.hint && <span className="block text-[13px] text-ink-600">{pl.hint}</span>}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <Link to="/p/wereld" className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-[14.5px] font-semibold text-accent">{t('Naar de wereldkaart met je route', 'To the world map with your route')}<ChevronRight className="h-4 w-4" aria-hidden /></Link>
      </Dialog>

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
