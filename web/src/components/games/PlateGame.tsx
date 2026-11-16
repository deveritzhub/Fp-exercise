import { useEffect, useRef, useState } from 'react';
import { FOOD_BY_KEY, macrosOf, sumMacros, type Food } from '@shared/foods';
import { useI18n } from '@/lib/i18n';
import { GAME_THEME, GOLD, GameButton, Hud, HudPill, Stage, StopButton, haptic, sfx } from './kit';
import type { GameProps } from './types';

type Role = 'protein' | 'carb' | 'veg' | 'fat' | 'treat';
type ShelfItem = { food: Food; icon: string; role: Role };

/** The shelf: proteins, carbs, vegetables, a fat and two less ideal choices, all from shared/foods. */
const SHELF: ShelfItem[] = (
  [
    ['kipfilet', '🍗', 'protein'],
    ['zalm', '🐟', 'protein'],
    ['ei', '🥚', 'protein'],
    ['linzen', '🫘', 'protein'],
    ['aardappel', '🥔', 'carb'],
    ['rijst', '🍚', 'carb'],
    ['broccoli', '🥦', 'veg'],
    ['sperziebonen', '🫛', 'veg'],
    ['paprika', '🫑', 'veg'],
    ['olijfolie', '🫒', 'fat'],
    ['friet', '🍟', 'treat'],
    ['pizza', '🍕', 'treat'],
  ] as const
).flatMap(([key, icon, role]) => {
  const food = FOOD_BY_KEY[key];
  return food ? [{ food, icon, role }] : [];
});
const BY_KEY: Record<string, ShelfItem> = Object.fromEntries(SHELF.map((s) => [s.food.key, s]));

const PROTEIN_LO = 25;
const PROTEIN_HI = 40;
const VEG_AIM = 150;
/** The "not too much" window, in kcal; only ever shown as a fullness bar. */
const FULL_LO = 400;
const FULL_HI = 700;
const MAX_ON_PLATE = 10;
const TIP_MS = 2200;

const TH = GAME_THEME.plate;
/** A dark walnut table: grain, a soft sheen and depth. */
const TABLE =
  'radial-gradient(120% 80% at 50% 0%, rgba(255,214,160,.10), transparent 60%), repeating-linear-gradient(91deg, rgba(255,255,255,.028) 0 2px, transparent 2px 11px), repeating-linear-gradient(89deg, rgba(0,0,0,.2) 0 1px, transparent 1px 27px), linear-gradient(180deg, #3d2818 0%, #2b1b10 55%, #1a100a 100%)';
/** Fine white porcelain: the rim and the well. */
const PLATE_RIM = 'radial-gradient(circle at 42% 30%, #ffffff 0%, #f7f3ec 46%, #e7e0d3 74%, #cbc1ae 100%)';
const PLATE_WELL = 'radial-gradient(circle at 44% 34%, #ffffff 0%, #faf7f1 52%, #ede7dc 100%)';

/** Replays the kit's shake on an element (the CSS keeps it still under reduced motion). */
function shake(el: HTMLElement | null) {
  if (!el) return;
  el.classList.remove('game-shake');
  void el.offsetWidth;
  el.classList.add('game-shake');
}

type Totals = { protein: number; veg: number; energy: number };

function totalsOf(keys: string[]): Totals {
  const items = keys.map((k) => BY_KEY[k]).filter((x): x is ShelfItem => !!x);
  const m = sumMacros(items.map((s) => macrosOf(s.food, s.food.portion.g)));
  const veg = items.filter((s) => s.role === 'veg').reduce((a, s) => a + s.food.portion.g, 0);
  return { protein: m.protein, veg, energy: m.kcal };
}

/** Points per part: 40 protein, 30 vegetables, 30 portion; partial credit outside the aims. */
function partsOf(t: Totals) {
  const protein = t.protein < PROTEIN_LO ? (40 * t.protein) / PROTEIN_LO : t.protein <= PROTEIN_HI ? 40 : 40 * Math.max(0, 1 - (t.protein - PROTEIN_HI) / 30);
  const veg = 30 * Math.min(1, t.veg / VEG_AIM);
  const portion = t.energy < FULL_LO ? (30 * t.energy) / FULL_LO : t.energy <= FULL_HI ? 30 : 30 * Math.max(0, 1 - (t.energy - FULL_HI) / 400);
  return { protein, veg, portion };
}
const scoreOf = (t: Totals) => {
  const p = partsOf(t);
  return Math.max(0, Math.min(100, Math.round(p.protein + p.veg + p.portion)));
};

/**
 * Fill the plate: tap foods from the shelf to put a usual portion on the plate, tap a food on the
 * plate to take it off. Meters show protein, vegetables and how full the plate is. "Klaar" scores
 * the meal and shows one tip for a moment before the round ends.
 */
export default function PlateGame({ onDone }: GameProps) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [plate, setPlate] = useState<{ id: number; key: string }[]>([]);
  const [result, setResult] = useState<{ score: number; tipNl: string; tipEn: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const nextId = useRef(1);
  const done = useRef(false);
  const timer = useRef<number | null>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const totals = totalsOf(plate.map((p) => p.key));

  const finish = (score: number) => {
    if (done.current) return;
    done.current = true;
    if (timer.current !== null) window.clearTimeout(timer.current);
    onDoneRef.current(score);
  };

  const add = (key: string) => {
    if (result) return;
    if (plate.length >= MAX_ON_PLATE) {
      setNotice(t('Je bord is vol. Tik op iets op je bord om het weg te halen.', 'Your plate is full. Tap something on your plate to take it off.'));
      sfx.bad();
      haptic([20, 30, 20]);
      shake(plateRef.current);
      return;
    }
    sfx.good();
    haptic(12);
    setNotice(null);
    setPlate((p) => [...p, { id: nextId.current++, key }]);
  };
  const remove = (id: number) => {
    if (result) return;
    sfx.tap();
    haptic(8);
    setNotice(null);
    setPlate((p) => p.filter((x) => x.id !== id));
  };

  const ready = () => {
    if (result || done.current) return;
    const score = scoreOf(totals);
    const tip = tipFor(totals, plate.map((p) => p.key));
    setResult({ score, tipNl: tip[0], tipEn: tip[1] });
    if (score >= 75) { sfx.win(); haptic([10, 40, 10]); }
    else if (score >= 50) { sfx.good(); haptic(12); }
    else sfx.tap();
    timer.current = window.setTimeout(() => finish(score), TIP_MS);
  };

  const fullness = totals.energy < FULL_LO ? 'low' : totals.energy <= FULL_HI ? 'ok' : 'high';
  const proteinOk = totals.protein >= PROTEIN_LO && totals.protein <= PROTEIN_HI;
  const vegOk = totals.veg >= VEG_AIM;
  const goals = [proteinOk, vegOk, fullness === 'ok'].filter(Boolean).length;

  return (
    <Stage game="plate" testId="plate-game" className="select-none">
      <Hud>
        <HudPill label={t('Op je bord', 'On plate')} value={`${plate.length}/${MAX_ON_PLATE}`} />
        <HudPill label={t('Doelen', 'Goals')} value={`${goals}/3`} accent={goals === 3 ? TH.glow : undefined} />
      </Hud>
      <p className="mx-auto max-w-sm text-center text-[13.5px] leading-snug text-white/65">{t('Maak een hoofdmaaltijd: tik op een product om een portie op je bord te leggen.', 'Make a main meal: tap a product to put a portion on your plate.')}</p>

      {/* The table, with the plate on it */}
      <div className="relative mx-auto mt-3 w-full max-w-[380px] overflow-hidden rounded-[26px] px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_18px_40px_-18px_rgba(0,0,0,.85)] ring-1 ring-white/10" style={{ background: TABLE }}>
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(62% 58% at 50% 46%, ${TH.glow}2e, transparent 72%)` }} />
        <div
          ref={plateRef}
          className="relative mx-auto grid aspect-square w-full max-w-[280px] place-items-center rounded-full p-[15%]"
          style={{ background: PLATE_RIM, boxShadow: '0 24px 34px -14px rgba(0,0,0,.8), 0 6px 12px rgba(0,0,0,.35), inset 0 2px 0 rgba(255,255,255,.95), inset 0 -4px 10px rgba(110,90,60,.28)' }}
          data-testid="plate"
        >
          <div aria-hidden className="absolute inset-[3.5%] rounded-full border border-[#d6ad55]/55" />
          <div aria-hidden className="absolute inset-[12%] rounded-full" style={{ background: PLATE_WELL, boxShadow: 'inset 0 4px 12px rgba(90,70,40,.24), inset 0 -1px 0 rgba(255,255,255,.9), 0 1px 0 rgba(255,255,255,.7)' }} />
          <div aria-hidden className="absolute left-[22%] top-[14%] h-[18%] w-[34%] -rotate-[24deg] rounded-full bg-white/70 blur-md" />
          {plate.length === 0 ? (
            <p className="relative px-4 text-center text-[13.5px] font-semibold text-[#8b8170]">{t('Je bord is nog leeg', 'Your plate is still empty')}</p>
          ) : (
            <ul className="relative flex flex-wrap content-center justify-center gap-0.5">
              {plate.map((p) => {
                const s = BY_KEY[p.key];
                if (!s) return null;
                const name = nl ? s.food.nl : s.food.en;
                return (
                  <li key={p.id} className="game-pop">
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      disabled={!!result}
                      aria-label={t(`${name}, ${s.food.portion.g} gram. Tik om weg te halen.`, `${name}, ${s.food.portion.g} grams. Tap to take off.`)}
                      className="flex min-h-[48px] min-w-[46px] flex-col items-center justify-center rounded-2xl px-1 py-0.5 leading-none transition duration-150 hover:bg-[#d4553f]/10 hover:ring-1 hover:ring-[#d4553f]/40 active:scale-90 disabled:hover:bg-transparent disabled:hover:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3f7a4c]"
                    >
                      <span aria-hidden className="text-[28px] drop-shadow-[0_3px_3px_rgba(60,40,20,.35)]">{s.icon}</span>
                      <span className="mt-0.5 text-[10.5px] font-bold tabular-nums text-[#6d6352]">{s.food.portion.g} g</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      {plate.length > 0 && !result && <p className="mt-2 text-center text-[12.5px] text-white/55">{t('Tik op iets op je bord om het weg te halen.', 'Tap something on your plate to take it off.')}</p>}

      {/* Meters */}
      <div className="mt-3 grid gap-3.5 rounded-2xl border border-white/10 bg-white/[.05] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-md" aria-live="polite">
        <Meter
          label={t('Eiwit', 'Protein')}
          value={`${Math.round(totals.protein)} g`}
          aim={t('doel 25–40 g', 'aim 25–40 g')}
          pct={totals.protein / 60}
          band={[PROTEIN_LO / 60, PROTEIN_HI / 60]}
          good={proteinOk}
          testId="plate-protein"
        />
        <Meter
          label={t('Groente', 'Vegetables')}
          value={`${totals.veg} g`}
          aim={t('doel 150 g of meer', 'aim 150 g or more')}
          pct={totals.veg / 300}
          band={[VEG_AIM / 300, 1]}
          good={vegOk}
          testId="plate-veg"
        />
        <Meter
          label={t('Hoe vol', 'How full')}
          value={fullness === 'low' ? t('Nog wat weinig', 'A bit little') : fullness === 'ok' ? t('Goed zo', 'Just right') : t('Te vol', 'Too full')}
          aim={t('niet te veel', 'not too much')}
          pct={totals.energy / 1000}
          band={[FULL_LO / 1000, FULL_HI / 1000]}
          good={fullness === 'ok'}
          testId="plate-fullness"
        />
      </div>

      {/* The shelf */}
      <div className="mt-4">
        <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-[.14em] text-white/55">{t('Kies uit het schap', 'Pick from the shelf')}</p>
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {SHELF.map((s) => {
            const name = nl ? s.food.nl : s.food.en;
            return (
              <li key={s.food.key}>
                <button
                  type="button"
                  onClick={() => add(s.food.key)}
                  disabled={!!result}
                  data-testid={`plate-food-${s.food.key}`}
                  aria-label={t(`${name} toevoegen, ${s.food.portion.g} gram`, `Add ${name}, ${s.food.portion.g} grams`)}
                  className="group relative flex min-h-[88px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-b from-white/[.13] to-white/[.04] px-1 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.14),0_10px_20px_-14px_rgba(0,0,0,.9)] backdrop-blur-md transition duration-150 hover:border-white/25 hover:from-white/[.18] active:scale-[.94] disabled:opacity-40 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <span aria-hidden className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  <span aria-hidden className="text-[32px] leading-none drop-shadow-[0_5px_8px_rgba(0,0,0,.5)] transition-transform duration-200 group-hover:-translate-y-0.5 group-active:scale-110">{s.icon}</span>
                  <span className="mt-1.5 text-[12px] font-semibold leading-tight text-white/90">{name}</span>
                  <span className="text-[11px] font-medium tabular-nums text-white/45">{s.food.portion.g} g</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {notice && <p className="game-rise mx-auto mt-3 max-w-sm rounded-xl border border-[#ffcf7a]/30 bg-[#ffcf7a]/10 px-3 py-2 text-center text-[13.5px] font-semibold text-[#ffd99a]" role="status">{notice}</p>}

      {result ? (
        <div className="game-rise mt-4 rounded-2xl border border-white/15 bg-white/[.08] p-4 text-center backdrop-blur-md" style={{ boxShadow: `0 0 44px -14px ${TH.glow}, inset 0 1px 0 rgba(255,255,255,.1)` }} role="status" data-testid="plate-tip">
          <p className="flex items-baseline justify-center gap-2">
            <span className="bg-clip-text text-[44px] font-black leading-none tabular-nums text-transparent" style={{ backgroundImage: GOLD }}>{result.score}</span>
            <span className="text-[15px] font-bold text-white/70">{t('punten', 'points')}</span>
          </p>
          <p className="mt-2 text-[14.5px] leading-snug text-white/85">{nl ? result.tipNl : result.tipEn}</p>
        </div>
      ) : (
        <GameButton className="mt-4 w-full text-[18px]" data-testid="plate-ready" onClick={ready}>{t('Klaar', 'Done')}</GameButton>
      )}
      <StopButton onClick={() => finish(result ? result.score : scoreOf(totals))} label={t('Stoppen', 'Stop')} />
    </Stage>
  );
}

/** A glowing bar with the target zone between two gold markers. */
function Meter({ label, value, aim, pct, band, good, testId }: { label: string; value: string; aim: string; pct: number; band: [number, number]; good: boolean; testId: string }) {
  const w = Math.max(0, Math.min(1, pct)) * 100;
  const tone = good ? TH.glow : '#ffb35c';
  return (
    <div data-testid={testId}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13.5px] font-bold text-white">
          {label} <span className="font-medium text-white/50">· {aim}</span>
        </span>
        <span className="shrink-0 text-[14px] font-extrabold tabular-nums transition-colors duration-300" style={{ color: good ? TH.glow : '#ffcf7a' }}>{value}</span>
      </div>
      <div className="relative mt-1.5 h-3 rounded-full bg-black/30 shadow-[inset_0_1px_3px_rgba(0,0,0,.6)] ring-1 ring-white/[.06]" aria-hidden>
        <div className="absolute inset-y-0 bg-[#f3cf6b]/[.14]" style={{ left: `${band[0] * 100}%`, width: `${(band[1] - band[0]) * 100}%` }} />
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${w}%`, background: good ? `linear-gradient(90deg, ${TH.soft}, ${TH.glow})` : 'linear-gradient(90deg, #ffe2a8, #ff9f43)', boxShadow: w > 0 ? `0 0 12px ${tone}b3` : undefined }}
        />
        {band.filter((b) => b > 0 && b < 1).map((b) => (
          <span key={b} className="absolute -inset-y-1 w-[3px] -translate-x-1/2 rounded-full" style={{ left: `${b * 100}%`, background: GOLD, boxShadow: '0 0 6px rgba(243,207,107,.9)' }} />
        ))}
      </div>
    </div>
  );
}

/** One tip: about the part that lost the most points. */
function tipFor(tot: Totals, keys: string[]): [string, string] {
  if (keys.length === 0) return ['Je bord was nog leeg. Leg de volgende keer eiwit, groente en iets voor energie op je bord.', 'Your plate was still empty. Next time, put protein, vegetables and something for energy on it.'];
  const p = partsOf(tot);
  const lost = [
    { k: 'protein' as const, v: 40 - p.protein },
    { k: 'veg' as const, v: 30 - p.veg },
    { k: 'portion' as const, v: 30 - p.portion },
  ].sort((a, b) => b.v - a.v)[0];
  if (!lost || lost.v < 1) return ['Top! Genoeg eiwit, veel groente en een goede portie.', 'Great! Enough protein, plenty of vegetables and a good portion.'];
  const treats = keys.some((k) => BY_KEY[k]?.role === 'treat');
  if (lost.k === 'protein') {
    return tot.protein < PROTEIN_LO
      ? ['Voeg wat meer eiwit toe, zoals kip, vis, een ei of linzen. Eiwit helpt je spieren herstellen.', 'Add a bit more protein, like chicken, fish, an egg or lentils. Protein helps your muscles recover.']
      : ['Dat is meer eiwit dan nodig: zo’n 25 tot 40 gram per maaltijd is mooi.', 'That is more protein than needed: about 25 to 40 grams per meal is fine.'];
  }
  if (lost.k === 'veg') return ['Doe er meer groente bij: minstens 150 gram, dat is een flinke schep.', 'Add more vegetables: at least 150 grams, that is a good spoonful.'];
  return tot.energy < FULL_LO
    ? ['Dit is wat weinig voor een hoofdmaaltijd. Voeg aardappelen of rijst toe voor energie.', 'This is a bit little for a main meal. Add potatoes or rice for energy.']
    : treats
      ? ['Je bord is wat te vol. Laat de friet of pizza eens staan en neem meer groente.', 'Your plate is a bit too full. Skip the chips or pizza and take more vegetables.']
      : ['Je bord is wat te vol. Een iets kleinere portie is genoeg.', 'Your plate is a bit too full. A slightly smaller portion is enough.'];
}
