import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DoorOpen, Gamepad2, LogOut, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { DEFAULT_LOOK } from '@shared/hero';
import type { Placed } from '@shared/homeDecor';
import { HOME_STAGES, homeStage, STREET_BOUND, STREET_RING, STREET_SIZE, streetPlot, type VillageHome } from '@shared/practiceVillage';
import { siteAt, VILLAGE_LAYOUT } from '@/components/patient/walk';
import { Minimap, type Landmark, type MapTrack } from '@/components/patient/VillageMap';
import { EXIT_KEY, HOME_KEY, PRACTICE_KEY, type WorldApi } from '@/components/patient/WalkVillage3D';
import { Joystick } from '@/pages/patient/VillageWalkPage';
// three.js only loads on the 3D pages.
const WalkVillage3D = lazy(() => import('@/components/patient/WalkVillage3D'));

const homeKey = (id: string) => `p:${id}`;
const BTN = 'pointer-events-auto inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-[#c9a14a] bg-[linear-gradient(180deg,#2f4a3f,#1c2f28)] px-4 text-[15px] font-semibold text-white shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd76a]';

/** The ring road behind the first homes, and the two ways to it from the square. */
const STREET_ROADS = (() => {
  const roads: { a: { x: number; z: number }; b: { x: number; z: number }; w: number }[] = [];
  const at = (deg: number, r: number) => ({ x: Math.cos((deg * Math.PI) / 180) * r, z: Math.sin((deg * Math.PI) / 180) * r });
  for (let d = 0; d < 360; d += 10) roads.push({ a: at(d, STREET_RING.road), b: at(d + 10, STREET_RING.road), w: 1.7 });
  for (const d of [0, 180]) roads.push({ a: at(d, 2.6), b: at(d, STREET_RING.road), w: 1.5 });
  for (let i = 0; i < 6; i++) roads.push({ a: at(streetPlot(i).deg, 2.6), b: at(streetPlot(i).deg, STREET_RING.inner - 2.4), w: 1.2 });
  return roads;
})();

/**
 * The practice's village on foot: the therapist starts in the practice and walks along the homes of
 * the patients. At a door: the record, or a look inside at how the patient furnished the home.
 * Homes carry a number; a name only when the page was asked to show names.
 */
export default function PracticeWalk({ homes, practiceName, picked, onPick, sample, className }: { homes: VillageHome[]; practiceName: string; picked: string | null; onPick: (id: string | null) => void; sample: boolean; className?: string }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [hood, setHood] = useState(0);
  const hoods = Math.max(1, Math.ceil(homes.length / STREET_SIZE));
  const shown = useMemo(() => homes.slice(hood * STREET_SIZE, (hood + 1) * STREET_SIZE), [homes, hood]);
  const world = useRef<WorldApi | null>(null);
  const track = useRef<MapTrack>({ x: 0, z: 0, facing: 0 });
  const stick = useRef({ x: 0, y: 0 });
  const [joystick, setJoystick] = useState(false);
  const [near, setNear] = useState<string | null>(null);
  const [inside, setInside] = useState<string | null>(null);
  const [items, setItems] = useState<Placed[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const label = (h: VillageHome) => h.name ?? t(`Huisje ${h.no}`, `Home ${h.no}`);
  const buildings = useMemo(
    () => shown.map((h, i) => {
      const p = streetPlot(i);
      return { key: homeKey(h.id), label: h.name ?? (nl ? `Huisje ${h.no}` : `Home ${h.no}`), site: siteAt(p.deg, p.ring), stage: homeStage(h.level), no: h.no, flag: h.week > 0 };
    }),
    [shown, nl],
  );
  const landmarks: Landmark[] = [
    { key: PRACTICE_KEY, label: practiceName, x: VILLAGE_LAYOUT.gym.x, z: VILLAGE_LAYOUT.gym.z - 1.6, icon: '🏥', color: '#b4532f', wide: true },
    ...buildings.map((b) => ({ key: b.key, label: b.label, x: b.site.x, z: b.site.z, icon: '🏠', color: b.flag ? '#2f9e44' : '#8a6038' })),
  ];
  const active = homes.filter((h) => h.week > 0).length;
  const atHome = near?.startsWith('p:') ? shown.find((h) => homeKey(h.id) === near) ?? null : null;
  // The therapist's own figure when they made one; else a plain one in the practice colours.
  const mine = useQuery({ queryKey: ['staff-avatar'], queryFn: () => api.get<{ look: Record<string, string> | null }>('/dashboard/avatar'), staleTime: 10 * 60_000 });
  const look = useMemo(() => (mine.data?.look ? { ...DEFAULT_LOOK, ...mine.data.look, gear: [] } : { ...DEFAULT_LOOK, hair: 'short', gear: ['tracksuit'] }), [mine.data]);

  const goIn = async (h: VillageHome) => {
    setBusy(true);
    setFailed(false);
    try {
      const r = await api.get<{ layout: Placed[] }>(`/dashboard/village/${h.id}/home`);
      setItems(r.layout);
      setInside(h.id);
      // After the furniture is in: one frame later the door opens.
      requestAnimationFrame(() => world.current?.use(`visit:${homeKey(h.id)}`));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  // A home picked outside the scene (the list beside it): go to its area and walk to its door.
  const nearRef = useRef<string | null>(null);
  nearRef.current = near;
  useEffect(() => {
    if (!picked || nearRef.current === homeKey(picked)) return;
    const i = homes.findIndex((h) => h.id === picked);
    if (i < 0) return;
    const area = Math.floor(i / STREET_SIZE);
    if (area !== hood) {
      setHood(area);
      setInside(null);
      // The other area is built first; the walk starts once it stands.
      const id = window.setTimeout(() => world.current?.goTo(homeKey(picked)), 1500);
      return () => window.clearTimeout(id);
    }
    world.current?.goTo(homeKey(picked));
  }, [picked, homes, hood]);
  const visited = inside ? homes.find((h) => h.id === inside) ?? null : null;

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className ?? ''}`} data-testid="practice-walk">
      <Suspense fallback={<div className="h-full w-full animate-pulse bg-[#E7EFE3]" />}>
        <WalkVillage3D
          className="h-full w-full"
          buildings={buildings}
          bound={STREET_BOUND}
          extraRoads={STREET_ROADS}
          people={false}
          visitRoom
          homeItems={items}
          look={look}
          heroName={t('Jij', 'You')}
          startAtTv
          tvLabel={t('Oefenzaal · tv', 'Exercise room · TV')}
          tvTitle={practiceName}
          tvLines={[t(`${homes.length} huisjes in het dorp`, `${homes.length} homes in the village`), t(`${active} deze week getraind`, `${active} trained this week`), t('Loop naar buiten voor de woonstraat', 'Walk outside for the street of homes')]}
          practiceLabel={practiceName}
          api={world}
          track={track}
          stick={stick}
          onNear={(k) => {
            setNear(k);
            if (k?.startsWith('p:')) onPick(k.slice(2));
          }}
          onZone={(z) => { if (z === 'village') setInside(null); }}
          onArrive={() => {}}
        />
      </Suspense>

      <div className="absolute right-2 top-2 h-[108px] w-[108px] overflow-hidden rounded-full border-2 border-[#c9a14a] shadow-card" data-testid="minimap">
        <Minimap track={track} landmarks={landmarks} onPlace={(k) => world.current?.goTo(k)} onWalk={(p) => world.current?.walk(p)} label={t('Minikaart van het dorp. Tik op een huisje om erheen te lopen.', 'Minimap of the village. Tap a home to walk there.')} />
      </div>

      {hoods > 1 && (
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-xl bg-black/55 p-1 text-white">
          {Array.from({ length: hoods }, (_, i) => (
            <button key={i} type="button" aria-pressed={hood === i} onClick={() => { setHood(i); setInside(null); onPick(null); }} className="min-h-[40px] rounded-lg px-3 text-[14px] font-semibold aria-pressed:bg-white aria-pressed:text-ink-950">
              {t(`Wijk ${i + 1}`, `Area ${i + 1}`)}
            </button>
          ))}
        </div>
      )}

      {joystick && (
        <div className="absolute bottom-3 left-3">
          <Joystick stick={stick} label={t('Joystick: sleep om te lopen, tot de rand om te rennen', 'Joystick: drag to walk, to the rim to run')} />
        </div>
      )}
      <button type="button" aria-pressed={joystick} data-testid="walk-joystick" aria-label={t('Joystick aan of uit', 'Joystick on or off')} onClick={() => { stick.current.x = 0; stick.current.y = 0; setJoystick((v) => !v); }}
        className="absolute left-2 top-14 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#c9a14a] bg-black/60 text-white aria-pressed:bg-[#5a4a1c]">
        <Gamepad2 className="h-5 w-5" aria-hidden />
      </button>

      <div className="pointer-events-none absolute inset-x-2 bottom-3 flex flex-col items-center gap-2 px-14" aria-live="polite">
        {visited && (
          <p className="rounded-xl bg-black/60 px-3 py-1.5 text-center text-[14px] font-medium text-white" data-testid="visit-note">
            {t(`Binnen bij ${label(visited)} · ${items.length} ${items.length === 1 ? 'meubel' : 'meubels'}`, `Inside ${label(visited)} · ${items.length} ${items.length === 1 ? 'piece' : 'pieces'}`)}
          </p>
        )}
        {inside && (
          <button type="button" className={BTN} data-testid="leave-home" onClick={() => world.current?.goTo(EXIT_KEY)}><LogOut className="h-5 w-5" aria-hidden />{t('Naar buiten', 'Go outside')}</button>
        )}
        {!inside && near === PRACTICE_KEY && (
          <button type="button" className={BTN} data-testid="enter-practice" onClick={() => world.current?.use(PRACTICE_KEY)}><DoorOpen className="h-5 w-5" aria-hidden />{t('Naar binnen: de praktijk', 'Go in: the practice')}</button>
        )}
        {!inside && near === EXIT_KEY && (
          <button type="button" className={BTN} data-testid="leave-practice" onClick={() => world.current?.use(EXIT_KEY)}><LogOut className="h-5 w-5" aria-hidden />{t('Naar buiten', 'Go outside')}</button>
        )}
        {!inside && atHome && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <p className="w-full rounded-xl bg-black/60 px-3 py-1.5 text-center text-[14px] font-medium text-white">
              {label(atHome)} · {nl ? HOME_STAGES[homeStage(atHome.level)].nl : HOME_STAGES[homeStage(atHome.level)].en} · level {atHome.level}
            </p>
            {!sample && (
              <>
                <Link to={`/app/patienten/${atHome.id}`} className={BTN} data-testid="walk-record"><Users className="h-5 w-5" aria-hidden />{t('Open het dossier', 'Open the record')}</Link>
                <button type="button" className={BTN} data-testid="enter-home" disabled={busy} onClick={() => void goIn(atHome)}><DoorOpen className="h-5 w-5" aria-hidden />{t('Naar binnen', 'Go in')}</button>
              </>
            )}
            {failed && <p role="alert" className="w-full rounded-xl bg-[#7a1f1f] px-3 py-1.5 text-center text-[14px] text-white">{t('Het huis kon niet worden geopend. Probeer het opnieuw.', 'The home could not be opened. Try again.')}</p>}
          </div>
        )}
      </div>
      <span hidden data-testid="walk-picked">{picked ?? ''}</span>
      <span hidden data-home-key={HOME_KEY} />
    </div>
  );
}
