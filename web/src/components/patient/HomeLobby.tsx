import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Gift, Home, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { bodyShape, levelTier, titleFor } from '@shared/hero';
import { villageGrowth, type VillageGrowth } from '@shared/villageGrowth';
import { HOME_STAGES, homeStage, levelsToNextHome } from '@shared/practiceVillage';
import { HeroPhoto } from '@/components/hero/HeroPhoto';
import { HeroStage, LevelBadge, XpBar } from '@/components/hero/GameFx';
import { useHero } from '@/pages/patient/HeroPages';
import type { HeroState } from '@/lib/types';

/**
 * The top of "Vandaag" as a game lobby: the hero on its podium in front of its own village, drawn in
 * code (no 3D, so it loads instantly). The sky follows the time of day. The village is the same
 * one as on the world map: it grows with workouts, bosses and level, and never shrinks.
 */

type Daypart = 'morning' | 'day' | 'evening' | 'night';
export function daypartOf(hour: number): Daypart {
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
const SKY: Record<Daypart, { top: string; bottom: string; hill: string; hill2: string; text: 'dark' | 'light' }> = {
  morning: { top: '#ffe2bd', bottom: '#d6ecf3', hill: '#8fbf6a', hill2: '#a9cf86', text: 'dark' },
  day: { top: '#bfe1f2', bottom: '#e6f3e8', hill: '#86b964', hill2: '#a2cc80', text: 'dark' },
  evening: { top: '#f4b98d', bottom: '#a9bcd9', hill: '#5f8d55', hill2: '#79a466', text: 'dark' },
  night: { top: '#17233f', bottom: '#33496d', hill: '#2f4a3a', hill2: '#3c5c48', text: 'light' },
};

type WorldLite = { zones: { nodes: number }[] };

function useGrowth(hero: HeroState | undefined): VillageGrowth | null {
  const world = useQuery({ queryKey: ['patient-world'], queryFn: () => api.get<WorldLite>('/patient/world'), staleTime: 60_000, enabled: !!hero?.hero });
  if (!hero?.level) return null;
  const workouts = (world.data?.zones ?? []).reduce((n, z) => n + z.nodes, 0);
  return villageGrowth({ workouts, bossesDefeated: hero.weekly?.bossesDefeated ?? 0, level: hero.level.level });
}

/** The patient's own home as it stands in the village: one drawing per kind, from a camp to a villa. */
function OwnHome({ stage, lit }: { stage: number; lit: boolean }) {
  const win = lit ? '#ffd36b' : '#cfe3ef';
  const wall = '#f6eedd';
  if (stage <= 0) {
    return (
      <g>
        <path d="M-15 6 L0 -16 L15 6Z" fill="#d9c08f" /><path d="M-4 6 L0 -5 L4 6Z" fill="#6b4a2b" /><path d="M0 -16 L0 -21" stroke="#6b4a2b" strokeWidth="1.2" />
        <path d="M0 -21 L7 -19 L0 -17Z" fill="#b5532c" />
        <ellipse cx="20" cy="5" rx="5" ry="1.6" fill="#5b4632" /><path d="M17 4 Q20 -5 23 4Z" fill="#f08a3c" className="hero-aura" /><path d="M18.6 4 Q20 -1 21.4 4Z" fill="#ffd36b" />
      </g>
    );
  }
  if (stage === 1) {
    return (
      <g>
        <rect x="-12" y="-8" width="24" height="14" fill="#b98a5a" /><path d="M-15 -7 L0 -19 L15 -7Z" fill="#7a5232" />
        {[-8, -4, 0, 4, 8].map((x) => <path key={x} d={`M${x} -8 V6`} stroke="#8e6740" strokeWidth="0.8" />)}
        <rect x="-3" y="-2" width="6" height="8" fill="#5b3f26" /><rect x="5.5" y="-5" width="4" height="4" fill={win} />
      </g>
    );
  }
  if (stage === 2) {
    return (
      <g>
        <rect x="-13" y="-10" width="26" height="16" fill={wall} /><path d="M-16.5 -9 L0 -24 L16.5 -9Z" fill="#b5532c" /><rect x="6" y="-23" width="4" height="8" fill="#8d8a82" />
        <rect x="-3" y="-3" width="6" height="9" rx="3" fill="#7a5232" /><rect x="-10.5" y="-6" width="5" height="5" fill={win} /><rect x="5.5" y="-6" width="5" height="5" fill={win} />
        <rect x="-11" y="-1" width="6" height="1.6" fill="#c2201f" /><rect x="5" y="-1" width="6" height="1.6" fill="#c2201f" />
      </g>
    );
  }
  if (stage === 3) {
    return (
      <g>
        <rect x="-14" y="-20" width="28" height="26" fill={wall} /><path d="M-17.5 -19 L0 -33 L17.5 -19Z" fill="#8e3b5f" /><rect x="7" y="-32" width="4" height="8" fill="#8d8a82" />
        <path d="M-14 -7 H14" stroke="#7a5232" strokeWidth="1.2" /><rect x="-3" y="-3" width="6" height="9" fill="#7a5232" />
        {[[-10.5, -16], [5.5, -16], [-10.5, -4], [5.5, -4]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="5" height="5" fill={win} />)}
      </g>
    );
  }
  if (stage === 4) {
    return (
      <g>
        <rect x="-26" y="-12" width="12" height="18" fill={wall} /><rect x="14" y="-12" width="12" height="18" fill={wall} />
        <path d="M-28 -11 L-20 -19 L-12 -11Z" fill="#2759a0" /><path d="M12 -11 L20 -19 L28 -11Z" fill="#2759a0" />
        <rect x="-14" y="-22" width="28" height="28" fill={wall} /><path d="M-17.5 -21 L0 -35 L17.5 -21Z" fill="#2759a0" />
        <rect x="-3.5" y="-5" width="7" height="11" rx="3.5" fill="#7a5232" />
        {[[-10.5, -18], [5.5, -18], [-10.5, -6], [5.5, -6], [-22.5, -7], [17.5, -7]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="5" height="5" fill={win} />)}
      </g>
    );
  }
  return (
    <g>
      <rect x="-24" y="-22" width="48" height="28" fill="#fbf8f0" /><rect x="-27" y="-25" width="54" height="4" fill="#e4bc63" /><path d="M-12 -25 L0 -34 L12 -25Z" fill="#fbf8f0" stroke="#e4bc63" strokeWidth="1" />
      {[-18, -10, 10, 18].map((x) => <rect key={x} x={x - 1.2} y="-21" width="2.4" height="27" fill="#e9e3d2" />)}
      <rect x="-4" y="-7" width="8" height="13" rx="4" fill="#7a5232" />
      {[[-16.5, -17], [11.5, -17], [-16.5, -6], [11.5, -6]].map(([x, y]) => <rect key={`${x}${y}`} x={x} y={y} width="5" height="6" fill={win} />)}
      <ellipse cx="36" cy="7" rx="11" ry="3.4" fill="#7fc4e8" stroke="#f6eedd" strokeWidth="1.2" />
      <path d="M-34 6 L-31 -14 L-28 6Z" fill="#2f6b3c" />
    </g>
  );
}

/** Village skyline in the hero's lobby. Decorative: the link over it and the chip beside it say what it is. */
function VillageScene({ daypart, growth, ownStage }: { daypart: Daypart; growth: VillageGrowth | null; ownStage: number | null }) {
  const sky = SKY[daypart];
  const lit = daypart === 'evening' || daypart === 'night';
  const roofs = ['#b5532c', '#2759a0', '#c9a14a', '#8e3b5f', '#29483c'];
  // Five village buildings plus the cottages that were earned.
  const count = 5 + (growth?.houses ?? 0);
  const houses = Array.from({ length: count }, (_, i) => {
    const big = i < 5;
    // To the right of the own home, on the slope above the greeting.
    const x = 198 + ((i * 29) % 98) + (i >= 5 ? 7 : 0);
    const y = big ? 66 + (i % 2) * 5 : 57 + (i % 3) * 4;
    return { x, y, s: big ? 1 : 0.7, roof: roofs[i % roofs.length], key: i };
  }).sort((a, b) => a.y - b.y);
  return (
    <svg viewBox="0 0 400 170" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="lobby-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky.top} />
          <stop offset="1" stopColor={sky.bottom} />
        </linearGradient>
      </defs>
      <rect width="400" height="170" fill="url(#lobby-sky)" />
      {daypart === 'night' ? (
        <>
          {Array.from({ length: 22 }, (_, i) => <circle key={i} cx={(i * 73) % 400} cy={8 + ((i * 37) % 60)} r={i % 3 ? 0.9 : 1.4} fill="#fff" opacity={0.75} className="hero-sparkle" style={{ animationDelay: `${(i % 7) * 0.5}s` }} />)}
          <circle cx="340" cy="30" r="14" fill="#f6efd6" />
          <circle cx="346" cy="26" r="12" fill={sky.top} />
        </>
      ) : (
        <circle cx={daypart === 'morning' ? 70 : daypart === 'evening' ? 330 : 300} cy={daypart === 'day' ? 28 : 44} r="18" fill={daypart === 'evening' ? '#ffb070' : '#ffe08a'} opacity="0.95" />
      )}
      {daypart !== 'night' && (
        <g fill="#fff" opacity="0.85" className="lobby-clouds">
          <ellipse cx="110" cy="34" rx="22" ry="8" /><ellipse cx="126" cy="30" rx="16" ry="9" />
          <ellipse cx="250" cy="22" rx="18" ry="6" /><ellipse cx="262" cy="19" rx="12" ry="7" />
        </g>
      )}
      <path d="M0 88 Q80 58 170 78 T400 70 V170 H0Z" fill={sky.hill2} />
      {/* The path from the village down to the front. */}
      <path d="M156 82 Q178 96 168 120 T186 170" fill="none" stroke="#e7d3a6" strokeWidth="7" strokeLinecap="round" opacity="0.85" />
      {growth?.windmill && (
        <g transform="translate(296 40)">
          <path d="M-6 30 L-4 0 H4 L6 30Z" fill="#f3ead8" />
          <path d="M-6 2 L0 -6 L6 2Z" fill="#b5532c" />
          <g className="lobby-blades" style={{ transformOrigin: '0px 0px' }}>
            {[0, 90, 180, 270].map((a) => <rect key={a} x="-1.5" y="-18" width="3" height="18" fill="#f6efe2" transform={`rotate(${a})`} />)}
          </g>
        </g>
      )}
      {growth?.lighthouse && (
        <g transform="translate(112 40)">
          <path d="M-5 40 L-3 6 H3 L5 40Z" fill="#f6efe2" /><rect x="-4" y="18" width="8" height="5" fill="#b5532c" />
          <circle cx="0" cy="3" r="3.5" fill="#ffe08a" className="hero-aura" /><path d="M-4 1 L0 -4 L4 1Z" fill="#b5532c" />
        </g>
      )}
      {houses.map((h) => (
        <g key={h.key} transform={`translate(${h.x} ${h.y}) scale(${h.s})`}>
          <ellipse cx="0" cy="6.5" rx="15" ry="2.6" fill="#000" opacity="0.12" />
          <rect x="5" y="-20" width="3.5" height="7" fill="#8d8a82" />
          <rect x="-11" y="-10" width="22" height="16" fill="#f6eedd" />
          <path d="M-14.5 -9 L0 -22 L14.5 -9Z" fill={h.roof} />
          <path d="M0 -22 L14.5 -9 H7Z" fill="#000" opacity="0.14" />
          <rect x="-3" y="-2" width="6" height="8" rx="3" fill="#8a6038" />
          <rect x="5" y="-7" width="4" height="4" fill={lit ? '#ffd36b' : '#cfe3ef'} />
          <rect x="-9" y="-7" width="4" height="4" fill={lit ? '#ffd36b' : '#cfe3ef'} />
        </g>
      ))}
      {Array.from({ length: growth?.pennants ?? 0 }, (_, i) => (
        <g key={i} transform={`translate(${204 + i * 15} 86)`}>
          <rect x="0" y="-16" width="1.5" height="16" fill="#8a6038" />
          <path d="M1.5 -16 L11 -13 L1.5 -10Z" fill={roofs[i % 4]} />
        </g>
      ))}
      {ownStage !== null && (
        <g transform="translate(152 76) scale(1.2)">
          <ellipse cx="0" cy="7" rx="22" ry="3.4" fill="#000" opacity="0.14" />
          <OwnHome stage={ownStage} lit={lit} />
          {/* The gold marker says: this one is yours. */}
          <path d="M-6 -47 H6 L0 -39Z" fill="#e4bc63" stroke="#6b4705" strokeWidth="1" strokeLinejoin="round" className="chest-bounce" />
        </g>
      )}
      <path d="M0 140 Q120 112 230 128 T400 120 V170 H0Z" fill={sky.hill} />
      {[30, 60, 360, 385].map((x, i) => (
        <g key={x} transform={`translate(${x + (i < 2 ? 60 : -40)} ${i < 2 ? 128 : 116})`}>
          <rect x="-1.5" y="-4" width="3" height="8" fill="#7a5232" />
          <path d="M-8 -3 L0 -20 L8 -3Z" fill={daypart === 'night' ? '#2c4a36' : '#4f8a4a'} />
        </g>
      ))}
    </svg>
  );
}

/** The lobby card at the top of "Vandaag". `subtitle` is the line about today's workouts. */
export function HomeLobby({ greeting, subtitle, date }: { greeting: string; subtitle?: React.ReactNode; date: string }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const q = useHero();
  const d = q.data;
  const growth = useGrowth(d);
  // Coming back from a workout: the hero cheers once and the lobby says what was earned.
  const location = useLocation();
  const navigate = useNavigate();
  const [welcome] = useState<{ xp: number } | null>(() => (location.state as { fromWorkout?: { xp: number } } | null)?.fromWorkout ?? null);
  useEffect(() => {
    if (welcome) navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const daypart = daypartOf(new Date().getHours());
  const light = SKY[daypart].text === 'light';
  const look = d?.hero ? { ...d.hero, gear: [...d.gear.equipped, ...(d.aids ?? [])], body: d.metrics ? bodyShape(d.metrics, d.hero.frame) : null, photo: d.customPhoto ?? null } : null;
  const L = d?.level;
  const tier = L ? levelTier(L.level) : null;
  return (
    <section aria-labelledby="lobby-greeting" className="relative overflow-hidden rounded-3xl border border-line shadow-card" data-daypart={daypart}>
      <div className="relative min-h-[300px]">
        <VillageScene daypart={daypart} growth={growth} ownStage={L ? homeStage(L.level) : null} />
        {/* The whole picture is the way into the village; the hero and the greeting keep their own links on top. */}
        <Link to="/p/dorp" data-testid="lobby-to-village" aria-label={t('Naar je dorp in 3D', 'To your village in 3D')} className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" />
        {L && (
          <Link to="/p/dorp" data-testid="lobby-home" className={cn('tap absolute right-2 top-2 flex min-h-[40px] items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-semibold shadow-card backdrop-blur-[2px]', light ? 'border-white/30 bg-[#17233f]/75 text-white' : 'border-white/70 bg-white/85 text-ink-950')}>
            <Home className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span className="leading-tight">
              <span className="block">{t('Jouw huis', 'Your home')} · {nl ? HOME_STAGES[homeStage(L.level)].nl : HOME_STAGES[homeStage(L.level)].en} · {t(`level ${L.level}`, `level ${L.level}`)}</span>
              {levelsToNextHome(L.level) !== null && <span className={cn('block text-[11px] font-normal', light ? 'text-white/85' : 'text-ink-700')}>{t(`nog ${levelsToNextHome(L.level)} tot een ${HOME_STAGES[homeStage(L.level) + 1].nl.toLowerCase()}`, `${levelsToNextHome(L.level)} to a ${HOME_STAGES[homeStage(L.level) + 1].en.toLowerCase()}`)}</span>}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        )}
        <div className="pointer-events-none relative flex min-h-[300px] items-end gap-2.5 p-3 pb-3 pt-10 [&_a]:pointer-events-auto">
          {look && L ? (
            <Link
              to="/p/held/uiterlijk"
              aria-label={t(`Uiterlijk en maten aanpassen, level ${L.level}`, `Edit look and measurements, level ${L.level}`)}
              className="tap relative shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <HeroStage level={L.level} className="block" cheer={!!welcome}>
                <HeroPhoto look={look} className="h-[144px] w-[96px] shadow-lift min-[400px]:h-[156px] min-[400px]:w-[104px]" />
              </HeroStage>
              <LevelBadge level={L.level} size={34} className="absolute -left-2 -top-2" />
            </Link>
          ) : null}
          <div className={cn('min-w-0 flex-1 rounded-2xl px-2.5 py-2 backdrop-blur-[2px]', light ? 'bg-[#17233f]/70' : 'bg-white/80')}>
            <p className={cn('text-[13.5px] font-medium', light ? 'text-white/85' : 'text-ink-700')}>{date}</p>
            <h1 id="lobby-greeting" className={cn('font-display text-[18px] font-bold leading-tight min-[400px]:text-[21px] sm:text-[24px]', light ? 'text-white' : 'text-ink-950')}>
              {greeting.includes(', ') ? <><span className="block whitespace-nowrap">{greeting.slice(0, greeting.indexOf(', ') + 1)}</span><span className="block [overflow-wrap:anywhere]">{greeting.slice(greeting.indexOf(', ') + 2)}</span></> : greeting}
            </h1>
            {d?.hero && L && tier && (
              <p className={cn('mt-1 text-[13px] font-semibold', light ? 'text-white/90' : 'text-ink-800')}>
                <Link to="/p/held" className="underline-offset-2 hover:underline">{d.hero.heroName}</Link> · {t(`Level ${L.level}`, `Level ${L.level}`)} ·{' '}
                <span className="rounded-full border bg-white px-1.5 py-0.5 text-[12px] text-[color:var(--c)] dark:text-[color:var(--cd)]" style={{ borderColor: tier.glow, '--c': tier.color, '--cd': tier.light } as React.CSSProperties}>{nl ? tier.nl : tier.en}</span>
              </p>
            )}
            {welcome ? (
              <p role="status" className="reward-in mt-1 text-[14px] font-semibold leading-snug" style={{ color: light ? '#f6e2a6' : '#855806' }}>
                {t(`Welkom terug in je dorp! +${welcome.xp} XP verdiend.`, `Welcome back to your village! +${welcome.xp} XP earned.`)}
              </p>
            ) : subtitle && <p className={cn('mt-1 text-[14px] leading-snug', light ? 'text-white/90' : 'text-ink-800')}>{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="bg-white px-4 pb-3 pt-2.5">
        {d?.hero && L ? (
          <>
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-semibold text-ink-900">{L.xp} XP · {titleFor(L.level, nl)}</span>
              <span className="text-ink-600">{t(`nog ${L.to - L.xp} XP tot level ${L.level + 1}`, `${L.to - L.xp} XP to level ${L.level + 1}`)}</span>
            </div>
            <XpBar xp={L.xp} compact className="mt-1" label={t(`Voortgang naar level ${L.level + 1}`, `Progress to level ${L.level + 1}`)} />
          </>
        ) : d && !d.hero ? (
          <Link to="/p/held/nieuw" className="flex min-h-[44px] items-center gap-2 text-[15px] font-semibold text-accent">
            <Sparkles className="h-5 w-5" aria-hidden />{t('Maak je sportheld en laat je dorp groeien', 'Create your sports hero and grow your village')}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

/** The village buildings as big tiles, each with a dot when something waits there. */
export function VillageTiles() {
  const { t } = useI18n();
  const q = useHero();
  const d = q.data;
  if (!d?.hero) return null;
  const questsOpen = d.weekly.quests.some((x) => !x.done);
  const tiles = [
    { key: 'board', to: '/p/held#weekly-title', label: t('Prikbord', 'Notice board'), hint: !d.checkin.today ? t('Dagcheck', 'Check-in') : t(`Quests ${d.weekly.quests.filter((x) => x.done).length}/${d.weekly.quests.length}`, `Quests ${d.weekly.quests.filter((x) => x.done).length}/${d.weekly.quests.length}`), sprite: [0, 0], dot: !d.checkin.today || questsOpen },
    { key: 'smithy', to: '/p/held/inventaris', label: t('Smederij', 'Smithy'), hint: d.chest?.available ? t('Dagkist klaar', 'Day chest ready') : t(`${d.gear.coins} muntjes`, `${d.gear.coins} coins`), sprite: [1, 0], dot: !!d.chest?.available },
    { key: 'arena', to: '/p/held#boss', label: t('Arena', 'Arena'), hint: d.weekly.boss ? (d.weekly.boss.defeated ? t('Baas verslagen', 'Boss defeated') : t('Baas van de week', 'Boss of the week')) : t('Geen baas', 'No boss'), sprite: [2, 0], dot: !!d.weekly.boss && !d.weekly.boss.defeated },
    { key: 'library', to: '/p/spieren?tab=quiz', label: t('Bibliotheek', 'Library'), hint: t('Quiz en atlas', 'Quiz and atlas'), sprite: [0, 1], dot: false },
    { key: 'guild', to: '/p/held/vrienden', label: t('Gildehal', 'Guild hall'), hint: t('Vrienden', 'Friends'), sprite: [1, 1], dot: false },
    { key: 'map', to: '/p/wereld', label: t('Wereldkaart', 'World map'), hint: t('Je route', 'Your route'), sprite: [2, 1], dot: false },
  ];
  return (
    <nav aria-label={t('Dorp', 'Village')}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="t-section">{t('Je dorp', 'Your village')}</h2>
        <Link to="/p/dorp" data-testid="walk-village-link" className="inline-flex min-h-[44px] items-center gap-1 text-[14.5px] font-semibold text-accent">{t('Loop rond in 3D', 'Walk around in 3D')}<span aria-hidden>→</span></Link>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {tiles.map((x) => (
          <li key={x.key}>
            <Link
              to={x.to}
              data-village-tile={x.key}
              className="tap group relative flex min-h-[176px] flex-col items-center justify-start overflow-hidden rounded-[20px] border border-[#dedfd7] bg-[#fffdfa] px-1.5 dark:border-line dark:bg-surface pb-2.5 pt-1 text-center shadow-card transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#a6b39b] hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {/* One optimized 20 KB atlas for all six illustrated buildings.
                  The art is decorative: the visible label/hint remains the link's accessible name. */}
              <span
                data-village-art={x.key}
                className="block aspect-square w-full max-w-[112px] shrink-0 rounded-xl bg-[#f9f1e8]"
                style={{
                  backgroundImage: "url('/village/fp-flow-village.webp')",
                  backgroundSize: '300% 200%',
                  backgroundPosition: `${x.sprite[0] * 50}% ${x.sprite[1] * 100}%`,
                  backgroundRepeat: 'no-repeat',
                }}
                aria-hidden="true"
              />
              <span className="mt-0.5 block max-w-full text-[13px] font-extrabold leading-tight text-ink-950 [overflow-wrap:anywhere] sm:text-[14px]">{x.label}</span>
              <span className="mt-1 block text-[11.5px] leading-[1.22] text-ink-700">{x.hint}</span>
              {x.key === 'smithy' && d.chest?.available && (
                <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#fff5db] text-[#855806] shadow-xs">
                  <Gift className="chest-bounce h-3.5 w-3.5" aria-hidden="true" />
                </span>
              )}
              {x.key === 'arena' && d.weekly.boss && !d.weekly.boss.defeated && (
                <span className="mt-1 block h-1.5 w-[70%] overflow-hidden rounded-full bg-[#fde8dc]" aria-hidden>
                  <span className="block h-full rounded-full bg-[#c2410c]" style={{ width: `${Math.max(4, 100 - (100 * d.weekly.boss.damage) / Math.max(1, d.weekly.boss.hp))}%` }} />
                </span>
              )}
              {x.dot && <span className="absolute right-2 top-2 h-3 w-3 rounded-full border-2 border-white bg-[#c2410c] shadow" aria-hidden />}
              {x.dot && <span className="sr-only">{t(', er wacht iets', ', something is waiting')}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
