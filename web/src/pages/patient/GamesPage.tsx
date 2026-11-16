import { Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Play, RotateCcw, Trophy } from 'lucide-react';
import { GAME_OF_DAY_BONUS, MINIGAMES, MINIGAME_REWARDED_PER_DAY, minigameByKey, minigameXp, starsFor, type Minigame, type MinigameKind } from '@shared/minigames';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Spinner, useToast } from '@/components/ui';
import { GAME_COMPONENTS } from '@/components/games/registry';
import { Confetti, CountUp, GAME_THEME, GOLD, GameButton, GoldStar, SoundToggle, Stage, haptic, sfx } from '@/components/games/kit';
import { inGameFrame } from '@/components/patient/GamePage';

type GameRow = { key: string; best: number; plays: number; rewardsLeft: number };
type GamesState = { games: GameRow[]; steps: { total: number; today: number }; gameOfDay?: string };
type RoundResult = GamesState & { score: number; stars: number; xp: number; newBest: boolean; best: number };

const KIND: Record<MinigameKind, [string, string]> = {
  move: ['Bewegen', 'Moving'],
  food: ['Voeding', 'Food'],
  mind: ['Hoofd en herstel', 'Mind and recovery'],
  daily: ['Elke dag', 'Every day'],
};

function Stars({ n, size = 16, className }: { n: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${n} / 3`}>
      {[0, 1, 2].map((i) => <GoldStar key={i} on={i < n} size={size} />)}
    </span>
  );
}

const useGames = () => useQuery({ queryKey: ['patient-minigames'], queryFn: () => api.get<GamesState>('/patient/hero/minigames') });

/** A glowing icon in a glass ring, in the game's colour. */
function GameIcon({ game, size = 56, float = false }: { game: Minigame; size?: number; float?: boolean }) {
  const th = GAME_THEME[game.key];
  return (
    <span
      aria-hidden
      className={cn('relative grid shrink-0 place-items-center rounded-full border border-white/20', float && 'game-float')}
      style={{ width: size, height: size, fontSize: size * 0.5, background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.28), ${th.glow}33 55%, rgba(0,0,0,.25))`, boxShadow: `0 0 ${size * 0.45}px ${th.glow}66, inset 0 1px 0 rgba(255,255,255,.35)` }}
    >
      {game.icon}
    </span>
  );
}

/** The Speelhal: all the little games as rich tiles, the game of the day on top, the stars collected. */
export function GamesPage() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const q = useGames();
  const row = (k: string) => q.data?.games.find((g) => g.key === k);
  const stars = MINIGAMES.reduce((sum, g) => sum + starsFor(g, row(g.key)?.best ?? 0), 0);
  const roundsLeft = (q.data?.games ?? []).reduce((sum, g) => sum + g.rewardsLeft, 0);
  const today = minigameByKey(q.data?.gameOfDay);
  return (
    <div className="space-y-5">
      {!inGameFrame() && <Link to="/p/held" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Je held', 'Your hero')}</Link>}

      {/* The banner: the hall's name in gold, and what there is to win today. */}
      <header className="relative isolate overflow-hidden rounded-[28px] p-5 text-white shadow-[0_24px_60px_-24px_rgba(0,0,0,.55)] ring-1 ring-black/5" style={{ background: 'radial-gradient(120% 120% at 0% 0%, #2c4a3c 0%, #14231d 55%, #070b09 100%)' }}>
        <div aria-hidden className="game-orb pointer-events-none absolute -right-10 -top-16 -z-10 h-48 w-48 rounded-full bg-[#f3cf6b] opacity-20 blur-3xl" />
        <div aria-hidden className="game-orb pointer-events-none absolute -bottom-20 left-10 -z-10 h-52 w-52 rounded-full bg-[#3fe0c5] opacity-[.12] blur-3xl [animation-delay:-5s]" />
        <p className="text-[11px] font-bold uppercase tracking-[.22em] text-white/55">{t('Speelhal', 'Games hall')}</p>
        <h1 className="mt-0.5 bg-clip-text text-[34px] font-black leading-tight text-transparent" style={{ backgroundImage: GOLD }}>{t('Spelletjes', 'Games')}</h1>
        <p className="mt-1 max-w-md text-[14.5px] leading-snug text-white/75">{t(`Korte spelletjes die ook helpen bij je herstel. De eerste ${MINIGAME_REWARDED_PER_DAY} rondes van elk spel per dag geven XP voor je held.`, `Short games that also help your recovery. The first ${MINIGAME_REWARDED_PER_DAY} rounds of each game a day give XP for your hero.`)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/[.06] px-3 py-2 backdrop-blur-md">
            <p className="text-[10.5px] font-semibold uppercase tracking-[.14em] text-white/55">{t('Sterren', 'Stars')}</p>
            <p className="flex items-center gap-1.5 text-[22px] font-extrabold tabular-nums"><GoldStar on size={20} />{stars}<span className="text-[14px] font-semibold text-white/50">/ {MINIGAMES.length * 3}</span></p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.06] px-3 py-2 backdrop-blur-md">
            <p className="text-[10.5px] font-semibold uppercase tracking-[.14em] text-white/55">{t('XP-rondes vandaag', 'XP rounds today')}</p>
            <p className="text-[22px] font-extrabold tabular-nums text-[#f3cf6b]">{roundsLeft}</p>
          </div>
        </div>
      </header>

      {today && (
        <Link to={`/p/spellen/${today.key}`} data-testid="game-of-day" className="game-rise relative isolate flex items-center gap-4 overflow-hidden rounded-[24px] p-4 text-white shadow-[0_18px_44px_-18px_rgba(0,0,0,.55)] ring-1 ring-[#f3cf6b]/60" style={{ background: `linear-gradient(135deg, ${GAME_THEME[today.key].to}, ${GAME_THEME[today.key].from})` }}>
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-60" style={{ background: `radial-gradient(80% 120% at 100% 0%, ${GAME_THEME[today.key].glow}55, transparent 60%)` }} />
          <GameIcon game={today} size={64} float />
          <span className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-[.12em] text-[#2b1d03]" style={{ background: GOLD }}>{t('Spel van de dag', 'Game of the day')} · ×{GAME_OF_DAY_BONUS} XP</span>
            <span className="mt-1 block text-[19px] font-extrabold">{nl ? today.nl : today.en}</span>
            <span className="block text-[13px] leading-snug text-white/75">{nl ? today.aboutNl : today.aboutEn}</span>
          </span>
        </Link>
      )}

      {(Object.keys(KIND) as MinigameKind[]).map((kind) => (
        <section key={kind} aria-labelledby={`games-${kind}`}>
          <h2 id={`games-${kind}`} className="mb-2 text-[12px] font-bold uppercase tracking-[.18em] text-ink-600">{nl ? KIND[kind][0] : KIND[kind][1]}</h2>
          <ul className="grid grid-cols-2 gap-2.5">
            {MINIGAMES.filter((g) => g.kind === kind).map((g) => {
              const r = row(g.key);
              const th = GAME_THEME[g.key];
              return (
                <li key={g.key}>
                  <Link
                    to={`/p/spellen/${g.key}`}
                    data-testid={`game-${g.key}`}
                    className="group relative isolate flex h-full min-h-[168px] flex-col overflow-hidden rounded-[22px] p-3.5 text-white shadow-[0_14px_34px_-16px_rgba(0,0,0,.6)] ring-1 ring-white/10 transition-transform duration-200 active:scale-[.98]"
                    style={{ background: `radial-gradient(120% 100% at 50% 0%, ${th.to}, ${th.from} 70%, #05070a)` }}
                  >
                    <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 -z-10 h-28 w-28 rounded-full blur-2xl transition-opacity group-hover:opacity-90" style={{ background: th.glow, opacity: 0.35 }} />
                    <div className="flex items-start justify-between">
                      <GameIcon game={g} size={50} />
                      {r && r.rewardsLeft > 0 && <span className="rounded-full px-2 py-0.5 text-[11px] font-black text-[#2b1d03]" style={{ background: GOLD }}>+XP ×{r.rewardsLeft}</span>}
                    </div>
                    <span className="mt-2.5 block text-[15.5px] font-extrabold leading-tight">{nl ? g.nl : g.en}</span>
                    <span className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-white/65">{nl ? g.aboutNl : g.aboutEn}</span>
                    <span className="mt-auto flex items-center justify-between pt-2">
                      <Stars n={starsFor(g, r?.best ?? 0)} size={15} />
                      {r && r.plays > 0 && <span className="text-[11.5px] font-semibold tabular-nums text-white/70">{t(`Beste ${r.best}`, `Best ${r.best}`)}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** One game: the splash with its goals, the round itself, and the celebration (score, stars, XP). */
export function GamePlayPage() {
  const { game: key } = useParams();
  const game = minigameByKey(key);
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const q = useGames();
  const qc = useQueryClient();
  const toast = useToast();
  const [phase, setPhase] = useState<'start' | 'play' | 'done'>('start');
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [saving, setSaving] = useState(false);
  if (!game) return <p className="text-[15px]">{t('Dit spelletje bestaat niet.', 'This game does not exist.')} <Link className="underline" to="/p/spellen">{t('Naar de spelletjes', 'To the games')}</Link></p>;
  const Game = GAME_COMPONENTS[game.key];
  const row = q.data?.games.find((g) => g.key === game.key);
  const isToday = q.data?.gameOfDay === game.key;

  const finish = async (score: number) => {
    setPhase('done');
    setSaving(true);
    try {
      const r = await api.post<RoundResult>(`/patient/hero/minigames/${game.key}`, { score: Math.max(0, Math.round(score)) });
      setResult(r);
      qc.setQueryData(['patient-minigames'], { games: r.games, steps: r.steps, gameOfDay: r.gameOfDay });
      void qc.invalidateQueries({ queryKey: ['patient-adventure'] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
      setResult(null);
    } finally {
      setSaving(false);
    }
  };
  const play = () => {
    sfx.start();
    haptic(15);
    setResult(null);
    setRound((n) => n + 1);
    setPhase('play');
  };

  return (
    <div className="space-y-4" data-testid="minigame-page" data-phase={phase}>
      <div className="flex items-center justify-between gap-2">
        <Link to="/p/spellen" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Speelhal', 'Games hall')}</Link>
        <span className="rounded-full bg-[#14231d] p-0.5"><SoundToggle labelOn={t('Geluid aan', 'Sound on')} labelOff={t('Geluid uit', 'Sound off')} /></span>
      </div>

      {phase === 'start' && (
        <Stage game={game.key} className="text-center">
          <div className="flex flex-col items-center px-2 pb-2 pt-4">
            <GameIcon game={game} size={104} float />
            {isToday && <span className="mt-4 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-[.14em] text-[#2b1d03]" style={{ background: GOLD }}>{t('Spel van de dag', 'Game of the day')} · ×{GAME_OF_DAY_BONUS} XP</span>}
            <h1 className="mt-3 text-[30px] font-black leading-tight text-white">{nl ? game.nl : game.en}</h1>
            <p className="mt-1 max-w-sm text-[15px] leading-snug text-white/75">{nl ? game.aboutNl : game.aboutEn}</p>
            <ul className="mt-5 w-full max-w-xs space-y-1.5">
              {game.stars.map((s, i) => (
                <li key={i} className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[.06] px-3 py-2 text-left backdrop-blur-md">
                  <Stars n={i + 1} size={16} className="shrink-0" />
                  <span className="min-w-0 flex-1 text-[13px] font-semibold leading-tight text-white/85">{t(`vanaf ${s} ${game.unitNl}`, `from ${s} ${game.unitEn}`)}</span>
                  <span className="shrink-0 text-[13px] font-extrabold text-[#f3cf6b]">+{minigameXp(i + 1) * (isToday ? GAME_OF_DAY_BONUS : 1)}</span>
                </li>
              ))}
            </ul>
            {row && row.plays > 0 && <p className="mt-4 flex items-center gap-1.5 text-[14px] font-semibold text-white/85"><Trophy className="h-4 w-4 text-[#f3cf6b]" aria-hidden />{t(`Je record: ${row.best} ${game.unitNl}`, `Your record: ${row.best} ${game.unitEn}`)}</p>}
            <p className="mt-1 text-[13px] text-white/60">{row?.rewardsLeft ? t(`Vandaag nog ${row.rewardsLeft} ${row.rewardsLeft === 1 ? 'ronde' : 'rondes'} met XP`, `${row.rewardsLeft} more ${row.rewardsLeft === 1 ? 'round' : 'rounds'} with XP today`) : row ? t('Vandaag geen XP meer voor dit spel, maar je record verbeteren kan altijd.', 'No more XP for this game today, but beating your record is always possible.') : null}</p>
            <GameButton data-testid="game-start" className="mt-5 w-full max-w-xs text-[18px]" onClick={play}><Play className="h-5 w-5" aria-hidden />{t('Spelen', 'Play')}</GameButton>
          </div>
        </Stage>
      )}

      {phase === 'play' && (
        <div data-testid="game-area">
          <Suspense fallback={<Stage game={game.key}><div className="grid min-h-[320px] place-items-center"><Spinner /></div></Stage>}>
            <Game key={round} onDone={(s) => void finish(s)} steps={q.data?.steps} />
          </Suspense>
        </div>
      )}

      {phase === 'done' && (
        <Stage game={game.key} className="text-center" testId="game-result">
          {saving || !result ? (
            <div className="grid min-h-[320px] place-items-center">{saving ? <Spinner /> : <GameButton onClick={play}><RotateCcw className="h-4 w-4" aria-hidden />{t('Opnieuw', 'Again')}</GameButton>}</div>
          ) : (
            <Celebration game={game} result={result} isToday={isToday} onAgain={play} />
          )}
        </Stage>
      )}
    </div>
  );
}

/** The end of a round: the score counts up, the stars fly in one by one, confetti for a good round. */
function Celebration({ game, result, isToday, onAgain }: { game: Minigame; result: RoundResult; isToday: boolean; onAgain: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const th = GAME_THEME[game.key];
  const great = result.stars >= 2 || result.newBest;
  useEffect(() => {
    const timers = [0, 1, 2].filter((i) => i < result.stars).map((i) => window.setTimeout(() => { sfx.star(i); haptic(10); }, 450 + i * 280));
    if (great) timers.push(window.setTimeout(() => sfx.win(), 450 + result.stars * 280));
    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [result.stars, great]);
  return (
    <div className="relative px-2 pb-2 pt-4">
      <Confetti fire={great} colors={['#f3cf6b', '#fff1c2', th.glow, th.soft, '#ffffff']} />
      <p className="text-[11px] font-bold uppercase tracking-[.22em] text-white/55">{t('Je score', 'Your score')}</p>
      <p className="mt-1 bg-clip-text text-[68px] font-black leading-none text-transparent tabular-nums" style={{ backgroundImage: GOLD }}>
        <CountUp value={result.score} testId="game-score" />
      </p>
      <p className="mt-1 text-[14px] font-semibold text-white/70">{nl ? game.unitNl : game.unitEn}</p>
      <div className="mt-4 flex justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < result.stars ? 'game-star-in' : 'game-pop'} style={{ animationDelay: `${0.35 + i * 0.28}s` }}>
            <GoldStar on={i < result.stars} size={i === 1 ? 64 : 52} />
          </span>
        ))}
      </div>
      {result.newBest && <p className="game-pop mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-black uppercase tracking-[.12em] text-[#2b1d03]" style={{ background: GOLD, animationDelay: '1.3s' }}><Trophy className="h-4 w-4" aria-hidden />{t('Nieuw record', 'New record')}</p>}
      <p className="mt-4 text-[17px] font-extrabold" style={{ color: result.xp > 0 ? th.soft : 'rgba(255,255,255,.6)' }} data-testid="game-xp">
        {result.xp > 0 ? t(`+${result.xp} XP voor je held`, `+${result.xp} XP for your hero`) : t('Geen XP meer vandaag voor dit spel', 'No more XP today for this game')}
      </p>
      {result.xp > 0 && isToday && <p className="text-[12.5px] font-semibold text-[#f3cf6b]">{t(`Spel van de dag: ×${GAME_OF_DAY_BONUS}`, `Game of the day: ×${GAME_OF_DAY_BONUS}`)}</p>}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <GameButton data-testid="game-again" onClick={onAgain}><RotateCcw className="h-4 w-4" aria-hidden />{t('Nog een keer', 'Play again')}</GameButton>
        <Link to="/p/spellen" className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-white/15 bg-white/[.08] px-6 text-[16px] font-extrabold text-white backdrop-blur-md hover:bg-white/[.13]">{t('Andere spelletjes', 'Other games')}</Link>
      </div>
    </div>
  );
}
