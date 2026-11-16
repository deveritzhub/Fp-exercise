import { lazy, Suspense, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Armchair, Backpack, Beef, Flame, Utensils, Package, Droplets, Heart, Sparkles, ChevronRight, Coins, DoorOpen, Footprints, Gamepad2, Gauge, Lock, Maximize2, Minimize2, RotateCw, Trash2, Map as MapIcon, Play, ScrollText, Swords, Tv } from 'lucide-react';
import { ApiError, api, mediaUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { Button, Dialog, ErrorState, useToast } from '@/components/ui';
import { LevelBadge } from '@/components/hero/GameFx';
import { useHero } from '@/pages/patient/HeroPages';
import { MODULE_PATH, moduleOf, openToday, type PatientHomeData } from '@/pages/patient/PatientHome';
import { GEAR_SLOT, SKILLS, bodyShape, levelTier } from '@shared/hero';
import { villageBuildings } from '@shared/worldMap';
import { ItemIcon } from '@/components/patient/ItemIcon';
import { BOXING_KEY, CAMP_KEY, EXIT_KEY, HOME_KEY, PRACTICE_KEY, TV_KEY, WELL_KEY, boardKey, type WorldApi } from '@/components/patient/WalkVillage3D';
import { DECOR, HOME_ROOM, decorItem, freeSpot, turn, type Placed } from '@shared/homeDecor';
import { HOME_STAGES, homeStage, type NextHome } from '@shared/practiceVillage';
import { VILLAGE_LAYOUT, slotPosition, type Site } from '@/components/patient/walk';
import { SITES, SPOTS, TOWN_HOUSES, WILD, placeAt } from '@/components/patient/townPlan';
import { openQuickLog } from '@/components/patient/Survival';
import { WATER } from '@shared/survival';
import { SUPPLY } from '@shared/supplies';
import { useSupplies } from '@/lib/supplies';
import { alphaAdvised, armourByKey, ZONES, zoneAt, COOKING, LOOT_KEYS, BERRIES_FOR, ATTACKS, BOXING, CREATURES, HERO_REGEN, LOOT, blow, heroMaxHp, hitOnHero, isAlpha, isHarvest, NEEDS_TOOL, TOOL_BONUS, toolFor, weaponAt, weaponByKey, type CreatureKind, type LootKey } from '@shared/adventure';
import { BoxingRound } from '@/components/patient/BoxingRound';
import { KarateSheet, useKarate } from '@/components/patient/Karate';
import { BELTS } from '@shared/karate';
import type { FigureLook } from '@/components/hero/HumanFigure';
import { Minimap, WorldMap, type Landmark, type MapTrack } from '@/components/patient/VillageMap';
// three.js only loads on the 3D pages.
const WalkVillage3D = lazy(() => import('@/components/patient/WalkVillage3D'));

/** Who keeps each building, and what they say when you step up to the counter. */
const KEEPER: Record<string, { name: [string, string]; says: [string, string]; open: [string, string] }> = {
  smithy: { name: ['Wapensmid', 'Armourer'], says: ['Welkom in de smederij! Hier ruil je muntjes voor uitrusting. Verdien ze met trainen en je dagkist.', 'Welcome to the smithy! Here you trade coins for gear. Earn them by training and your day chest.'], open: ['Bekijk de uitrusting', 'See the gear'] },
  library: { name: ['Bibliothecaris', 'Librarian'], says: ['Stil in de bibliotheek… maar vraag gerust. Hier vind je alle spieren en wat ze doen.', 'Quiet in the library… but do ask. Here you find every muscle and what it does.'], open: ['Open de spierenatlas', 'Open the muscle atlas'] },
  hall: { name: ['Hofmeester', 'Steward'], says: ['Dit is de trofeeënhal. Alles wat je hebt verdiend hangt hier aan de muur.', 'This is the trophy hall. Everything you have earned hangs on the wall here.'], open: ['Bekijk je prijzen', 'See your trophies'] },
  board: { name: ['Bode', 'Messenger'], says: ['Nieuws van het prikbord: hier staan je missies van deze week.', 'News from the notice board: here are your missions for this week.'], open: ['Bekijk je missies', 'See your missions'] },
  dojo: { name: ['Sensei', 'Sensei'], says: ['Osu! Welkom in de dojo.', 'Osu! Welcome to the dojo.'], open: ['Bekijk je banden', 'See your belts'] },
  guild: { name: ['Gildemeester', 'Guild master'], says: ['Welkom in de gildehal. Samen met de rest van de praktijk werk je hier aan één doel.', 'Welcome to the guild hall. Together with the rest of the practice you work on one goal here.'], open: ['Bekijk het gilde', 'See the guild'] },
};

/** What each figure can do for you: the functions of the app, as choices in the talk. `act` opens something in the world itself. */
type TalkOption = { nl: string; en: string; to?: string; act?: 'tv' | 'karate' | 'boxing' };
const TALK: Record<string, { name: [string, string]; says: [string, string]; options: TalkOption[] }> = {
  practice: {
    name: ['Fysiotherapeut', 'Physiotherapist'], says: ['Fijn dat je er bent. Waar kan ik je mee helpen?', 'Good to see you. What can I help you with?'],
    options: [
      { nl: 'Laat mijn oefeningen van vandaag zien', en: 'Show my exercises for today', act: 'tv' },
      { nl: 'Ik wil mijn pijn doorgeven', en: 'I want to report my pain', to: '/p/held/pijn' },
      { nl: 'Mijn revalidatieprogramma', en: 'My rehab programme', to: '/p/revalidatie' },
      { nl: 'Hoe gaat het met mijn voortgang?', en: 'How is my progress?', to: '/p/voortgang' },
      { nl: 'Een bericht sturen', en: 'Send a message', to: '/p/berichten' },
    ],
  },
  kracht: {
    name: ['Coach', 'Coach'], says: ['Klaar om sterker te worden? Zeg het maar.', 'Ready to get stronger? Tell me.'],
    options: [
      { nl: 'Mijn krachtprogramma', en: 'My strength programme', to: '/p/kracht' },
      { nl: 'Mijn 1RM meten en krachtlog invullen', en: 'Measure my 1RM and fill in the strength log', to: '/p/krachtlog' },
      { nl: 'Een eigen training loggen', en: 'Log a workout of my own', to: '/p/logboek' },
    ],
  },
  mobiliteit: {
    name: ['Flowmeester', 'Flow master'], says: ['Adem rustig in. Wat wil je vandaag losmaken?', 'Breathe in slowly. What would you like to loosen today?'],
    options: [
      { nl: 'Mijn mobiliteit meten', en: 'Measure my mobility', to: '/p/mobiliteit/meten' },
      { nl: 'Mijn mobiliteitsprogramma', en: 'My mobility programme', to: '/p/mobiliteit' },
    ],
  },
  smithy: {
    name: ['Wapensmid', 'Armourer'], says: ['Welkom in de smederij! Hier ruil je muntjes voor uitrusting.', 'Welcome to the smithy! Here you trade coins for gear.'],
    options: [{ nl: 'Wapens en gereedschap kopen', en: 'Buy weapons and tools', to: '/p/held/inventaris#backpack-title' }, { nl: 'Iets maken van mijn buit', en: 'Make something from my loot', to: '/p/held/inventaris#craft-title' }, { nl: 'Laat de uitrusting zien', en: 'Show me the gear', to: '/p/held/inventaris#gear-title' }, { nl: 'Mijn uiterlijk aanpassen', en: 'Change my look', to: '/p/held/uiterlijk' }],
  },
  library: {
    name: ['Bibliothecaris', 'Librarian'], says: ['Stil in de bibliotheek… maar vraag gerust.', 'Quiet in the library… but do ask.'],
    options: [{ nl: 'De spierenatlas', en: 'The muscle atlas', to: '/p/spieren' }],
  },
  hall: {
    name: ['Hofmeester', 'Steward'], says: ['Dit is de trofeeënhal. Alles wat je hebt verdiend hangt hier.', 'This is the trophy hall. Everything you have earned hangs here.'],
    options: [{ nl: 'Mijn prijzen', en: 'My trophies', to: '/p/held/inventaris#trophies-title' }, { nl: 'Mijn badges', en: 'My badges', to: '/p/held#fold-hero-badges' }, { nl: 'Mijn voortgang', en: 'My progress', to: '/p/voortgang' }],
  },
  board: {
    name: ['Bode', 'Messenger'], says: ['Nieuws van het prikbord!', 'News from the notice board!'],
    options: [{ nl: 'Mijn missies van vandaag', en: 'My missions for today', to: '/p' }, { nl: 'De wereldkaart', en: 'The world map', to: '/p/wereld' }, { nl: 'Mijn berichten', en: 'My messages', to: '/p/berichten' }],
  },
  guild: {
    name: ['Gildemeester', 'Guild master'], says: ['Welkom in de gildehal. Samen staan we sterker.', 'Welcome to the guild hall. Together we stand stronger.'],
    options: [{ nl: 'Het gilde van de praktijk', en: 'The guild of the practice', to: '/p/wereld#gilde' }, { nl: 'Mijn vrienden', en: 'My friends', to: '/p/held/vrienden' }],
  },
  dojo: {
    name: ['Sensei', 'Sensei'], says: ['Osu! Welkom in de dojo.', 'Osu! Welcome to the dojo.'],
    options: [{ nl: 'Mijn band en de exameneisen', en: 'My belt and the exam requirements', act: 'karate' }],
  },
};

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
  dojo: ['🥋', '#1d1f1e'],
  weaponshop: ['⚔️', '#8a3a2a'],
  armourer: ['🛡️', '#5c6a7a'],
  tailor: ['🧵', '#9a4a6a'],
  workshop: ['⚙️', '#3d5a8a'],
  carpenter: ['🔨', '#a0522d'],
  rehab: ['➕', '#3d6a8a'],
  healer: ['❤️', '#a83a3a'],
  physio: ['🏃', '#7a4a8a'],
  massage: ['💆', '#6a8a5a'],
  pool: ['🏊', '#3a7ab8'],
  grocer: ['🧺', '#5a8a3a'],
  baker: ['🥖', '#b8782a'],
  inn: ['🍺', '#8a3a2a'],
  tradepost: ['⚓', '#7a5a3a'],
  townhall: ['🏛️', '#3a4a8a'],
  stables: ['🐴', '#8a5a3a'],
};

const PLACE_HINT: Record<string, [string, string]> = {
  weaponshop: ['Wapens en gereedschap kopen', 'Buy weapons and tools'],
  armourer: ['Je uitrusting', 'Your gear'],
  tailor: ['Je uiterlijk aanpassen', 'Change your look'],
  workshop: ['Maken van je buit', 'Make things from your loot'],
  carpenter: ['Een kist of wapen maken', 'Make a chest or a weapon'],
  rehab: ['Je revalidatie', 'Your rehabilitation'],
  healer: ['Je pijnkaart bijwerken', 'Update your body map'],
  grocer: ['Voeding en boodschappen', 'Nutrition and shopping'],
  baker: ['Recepten', 'Recipes'],
  inn: ['Je vrienden', 'Your friends'],
  townhall: ['Je instellingen', 'Your settings'],
  physio: ['Komt later', 'Comes later'],
  massage: ['Komt later', 'Comes later'],
  pool: ['Komt later', 'Comes later'],
  tradepost: ['Komt later', 'Comes later'],
  stables: ['Komt later', 'Comes later'],
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
type OwnHome = { level: number; coins: number; owned: string[]; layout: Placed[]; stage: number; build: NextHome | null };
const WHY_NOT: Record<string, [string, string]> = {
  not_enough_loot: ['Je hebt nog niet genoeg buit om te bouwen.', 'You do not have enough loot to build yet.'],
  home_complete: ['Je woont al in het grootste huis.', 'You already live in the biggest home.'],
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

/**
 * How smoothly the world runs on this device: frames per second, read from the scene once a second.
 * Off until asked for; a help for tuning, not a part of the game.
 */
function FpsMeter() {
  const { t } = useI18n();
  const [on, setOn] = useState(false);
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => {
      const v = Number(document.querySelector<HTMLElement>('[data-testid="walk-village"]')?.dataset.fps);
      setFps(Number.isFinite(v) && v > 0 ? v : null);
    }, 1000);
    return () => window.clearInterval(id);
  }, [on]);
  // In the action bar of the world itself, so it is in reach in full screen too; the number sits just above the bar.
  return (
    <>
      <button type="button" data-testid="fps-toggle" aria-pressed={on} onClick={() => setOn((v) => !v)} aria-label={on ? t('Verberg de snelheid', 'Hide the speed') : t('Toon hoe vloeiend het dorp loopt', 'Show how smoothly the village runs')}
        className={`${SLOT} aria-pressed:border-[#ffd76a] aria-pressed:bg-[linear-gradient(180deg,#5a4a1c,#2a2410)]`}><Gauge className="h-5 w-5" aria-hidden /></button>
      {on && (
        <p role="status" data-testid="fps" className="pointer-events-none absolute bottom-[54px] left-0 whitespace-nowrap rounded-md border border-black/60 bg-[#141c18]/90 px-2 py-1 text-[12.5px] font-semibold tabular-nums text-white shadow-lift">
          {fps === null ? t('meten…', 'measuring…') : t(`${fps} beelden per seconde`, `${fps} frames per second`)}
          {fps !== null && <span className="ml-1 font-normal text-white/80">{fps >= 30 ? t('· goed', '· good') : fps >= 20 ? t('· matig', '· fair') : t('· traag', '· slow')}</span>}
        </p>
      )}
    </>
  );
}

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
  const autoFull = useRef(false);
  // A phone turned sideways: the village takes the whole screen by itself, and gives it back when the
  // phone is upright again (unless full screen was chosen by hand).
  useEffect(() => {
    const mq = window.matchMedia?.('(orientation: landscape) and (max-height: 520px)');
    if (!mq) return;
    const sync = () => {
      if (mq.matches) setFull((f) => { if (!f) autoFull.current = true; return true; });
      else if (autoFull.current) { autoFull.current = false; setFull(false); }
    };
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);
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
  type Adventure = { xp: number; wins: number; winsToday: number; dailyWins: number; roundsToday: number; level: number; from: number; to: number; weapon: string | null; owned: string[]; tools?: string[]; coins: number; loot?: Record<string, number>; lootCap?: number; armour?: string | null;
    quest?: { key: string; kind: CreatureKind; n: number; nl: string; en: string; progress: number; done: boolean; xp: number } | null };
  const adventure = useQuery({ queryKey: ['patient-adventure'], queryFn: () => api.get<Adventure>('/patient/hero/adventure'), enabled: !!d?.hero });
  // The weapon in hand is the one bought and put on in the backpack; none means bare fists.
  const weapon = weaponByKey(adventure.data?.weapon);
  /** A new adventurer level: say which weapon the smith now sells, if one came with it. */
  const levelUp = (was: number, now: number) => {
    if (now <= was) return;
    const w = weaponAt(now).weapon;
    toast(w.level > was ? t(`Avonturier ${now}! Nieuw bij de wapensmid: ${w.nl}.`, `Adventurer ${now}! New at the armourer: ${w.en}.`) : t(`Avonturier ${now}!`, `Adventurer ${now}!`));
  };
  const look = useMemo(
    () => (d?.hero ? { ...d.hero, gear: [...d.gear.equipped.filter((g) => weapon.key === 'fists' || GEAR_SLOT[g] !== 'held'), ...(d.aids ?? [])], body: d.metrics ? bodyShape(d.metrics, d.hero.frame) : null } : null),
    [d, weapon.key],
  );
  const todo = useMemo(() => (home.data?.programs ?? []).filter(openToday), [home.data]);
  const waiting = { kracht: todo.some((p) => moduleOf(p) === 'kracht'), mobiliteit: todo.some((p) => moduleOf(p) === 'mobiliteit') };
  // Round the square: the hero's buildings. Further out, west and east: the houses for strength and mobility.
  const buildings = useMemo(
    () => [
      ...villageBuildings({ hero: true, atlas: true, mission: true, guild: true }).map((b) => ({ key: b.key as string, to: b.to as string, label: nl ? LABEL[b.key][0] : LABEL[b.key][1], keeper: KEEPER[b.key] ? KEEPER[b.key].name[nl ? 0 : 1] : undefined, site: SITES[b.key as keyof typeof SITES] as Site | undefined })),
      { key: 'kracht', to: MODULE_PATH.kracht, label: nl ? 'Krachthonk' : 'Strength house', site: SITES.kracht as Site, roof: 0x7a2f24, kind: 'kracht' as const, alert: waiting.kracht },
      { key: 'mobiliteit', to: MODULE_PATH.mobiliteit, label: nl ? 'Mobiliteitsstudio' : 'Mobility studio', site: SITES.mobiliteit as Site, roof: 0x2f7f8a, kind: 'mobiliteit' as const, alert: waiting.mobiliteit },
      // The Kyokushin dojo, behind the houses in the north-west: its door opens the belt list.
      { key: 'dojo', to: '/p/held', label: 'Dojo', site: SITES.dojo as Site, roof: 0x1d1f1e, keeper: 'Sensei', model: { url: '/village/buildings/dojo.glb?v=1', scale: 0.8 } },
      // The rest of the town plan: shops and houses that open a part of the app, and some that come later.
      ...TOWN_HOUSES.map((h) => ({ key: h.key, to: h.to ?? '', label: nl ? h.nl : h.en, site: placeAt(h.at.x, h.at.z, 2.1 * (h.scale ?? 1)) as Site, roof: h.roof, scale: h.scale, soon: !!h.soon })),
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

  // Doors open by themselves: standing at the door of a house or shop, the hero walks in. Not while
  // passing by on the way elsewhere, not right after stepping out, and not when a task waits at this door.
  const leftBy = useRef(false);
  useEffect(() => {
    if (!near) {
      leftBy.current = false;
      return;
    }
    const b = buildings.find((x) => x.key === near);
    if (!b || leftBy.current || !(('keeper' in b && b.keeper) || 'kind' in b)) return;
    if (dest && dest !== near) return;
    if (errand?.link && errand.dest === near) return;
    const id = window.setTimeout(() => world.current?.use(near), dest ? 150 : 700);
    return () => window.clearTimeout(id);
  }, [near, dest, buildings, errand]);

  if (home.isError) return <ErrorState error={home.error} onRetry={() => home.refetch()} />;
  const L = d?.level;
  const nearBuilding = buildings.find((b) => b.key === near) ?? null;
  const boardOf = buildings.find((b) => 'kind' in b && boardKey(b.key) === near) ?? null;
  // At the counter of a kept building: the keeper to talk to.
  const keeperOf = buildings.find((b) => 'keeper' in b && b.keeper && boardKey(b.key) === near) ?? null;
  const [talk, setTalk] = useState<string | null>(null);
  const talking = buildings.find((b) => b.key === talk) ?? null;
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
    // The adventure's task of the day: walk to the first of its kind; done, it gives its bonus.
    ...(adventure.data?.quest && !adventure.data.quest.done ? [{ id: 'adv-quest', label: nl ? adventure.data.quest.nl : adventure.data.quest.en, hint: t(`${adventure.data.quest.progress}/${adventure.data.quest.n} · +${adventure.data.quest.xp} avonturen-XP`, `${adventure.data.quest.progress}/${adventure.data.quest.n} · +${adventure.data.quest.xp} adventure XP`), dest: `quest:${adventure.data.quest.kind}` }] : []),
    ...(d?.chest?.available ? [{ id: 'chest', label: t('Open je dagkist', 'Open your day chest'), hint: t('Ligt klaar in de smederij', 'Ready in the smithy'), dest: 'smithy', link: '/p/held/inventaris' }] : []),
  ];
  // ---- The own home ----
  const own = homeQ.data ?? null;
  // The village is built once, when everything it is made from has arrived: built earlier it would be
  // built again a moment later, and a walk just started would be lost.
  const settled = !home.isLoading && !heroQ.isLoading && !coach.isLoading && !(d?.hero && (homeQ.isLoading || adventure.isLoading));
  // The home that stands is the one built with loot; before the first answer, the one the level gives.
  const stage = own?.stage ?? (L ? homeStage(L.level) : 0);
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

  // Building the next home: the loot is handed in, the house in the village grows.
  const [building, setBuilding] = useState(false);
  const [justBuilt, setJustBuilt] = useState<number | null>(null);
  const build = async () => {
    setBuilding(true);
    try {
      const r = await api.post<OwnHome>('/patient/hero/home/build', {});
      qc.setQueryData(['patient-own-home'], r);
      setJustBuilt(r.stage);
      await Promise.all([qc.invalidateQueries({ queryKey: ['patient-adventure'] }), qc.invalidateQueries({ queryKey: ['patient-hero'] })]);
      toast(t(`Gebouwd! Je woont nu in een ${HOME_STAGES[r.stage].nl.toLowerCase()}.`, `Built! You now live in a ${HOME_STAGES[r.stage].en.toLowerCase()}.`), 'ok');
    } catch (e) {
      say(e);
    } finally {
      setBuilding(false);
    }
  };

  // The well: one real glass of water, logged where the hero stands.
  const [drinking, setDrinking] = useState(false);
  const drink = async () => {
    setDrinking(true);
    try {
      await api.post('/patient/logs/water', { ml: WATER.glassMl });
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
      toast(t('Glas water gelogd: +1 glas in de veldfles van je held. Drink het ook echt op!', 'Glass of water logged: +1 glass in your hero’s flask. Do drink it!'));
    } catch (e) {
      say(e);
    } finally {
      setDrinking(false);
    }
  };
  // Supplies come from real life: a glass per glass of water logged today, a ration per meal logged.
  // The hero drinks or eats them to heal; three main meals logged make the hero faster and stronger.
  const supply = useSupplies(d?.logs?.survival.water.ml ?? 0, !!d?.hero);
  const heal = (fraction: number) => setHeroHp((h) => (h === null ? null : Math.min(maxHp, h + maxHp * fraction) >= maxHp ? null : h + maxHp * fraction));
  const sip = () => {
    if (supply.glasses <= 0) return;
    supply.use('water');
    heal(SUPPLY.waterHeals);
    toast(t('Je held drinkt een glas uit de veldfles: +50% leven.', 'Your hero drinks a glass from the flask: +50% life.'));
  };
  const eat = () => {
    if (supply.rations <= 0) return;
    supply.use('food');
    heal(SUPPLY.rationHeals);
    toast(t('Je held eet een rantsoen: weer helemaal fit.', 'Your hero eats a ration: fully fit again.'));
  };
  // One folding part of the HUD open at a time (meters or tasks), so the world stays in view. Kept in this browser.
  const [panel, setPanel] = useState<'meters' | 'tasks' | null>(() => {
    try {
      const v = localStorage.getItem('fp.village.panel');
      return v === 'meters' || v === 'tasks' ? v : null;
    } catch {
      return null;
    }
  });
  const openPanel = (v: 'meters' | 'tasks' | null) => {
    setPanel(v);
    try {
      localStorage.setItem('fp.village.panel', v ?? '');
    } catch { /* not kept: fine */ }
  };
  // The dojo: karate belts with a list to tick off.
  const karate = useKarate(!!d?.hero);
  const [dojoOpen, setDojoOpen] = useState(false);
  // The boxing school: a round on the bag, for adventure XP.
  const [boxingOpen, setBoxingOpen] = useState(false);
  // The campfire, the chest at home, and where the hero is (the village or a room).
  const [campOpen, setCampOpen] = useState(false);
  const [chestOpen, setChestOpen] = useState(false);
  const [zone, setZone] = useState('village');
  const [cooking, setCooking] = useState<string | null>(null);
  const cook = async (key: string) => {
    setCooking(key);
    try {
      qc.setQueryData(['patient-adventure'], await api.post<Adventure>('/patient/hero/adventure/cook', { key }));
      toast(t(`${LOOT[key as LootKey].nl} klaar! Het zit in je rugzak.`, `${LOOT[key as LootKey].en} ready! It is in your backpack.`));
    } catch (e) {
      say(e);
    } finally {
      setCooking(null);
    }
  };
  // A cooked dish from the pack: the one that heals most first.
  const dishes = COOKING.filter((x) => (adventure.data?.loot?.[x.key] ?? 0) > 0).sort((a, b) => b.heals - a.heals);
  const dishCount = COOKING.reduce((n, x) => n + (adventure.data?.loot?.[x.key] ?? 0), 0);
  const eatDish = async () => {
    const dish = dishes[0];
    if (!dish) return;
    try {
      const r = await api.post<Adventure & { heals: number }>('/patient/hero/adventure/eat', { key: dish.key });
      qc.setQueryData(['patient-adventure'], r);
      heal(r.heals);
      toast(t(`Je held eet ${LOOT[dish.key].nl.toLowerCase()}: +${Math.round(r.heals * 100)}% leven.`, `Your hero eats ${LOOT[dish.key].en.toLowerCase()}: +${Math.round(r.heals * 100)}% life.`));
    } catch (e) {
      say(e);
    }
  };
  const [roundNo, setRoundNo] = useState(0);
  const roundDone = async (hits: number) => {
    try {
      const was = adventure.data?.level ?? 1;
      const r = await api.post<Adventure & { gained: number }>('/patient/hero/adventure/round', { hits });
      qc.setQueryData(['patient-adventure'], r);
      toast(r.gained > 0 ? t(`${hits} raak: +${r.gained} avonturen-XP`, `${hits} hit: +${r.gained} adventure XP`) : t('Lekker gebokst! Voor vandaag heb je de XP van de bokszak al binnen.', 'Nice boxing! You already have today’s XP from the bag.'));
      levelUp(was, r.level);
    } catch (e) {
      say(e);
    }
  };
  // Walking into a hunting ground: its name and level once, with a word of warning when it is too soon.
  const lastZone = useRef<string | null>(null);
  useEffect(() => {
    if (!d?.hero) return;
    const id = window.setInterval(() => {
      const zn = zoneAt(track.current.x, track.current.z);
      if ((zn?.key ?? null) === lastZone.current) return;
      lastZone.current = zn?.key ?? null;
      if (!zn) return;
      const lvl = adventure.data?.level ?? 1;
      toast(lvl >= zn.level
        ? t(`${zn.icon} ${zn.nl} · level ${zn.level}+`, `${zn.icon} ${zn.en} · level ${zn.level}+`)
        : t(`${zn.icon} ${zn.nl} is voor avonturier ${zn.level} en hoger. De dieren hier laten zich pas zien als je sterker bent.`, `${zn.icon} ${zn.en} is for adventurer ${zn.level} and up. Its creatures only show themselves once you are stronger.`));
    }, 1000);
    return () => window.clearInterval(id);
  }, [d?.hero, adventure.data?.level]);
  // Thirsty or stiff, as the day's log says: the hero walks slower until that is put right.
  const states = d?.logs?.survival.status ?? [];
  const thirsty = states.some((x) => x.key === 'thirsty');
  const stiff = states.some((x) => x.key === 'stiff');
  const pace = (thirsty ? 0.8 : 1) * (stiff ? 0.8 : 1) * (supply.fed ? SUPPLY.fedPace : 1);

  // The adventure: little ailments round the village to beat, for XP of its own (never the hero's).
  const creatures = useMemo(
    () => WILD.map((w, i) => ({ key: `mob:${i}`, kind: w.kind as CreatureKind, label: nl ? CREATURES[w.kind as CreatureKind].nl : CREATURES[w.kind as CreatureKind].en, x: w.x, z: w.z }))
      // The big ones only show themselves to an adventurer of their level.
      .filter((c) => (adventure.data?.level ?? 1) >= CREATURES[c.kind].level),
    [nl, adventure.data?.level],
  );
  const [hurt, setHurt] = useState<Record<string, number>>({});
  const [beaten, setBeaten] = useState<string[]>([]);
  const mob = near?.startsWith('mob:') && !beaten.includes(near) ? creatures.find((c) => c.key === near) ?? null : null;
  // What was put right in real life today hits its own creature twice as hard.
  const strong = useMemo(() => new Set([...states.filter((x) => x.kind === 'buff').map((x) => x.key), ...(doneToday ? ['trained'] : [])]), [states, doneToday]);
  // The hero's life: monsters hit back once struck, an Alpha attacks by itself. Play only: losing
  // sends the hero back to the well with full life, nothing is lost.
  const maxHp = heroMaxHp(adventure.data?.level ?? 1, doneToday);
  const [heroHp, setHeroHp] = useState<number | null>(null);
  const hp = Math.min(maxHp, heroHp ?? maxHp);
  const [provoked, setProvoked] = useState<string[]>([]);
  const [downBy, setDownBy] = useState<string | null>(null);
  const [hitAt, setHitAt] = useState(0);
  const lastHit = useRef(0);
  const lastAttack = useRef<Record<string, number>>({});
  useEffect(() => {
    const id = window.setInterval(() => {
      if (downBy) return;
      const now = Date.now();
      const atk = mob ? ATTACKS[mob.kind] : null;
      if (mob && atk && atk.damage > 0 && (atk.aggressive || provoked.includes(mob.key))) {
        const since = now - (lastAttack.current[mob.key] ?? 0);
        // The first blow comes after a short warning, then at the creature's own pace.
        if (!lastAttack.current[mob.key]) lastAttack.current[mob.key] = now - atk.everyMs + 700;
        else if (since >= atk.everyMs) {
          lastAttack.current[mob.key] = now;
          lastHit.current = now;
          world.current?.lunge(mob.key);
          setHitAt(now);
          const dmg = hitOnHero(mob.kind, doneToday, armourByKey(adventure.data?.armour)?.guard ?? 0);
          setHeroHp((h) => {
            const left = Math.max(0, Math.min(maxHp, h ?? maxHp) - dmg);
            if (left === 0) setDownBy(mob.label);
            return left;
          });
        }
        return;
      }
      if (mob) return;
      // Out of a fight the life comes back by itself, after a little while.
      if (now - lastHit.current > HERO_REGEN.afterMs) setHeroHp((h) => (h === null || h >= maxHp ? h : Math.min(maxHp, h + HERO_REGEN.perSecond / 2)));
    }, 500);
    return () => window.clearInterval(id);
  }, [mob, provoked, downBy, maxHp, doneToday]);
  // Walking away ends the fight: a creature forgets you once you are gone.
  useEffect(() => {
    if (!mob) lastAttack.current = {};
  }, [mob]);
  const respawn = () => {
    const by = mob?.key;
    setDownBy(null);
    setHeroHp(maxHp);
    setProvoked([]);
    lastAttack.current = {};
    // The creature heals too: the fight starts over.
    if (by) setHurt((h) => ({ ...h, [by]: 0 }));
    world.current?.respawn();
  };

  // The right tool for what stands here: the hatchet for an oak, the pickaxe for a rock.
  const mobTool = mob ? toolFor(mob.kind) : null;
  const hasTool = !!mobTool && (adventure.data?.tools ?? []).includes(mobTool.key);
  const strike = async () => {
    if (!mob || downBy) return;
    // An oak asks for a hatchet.
    if (mob.kind === 'oak' && !adventure.data?.tools?.includes('hatchet')) {
      toast(t('Hier heb je een hakbijl voor nodig. Koop er een bij de wapensmid.', 'You need a hatchet for this. Buy one at the armourer.'));
      return;
    }
    world.current?.strike(mob.key);
    if (!provoked.includes(mob.key)) setProvoked((p) => [...p, mob.key]);
    const left = CREATURES[mob.kind].hp - (hurt[mob.key] ?? 0) - blow(mob.kind, strong, isHarvest(mob.kind) ? 0 : weapon.power) * (supply.fed ? SUPPLY.fedPower : 1) * (hasTool ? TOOL_BONUS.blows : 1);
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
      const r = await api.post<Adventure & { gained: number; questXp?: number; drops?: { item: LootKey; n: number }[] }>('/patient/hero/adventure/win', { kind: mob.kind });
      if (r.questXp) toast(t(`Taak van vandaag klaar: ${r.quest?.nl.toLowerCase() ?? ''}! +${r.questXp} avonturen-XP`, `Today’s task done: ${r.quest?.en.toLowerCase() ?? ''}! +${r.questXp} adventure XP`));
      const was = adventure.data?.level ?? 1;
      qc.setQueryData(['patient-adventure'], r);
      levelUp(was, r.level);
      if (!isHarvest(mob.kind)) toast(r.gained > 0 ? t(`${mob.label} verslagen! +${r.gained} avonturen-XP`, `${mob.label} beaten! +${r.gained} adventure XP`) : t(`${mob.label} verslagen! Voor vandaag heb je alle avonturen-XP al binnen.`, `${mob.label} beaten! You already have all of today's adventure XP.`));
      // Loot counts for building the home: refresh what it still needs.
      if (r.drops?.length) void qc.invalidateQueries({ queryKey: ['patient-own-home'] });
      if (r.drops?.length) toast(t(`Buit: ${r.drops.map((x) => `${x.n}× ${LOOT[x.item].nl.toLowerCase()}`).join(', ')}. Het zit in je rugzak.`, `Loot: ${r.drops.map((x) => `${x.n}× ${LOOT[x.item].en.toLowerCase()}`).join(', ')}. It is in your backpack.`));
    } catch (e) {
      say(e);
    }
  };

  const run = (task: Task) => {
    hideTip();
    // The task of the day goes to the nearest one of its kind that is there.
    if (task.dest.startsWith('quest:')) {
      const kind = task.dest.slice(6);
      const at = track.current;
      const target = creatures.filter((c) => c.kind === kind && !beaten.includes(c.key)).sort((a, b) => Math.hypot(a.x - at.x, a.z - at.z) - Math.hypot(b.x - at.x, b.z - at.z))[0];
      if (!target) return;
      setErrand({ ...task, dest: target.key });
      world.current?.goTo(target.key);
      return;
    }
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
      : k.startsWith('in:') && KEEPER[k.slice(3)] ? buildings.find((b) => b.key === k.slice(3))?.label ?? k
      : k.startsWith('in:') ? t('het programmabord', 'the programme board')
      : k === WELL_KEY ? t('de waterput', 'the well')
      : k === BOXING_KEY ? t('de boksschool', 'the boxing school')
      : k === CAMP_KEY ? t('het kampvuur', 'the campfire')
      : k.startsWith('mob:') ? creatures.find((c) => c.key === k)?.label ?? t('het kwaaltje', 'the ailment')
      : buildings.find((b) => b.key === k)?.label ?? k;
  // Landmarks for the maps: every building with its own sign, and the practice.
  const landmarks: Landmark[] = [
      { key: TV_KEY, label: practiceName.replace(/\s*\(.*?\)\s*/g, ' ').trim(), x: VILLAGE_LAYOUT.gym.x, z: VILLAGE_LAYOUT.gym.z - 1.6, icon: '🏥', color: '#b4532f', wide: true, alert: todo.some((p) => moduleOf(p) === 'revalidatie') },
      ...buildings.map((b, i) => ({ key: 'kind' in b ? boardKey(b.key) : b.key, label: b.label, x: sites[i].x, z: sites[i].z, icon: SIGN[b.key]?.[0] ?? '🏠', color: SIGN[b.key]?.[1] ?? '#8a6038', alert: 'alert' in b && !!b.alert })),
      ...(own ? [{ key: HOME_KEY, label: homeLabel, x: SPOTS.home.x, z: SPOTS.home.z, icon: '🏡', color: '#3f8f5a' }] : []),
      // The hunting grounds, with the level from which their creatures show themselves.
      ...(d?.hero ? ZONES.map((zn) => ({ key: `zone:${zn.key}`, label: `${nl ? zn.nl : zn.en} · lvl ${zn.level}+`, x: zn.x, z: zn.z, icon: zn.icon, color: (adventure.data?.level ?? 1) >= zn.level ? '#5a7a3a' : '#7a3a2a' })) : []),
    ];

  // Fast travel: the hero stands there at once. Walking stays the way to see the town.
  const jumpTo = (key: string) => {
    setPlacesOpen(false);
    hideTip();
    setErrand(null);
    world.current?.jump(key);
  };
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
    ...(d?.hero ? [
      { key: CAMP_KEY, label: t('Kampvuur', 'Campfire'), hint: t('Koken van je buit', 'Cook your loot'), alert: false },
      { key: BOXING_KEY, label: t('Boksschool', 'Boxing school'), hint: t('Een ronde op de bokszak', 'A round on the bag'), alert: false },
      ...ZONES.map((zn) => ({ key: `zone:${zn.key}`, label: `${zn.icon} ${nl ? zn.nl : zn.en}`, hint: t(`Jachtgebied · avonturier ${zn.level}+`, `Hunting ground · adventurer ${zn.level}+`), alert: false })),
    ] : []),
  ];
  // The link a task brought along wins over the building's own, once the hero stands there.
  const errandHere = errand && errand.link && (near === errand.dest || (errand.dest.startsWith('in:') ? false : near === errand.dest)) ? errand : null;
  const pct = L ? Math.max(0, Math.min(100, Math.round(((L.xp - L.from) / Math.max(1, L.to - L.from)) * 100))) : 0;

  return (
    <div className="space-y-3">
      <h1 className="sr-only">{t('Je dorp', 'Your village')}</h1>
      <p className="mb-1 text-[13px] text-ink-600">{t('Tip: draai je telefoon om liggend te spelen.', 'Tip: turn your phone to play sideways.')}</p>
      <Button size="md" variant="secondary" className="mb-2 w-full" data-testid="play-full" icon={<Maximize2 className="h-4 w-4" />} onClick={() => setFull(true)}>{t('Speel in volledig scherm', 'Play full screen')}</Button>
      <section aria-label={t('Je dorp in 3D. Tik op de grond om te lopen, of kies een gebouw.', 'Your village in 3D. Tap the ground to walk, or pick a building.')} data-full={full ? '1' : undefined}
        className={full ? 'fixed inset-0 z-50 !mt-0 bg-[#1b2a22] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]' : 'relative'}>
        <div className={full ? 'relative h-full' : 'relative'}>
        <Suspense fallback={<div className="h-[calc(100dvh-13.5rem)] min-h-[440px] animate-pulse rounded-2xl bg-[#26342c]" />}>
          {!settled ? <div className="h-[calc(100dvh-13.5rem)] min-h-[440px] animate-pulse rounded-2xl bg-[#26342c]" /> :
          <WalkVillage3D
            className={full ? 'h-full !rounded-none !border-0' : 'h-[calc(100dvh-13.5rem)] min-h-[440px]'}
            buildings={buildings}
            plan
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
            creatureHurt={hurt}
            boxing={!!d?.hero}
            belt={karate.data && karate.data.belt > 0 ? BELTS[karate.data.belt].color : null}
            tools={adventure.data?.tools}
            weapon={hasTool && mobTool ? mobTool.key : mob && isHarvest(mob.kind) ? null : weapon.key === 'fists' ? null : weapon.key}
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
            onZone={(z) => { setZone(z); if (z === 'village') leftBy.current = true; }}
            onTalk={setTalk}
            onDestination={(k) => { setDest(k); if (!k) return; hideTip(); }}
            onArrive={(k) => { if (k === TV_KEY) setTvOpen(true); }}
          />}
        </Suspense>

        {/* Unit frame: who you are, your level and the way to the next one. */}
        <Link to="/p/held" aria-label={L ? t(`Naar je held, level ${L.level}, ${pct}% naar het volgende level, leven ${Math.ceil(hp)} van ${maxHp}`, `To your hero, level ${L.level}, ${pct}% to the next level, life ${Math.ceil(hp)} of ${maxHp}`) : t('Naar je held', 'To your hero')}
          className={`${PANEL} absolute left-2 top-2 flex items-center gap-2 py-1 pl-1 pr-3`}>
          {L && <LevelBadge level={L.level} size={38} />}
          <span className="min-w-0">
            <span className="block max-w-[120px] truncate font-display text-[13.5px] font-bold leading-tight text-[#f6e2a6]">{d?.hero?.heroName ?? t('Je dorp', 'Your village')}</span>
            {/* Life: green to red, with the numbers; it drops when a creature hits. */}
            {d?.hero && (
              <span data-testid="hero-hp" data-hp={Math.ceil(hp)} data-max={maxHp} aria-hidden className="mt-0.5 flex w-[112px] items-center gap-1">
                <Heart className="h-3 w-3 shrink-0 fill-[#e2574a] text-[#e2574a]" />
                <span className="relative block h-[9px] min-w-0 flex-1 overflow-hidden rounded-sm border border-black/70 bg-black/60">
                  <span className="absolute inset-y-0 left-0 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${(hp / maxHp) * 100}%`, background: hp / maxHp > 0.5 ? '#4ad06a' : hp / maxHp > 0.25 ? '#f0b429' : '#e2574a' }} />
                </span>
                <span className="shrink-0 text-[9.5px] font-semibold leading-none tabular-nums text-white/90">{Math.ceil(hp)}/{maxHp}</span>
              </span>
            )}
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
          <div className={`${PANEL} ${panel === 'tasks' ? 'w-[172px]' : ''} px-1.5 py-1`} role="group" aria-label={t('Taken', 'Tasks')}>
            <button type="button" data-testid="toggle-tasks" aria-expanded={panel === 'tasks'} onClick={() => openPanel(panel === 'tasks' ? null : 'tasks')}
              className="flex min-h-[32px] w-full items-center gap-1 px-1 font-display text-[12.5px] font-bold text-[#ffd76a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a]">
              <ScrollText className="h-3.5 w-3.5" aria-hidden />{t('Taken', 'Tasks')}{tasks.length > 0 && <span className="rounded-full bg-[#ffd21f] px-1.5 text-[11px] font-black leading-[16px] text-[#1b2a22]">{tasks.length}</span>}
              <ChevronRight className={`ml-auto h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${panel === 'tasks' ? 'rotate-90' : ''}`} aria-hidden />
            </button>
            {panel !== 'tasks' ? null : tasks.length > 0 ? (
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
            {panel === 'tasks' && tasks.length > 4 && <p className="px-1 text-[10.5px] text-white/70">{t(`+ ${tasks.length - 4} meer`, `+ ${tasks.length - 4} more`)}</p>}
          </div>
        </div>

        {/* On the way: where to, and a way to stop. */}
        {dest ? (
          <p role="status" data-testid="on-the-way" className={`${PANEL} absolute left-2 flex max-w-[172px] items-center gap-2 py-1 pl-2.5 pr-1 text-[12.5px] ${panel === 'meters' ? 'top-[246px]' : 'top-[122px]'}`}>
            <Footprints className="h-4 w-4 shrink-0 text-[#ffd76a]" aria-hidden />
            <span className="min-w-0 flex-1 leading-tight">{t(`Onderweg naar ${placeName(dest)}`, `On the way to ${placeName(dest)}`)}</span>
            <button type="button" onClick={() => world.current?.stop()} className="min-h-[32px] rounded-md px-2 font-semibold text-[#ffd76a] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a]">{t('Stop', 'Stop')}</button>
          </p>
        ) : tip ? (
          <p className={`${PANEL} absolute left-[56px] top-[76px] flex max-w-[176px] items-start gap-1 py-1.5 pl-2.5 pr-1 text-[12.5px] leading-snug`}>
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
        <div className={`pointer-events-none absolute inset-x-2 flex justify-center ${joystick ? 'bottom-[182px] land:bottom-[64px] land:left-[130px]' : 'bottom-[64px]'}`}>
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
            <span className="flex flex-col items-center gap-1.5">
            {isAlpha(mob.kind) && (
              <p role="status" data-testid="alpha-warning" className={`${PANEL} max-w-[300px] border-[#ff8a6e] px-3 py-1.5 text-center text-[13px] leading-snug`}>
                {t(`Alfa! Hij valt zelf aan en slaat hard. Eerlijk gevecht vanaf avonturier ${alphaAdvised(mob.kind)}, met een goed wapen.`, `Alpha! It attacks by itself and hits hard. A fair fight from adventurer ${alphaAdvised(mob.kind)}, with a good weapon.`)}
              </p>
            )}
            {NEEDS_TOOL[mob.kind] && !hasTool ? (
              <Link to="/p/held/inventaris#backpack-title" data-testid="tool-needed" className="tap pointer-events-auto inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#e4bc63] bg-accent px-4 text-[15px] font-semibold text-white shadow-lift">
                {t(`Hier heb je een ${mobTool?.nl.toLowerCase() ?? 'gereedschap'} voor nodig. Koop hem in je rugzak (${mobTool?.price ?? ''} muntjes).`, `You need a ${mobTool?.en.toLowerCase() ?? 'tool'} for this. Buy it in your backpack (${mobTool?.price ?? ''} coins).`)}
              </Link>
            ) : (
            <Button size="lg" data-testid="strike" className="pointer-events-auto border border-[#ffb3a1] shadow-lift" icon={<Swords className="h-5 w-5" />} onClick={() => void strike()}>
              {mob.kind === 'bush' ? t('Pluk bessen', 'Pick berries') : isHarvest(mob.kind) ? t(`Hak de ${mob.label.toLowerCase()}${hasTool && mobTool ? ` met je ${mobTool.nl.toLowerCase()}` : ''}`, `Chop the ${mob.label.toLowerCase()}${hasTool && mobTool ? ` with your ${mobTool.en.toLowerCase()}` : ''}`) : t(`Sla ${mob.label}`, `Strike ${mob.label}`)} · <span aria-label={t(`nog ${Math.max(1, CREATURES[mob.kind].hp - (hurt[mob.key] ?? 0))} leven`, `${Math.max(1, CREATURES[mob.kind].hp - (hurt[mob.key] ?? 0))} life left`)}>♥ {Math.max(1, CREATURES[mob.kind].hp - (hurt[mob.key] ?? 0))}</span>{strong.has(CREATURES[mob.kind].weakTo) ? t(' · dubbele klap', ' · double blow') : ''}
            </Button>
            )}
            </span>
          ) : near === CAMP_KEY ? (
            <Button size="lg" data-testid="open-camp" className="pointer-events-auto border border-[#ffc078] shadow-lift" icon={<Flame className="h-5 w-5" />} onClick={() => setCampOpen(true)}>{t('Koken op het vuur', 'Cook on the fire')}</Button>
          ) : zone === HOME_KEY && own?.layout.some((i) => i.key === 'home_lootchest') && !near ? (
            <Button size="lg" data-testid="open-lootchest" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<Package className="h-5 w-5" />} onClick={() => setChestOpen(true)}>{t('Open je buitkist', 'Open your loot chest')}</Button>
          ) : near === BOXING_KEY ? (
            <Button size="lg" data-testid="open-boxing" className="pointer-events-auto border border-[#ffd76a] shadow-lift" icon={<Swords className="h-5 w-5" />} onClick={() => { setRoundNo((n) => n + 1); setBoxingOpen(true); }}>{t('Train op de bokszak', 'Train on the bag')}</Button>
          ) : near === WELL_KEY ? (
            <span className="pointer-events-auto flex flex-wrap justify-center gap-2">
              <Button size="lg" data-testid="drink-well" loading={drinking} className="border border-[#9fd8ff] shadow-lift" icon={<Droplets className="h-5 w-5" />} onClick={() => void drink()}>{t(`Drink een glas (+${WATER.glassMl} ml)`, `Drink a glass (+${WATER.glassMl} ml)`)}</Button>
            </span>
          ) : near === HOME_KEY ? (
            <Button size="lg" data-testid="enter-home" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<DoorOpen className="h-5 w-5" />} onClick={() => world.current?.use(HOME_KEY)}>{t('Naar binnen: jouw huis', 'Go in: your home')}</Button>
          ) : near === boardKey(HOME_KEY) ? (
            <Button size="lg" data-testid="open-decor" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<Armchair className="h-5 w-5" />} onClick={() => setDecorOpen(true)}>{t('Inrichten en winkel', 'Furnish and shop')}</Button>
          ) : near === EXIT_KEY ? (
            <span className="pointer-events-auto flex flex-wrap justify-center gap-2">
              {zone === HOME_KEY && own?.layout.some((i) => i.key === 'home_lootchest') && (
                <Button size="lg" data-testid="open-lootchest" className="border border-[#e4bc63] shadow-lift" icon={<Package className="h-5 w-5" />} onClick={() => setChestOpen(true)}>{t('Open je buitkist', 'Open your loot chest')}</Button>
              )}
              <Button size="lg" variant="secondary" className="border border-[#e4bc63] shadow-lift" icon={<DoorOpen className="h-5 w-5" />} onClick={() => world.current?.use(EXIT_KEY)}>{t('Naar buiten: het dorp', 'Go out: the village')}</Button>
            </span>
          ) : errandHere ? (
            <Link to={errandHere.link!} data-testid="errand-link" className="tap pointer-events-auto inline-flex min-h-[48px] max-w-full items-center gap-2 rounded-xl border border-[#e4bc63] bg-accent px-4 text-[15.5px] font-semibold text-white shadow-lift">
              <DoorOpen className="h-5 w-5 shrink-0" aria-hidden /><span className="truncate">{errandHere.label}</span>
            </Link>
          ) : keeperOf || boardOf ? (
            <p role="status" data-testid="talk-hint" className={`${PANEL} px-3 py-2 text-[13.5px]`}>{t(`Tik op de ${(TALK[(keeperOf ?? boardOf)!.key]?.name[0] ?? '').toLowerCase()} om te praten.`, `Tap the ${(TALK[(keeperOf ?? boardOf)!.key]?.name[1] ?? '').toLowerCase()} to talk.`)}</p>
          ) : nearBuilding && 'keeper' in nearBuilding && nearBuilding.keeper ? (
            <Button size="lg" data-testid="enter-shop" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<DoorOpen className="h-5 w-5" />} onClick={() => world.current?.use(nearBuilding.key)}>{t(`Naar binnen: ${nearBuilding.label}`, `Go in: ${nearBuilding.label}`)}</Button>
          ) : nearBuilding && 'kind' in nearBuilding ? (
            <Button size="lg" data-testid="enter-house" className="pointer-events-auto border border-[#e4bc63] shadow-lift" icon={<DoorOpen className="h-5 w-5" />} onClick={() => world.current?.use(nearBuilding.key)}>{t(`Naar binnen: ${nearBuilding.label}`, `Go in: ${nearBuilding.label}`)}</Button>
          ) : nearBuilding && 'soon' in nearBuilding && nearBuilding.soon ? (
            <p role="status" data-testid="building-soon" className={`${PANEL} px-3 py-2 text-[13.5px]`}>{t(`${nearBuilding.label}: nog dicht. Dit deel van het dorp komt later.`, `${nearBuilding.label}: closed for now. This part of the village comes later.`)}</p>
          ) : nearBuilding ? (
            <Link to={nearBuilding.to} data-testid="enter-building" className="tap pointer-events-auto inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#e4bc63] bg-accent px-4 text-[15.5px] font-semibold text-white shadow-lift">
              <DoorOpen className="h-5 w-5" aria-hidden />{t(`Naar binnen: ${nearBuilding.label}`, `Go in: ${nearBuilding.label}`)}
            </Link>
          ) : null}
        </div>

        {/* Red flash at the edges when a creature lands a blow. */}
        {hitAt > 0 && <div key={hitAt} className="hero-hit pointer-events-none absolute inset-0 z-[5]" aria-hidden />}

        {/* Meters of the day, as in a game: protein, steps and water. A tap opens the quick log on that tab. */}
        {d?.hero && d.logs && (
          <div className="absolute left-[58px] top-[76px] flex flex-col items-start gap-[3px]" data-testid="world-meters">
            {/* Folded: three small gauges in one button. Open: the full meters, the flask and the adventurer level. */}
            <button type="button" data-testid="toggle-meters" aria-expanded={panel === 'meters'} onClick={() => openPanel(panel === 'meters' ? null : 'meters')}
              aria-label={t('Meters van vandaag: eiwit, beweging en water', 'Today’s meters: protein, movement and water')}
              className="flex h-10 items-center gap-2 rounded-lg border border-[#e4bc63]/70 bg-[#141c18]/85 px-2 text-white shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a]">
              {([[Beef, d.logs.protein.goal ? d.logs.protein.grams / d.logs.protein.goal : 0, '#e2674a'], [Footprints, d.logs.steps.goal ? d.logs.steps.today / d.logs.steps.goal : 0, '#5fc46a'], [Droplets, d.logs.survival.water.ratio, '#58a8e8']] as const).map(([Icon, ratio, color], i) => (
                <span key={i} className="flex flex-col items-center gap-[3px]" aria-hidden>
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                  <span className="block h-[3px] w-5 overflow-hidden rounded-full bg-black/60"><span className="block h-full" style={{ width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`, background: color }} /></span>
                </span>
              ))}
              <ChevronRight className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${panel === 'meters' ? 'rotate-90' : ''}`} aria-hidden />
            </button>
            {panel === 'meters' && (<>
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
            {adventure.data && (
              <p className="flex w-max items-center gap-1 rounded-md border border-black/60 bg-[#141c18]/85 px-1.5 py-[3px] text-[10.5px] font-semibold leading-none text-[#ffd9a8] shadow-lift" data-testid="adventure-level">
                <Sparkles className="h-3 w-3" aria-hidden />{t(`Avonturier ${adventure.data.level}`, `Adventurer ${adventure.data.level}`)} · {adventure.data.xp - adventure.data.from}/{adventure.data.to - adventure.data.from}<span className="sr-only"> · {nl ? weapon.nl : weapon.en}</span>
              </p>
            )}
            </>)}
          </div>
        )}

        {d?.hero && !dest && !placing && (
          <ul className={`absolute left-2 flex max-w-[236px] flex-wrap gap-1 whitespace-nowrap land:left-[212px] land:!top-2 land:max-w-[calc(100%-400px)] ${panel === 'meters' ? 'top-[246px]' : 'top-[122px]'}`} data-testid="world-states" aria-label={t('Hoe je held zich voelt', 'How your hero feels')}>
            <li><button type="button" data-testid="flask" data-n={supply.glasses} disabled={supply.glasses <= 0 || hp >= maxHp} onClick={sip}
              aria-label={supply.glasses > 0 ? t(`Veldfles: ${supply.glasses} ${supply.glasses === 1 ? 'glas' : 'glazen'}. Tik om te drinken: +50% leven.`, `Flask: ${supply.glasses} ${supply.glasses === 1 ? 'glass' : 'glasses'}. Tap to drink: +50% life.`) : t('Veldfles leeg. Log een glas water dat je echt drinkt, dan krijgt je held er een.', 'Flask empty. Log a glass of water you really drink, and your hero gets one.')}
              className="flex min-h-[28px] items-center gap-1 rounded-full border bg-[#141c18]/85 px-2 text-[11.5px] font-semibold leading-none shadow-lift disabled:opacity-60 border-[#9fd8ff]/70 text-[#cfeaff]"><Droplets className="h-3.5 w-3.5" aria-hidden />{supply.glasses}</button></li>
            <li><button type="button" data-testid="eat-dish" data-n={dishCount} disabled={dishCount <= 0 || hp >= maxHp} onClick={() => void eatDish()}
              aria-label={dishCount > 0 ? t(`Gekookt eten: ${dishCount}. Tik om te eten: ${LOOT[dishes[0].key].nl.toLowerCase()}.`, `Cooked food: ${dishCount}. Tap to eat: ${LOOT[dishes[0].key].en.toLowerCase()}.`) : t('Geen gekookt eten. Kook vlees, een ei of bessen bij het kampvuur.', 'No cooked food. Cook meat, an egg or berries at the campfire.')}
              className="flex min-h-[28px] items-center gap-1 rounded-full border bg-[#141c18]/85 px-2 text-[11.5px] font-semibold leading-none shadow-lift disabled:opacity-60 border-[#ffc078]/70 text-[#ffe0bd]"><Utensils className="h-3.5 w-3.5" aria-hidden />{dishCount}</button></li>
            <li><button type="button" data-testid="rations" data-n={supply.rations} disabled={supply.rations <= 0 || hp >= maxHp} onClick={eat}
              aria-label={supply.rations > 0 ? t(`Rantsoenen: ${supply.rations}. Tik om te eten: weer helemaal fit.`, `Rations: ${supply.rations}. Tap to eat: fully fit again.`) : t('Geen rantsoenen. Vul bij Voeding in wat je at, dan krijgt je held eten.', 'No rations. Log what you ate under Nutrition, and your hero gets food.')}
              className="flex min-h-[28px] items-center gap-1 rounded-full border bg-[#141c18]/85 px-2 text-[11.5px] font-semibold leading-none shadow-lift disabled:opacity-60 border-[#f0c36a]/70 text-[#ffe9b8]"><Beef className="h-3.5 w-3.5" aria-hidden />{supply.rations}</button></li>
            {supply.fed ? (
              <li><span data-testid="well-fed" className="flex min-h-[28px] items-center gap-1 rounded-full border bg-[#141c18]/85 px-2 text-[11.5px] font-semibold leading-none shadow-lift disabled:opacity-60 border-[#9fe39a]/70 text-[#c9f2c0]">{t('Goed gegeten · sneller en sterker', 'Well fed · faster and stronger')}</span></li>
            ) : (
              <li><Link to="/p/voeding" data-testid="fed-progress" className="flex min-h-[28px] items-center gap-1 rounded-full border bg-[#141c18]/85 px-2 text-[11.5px] font-semibold leading-none shadow-lift disabled:opacity-60 border-white/30 text-white/85"
                aria-label={t(`${supply.mainMeals} van 3 maaltijden ingevuld. Vul ontbijt, lunch en diner in: dan is je held sneller en sterker.`, `${supply.mainMeals} of 3 meals logged. Log breakfast, lunch and dinner: then your hero is faster and stronger.`)}>{t(`Eten ${supply.mainMeals}/3`, `Food ${supply.mainMeals}/3`)}</Link></li>
            )}
            {thirsty && (
              <li><button type="button" onClick={() => world.current?.goTo(WELL_KEY)}
                aria-label={t('Dorst: je loopt trager. Tik om naar de waterput te lopen.', 'Thirsty: you walk slower. Tap to walk to the well.')}
                className="flex min-h-[28px] items-center gap-1 rounded-full border border-[#9fd8ff]/70 bg-[#141c18]/85 px-2 text-[11.5px] font-semibold leading-none text-[#cfeaff] shadow-lift"><Droplets className="h-3.5 w-3.5" aria-hidden />{t('Dorst · trager', 'Thirsty · slower')}</button></li>
            )}
            {stiff && (
              <li><button type="button" onClick={() => world.current?.goTo('in:mobiliteit')}
                aria-label={t(`Stijf: je loopt trager. ${d!.logs.steps.today.toLocaleString('nl-NL')} van ${d!.logs.steps.goal.toLocaleString('nl-NL')} stappen vandaag; lopen of even bewegen helpt. Tik voor de Mobiliteitsstudio.`, `Stiff: you walk slower. ${d!.logs.steps.today.toLocaleString('en-GB')} of ${d!.logs.steps.goal.toLocaleString('en-GB')} steps today; walking or moving helps. Tap for the mobility studio.`)}
                className="flex min-h-[28px] items-center gap-1 rounded-full border border-[#f0c36a]/70 bg-[#141c18]/85 px-2 text-[11.5px] font-semibold leading-none text-[#ffe9b8] shadow-lift"><Footprints className="h-3.5 w-3.5" aria-hidden />{t('Stijf · trager', 'Stiff · slower')}</button></li>
            )}
          </ul>
        )}

        {/* Action bar. */}
        <button type="button" data-testid="toggle-full" aria-pressed={full} onClick={() => setFull((v) => !v)} aria-label={full ? t('Volledig scherm sluiten', 'Leave full screen') : t('Volledig scherm', 'Full screen')}
          className="absolute left-2 top-[76px] grid h-10 w-10 place-items-center rounded-lg border border-[#e4bc63]/70 bg-[#141c18]/85 text-[#f6e2a6] shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd76a]">
          {full ? <Minimize2 className="h-5 w-5" aria-hidden /> : <Maximize2 className="h-5 w-5" aria-hidden />}
        </button>
        <nav aria-label={t('Snelbalk', 'Action bar')} className="absolute bottom-2 left-2 flex gap-1.5">
          <button type="button" className={SLOT} aria-label={t('Naar de tv met je oefeningen', 'To the TV with your exercises')} onClick={() => (near === TV_KEY ? setTvOpen(true) : world.current?.goTo(TV_KEY))} data-testid="slot-tv"><Tv className="h-5 w-5" aria-hidden /></button>
          <Link to="/p/held/inventaris" className={SLOT} aria-label={t('Rugzak: je uitrusting', 'Backpack: your gear')}><Backpack className="h-5 w-5" aria-hidden /></Link>
          <Link to="/p/held" className={SLOT} aria-label={t('Skills en je held', 'Skills and your hero')}><Swords className="h-5 w-5" aria-hidden /></Link>
          <button type="button" data-testid="slot-places" className={SLOT} aria-label={t('Plekken: kies waar je heen wilt', 'Places: pick where to go')} onClick={() => setPlacesOpen(true)}><MapIcon className="h-5 w-5" aria-hidden /></button>
          <button type="button" data-testid="slot-joystick" aria-pressed={joystick} className={`${SLOT} aria-pressed:border-[#ffd76a] aria-pressed:bg-[linear-gradient(180deg,#5a4a1c,#2a2410)]`} aria-label={t('Joystick aan of uit', 'Joystick on or off')} onClick={toggleJoystick}><Gamepad2 className="h-5 w-5" aria-hidden /></button>
          <FpsMeter />
        </nav>
        </div>
      </section>

      <p className="text-[13.5px] leading-relaxed text-ink-700">
        {t('Tik op de grond om te lopen. Sleep opzij om helemaal rond te draaien, omhoog of omlaag om te kantelen, en knijp met twee vingers (of gebruik + en −) om in en uit te zoomen. Tik op een poppetje om te praten. Liever een joystick? Zet hem aan met de knop met de gamepad. In de oefenzaal van je praktijk staan de fysiotherapeut en de tv met je oefeningen van vandaag.', 'Tap the ground to walk and drag sideways to look around. Prefer a joystick? Switch it on with the gamepad button. In the exercise room of your practice you find the physiotherapist and the TV with your exercises for today.')}
      </p>

      <Dialog open={decorOpen} onClose={() => setDecorOpen(false)} title={t('Jouw huis inrichten', 'Furnish your home')} size="md" sheet
        description={L ? t(`${HOME_STAGES[stage].nl}, level ${L.level}.`, `${HOME_STAGES[stage].en}, level ${L.level}.`) : undefined}>
        {own && <BuildHome own={own} level={L?.level ?? 1} busy={building} justBuilt={justBuilt} onBuild={() => void build()} />}
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
                {DECOR.filter((item) => !item.made && !own.owned.includes(item.key)).map((item) => {
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

      <Dialog open={!!talk && !!TALK[talk]} onClose={() => setTalk(null)} size="md" sheet title={talk && TALK[talk] ? `${talk === 'practice' ? t('Fysiotherapeut', 'Physiotherapist') : TALK[talk].name[nl ? 0 : 1]}${talking ? ` · ${talking.label}` : talk === 'practice' ? ` · ${practiceName}` : ''}` : ''}>
        {talk && TALK[talk] && (
          <div className="space-y-3" data-testid="keeper-talk">
            <p className="rounded-2xl rounded-tl-sm bg-[#fbf0d9] px-4 py-3 text-[15.5px] leading-snug text-[#3a2a12]">“{TALK[talk].says[nl ? 0 : 1]}”</p>
            {d && talking && KEEPER[talk] && talk !== 'dojo' && (
              <ul className="grid grid-cols-2 gap-2 text-[14px]">
                {(talk === 'smithy' ? [[t('Muntjes', 'Coins'), d.gear.coins], [t('Uitrusting', 'Gear'), d.gear.owned.length]]
                  : talk === 'hall' ? [[t('Prijzen', 'Trophies'), `${d.trophies.filter((x) => x.earned).length}/${d.trophies.length}`], [t('Badges', 'Badges'), `${d.badges.filter((x) => x.earned).length}/${d.badges.length}`]]
                  : talk === 'board' ? [[t('Taken vandaag', 'Tasks today'), tasks.length], [t('Level', 'Level'), d.level.level]]
                  : talk === 'library' ? [[t('Skills', 'Skills'), d.skills.length], [t('Totaal level', 'Total level'), d.totalLevel]]
                  : [[t('Level', 'Level'), d.level.level], [t('Avonturier', 'Adventurer'), adventure.data?.level ?? 1]] as [string, string | number][]).map(([label, value]) => (
                  <li key={String(label)} className="rounded-xl border border-line bg-white px-3 py-2"><span className="block text-[12.5px] text-ink-600">{label}</span><span className="font-display text-[20px] font-bold tabular-nums text-ink-950">{value}</span></li>
                ))}
              </ul>
            )}
            <ul className="space-y-2" aria-label={t('Wat wil je doen?', 'What would you like to do?')}>
              {TALK[talk].options.map((o, i) => {
                const cls = 'tap flex min-h-[52px] w-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 text-left text-[15.5px] font-semibold text-ink-950 hover:border-accent';
                const label = <><span>{nl ? o.nl : o.en}</span><ChevronRight className="h-5 w-5 shrink-0 text-accent" aria-hidden /></>;
                return (
                  <li key={o.nl}>
                    {o.to ? <Link to={o.to} data-testid={i === 0 ? 'enter-building' : undefined} className={cls}>{label}</Link> : (
                      <button type="button" data-testid={i === 0 ? 'talk-first' : undefined} className={cls} onClick={() => {
                        setTalk(null);
                        if (o.act === 'tv') setTvOpen(true);
                        if (o.act === 'karate') setDojoOpen(true);
                      }}>{label}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Dialog>
      <KarateSheet open={dojoOpen} onClose={() => setDojoOpen(false)} />
      <Dialog open={campOpen} onClose={() => setCampOpen(false)} size="md" sheet title={t('Kampvuur', 'Campfire')}
        description={t('Kook je buit: gekookt eten brengt het leven van je held terug in het dorp.', 'Cook your loot: cooked food brings your hero’s life back in the village.')}>
        <ul className="space-y-2" data-testid="cook-list">
          {COOKING.map((dish) => {
            const needs = Object.entries(dish.needs) as [LootKey, number][];
            const enough = needs.every(([k, n]) => (adventure.data?.loot?.[k] ?? 0) >= n);
            const name = nl ? LOOT[dish.key].nl : LOOT[dish.key].en;
            return (
              <li key={dish.key} data-dish={dish.key} className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5">
                <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-canvas text-[24px]">{LOOT[dish.key].icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold text-ink-950">{name} <span className="font-normal text-ink-700">· {t(`+${Math.round(dish.heals * 100)}% leven`, `+${Math.round(dish.heals * 100)}% life`)} · {t(`je hebt er ${adventure.data?.loot?.[dish.key] ?? 0}`, `you have ${adventure.data?.loot?.[dish.key] ?? 0}`)}</span></span>
                  <span className="block text-[12.5px] text-ink-700">{needs.map(([k, n]) => `${LOOT[k].icon} ${(nl ? LOOT[k].nl : LOOT[k].en).toLowerCase()} ${Math.min(adventure.data?.loot?.[k] ?? 0, n)}/${n}`).join(' · ')}</span>
                </span>
                <Button size="sm" disabled={!enough} loading={cooking === dish.key} onClick={() => void cook(dish.key)} aria-label={t(`Kook ${name}`, `Cook ${name}`)}>{t('Kook', 'Cook')}</Button>
              </li>
            );
          })}
        </ul>
      </Dialog>
      <Dialog open={chestOpen} onClose={() => setChestOpen(false)} size="md" sheet title={t('Je buitkist', 'Your loot chest')}
        description={t(`Hier bewaar je tot ${adventure.data?.lootCap ?? 99} stuks per soort.`, `Here you keep up to ${adventure.data?.lootCap ?? 99} of a kind.`)}>
        <ul className="grid grid-cols-4 gap-2" data-testid="chest-loot">
          {LOOT_KEYS.filter((k) => (adventure.data?.loot?.[k] ?? 0) > 0).map((k) => (
            <li key={k} data-loot={k} aria-label={`${nl ? LOOT[k].nl : LOOT[k].en}: ${adventure.data?.loot?.[k]}`} className="relative grid aspect-square place-items-center rounded-xl border border-[#e4bc63] bg-[#fbf0d9] text-[24px]">
              <ItemIcon k={k} emoji={LOOT[k].icon} />
              <span aria-hidden className="absolute bottom-0.5 right-1 text-[11.5px] font-bold tabular-nums text-ink-950">{adventure.data?.loot?.[k]}</span>
            </li>
          ))}
        </ul>
        {!LOOT_KEYS.some((k) => (adventure.data?.loot?.[k] ?? 0) > 0) && <p className="text-[14px] text-ink-700">{t('Nog leeg. Versla kwaaltjes en dieren, hak eiken en pluk bessen.', 'Empty so far. Beat ailments and animals, chop oaks and pick berries.')}</p>}
      </Dialog>
      <Dialog open={boxingOpen} onClose={() => setBoxingOpen(false)} size="md" sheet title={t('Boksschool', 'Boxing school')}
        description={adventure.data ? t(`Ronde ${Math.min(adventure.data.roundsToday + 1, BOXING.roundsPerDay)} van ${BOXING.roundsPerDay} die vandaag XP geeft.`, `Round ${Math.min(adventure.data.roundsToday + 1, BOXING.roundsPerDay)} of ${BOXING.roundsPerDay} that gives XP today.`) : undefined}
        footer={<Button variant="secondary" onClick={() => setRoundNo((n) => n + 1)} data-testid="next-round">{t('Nog een ronde', 'Another round')}</Button>}>
        <BoxingRound key={roundNo} onDone={(hits) => void roundDone(hits)} />
      </Dialog>
      <Dialog open={placesOpen} onClose={() => setPlacesOpen(false)} title={t('Wereldkaart', 'World map')} description={t('Kies een plek: je held loopt er vanzelf heen, of reist er direct heen met de knop rechts.', 'Pick a place: your hero walks there by itself, or travels straight there with the button on the right.')} size="md" sheet>
        <WorldMap track={track} landmarks={landmarks} onPlace={toPlace} onWalk={toPoint} label={t('Wereldkaart van het dorp, noorden boven. Tik op een gebouw of een plek om erheen te lopen.', 'World map of the village, north up. Tap a building or a spot to walk there.')} />
        <p className="mb-2 mt-2 text-[13px] text-ink-600">{t('Tik op de kaart, of kies hieronder een plek.', 'Tap the map, or pick a place below.')}</p>
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line" data-testid="places">
          {places.map((pl) => (
            <li key={pl.key} className="flex items-stretch">
              <button type="button" className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left hover:bg-[#F3F7F1]" onClick={() => toPlace(pl.key)}>
                <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[18px] font-black ${pl.alert ? 'bg-[#fbf0d9] text-[#b07a00]' : 'bg-[#E7EFE3] text-ink-600'}`}>{pl.alert ? '!' : <MapIcon className="h-4 w-4" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-ink-900">{pl.label}{pl.alert && <span className="sr-only">{t(' (hier wacht iets)', ' (something waits here)')}</span>}</span>
                  {pl.hint && <span className="block text-[13px] text-ink-600">{pl.hint}</span>}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
              </button>
              <button type="button" data-testid={`jump-${pl.key}`} onClick={() => jumpTo(pl.key)} aria-label={t(`Reis direct naar ${pl.label}`, `Travel straight to ${pl.label}`)}
                className="flex w-[64px] shrink-0 flex-col items-center justify-center gap-0.5 border-l border-line text-[11.5px] font-semibold text-accent hover:bg-[#F3F7F1]">
                <Sparkles className="h-4 w-4" aria-hidden />{t('Direct', 'Travel')}
              </button>
            </li>
          ))}
        </ul>
        <Link to="/p/wereld" className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-[14.5px] font-semibold text-accent">{t('Naar de wereldkaart met je route', 'To the world map with your route')}<ChevronRight className="h-4 w-4" aria-hidden /></Link>
      </Dialog>

      <Dialog open={!!downBy} onClose={respawn} title={t('Je bent verslagen', 'You were beaten')} size="sm"
        description={t(`${downBy ?? ''} was te sterk deze keer.`, `${downBy ?? ''} was too strong this time.`)}
        footer={<Button size="lg" className="w-full" data-testid="respawn" icon={<Droplets className="h-5 w-5" />} onClick={respawn}>{t('Opstaan bij de waterput', 'Get up at the well')}</Button>}>
        <div data-testid="hero-down" className="space-y-2 text-[15px] leading-relaxed text-ink-800">
          <p>{t('Je verliest niets: je held staat weer op bij de waterput, met al zijn leven terug.', 'You lose nothing: your hero gets up at the well, with all life back.')}</p>
          <p>{t('Sterker terugkomen? Koop een beter wapen bij de wapensmid, of doe vandaag je training: dan heeft je held een kwart meer leven en komen klappen minder hard aan.', 'Come back stronger? Buy a better weapon at the armourer, or do today’s workout: then your hero has a quarter more life and blows land softer.')}</p>
        </div>
      </Dialog>

      <Dialog open={tvOpen} onClose={() => { setTvOpen(false); setPlaying(null); }} title={t('Je oefeningen van vandaag', "Today's exercises")} size="md" sheet>
        <div data-testid="tv-panel" className="space-y-4">
          {exercise && !mediaUrl(exercise.exercise.videoMediaId) && !mediaUrl(exercise.exercise.thumbnailMediaId) && (
            // No video yet: no empty screen, but how to do it and what to watch out for.
            <div data-testid="tv-text-only" className="rounded-xl border border-line bg-white p-3">
              <p className="text-[15.5px] font-semibold text-ink-950">{nl ? exercise.exercise.nameNl : exercise.exercise.nameEn}</p>
              {[
                [t('Startpositie', 'Starting position'), nl ? exercise.exercise.startingPositionNl : exercise.exercise.startingPositionEn],
                [t('Uitvoering', 'How to do it'), nl ? exercise.exercise.movementNl : exercise.exercise.movementEn],
                [t('Let op', 'Remember'), nl ? exercise.exercise.instructionsNl : exercise.exercise.instructionsEn],
              ].filter(([, v]) => v).map(([title, text]) => (
                <div key={title} className="mt-2">
                  <p className="text-[14px] font-semibold text-ink-800">{title}</p>
                  <p className="text-[15px] leading-relaxed text-ink-700">{text}</p>
                </div>
              ))}
            </div>
          )}
          {exercise && (mediaUrl(exercise.exercise.videoMediaId) || mediaUrl(exercise.exercise.thumbnailMediaId)) && (
            <div className="overflow-hidden rounded-xl border-4 border-[#1c2420] bg-black">
              {mediaUrl(exercise.exercise.videoMediaId) ? (
                <video key={exercise.id} src={mediaUrl(exercise.exercise.videoMediaId)!} poster={mediaUrl(exercise.exercise.thumbnailMediaId) ?? undefined} controls autoPlay muted loop playsInline className="aspect-video w-full" />
              ) : (
                <img src={mediaUrl(exercise.exercise.thumbnailMediaId)!} alt="" className="aspect-video w-full object-contain" />
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

/** The next home: what it costs in loot, what you have, and the button to build it. */
function BuildHome({ own, level, busy, justBuilt, onBuild }: { own: OwnHome; level: number; busy: boolean; justBuilt: number | null; onBuild: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const b = own.build;
  const done = justBuilt !== null && justBuilt === own.stage && (
    <p role="status" data-testid="home-built" className="mb-2 rounded-xl border border-[#9fd4a8] bg-[#eef8f0] px-3 py-2 text-[14.5px] font-semibold text-ink-900">
      {t(`Gebouwd! Je woont nu in een ${HOME_STAGES[own.stage].nl.toLowerCase()}.`, `Built! You now live in a ${HOME_STAGES[own.stage].en.toLowerCase()}.`)}
    </p>
  );
  if (!b) return <>{done}<p data-testid="build-home" className="mb-3 rounded-xl bg-[#F3F7F1] px-3 py-2.5 text-[14.5px] text-ink-800">{t('Je woont in het grootste huis van het dorp.', 'You live in the biggest home of the village.')}</p></>;
  const next = HOME_STAGES[b.stage];
  return (
    <>
    {done}
    <section data-testid="build-home" aria-labelledby="build-home-h" className="mb-3 rounded-xl border border-line bg-white p-3">
      <h3 id="build-home-h" className="text-[15.5px] font-semibold text-ink-950">{t(`Bouw een ${next.nl.toLowerCase()}`, `Build a ${next.en.toLowerCase()}`)}</h3>
      <p className="mt-0.5 text-[13.5px] text-ink-700">{t('Verzamel buit in het dorp: hak eiken voor hout en rotsen voor steen, en versla wezens voor wat ze laten vallen.', 'Collect loot in the village: chop oaks for wood and rocks for stone, and beat creatures for what they drop.')}</p>
      <ul className="mt-2 grid grid-cols-2 gap-1.5">
        {(Object.entries(b.cost) as [LootKey, number][]).map(([k, n]) => {
          // Counted as there: the loot itself, or berries standing in for animal loot.
          const have = Math.min(n, n - (b.missing[k] ?? 0));
          return (
            <li key={k} data-cost={k} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[13.5px] ${have >= n ? 'border-[#9fd4a8] bg-[#eef8f0]' : 'border-line'}`}>
              <span aria-hidden>{LOOT[k].icon}</span>
              <span className="min-w-0 flex-1 truncate">{nl ? LOOT[k].nl : LOOT[k].en}</span>
              <span className="tabular-nums font-semibold">{have}/{n}</span>
            </li>
          );
        })}
      </ul>
      {(Object.keys(b.cost) as LootKey[]).some((k) => BERRIES_FOR[k]) && (
        <p data-testid="berries-hint" className="mt-2 rounded-lg bg-[#eef1fb] px-2.5 py-1.5 text-[13px] text-ink-800">
          {t('Liever niet jagen? Dierlijke buit betaal je ook met bessen van de struiken: ', 'Rather not hunt? Animal loot can be paid with berries from the bushes too: ')}
          {(Object.keys(b.cost) as LootKey[]).filter((k) => BERRIES_FOR[k]).map((k) => `${BERRIES_FOR[k]} ${t('bessen', 'berries')} = 1 ${(nl ? LOOT[k].nl : LOOT[k].en).toLowerCase()}`).join(', ')}.
          {b.pay.berries ? t(` Je betaalt nu ${b.pay.berries} bessen.`, ` You now pay ${b.pay.berries} berries.`) : ''}
        </p>
      )}
      {!b.levelOk && <p className="mt-2 text-[13.5px] text-ink-700">{t(`Vanaf level ${next.from} mag je een ${next.nl.toLowerCase()} bouwen (nu level ${level}).`, `From level ${next.from} you may build a ${next.en.toLowerCase()} (now level ${level}).`)}</p>}
      <Button className="mt-2 w-full" data-testid="build-home-button" disabled={!b.ready} loading={busy} onClick={onBuild}>
        {b.ready ? t(`Bouw je ${next.nl.toLowerCase()}`, `Build your ${next.en.toLowerCase()}`) : !b.levelOk ? t(`Nog niet: level ${next.from} nodig`, `Not yet: level ${next.from} needed`) : t('Nog niet genoeg buit', 'Not enough loot yet')}
      </Button>
    </section>
    </>
  );
}
