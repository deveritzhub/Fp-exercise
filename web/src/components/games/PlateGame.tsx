import { useEffect, useRef, useState } from 'react';
import { FOOD_BY_KEY, macrosOf, sumMacros, type Food } from '@shared/foods';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
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
      return;
    }
    setNotice(null);
    setPlate((p) => [...p, { id: nextId.current++, key }]);
  };
  const remove = (id: number) => {
    if (result) return;
    setNotice(null);
    setPlate((p) => p.filter((x) => x.id !== id));
  };

  const ready = () => {
    if (result || done.current) return;
    const score = scoreOf(totals);
    const tip = tipFor(totals, plate.map((p) => p.key));
    setResult({ score, tipNl: tip[0], tipEn: tip[1] });
    timer.current = window.setTimeout(() => finish(score), TIP_MS);
  };

  const fullness = totals.energy < FULL_LO ? 'low' : totals.energy <= FULL_HI ? 'ok' : 'high';

  return (
    <div className="flex flex-col gap-4 select-none" data-testid="plate-game">
      <p className="text-center text-[14px] text-ink-600">{t('Maak een hoofdmaaltijd: tik op een product om een portie op je bord te leggen.', 'Make a main meal: tap a product to put a portion on your plate.')}</p>

      {/* The plate */}
      <div className="mx-auto grid aspect-square w-full max-w-[280px] place-items-center rounded-full border-[10px] border-[#e9e4da] bg-white p-5 shadow-[inset_0_0_0_2px_#f3efe8,0_8px_20px_-10px_rgba(0,0,0,0.25)]" data-testid="plate">
        {plate.length === 0 ? (
          <p className="px-6 text-center text-[13.5px] text-ink-500">{t('Je bord is nog leeg', 'Your plate is still empty')}</p>
        ) : (
          <ul className="flex flex-wrap content-center justify-center gap-1.5">
            {plate.map((p) => {
              const s = BY_KEY[p.key];
              if (!s) return null;
              const name = nl ? s.food.nl : s.food.en;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    disabled={!!result}
                    aria-label={t(`${name}, ${s.food.portion.g} gram. Tik om weg te halen.`, `${name}, ${s.food.portion.g} grams. Tap to take off.`)}
                    className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-xl bg-canvas px-1.5 py-1 leading-none hover:bg-bad-soft"
                  >
                    <span aria-hidden className="text-[22px]">{s.icon}</span>
                    <span className="mt-0.5 text-[11px] font-semibold text-ink-700">{s.food.portion.g} g</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {plate.length > 0 && !result && <p className="-mt-2 text-center text-[12.5px] text-ink-500">{t('Tik op iets op je bord om het weg te halen.', 'Tap something on your plate to take it off.')}</p>}

      {/* Meters */}
      <div className="grid gap-2.5" aria-live="polite">
        <Meter
          label={t('Eiwit', 'Protein')}
          value={`${Math.round(totals.protein)} g`}
          aim={t('doel 25–40 g', 'aim 25–40 g')}
          pct={totals.protein / 60}
          band={[PROTEIN_LO / 60, PROTEIN_HI / 60]}
          good={totals.protein >= PROTEIN_LO && totals.protein <= PROTEIN_HI}
          testId="plate-protein"
        />
        <Meter
          label={t('Groente', 'Vegetables')}
          value={`${totals.veg} g`}
          aim={t('doel 150 g of meer', 'aim 150 g or more')}
          pct={totals.veg / 300}
          band={[VEG_AIM / 300, 1]}
          good={totals.veg >= VEG_AIM}
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
      <div>
        <p className="mb-1.5 text-[13.5px] font-semibold text-ink-800">{t('Kies uit het schap', 'Pick from the shelf')}</p>
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
                  className="flex min-h-[76px] w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-line bg-white px-1 py-1.5 text-center hover:border-ink-300 active:bg-canvas disabled:opacity-50"
                >
                  <span aria-hidden className="text-[26px] leading-none">{s.icon}</span>
                  <span className="text-[12px] font-medium leading-tight text-ink-800">{name}</span>
                  <span className="text-[11px] text-ink-500">{s.food.portion.g} g</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {notice && <p className="text-center text-[13.5px] font-medium text-warn" role="status">{notice}</p>}

      {result ? (
        <div className="rounded-xl border border-line bg-canvas p-3 text-center animate-fade-in" role="status" data-testid="plate-tip">
          <p className="text-[15px] font-semibold text-ink-900">{t(`${result.score} punten`, `${result.score} points`)}</p>
          <p className="mt-0.5 text-[14px] text-ink-700">{nl ? result.tipNl : result.tipEn}</p>
        </div>
      ) : (
        <Button size="xl" className="w-full" data-testid="plate-ready" onClick={ready}>{t('Klaar', 'Done')}</Button>
      )}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" className="min-h-[44px] px-4" data-testid="game-stop" onClick={() => finish(result ? result.score : scoreOf(totals))}>{t('Stoppen', 'Stop')}</Button>
      </div>
    </div>
  );
}

function Meter({ label, value, aim, pct, band, good, testId }: { label: string; value: string; aim: string; pct: number; band: [number, number]; good: boolean; testId: string }) {
  const w = Math.max(0, Math.min(1, pct)) * 100;
  return (
    <div data-testid={testId}>
      <div className="flex items-baseline justify-between gap-2 text-[13.5px]">
        <span className="font-semibold text-ink-900">{label} <span className="font-normal text-ink-500">· {aim}</span></span>
        <span className={good ? 'font-semibold text-ok' : 'font-semibold text-ink-700'}>{value}</span>
      </div>
      <div className="relative mt-1 h-3 overflow-hidden rounded-full bg-ink-100" aria-hidden>
        <div className="absolute inset-y-0 bg-ok/20" style={{ left: `${band[0] * 100}%`, width: `${(band[1] - band[0]) * 100}%` }} />
        <div className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ${good ? 'bg-ok' : 'bg-warn'}`} style={{ width: `${w}%` }} />
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
