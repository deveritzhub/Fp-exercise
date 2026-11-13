import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Armchair, Backpack, Beef, Droplets, Sparkles, ChevronRight, ClipboardList, Coins, DoorOpen, Footprints, Gamepad2, Lock, Maximize2, Minimize2, RotateCw, Trash2, Map as MapIcon, Play, ScrollText, Swords, Tv } from 'lucide-react';
import { ApiError, api, mediaUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { Button, Dialog, ErrorState, useToast } from '@/components/ui';
import { LevelBadge } from '@/components/hero/GameFx';
import { useHero } from '@/pages/patient/HeroPages';
import { MODULE_PATH, moduleOf, openToday, type PatientHomeData } from '@/pages/patient/PatientHome';
import { GEAR_SLOT, SKILLS, bodyShape, levelTier } from '@shared/hero';
import { villageBuildings } from '@shared/worldMap';
import { BOXING_KEY, EXIT_KEY, HOME_AT, HOME_KEY, PRACTICE_KEY, TV_KEY, WELL_KEY, boardKey, type WorldApi } from '@/components/patient/WalkVillage3D';
import { DECOR, HOME_ROOM, decorItem, freeSpot, turn, type Placed } from '@shared/homeDecor';
import { HOME_STAGES, homeStage, levelsToNextHome } from '@shared/practiceVillage';
import { MODULE_SITES, VILLAGE_LAYOUT, slotPosition, type Site } from '@/components/patient/walk';
import { openQuickLog } from '@/components/patient/Survival';
import { WATER } from '@shared/survival';
import { BOXING, CREATURES, blow, weaponAt, type CreatureKind } from '@shared/adventure';
import { BoxingRound } from '@/components/patient/BoxingRound';
import type { FigureLook } from '@/components/hero/HumanFigure';
import { Minimap, WorldMap, type Landmark, type MapTrack } from '@/components/patient/VillageMap';
// three.js only loads on the 3D pages.
const WalkVillage3D = lazy(() => import('@/components/patient/WalkVillage3D'));

const LABEL: Record<string, [string, string]> = {
  smithy: ['Smederij', 'Smithy'],
  library: ['Bibliotheek', 'Library'],
  hall: ['Trofeeënhal', 'Trophy hall'],
  board: ['Prikbord', 'Notice board'],
  guild: ['Gildehal', 'Guild hall'],
};

/** The sign of each building on the maps: an icon and the colour of its roof. */
const SIGN: Record<string, [string, string]> = {
  smithy: ['⚒️', '#b5532c'],
  library: ['📚', '#2759a0'],
  hall: ['🏆', '#c9a14a'],
  board: ['📜', '#8e3b5f'],
  guild: ['🚩', '#29483c'],
  kracht: ['🏋️', '#7a2f24'],
  mobiliteit: ['🧘', '#2f7f8a'],
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

type Track = MapTrack;
type OwnHome = { level: number; coins: number; owned: string[]; layout: Placed[] };
const WHY_NOT: Record<string, [string, string]> = {
  layout_door: ['Dat is te dicht bij de deur.', 'That is too close to the door.'],
  layout_overlap: ['Daar staat al iets.', 'Something already stands there.'],
  layout_outside: ['Dat is te dicht bij de muur.', 'That is too close to the wall.'],
  not_enough_coins: ['Je hebt nog niet genoeg muntjes.', 'You do not have enough coins yet.'],
  level_too_low: ['Daar is je level nog te laag voor.', 'Your level is too low for that yet.'],
};
/** Something to do, and the place in the village where it is done. */
type Task = { id: string; label: string; hint: string; dest: string; link?: string };
const TIP_KEY = 'fp.village.tip';

const STICK_KEY = 'fp.village.joystick';

/** Thumb stick: drag the knob and the hero walks that way; push it to the rim to run. */
export function Joystick({ stick, label }: { stick: RefObject<{ x: number; y: number }>; label: string }) {
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
  const qc = useQueryClient();
  const toast = useToast();
  // The own home: what was bought and where it stands. Only for someone who has a hero.
  const homeQ = useQuery({ queryKey: ['patient-own-home'], queryFn: () => api.get<OwnHome>('/patient/hero/home'), enabled: !!heroQ.data?.hero });
  const [decorOpen, setDecorOpen] = useState(false);
  const [shopTab, setShopTab] = useState<'mine' | 'shop'>('mine');
  /** The piece being put down: the next tap on the floor of the home places it. */
  const [placing, setPlacing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Full screen: the village over the whole screen. Where the browser can, its own bars go too
  // (not on an iPhone, where the page simply fills the screen).
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const root = document.documentElement;
    const scroll = root.style.overflow;
    root.style.overflow = 'hidden';
    void root.requestFullscreen?.().catch(() => undefined);
    const onChange = () => { if (!document.fullscreenElement && wasNative) setFull(false); };
    let wasNative = false;
    const mark = () => { if (document.fullscreenElement) wasNative = true; onChange(); };
    document.addEventListener('fullscreenchange', mark);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) setFull(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = scroll;
      document.removeEventListener('fullscreenchange', mark);
      window.removeEventListener('keydown', onKey);
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    };
  }, [full]);
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
  // The patient's own therapist as a figure, when they made one.
  const coach = useQuery({ queryKey: ['patient-coach'], queryFn: () => api.get<{ look: FigureLook | null }>('/patient/hero/coach'), staleTime: 10 * 60_000 });
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
  // The adventure: XP of its own (never the hero's), a level, and the weapon that comes with it.
  type Adventure = { xp: number; wins: number; winsToday: number; dailyWins: number; roundsToday: number; level: number; from: number; to: number };
  const adventure = useQuery({ queryKey: ['patient-adventure'], queryFn: () => api.get<Adventure>('/patient/hero/adventure'), enabled: !!d?.hero });
  const { weapon } = weaponAt(adventure.data?.level ?? 1);
  const look = useMemo(
    () => (d?.hero ? { ...d.hero, gear: [...d.gear.equipped.filter((g) => weapon.key === 'fists' || GEAR_SLOT[g] !== 'held'), ...(d.aids ?? [])], body: d.metrics ? bodyShape(d.metrics, d.hero.frame) : null } : null),
    [d, weapon.key],
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
  // ---- The own home ----
  const own = homeQ.data ?? null;
  const stage = L ? homeStage(L.level) : 0;
  const homeLabel = t('Jouw huis', 'Your home');
  const say = (e: unknown) => {
    const code = e instanceof ApiError ? e.message : '';
    const text = WHY_NOT[code];
    toast(text ? (nl ? text[0] : text[1]) : t('Dat lukte niet. Probeer het opnieuw.', 'That did not work. Try again.'));
  };
  const saveLayout = async (items: Placed[]) => {
    setBusy(true);
    try {
      qc.setQueryData(['patient-own-home'], await api.put<OwnHome>('/patient/hero/home/layout', { items }));
      return true;
    } catch (e) {
      say(e);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const buy = async (key: string) => {
    setBusy(true);
    try {
      qc.setQueryData(['patient-own-home'], await api.post<OwnHome>('/patient/hero/home/buy', { item: key }));
      void qc.invalidateQueries({ queryKey: ['patient-hero'] });
      const d2 = decorItem(key);
      toast(t(`${d2?.nl ?? 'Meubel'} gekocht en neergezet.`, `${d2?.en ?? 'Piece'} bought and put down.`));
      setShopTab('mine');
    } catch (e) {
      say(e);
    } finally {
      setBusy(false);
    }
  };
  const putDown = async (spot: { x: number; z: number }) => {
    if (!placing || !own) return;
    const before = own.layout.find((i) => i.key === placing);
    // A tap on or past a wall means: against that wall. The piece slides to the nearest spot inside.
    const pad = Math.max(0.3, decorItem(placing)?.r ?? 0);
    const x = Math.min(HOME_ROOM.x1 - pad, Math.max(HOME_ROOM.x0 + pad, spot.x));
    const z = Math.min(HOME_ROOM.z1 - pad, Math.max(HOME_ROOM.z0 + pad, spot.z));
    const ok = await saveLayout([...own.layout.filter((i) => i.key !== placing), { key: placing, x, z, rot: before?.rot ?? 0 }]);
    if (ok) setPlacing(null);
  };

  // The well: one real glass of water, logged where the hero stands.
  const [drinking, setDrinking] = useState(false);
  const drink = async () => {
    setDrinking(true);
    try {
      await api.post('/patient/logs/water', { ml: WATER.glassMl });
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
      toast(t('Glas water gelogd. Drink het ook echt op!', 'Glass of water logged. Do drink it!'));
    } catch (e) {
      say(e);
    } finally {
      setDrinking(false);
    }
  };
  // The flask in the backpack: filled at the well, two glasses to drink on the way. Kept in this browser, for today.
  const FLASK = 'fp.village.flask';
  const todayKey = new Date().toDateString();
  const [flask, setFlaskState] = useState<number>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(FLASK) ?? 'null') as { day: string; n: number } | null;
      return v && v.day === todayKey ? Math.max(0, Math.min(2, v.n)) : 0;
    } catch {
      return 0;
    }
  });
  const setFlask = (n: number) => {
    setFlaskState(n);
    try {
      localStorage.setItem(FLASK, JSON.stringify({ day: todayKey, n }));
    } catch { /* a full or closed store: the flask is simply not kept */ }
  };
  const sip = async () => {
    if (flask <= 0 || drinking) return;
    setFlask(flask - 1);
    await drink();
  };
  // The boxing school: a round on the bag, for adventure XP.
  const [boxingOpen, setBoxingOpen] = useState(false);
  const [roundNo, setRoundNo] = useState(0);
  const roundDone = async (hits: number) => {
    try {
      const was = adventure.data?.level ?? 1;
      const r = await api.post<Adventure & { gained: number }>('/patient/hero/adventure/round', { hits });
      qc.setQueryData(['patient-adventure'], r);
      toast(r.gained > 0 ? t(`${hits} raak: +${r.gained} avonturen-XP`, `${hits} hit: +${r.gained} adventure XP`) : t('Lekker gebokst! Voor vandaag heb je de XP van de bokszak al binnen.', 'Nice boxing! You already have today’s XP from the bag.'));
      if (r.level > was) toast(t(`Avonturier ${r.level}! Wapen: ${weaponAt(r.level).weapon.nl}.`, `Adventurer ${r.level}! Weapon: ${weaponAt(r.level).weapon.en}.`));
    } catch (e) {
      say(e);
    }
  };
  // Thirsty or stiff, as the day's log says: the hero walks slower until that is put right.
  const states = d?.logs?.survival.status ?? [];
  const thirsty = states.some((x) => x.key === 'thirsty');
  const stiff = states.some((x) => x.key === 'stiff');
  const pace = (thirsty ? 0.8 : 1) * (stiff ? 0.8 : 1);

  // The adventure: little ailments round the village to beat, for XP of its own (never the hero's).
  const creatures = useMemo(
    () => ([['slime', 120, 10.5], ['imp', 215, 10.8], ['couch', 325, 10.8], ['slime', 105, 8.4], ['giant_slime', 140, 11.3], ['couch_king', 295, 11.4]] as [CreatureKind, number, number][])
      .map(([kind, deg, r], i) => ({ key: `mob:${i}`, kind, label: nl ? CREATURES[kind].nl : CREATURES[kind].en, x: Math.cos((deg * Math.PI) / 180) * r, z: Math.sin((deg * Math.PI) / 180) * r }))
      // The big ones only show themselves to an adventurer of their level.
      .filter((c) => (adventure.data?.level ?? 1) >= CREATURES[c.kind].level),
    [nl, adventure.data?.level],
  );
  const [hurt, setHurt] = useState<Record<string, number>>({});
  const [beaten, setBeaten] = useState<string[]>([]);
  const mob = near?.startsWith('mob:') && !beaten.includes(near) ? creatures.find((c) => c.key === near) ?? null : null;
  // What was put right in real life today hits its own creature twice as hard.
  const strong = useMemo(() => new Set([...states.filter((x) => x.kind === 'buff').map((x) => x.key), ...(doneToday ? ['trained'] : [])]), [states, doneToday]);
  const strike = async () => {
    if (!mob) return;
    world.current?.strike(mob.key);
    const left = CREATURES[mob.kind].hp - (hurt[mob.key] ?? 0) - blow(mob.kind, strong, weapon.power);
    if (left > 0) {
      setHurt((h) => ({ ...h, [mob.key]: CREATURES[mob.kind].hp - left }));
      return;
    }
    const key = mob.key;
    setBeaten((b) => [...b, key]);
    setHurt((h) => ({ ...h, [key]: 0 }));
    // It comes back after a while, somewhere to return to.
    window.setTimeout(() => setBeaten((b) => b.filter((k) => k !== key)), 45_000);
    try {
      const r = await api.post<Adventure & { gained: number }>('/patient/hero/adventure/win', { kind: mob.kind });
      const was = adventure.data?.level ?? 1;
      qc.setQueryData(['patient-adventure'], r);
      const won = weaponAt(r.level).weapon;
      if (r.level > was) toast(won.level > was ? t(`Avonturier ${r.level}! Nieuw wapen: ${won.nl}.`, `Adventurer ${r.level}! New weapon: ${won.en}.`) : t(`Avonturier ${r.level}!`, `Adventurer ${r.level}!`));
      toast(r.gained > 0 ? t(`${mob.label} verslagen! +${r.gained} avonturen-XP`, `${mob.label} beaten! +${r.gained} adventure XP`) : t(`${mob.label} verslagen! Voor vandaag heb je alle avonturen-XP al binnen.`, `${mob.label} beaten! You already have all of today's adventure XP.`));
    } catch (e) {
      say(e);
    }
  };

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
      : k === HOME_KEY ? homeLabel.toLowerCase()
      : k === boardKey(HOME_KEY) ? t('je inrichtingstafel', 'your furnishing table')
      : k.startsWith('in:') ? t('het programmabord', 'the programme board')
      : buildings.find((b) => b.key === k)?.label ?? k;
  // Landmarks for the maps: every building with its own sign, and the practice.
  const landmarks: Landmark[] = [
      { key: TV_KEY, label: practiceName.replace(/\s*\(.*?\)\s*/g, ' ').trim(), x: VILLAGE_LAYOUT.gym.x, z: VILLAGE_LAYOUT.gym.z - 1.6, icon: '🏥', color: '#b4532f', wide: true, alert: todo.some((p) => moduleOf(p) === 'revalidatie') },
      ...buildings.map((b, i) => ({ key: 'kind' in b ? boardKey(b.key) : b.key, label: b.label, x: sites[i].x, z: sites[i].z, icon: SIGN[b.key]?.[0] ?? '🏠', color: SIGN[b.key]?.[1] ?? '#8a6038', alert: 'alert' in b && !!b.alert })),
      ...(own ? [{ key: HOME_KEY, label: homeLabel, x: HOME_AT.x, z: HOME_AT.z, icon: '🏡', color: '#3f8f5a' }] : []),
    ];

  const toPlace = (key: string) => {
    setPlacesOpen(false);
    hideTip();
    setErrand(null);
    world.current?.goTo(key);
  };
  const toPoint = (pt: { x: number; z: number }) => {
    setPlacesOpen(false);
    hideTip();
    setErrand(null);
    world.current?.walk(pt);
  };
  const places = [
    { key: TV_KEY, label: practiceName, hint: t('Oefenzaal, coach en de tv met je oefeningen', 'Exercise room, coach and the TV with your exercises'), alert: todo.some((p) => moduleOf(p) === 'revalidatie') },
    ...buildings.map((b) => ({ key: 'kind' in b ? boardKey(b.key) : b.key, label: b.label, hint: PLACE_HINT[b.key] ? (nl ? PLACE_HINT[b.key][0] : PLACE_HINT[b.key][1]) : '', alert: 'alert' in b && !!b.alert })),
    ...(own ? [{ key: HOME_KEY, label: homeLabel, hint: t(`${nl ? HOME_STAGES[stage].nl : HOME_STAGES[stage].en} · richt het in met je muntjes`, `${HOME_STAGES[stage].en} · furnish it with your coins`), alert: false }] : []),
  ];
  // The link a task brought along wins over the building's own, once the hero stands there.
  const errandHere = errand && errand.link && (near === errand.dest || (errand.dest.startsWith('in:') ? false : near === errand.dest)) ? errand : null;
  const pct = L ? Math.max(0, Math.min(100, Math.round(((L.xp - L.from) / Math.max(1, L.to - L.from)) * 100))) : 0;

  return (
    <div className="space-y-3">
      <h1 className="sr-only">{t('Je dorp', 'Your village')}</h1>
      <section aria-label={t('Je dorp in 3D. Tik op de grond om te lopen, of kies een gebouw.', 'Your village in 3D. Tap the ground to walk, or pick a building.')} data-full={full ? '1' : undefined}
        className={full ? 'fixed inset-0 z-50 bg-[#1b2a22] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]' : 'relative'}>
        <div className={full ? 'relative h-full' : 'relative'}>
        <Suspense fallback={<div className="h-[calc(100dvh-13.5rem)] min-h-[440px] animate-pulse rounded-2xl bg-[#26342c]" />}>
          <WalkVillage3D
            className={full ? 'h-full !rounded-none !border-0' : 'h-[calc(100dvh-13.5rem)] min-h-[440px]'}
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
            coachLook={coach.data?.look ?? null}
            well={!!d?.hero}
            creatures={d?.hero ? creatures : undefined}
            creaturesGone={beaten}
            boxing={!!d?.hero}
            weapon={weapon.key === 'fists' ? null : weapon.key}
            pace={pace}
            api={world}
            practiceLabel={home.data?.patient.practiceName ?? t('De praktijk', 'The practice')}
            home={own ? { stage, label: homeLabel } : undefined}
            homeItems={own?.layout}
            placing={!!placing}
            onFloor={(spot) => void putDown(spot)}
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
          <div className="relative">
            <Minimap track={track} landmarks={landmarks} onPlace={toPlace} onWalk={toPoint} label={t('Minikaart van het dorp. Tik op een plek of gebouw om erheen te lopen.', 'Minimap of the village. Tap a spot or a building to walk there.')} />
            <button type="button" data-testid="open-world-map" onClick={() => setPlacesOpen(true)} aria-label={t('Wereldkaart openen', 'Open the world map')} className="absolute -bottom-1 -left-1 grid h-9 w-9 place-items-center rounded-full border border-[#e4bc63] bg-[#141c18] text-[#ffd76a] shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a]"><MapIcon className="h-4 w-4" aria-hidden /></button>
          </div>
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
          <p role="status" data-testid="on-the-way" className={`${PANEL} absolute left-[56px] top-[62px] flex max-w-[176px] items-center gap-2 py-1 pl-2.5 pr-1 text-[12.5px]`}>
            <Footprints className="h-4 w-4 shrink-0 text-[#ffd76a]" aria-hidden />
            <span className="min-w-0 flex-1 leading-tight">{t(`Onderweg naar ${placeName(dest)}`, `On the way to ${placeName(dest)}`)}</span>
            <button type="button" onClick={() => world.current?.stop()} className="min-h-[32px] rounded-md px-2 font-semibold text-[#ffd76a] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a]">{t('Stop', 'Stop')}</button>
          </p>
        ) : tip ? (
          <p className={`${PANEL} absolute left-[56px] top-[62px] flex max-w-[176px] items-start gap-1 py-1.5 pl-2.5 pr-1 text-[12.5px] leading-snug`}>
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
          ) : placing ? (
            <p role="status" data-testid="placing" className={`${PANEL} pointer-events-auto flex items-center gap-2 py-1.5 pl-3 pr-1.5 text-[14px]`}>
              <span>{t(`Tik op de vloer waar je ${decorItem(placing)?.nl.toLowerCase() ?? 'meubel'} moet staan.`, `Tap the floor where your ${decorItem(placing)?.en.toLowerCase() ?? 'piece'} should go.`)}</span>
              <button type="button" onClick={() => setPlacing(null)} className="min-h-[36px] rounded-md px-2 font-semibold text-[#ffd76a] hover:bg-white/10">{t('Annuleer', 'Cancel')}</button>
            </p>
          ) : mob ? (
            <Button size="lg" data-testid="strike" className="pointer-events-auto border border-[#ffb3a1] shadow-lift" icon={<Swords className="h-5 w-5" />} onClick={() => void strike()}>
              {t(`Sla ${mob.label}`, `Strike ${mob.label}`)} · <span aria-label={t(`nog ${Math.max(1, CREATURES[mob.kind].hp - (hurt[mob.key] ?? 0))} leven`, `${Math.max(1, CREATURES[mob.kind].hp - (hurt[mob.key] ?? 0))} life left`)}>♥ {Math.max(1, CREATURES[mob.kind].hp - (hurt[mob.key] ?? 0))}</span>{strong.has(CREATURES[mob.kind].weakTo) ? t(' · dubbele klap', ' · double blow') : ''}
            </Button>
          ) : near === BOXING_KEY ? (
            <Button size="lg" data-testid="open-boxing" className="pointer-events-auto border border-[#ffd76a] shadow-lift" icon={<Swords className="h-5 w-5" />} onClick={() => { setRoundNo((n) => n + 1); setBoxingOpen(true); }}>{t('Train op de bokszak', 'Train on the bag')}</Button>
          ) : near === WELL_KEY ? (
            <span className="pointer-events-auto flex flex-wrap justify-center gap-2">
              <Button size="lg" data-testid="drink-well" loading={drinking} className="border border-[#9fd8ff] shadow-lift" icon={<Droplets className="h-5 w-5" />} onClick={() => void drink()}>{t(`Drink een glas (+${WATER.glassMl} ml)`, `Drink a glass (+${WATER.glassMl} ml)`)}</Button>
              {flask < 2 && <Button size="lg" variant="secondary" data-testid="fill-flask" className="border border-[#9fd8ff] shadow-lift" onClick={() => { setFlask(2); toast(t('Fles gevuld: twee glazen voor onderweg.', 'Flask filled: two glasses for on the way.')); }}>{t('Vul je fles', 'Fill your flask')}</Button>}
            </span>
          ) : near === HOME_KEY ? (
            <Button size="lg" data-testid="enter-home" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<DoorOpen className="h-5 w-5" />} onClick={() => world.current?.use(HOME_KEY)}>{t('Naar binnen: jouw huis', 'Go in: your home')}</Button>
          ) : near === boardKey(HOME_KEY) ? (
            <Button size="lg" data-testid="open-decor" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<Armchair className="h-5 w-5" />} onClick={() => setDecorOpen(true)}>{t('Inrichten en winkel', 'Furnish and shop')}</Button>
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

        {adventure.data && (
          <p className="absolute left-[58px] top-[162px] flex items-center gap-1 rounded-md border border-black/60 bg-[#141c18]/85 px-1.5 py-[3px] text-[10.5px] font-semibold leading-none text-[#ffd9a8] shadow-lift" data-testid="adventure-level">
            <Sparkles className="h-3 w-3" aria-hidden />{t(`Avonturier ${adventure.data.level}`, `Adventurer ${adventure.data.level}`)} · {adventure.data.xp - adventure.data.from}/{adventure.data.to - adventure.data.from}<span className="sr-only"> · {nl ? weapon.nl : weapon.en}</span>
          </p>
        )}
        {/* Meters of the day, as in a game: protein, steps and water. A tap opens the quick log on that tab. */}
        {d?.hero && d.logs && (
          <div className="absolute left-[58px] top-[62px] flex flex-col gap-[3px]" data-testid="world-meters">
            {([
              ['protein', Beef, t('Eiwit', 'Protein'), d.logs.protein.goal ? d.logs.protein.grams / d.logs.protein.goal : null, d.logs.protein.goal ? `${Math.round(d.logs.protein.grams)}/${d.logs.protein.goal} g` : t('kies doel', 'set goal'), '#e2674a'],
              ['steps', Footprints, t('Beweging', 'Movement'), d.logs.steps.goal ? d.logs.steps.today / d.logs.steps.goal : null, `${d.logs.steps.today.toLocaleString(nl ? 'nl-NL' : 'en-GB')}/${d.logs.steps.goal.toLocaleString(nl ? 'nl-NL' : 'en-GB')}`, '#5fc46a'],
              ['water', Droplets, t('Water', 'Water'), d.logs.survival.water.ratio, `${Math.round(d.logs.survival.water.ratio * 100)}%`, '#58a8e8'],
            ] as const).map(([tab, Icon, label, ratio, text, color]) => (
              <button key={tab} type="button" data-meter={tab} onClick={() => openQuickLog(tab)}
                aria-label={t(`${label}: ${text}. Tik om te loggen.`, `${label}: ${text}. Tap to log.`)}
                className="flex h-[22px] w-[128px] items-center gap-1 rounded-md border border-black/60 bg-[#141c18]/85 pl-1 pr-1.5 text-white shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a]">
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden />
                <span className="relative h-[9px] min-w-0 flex-1 overflow-hidden rounded-sm bg-black/60">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio ?? 0)) * 100)}%`, background: color }} />
                </span>
                <span className="shrink-0 text-[9.5px] font-semibold leading-none tabular-nums">{text}</span>
              </button>
            ))}
            <button type="button" data-testid="flask" disabled={flask <= 0 || drinking} onClick={() => void sip()}
              aria-label={flask > 0 ? t(`Waterfles: ${flask} van 2 glazen. Tik om een glas te drinken.`, `Flask: ${flask} of 2 glasses. Tap to drink a glass.`) : t('Waterfles leeg. Vul hem bij de waterput.', 'Flask empty. Fill it at the well.')}
              className="flex h-[22px] w-[128px] items-center gap-1 rounded-md border border-black/60 bg-[#141c18]/85 pl-1 pr-1.5 text-white shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a] disabled:opacity-70">
              <Backpack className="h-3.5 w-3.5 shrink-0 text-[#9fd8ff]" aria-hidden />
              <span className="flex flex-1 gap-1" aria-hidden>{[0, 1].map((i) => <span key={i} className={`h-[9px] flex-1 rounded-sm ${i < flask ? 'bg-[#58a8e8]' : 'bg-black/60'}`} />)}</span>
              <span className="shrink-0 text-[9.5px] font-semibold leading-none">{flask > 0 ? t('drink', 'drink') : t('leeg', 'empty')}</span>
            </button>
          </div>
        )}

        {(thirsty || stiff) && (
          <ul className="absolute left-2 top-[186px] flex max-w-[190px] flex-col gap-1" data-testid="world-states" aria-label={t('Hoe je held zich voelt', 'How your hero feels')}>
            {thirsty && (
              <li><button type="button" onClick={() => world.current?.goTo(WELL_KEY)} className="rounded-md border border-[#9fd8ff]/70 bg-[#141c18]/85 px-2 py-1 text-left text-[11.5px] font-semibold leading-tight text-[#cfeaff] shadow-lift">{t('Dorst: je loopt trager. Tik om naar de waterput te lopen.', 'Thirsty: you walk slower. Tap to walk to the well.')}</button></li>
            )}
            {stiff && (
              <li><button type="button" onClick={() => world.current?.goTo('in:mobiliteit')} className="rounded-md border border-[#f0c36a]/70 bg-[#141c18]/85 px-2 py-1 text-left text-[11.5px] font-semibold leading-tight text-[#ffe9b8] shadow-lift">{t('Stijf: je loopt trager. Even bewegen helpt; tik voor de Mobiliteitsstudio.', 'Stiff: you walk slower. Moving helps; tap for the mobility studio.')}</button></li>
            )}
          </ul>
        )}

        {/* Action bar. */}
        <button type="button" data-testid="toggle-full" aria-pressed={full} onClick={() => setFull((v) => !v)} aria-label={full ? t('Volledig scherm sluiten', 'Leave full screen') : t('Volledig scherm', 'Full screen')}
          className="absolute left-2 top-[62px] grid h-10 w-10 place-items-center rounded-lg border border-[#e4bc63]/70 bg-[#141c18]/85 text-[#f6e2a6] shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a]">
          {full ? <Minimize2 className="h-5 w-5" aria-hidden /> : <Maximize2 className="h-5 w-5" aria-hidden />}
        </button>
        <nav aria-label={t('Snelbalk', 'Action bar')} className="absolute bottom-2 left-2 flex gap-1.5">
          <button type="button" className={SLOT} aria-label={t('Naar de tv met je oefeningen', 'To the TV with your exercises')} onClick={() => (near === TV_KEY ? setTvOpen(true) : world.current?.goTo(TV_KEY))} data-testid="slot-tv"><Tv className="h-5 w-5" aria-hidden /></button>
          <Link to="/p/held/inventaris" className={SLOT} aria-label={t('Rugzak: je uitrusting', 'Backpack: your gear')}><Backpack className="h-5 w-5" aria-hidden /></Link>
          <Link to="/p/held" className={SLOT} aria-label={t('Skills en je held', 'Skills and your hero')}><Swords className="h-5 w-5" aria-hidden /></Link>
          <button type="button" data-testid="slot-places" className={SLOT} aria-label={t('Plekken: kies waar je heen wilt', 'Places: pick where to go')} onClick={() => setPlacesOpen(true)}><MapIcon className="h-5 w-5" aria-hidden /></button>
          <button type="button" data-testid="slot-joystick" aria-pressed={joystick} className={`${SLOT} aria-pressed:border-[#ffd76a] aria-pressed:bg-[linear-gradient(180deg,#5a4a1c,#2a2410)]`} aria-label={t('Joystick aan of uit', 'Joystick on or off')} onClick={toggleJoystick}><Gamepad2 className="h-5 w-5" aria-hidden /></button>
        </nav>
        </div>
      </section>

      <p className="text-[13.5px] leading-relaxed text-ink-700">
        {t('Tik op de grond om te lopen en sleep opzij om rond te kijken. Liever een joystick? Zet hem aan met de knop met de gamepad. In de oefenzaal van je praktijk staan de fysiotherapeut en de tv met je oefeningen van vandaag.', 'Tap the ground to walk and drag sideways to look around. Prefer a joystick? Switch it on with the gamepad button. In the exercise room of your practice you find the physiotherapist and the TV with your exercises for today.')}
      </p>

      <Dialog open={decorOpen} onClose={() => setDecorOpen(false)} title={t('Jouw huis inrichten', 'Furnish your home')} size="md" sheet
        description={L ? t(`${HOME_STAGES[stage].nl}, level ${L.level}. ${levelsToNextHome(L.level) === null ? 'Dit is het grootste huis.' : `Nog ${levelsToNextHome(L.level)} level(s) tot een ${HOME_STAGES[stage + 1].nl.toLowerCase()}.`}`, `${HOME_STAGES[stage].en}, level ${L.level}. ${levelsToNextHome(L.level) === null ? 'This is the biggest home.' : `${levelsToNextHome(L.level)} more level(s) to a ${HOME_STAGES[stage + 1].en.toLowerCase()}.`}`) : undefined}>
        {own && (
          <div data-testid="decor-panel">
            <p className="mb-2 text-[12.5px] text-ink-600">{t('Je fysiotherapeut kan in het dorp van de praktijk bij je binnen kijken en ziet dan je meubels, niet je muntjes.', 'Your physiotherapist can look into your home in the practice village and sees your furniture, not your coins.')}</p>
            <p className="flex items-center gap-2 rounded-xl bg-[#fbf0d9] px-3 py-2 text-[15px] font-semibold text-[#6b4705]"><Coins className="h-5 w-5" aria-hidden /><span data-testid="coins">{own.coins}</span> {t('muntjes', 'coins')}<span className="ml-auto text-[12.5px] font-normal">{t('Verdien ze met trainen en je dagkist.', 'Earn them by training and your day chest.')}</span></p>
            <div role="tablist" className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-[#E7EFE3] p-1">
              {(['mine', 'shop'] as const).map((tab) => (
                <button key={tab} type="button" role="tab" aria-selected={shopTab === tab} onClick={() => setShopTab(tab)} className="min-h-[40px] rounded-lg text-[14.5px] font-semibold text-ink-700 aria-selected:bg-white aria-selected:text-ink-950 aria-selected:shadow-card">
                  {tab === 'mine' ? t(`Mijn meubels (${own.owned.length})`, `My furniture (${own.owned.length})`) : t('Winkel', 'Shop')}
                </button>
              ))}
            </div>
            {shopTab === 'mine' ? (
              own.owned.length === 0 ? (
                <p className="mt-3 rounded-xl bg-[#F3F7F1] px-3 py-3 text-[14.5px] text-ink-800">{t('Je huis is nog leeg. Koop je eerste meubel in de winkel.', 'Your home is still empty. Buy your first piece in the shop.')}</p>
              ) : (
                <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
                  {own.owned.map((key) => {
                    const item = decorItem(key)!;
                    const at = own.layout.find((i) => i.key === key);
                    return (
                      <li key={key} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                        {/* The name on its own line; the buttons under it, so nothing is squeezed on a phone. */}
                        <span className="basis-full">
                          <span className="block text-[15px] font-semibold text-ink-900">{nl ? item.nl : item.en}</span>
                          <span className="block text-[13px] text-ink-600">{at ? t('Staat in je huis', 'In your home') : t('In de opslag', 'In storage')}</span>
                        </span>
                        <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setDecorOpen(false); setPlacing(key); }}>{at ? t('Verplaats', 'Move') : t('Neerzetten', 'Put down')}</Button>
                        {at && <Button size="sm" variant="secondary" disabled={busy} aria-label={t(`${item.nl} draaien`, `Turn ${item.en}`)} icon={<RotateCw className="h-4 w-4" />} onClick={() => void saveLayout(own.layout.map((i) => (i.key === key ? { ...i, rot: turn(i.rot + 90) } : i)))}>{t('Draai', 'Turn')}</Button>}
                        {at && <Button size="sm" variant="secondary" disabled={busy} aria-label={t(`${item.nl} opbergen`, `Store ${item.en}`)} icon={<Trash2 className="h-4 w-4" />} onClick={() => void saveLayout(own.layout.filter((i) => i.key !== key))}>{t('Opbergen', 'Store')}</Button>}
                      </li>
                    );
                  })}
                </ul>
              )
            ) : (
              <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line" data-testid="decor-shop">
                {DECOR.filter((item) => !own.owned.includes(item.key)).map((item) => {
                  const locked = own.level < item.level;
                  const poor = own.coins < item.price;
                  const full = !freeSpot(item.key, own.layout, new Set([...own.owned, item.key]));
                  return (
                    <li key={item.key} className="flex items-center gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-ink-900">{nl ? item.nl : item.en}</span>
                        <span className="block text-[13px] text-ink-600">{locked ? t(`Vanaf level ${item.level}`, `From level ${item.level}`) : full ? t('Past nu niet: berg eerst iets op', 'Does not fit now: store something first') : poor ? t(`Nog ${item.price - own.coins} muntjes sparen`, `${item.price - own.coins} more coins to save`) : t('Wordt meteen neergezet', 'Is put down at once')}</span>
                      </span>
                      <Button size="sm" disabled={busy || locked || poor} data-buy={item.key} icon={locked ? <Lock className="h-4 w-4" /> : <Coins className="h-4 w-4" />} onClick={() => void buy(item.key)}>{item.price}</Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Dialog>

      <Dialog open={boxingOpen} onClose={() => setBoxingOpen(false)} size="md" sheet title={t('Boksschool', 'Boxing school')}
        description={adventure.data ? t(`Ronde ${Math.min(adventure.data.roundsToday + 1, BOXING.roundsPerDay)} van ${BOXING.roundsPerDay} die vandaag XP geeft.`, `Round ${Math.min(adventure.data.roundsToday + 1, BOXING.roundsPerDay)} of ${BOXING.roundsPerDay} that gives XP today.`) : undefined}
        footer={<Button variant="secondary" onClick={() => setRoundNo((n) => n + 1)} data-testid="next-round">{t('Nog een ronde', 'Another round')}</Button>}>
        <BoxingRound key={roundNo} onDone={(hits) => void roundDone(hits)} />
      </Dialog>
      <Dialog open={placesOpen} onClose={() => setPlacesOpen(false)} title={t('Wereldkaart', 'World map')} description={t('Kies een plek: je held loopt er vanzelf heen.', 'Pick a place: your hero walks there by itself.')} size="md" sheet>
        <WorldMap track={track} landmarks={landmarks} onPlace={toPlace} onWalk={toPoint} label={t('Wereldkaart van het dorp, noorden boven. Tik op een gebouw of een plek om erheen te lopen.', 'World map of the village, north up. Tap a building or a spot to walk there.')} />
        <p className="mb-2 mt-2 text-[13px] text-ink-600">{t('Tik op de kaart, of kies hieronder een plek.', 'Tap the map, or pick a place below.')}</p>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line" data-testid="places">
          {places.map((pl) => (
            <li key={pl.key}>
              <button type="button" className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#F3F7F1]" onClick={() => toPlace(pl.key)}>
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
