import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { FOOD_BY_KEY } from '@shared/foods';
import { useI18n } from '@/lib/i18n';
import { GAME_THEME, GlowBar, Hud, HudPill, Stage, StopButton, haptic, sfx } from './kit';
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

const TH = GAME_THEME.market;
const FLY_MS = 600;
/** Brushed steel for the rails. */
const RAIL = 'linear-gradient(180deg, #8a939c 0%, #48505a 16%, #22272e 50%, #48505a 84%, #7a838c 100%)';
/** The rubber band: moving ribs over a soft, rounded sheen. */
const BELT =
  'repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0 2px, rgba(0,0,0,.18) 2px 4px, transparent 4px 28px), linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(255,255,255,.04) 28%, rgba(255,255,255,.07) 50%, rgba(255,255,255,.02) 72%, rgba(0,0,0,.6) 100%)';
/** A glossy product card. */
const CARD = 'linear-gradient(165deg, #ffffff 0%, #f7f2eb 55%, #e6dccf 100%)';
const CARD_SHADOW = '0 14px 18px -8px rgba(0,0,0,.75), 0 3px 6px rgba(0,0,0,.3), inset 0 -3px 6px rgba(120,95,70,.18)';

type Flyer = { id: number; emoji: string; good: boolean; x: number; y: number; dx: number; dy: number; until: number };

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
  const [flash, setFlash] = useState<{ n: number; good: boolean; k: number } | null>(null);
  const items = useRef<OnBelt[]>([]);
  const elapsed = useRef(0);
  const nextSpawn = useRef(0);
  const nextId = useRef(1);
  const scoreRef = useRef(0);
  const done = useRef(false);
  const basketRef = useRef<HTMLDivElement>(null);
  const beltRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const flyers = useRef<Flyer[]>([]);
  const flashGood = useRef(true);
  const lastTick = useRef(0);
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
      flyers.current = flyers.current.filter((f) => f.until > now);
      // A soft tick for each of the last five seconds.
      const secLeft = Math.ceil(ROUND - elapsed.current);
      if (secLeft <= 5 && secLeft > 0 && secLeft !== lastTick.current) {
        lastTick.current = secLeft;
        sfx.tick();
      }
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
    setFlash({ n: delta, good: it.p.good, k: it.id });
    if (it.p.good) {
      sfx.good();
      haptic(12);
    } else {
      sfx.bad();
      haptic([20, 30, 20]);
    }
    // The product flies from the belt into the basket.
    const root = rootRef.current?.getBoundingClientRect();
    const belt = beltRef.current?.getBoundingClientRect();
    const basket = basketRef.current?.getBoundingClientRect();
    if (!reduced && root && belt && basket) {
      const x = belt.left + it.x * belt.width - root.left;
      const y = belt.top + belt.height / 2 - root.top;
      flyers.current.push({ id: it.id, emoji: it.p.emoji, good: it.p.good, x, y, dx: basket.left + basket.width / 2 - root.left - x, dy: basket.top + basket.height / 2 - root.top - y, until: performance.now() + FLY_MS });
    }
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
  if (flash) flashGood.current = flash.good;
  const lowTime = left <= 10;

  return (
    <Stage game="market" testId="market-game" className="select-none">
      <div ref={rootRef} className="relative">
        <Hud>
          <HudPill
            label={t('Tijd', 'Time')}
            accent={lowTime ? '#ff9b8a' : TH.soft}
            value={<span data-testid="market-time">{left}<span className="text-[14px] font-bold opacity-70"> s</span></span>}
          />
          <div
            ref={basketRef}
            className="relative rounded-2xl transition-shadow duration-300"
            style={{ boxShadow: flash ? (flash.good ? '0 0 26px -2px rgba(95,211,154,.8)' : '0 0 26px -2px rgba(255,86,86,.85)') : '0 0 0 0 transparent' }}
            data-testid="market-basket"
          >
            <HudPill label={t('Mandje', 'Basket')} value={<span className="inline-flex items-center gap-1"><span aria-hidden className="text-[18px]">🧺</span>{inBasket}</span>} className="h-full" />
            {flash && (
              <span
                key={flash.k}
                aria-hidden
                className="game-pop absolute -right-2 -top-3 rounded-full px-2 py-0.5 text-[13px] font-black tabular-nums text-white"
                style={flash.good ? { background: 'linear-gradient(135deg, #8ff0b8, #2fbf74)', boxShadow: '0 0 14px rgba(95,211,154,.9)' } : { background: 'linear-gradient(135deg, #ff9b8a, #e5413a)', boxShadow: '0 0 14px rgba(255,86,86,.9)' }}
              >
                {flash.n > 0 ? `+${flash.n}` : `−${Math.abs(flash.n)}`}
              </span>
            )}
          </div>
          <HudPill label={t('Punten', 'Points')} accent="#f3cf6b" value={<span data-testid="market-score">{score}</span>} />
        </Hud>
        <GlowBar game="market" value={1 - progress} />

        {/* The belt: steel rails around a moving rubber band */}
        <div className="relative mt-4 rounded-[22px] p-[7px] shadow-[0_22px_40px_-18px_rgba(0,0,0,.95)]" style={{ background: RAIL }}>
          <div
            ref={beltRef}
            role="group"
            tabIndex={0}
            onKeyDown={onBeltKey}
            aria-label={t('Lopende band. Druk op spatie als een product in het vak staat om het te pakken.', 'Conveyor belt. Press space when a product is in the box to grab it.')}
            className="relative h-[132px] overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            data-testid="market-belt"
            style={{ backgroundColor: '#1a1f25', backgroundImage: BELT, backgroundPosition: reduced ? '0 0, 0 0' : `${-travelled}px 0, 0 0` }}
          >
            {/* Soft light from above */}
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 100% at 40% -15%, ${TH.glow}38, transparent 70%)` }} />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-2 rounded-xl border-2 border-dashed"
              style={{ left: `${ZONE[0] * 100}%`, width: `${(ZONE[1] - ZONE[0]) * 100}%`, borderColor: `${TH.soft}88`, background: `${TH.glow}12`, boxShadow: `inset 0 0 18px ${TH.glow}30, 0 0 16px ${TH.glow}30` }}
            />
            {items.current.map((it) => {
              const name = nl ? it.p.nl : it.p.en;
              return (
                <button
                  key={it.id}
                  type="button"
                  tabIndex={-1}
                  aria-label={name}
                  onPointerDown={(e) => { e.preventDefault(); grab(it.id); }}
                  className="absolute top-1/2 flex h-[96px] w-[74px] touch-manipulation flex-col items-center justify-center overflow-hidden rounded-2xl ring-1 ring-black/10"
                  style={{ left: `${it.x * 100}%`, transform: 'translate(-50%, -50%)', background: CARD, boxShadow: CARD_SHADOW }}
                  data-testid="market-item"
                  data-good={it.p.good ? '1' : '0'}
                >
                  <span aria-hidden className="pointer-events-none absolute inset-x-1 top-0.5 h-[40%] rounded-t-[14px] bg-gradient-to-b from-white to-white/0 opacity-90" />
                  <span aria-hidden className="relative text-[36px] leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,.28)]">{it.p.emoji}</span>
                  <span className="relative mt-1 line-clamp-2 px-0.5 text-center text-[11px] font-bold leading-tight text-[#2f2a26]">{name}</span>
                </button>
              );
            })}
            {/* The ends of the belt fade into the dark */}
            <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/60 to-transparent" />
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/60 to-transparent" />
            {/* A green or red glow after a grab */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500"
              style={{ opacity: flash ? 1 : 0, boxShadow: flashGood.current ? 'inset 0 0 34px rgba(95,211,154,.6)' : 'inset 0 0 38px rgba(255,70,70,.75)' }}
            />
          </div>
        </div>

        {/* Products flying into the basket */}
        {flyers.current.map((f) => (
          <span
            key={f.id}
            aria-hidden
            className="pointer-events-none absolute z-30 grid h-[60px] w-[48px] place-items-center rounded-xl text-[28px]"
            style={{ left: f.x, top: f.y, transform: 'translate(-50%, -50%)', background: CARD, boxShadow: f.good ? '0 0 22px rgba(95,211,154,.9)' : '0 0 22px rgba(255,70,70,.9)' }}
            ref={(el) => {
              if (!el || el.dataset.flown) return;
              el.dataset.flown = '1';
              el.animate?.(
                [
                  { transform: 'translate(-50%, -50%) scale(1.1)', opacity: 1 },
                  { transform: `translate(-50%, -50%) translate(${f.dx * 0.3}px, ${f.dy * 0.3 - 46}px) scale(1.15) rotate(-8deg)`, opacity: 1, offset: 0.35 },
                  { transform: `translate(-50%, -50%) translate(${f.dx}px, ${f.dy}px) scale(.3) rotate(10deg)`, opacity: 0.2 },
                ],
                { duration: FLY_MS, easing: 'cubic-bezier(.45,0,.6,1)', fill: 'forwards' },
              );
            }}
          >
            {f.emoji}
          </span>
        ))}

        <p className="mx-auto mt-3 max-w-sm text-center text-[13.5px] leading-snug text-white/60">{t('Tik op gezonde en eiwitrijke producten (+2). Laat snoep, frisdrank en gefrituurd eten liggen (−1).', 'Tap healthy and protein-rich products (+2). Leave sweets, soft drinks and fried food (−1).')}</p>
        <p className="sr-only" aria-live="polite">{flash ? (flash.good ? t('Goed gekozen, 2 punten erbij.', 'Good choice, 2 points.') : t('Die liever laten liggen, 1 punt eraf.', 'Better leave that one, 1 point off.')) : ''}</p>
        <StopButton onClick={finish} label={t('Stoppen', 'Stop')} />
      </div>
    </Stage>
  );
}
