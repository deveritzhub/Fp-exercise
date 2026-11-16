import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { FOOD_BY_KEY } from '@shared/foods';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui';
import type { GameProps } from './types';

type Product = { emoji: string; nl: string; en: string; good: boolean };
type OnBelt = { id: number; p: Product; x: number };

/** Name from the food list without the bit in brackets ("Bruine bonen (blik)" -> "Bruine bonen"). */
const short = (s: string) => s.replace(/\s*\(.*\)\s*/, '').trim();
const fromFoods = (list: [string, string][], good: boolean): Product[] =>
  list.flatMap(([key, emoji]) => {
    const f = FOOD_BY_KEY[key];
    return f ? [{ emoji, nl: short(f.nl), en: short(f.en), good }] : [];
  });

/** Healthy, protein-rich, vegetables and fruit: +2. */
const GOOD: Product[] = fromFoods(
  [
    ['kipfilet', '🍗'], ['ei', '🥚'], ['zalm', '🐟'], ['kwark', '🥣'], ['melk', '🥛'], ['bruine_bonen', '🫘'], ['amandelen', '🌰'],
    ['brood_volkoren', '🍞'], ['broccoli', '🥦'], ['paprika', '🫑'], ['wortel', '🥕'], ['tomaat', '🍅'], ['appel', '🍎'], ['banaan', '🍌'], ['aardbeien', '🍓'],
  ],
  true,
);
/** Sugary, fried or ultra-processed: -1. */
const BAD: Product[] = [
  ...fromFoods([['frisdrank', '🥤'], ['friet', '🍟'], ['koek', '🍪']], false),
  { emoji: '🍬', nl: 'Snoep', en: 'Candy', good: false },
  { emoji: '🍭', nl: 'Lolly', en: 'Lollipop', good: false },
  { emoji: '🍰', nl: 'Taart', en: 'Cake', good: false },
  { emoji: '🍩', nl: 'Donut', en: 'Doughnut', good: false },
  { emoji: '🍫', nl: 'Chocoladereep', en: 'Chocolate bar', good: false },
  { emoji: '🌭', nl: 'Hotdog', en: 'Hot dog', good: false },
];

const ROUND = 45;
const MAX = 80;
/** Belt speed in belt-widths per second: slow at the start, a bit faster at the end. */
const speedAt = (s: number) => 0.2 + 0.17 * Math.min(1, s / ROUND);
/** The keyboard grab zone (fraction of the belt width). */
const ZONE: [number, number] = [0.3, 0.5];

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T;
const prefersReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Supermarket sprint: products ride a belt from right to left. Tap the healthy ones to put them in
 * the basket (+2); sugary, fried or very processed ones cost a point (-1). 45 seconds, the belt
 * slowly speeds up. Keyboard: focus the belt and press space when a product is in the marked box.
 */
export default function MarketGame({ onDone }: GameProps) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [, setFrame] = useState(0);
  const [score, setScore] = useState(0);
  const [inBasket, setInBasket] = useState(0);
  const [flash, setFlash] = useState<{ n: number; good: boolean } | null>(null);
  const items = useRef<OnBelt[]>([]);
  const elapsed = useRef(0);
  const nextSpawn = useRef(0);
  const nextId = useRef(1);
  const scoreRef = useRef(0);
  const done = useRef(false);
  const basketRef = useRef<HTMLDivElement>(null);
  const flashTimer = useRef<number | null>(null);
  const reduced = useRef(prefersReducedMotion()).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDoneRef.current(Math.max(0, Math.min(MAX, Math.round(scoreRef.current))));
  };

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (done.current) return;
      // Clamp the step so a hidden tab pauses the round instead of skipping it.
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      elapsed.current += dt;
      const speed = speedAt(elapsed.current);
      for (const it of items.current) it.x -= speed * dt;
      items.current = items.current.filter((it) => it.x > -0.15);
      nextSpawn.current -= dt;
      if (nextSpawn.current <= 0) {
        const good = Math.random() < 0.6;
        items.current.push({ id: nextId.current++, p: pick(good ? GOOD : BAD), x: 1.12 });
        nextSpawn.current = (0.27 / speed) * (0.9 + Math.random() * 0.7);
      }
      setFrame((f) => (f + 1) % 1_000_000);
      if (elapsed.current >= ROUND) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grab = (id: number) => {
    if (done.current) return;
    const it = items.current.find((x) => x.id === id);
    if (!it) return;
    items.current = items.current.filter((x) => x.id !== id);
    const delta = it.p.good ? 2 : -1;
    scoreRef.current = Math.max(0, scoreRef.current + delta);
    setScore(scoreRef.current);
    setInBasket((n) => n + 1);
    setFlash({ n: delta, good: it.p.good });
    if (flashTimer.current !== null) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 700);
    if (!it.p.good && !reduced) {
      basketRef.current?.animate?.(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }],
        { duration: 350, easing: 'ease-out' },
      );
    }
  };

  const onBeltKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    const mid = (ZONE[0] + ZONE[1]) / 2;
    const inZone = items.current.filter((it) => it.x >= ZONE[0] - 0.04 && it.x <= ZONE[1] + 0.04).sort((a, b) => Math.abs(a.x - mid) - Math.abs(b.x - mid))[0];
    if (inZone) grab(inZone.id);
  };

  const left = Math.max(0, Math.ceil(ROUND - elapsed.current));
  const progress = Math.min(1, elapsed.current / ROUND);
  /** Belt stripes move along with the products (decorative; they stand still with reduced motion). */
  const travelled = elapsed.current * 60;

  return (
    <div className="flex flex-col gap-3 select-none" data-testid="market-game">
      <div className="flex items-center justify-between gap-2 text-[14px]">
        <span className="text-ink-600">{t('Tijd', 'Time')}: <span className="font-semibold tabular-nums text-ink-900" data-testid="market-time">{left} s</span></span>
        <div ref={basketRef} className="relative flex items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5" data-testid="market-basket">
          <span aria-hidden className="text-[18px]">🧺</span>
          <span className="text-ink-700">{t(`${inBasket} in je mandje`, `${inBasket} in your basket`)}</span>
          {flash && (
            <span aria-hidden className={`absolute -top-3 right-1 rounded-full px-1.5 text-[12px] font-bold ${flash.good ? 'bg-ok text-white' : 'bg-bad text-white'}`}>{flash.n > 0 ? `+${flash.n}` : flash.n}</span>
          )}
        </div>
        <span className="text-ink-600">{t('Punten', 'Points')}: <span className="font-bold tabular-nums text-ink-950" data-testid="market-score">{score}</span></span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-100" aria-hidden><div className="h-full bg-accent" style={{ width: `${(1 - progress) * 100}%` }} /></div>

      {/* The belt */}
      <div
        role="group"
        tabIndex={0}
        onKeyDown={onBeltKey}
        aria-label={t('Lopende band. Druk op spatie als een product in het vak staat om het te pakken.', 'Conveyor belt. Press space when a product is in the box to grab it.')}
        className="relative h-[124px] overflow-hidden rounded-2xl border-y-[6px] border-[#5d6770] bg-[#3e4850] focus-visible:ring-2"
        data-testid="market-belt"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 28px)', backgroundPosition: reduced ? '0 0' : `${-travelled}px 0` }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-y-2 rounded-xl border-2 border-dashed border-white/35" style={{ left: `${ZONE[0] * 100}%`, width: `${(ZONE[1] - ZONE[0]) * 100}%` }} />
        {items.current.map((it) => {
          const name = nl ? it.p.nl : it.p.en;
          return (
            <button
              key={it.id}
              type="button"
              tabIndex={-1}
              aria-label={name}
              onPointerDown={(e) => { e.preventDefault(); grab(it.id); }}
              className="absolute top-1/2 flex h-[92px] w-[72px] touch-manipulation flex-col items-center justify-center rounded-xl bg-white/95 shadow-md"
              style={{ left: `${it.x * 100}%`, transform: 'translate(-50%, -50%)' }}
              data-testid="market-item"
              data-good={it.p.good ? '1' : '0'}
            >
              <span aria-hidden className="text-[34px] leading-none">{it.p.emoji}</span>
              <span className="mt-1 line-clamp-2 px-0.5 text-center text-[11px] font-medium leading-tight text-[#2b3a33]">{name}</span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[13.5px] text-ink-600">{t('Tik op gezonde en eiwitrijke producten (+2). Laat snoep, frisdrank en gefrituurd eten liggen (−1).', 'Tap healthy and protein-rich products (+2). Leave sweets, soft drinks and fried food (−1).')}</p>
      <p className="sr-only" aria-live="polite">{flash ? (flash.good ? t('Goed gekozen, 2 punten erbij.', 'Good choice, 2 points.') : t('Die liever laten liggen, 1 punt eraf.', 'Better leave that one, 1 point off.')) : ''}</p>
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" className="min-h-[44px] px-4" data-testid="game-stop" onClick={finish}>{t('Stoppen', 'Stop')}</Button>
      </div>
    </div>
  );
}
