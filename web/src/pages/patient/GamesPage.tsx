import { Suspense, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Play, RotateCcw, Star, Trophy } from 'lucide-react';
import { GAME_OF_DAY_BONUS, MINIGAMES, MINIGAME_REWARDED_PER_DAY, minigameByKey, minigameXp, starsFor, type Minigame, type MinigameKind } from '@shared/minigames';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Button, Spinner, useToast } from '@/components/ui';
import { GAME_COMPONENTS } from '@/components/games/registry';

type GameRow = { key: string; best: number; plays: number; rewardsLeft: number };
type GamesState = { games: GameRow[]; steps: { total: number; today: number }; gameOfDay?: string };
type RoundResult = GamesState & { score: number; stars: number; xp: number; newBest: boolean; best: number };

const KIND: Record<MinigameKind, [string, string]> = {
  move: ['Bewegen', 'Moving'],
  food: ['Voeding', 'Food'],
  mind: ['Hoofd en herstel', 'Mind and recovery'],
  daily: ['Elke dag', 'Every day'],
};

function Stars({ n, size = 'h-4 w-4' }: { n: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${n} / 3`}>
      {[0, 1, 2].map((i) => <Star key={i} aria-hidden className={cn(size, i < n ? 'fill-[#e4bc63] text-[#c9a14a]' : 'text-ink-300')} />)}
    </span>
  );
}

const useGames = () => useQuery({ queryKey: ['patient-minigames'], queryFn: () => api.get<GamesState>('/patient/hero/minigames') });

/** All the little games, by what they train, with the best score and the rewards left today. */
export function GamesPage() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const q = useGames();
  const row = (k: string) => q.data?.games.find((g) => g.key === k);
  return (
    <div className="space-y-5">
      <Link to="/p/held" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Je held', 'Your hero')}</Link>
      <header>
        <h1 className="t-page">{t('Spelletjes', 'Games')}</h1>
        <p className="mt-1 text-[15px] text-ink-600">{t(`Korte spelletjes die ook helpen bij je herstel. De eerste ${MINIGAME_REWARDED_PER_DAY} rondes van elk spel per dag geven XP voor je held.`, `Short games that also help your recovery. The first ${MINIGAME_REWARDED_PER_DAY} rounds of each game a day give XP for your hero.`)}</p>
      </header>
      {(() => {
        const today = minigameByKey(q.data?.gameOfDay);
        if (!today) return null;
        return (
          <Link to={`/p/spellen/${today.key}`} data-testid="game-of-day" className="flex items-center gap-3 rounded-2xl border border-[#e4bc63] bg-[linear-gradient(135deg,#fff8e6,#fff)] p-4 shadow-card">
            <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white text-[30px] shadow-xs">{today.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-bold uppercase tracking-wide text-[#8a5a00]">{t('Spel van de dag', 'Game of the day')} · ×{GAME_OF_DAY_BONUS} XP</span>
              <span className="block text-[17px] font-bold text-ink-950">{nl ? today.nl : today.en}</span>
              <span className="block text-[13px] text-ink-600">{nl ? today.aboutNl : today.aboutEn}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[#c9a14a]" aria-hidden />
          </Link>
        );
      })()}
      {(Object.keys(KIND) as MinigameKind[]).map((kind) => (
        <section key={kind} aria-labelledby={`games-${kind}`}>
          <h2 id={`games-${kind}`} className="t-section mb-2">{nl ? KIND[kind][0] : KIND[kind][1]}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {MINIGAMES.filter((g) => g.kind === kind).map((g) => {
              const r = row(g.key);
              return (
                <li key={g.key}>
                  <Link to={`/p/spellen/${g.key}`} data-testid={`game-${g.key}`} className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card hover:border-ink-300">
                    <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-canvas text-[26px]">{g.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15.5px] font-semibold text-ink-950">{nl ? g.nl : g.en}</span>
                      <span className="block text-[13px] leading-snug text-ink-600">{nl ? g.aboutNl : g.aboutEn}</span>
                      {r && r.plays > 0 && (
                        <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-700">
                          <Stars n={starsFor(g, r.best)} size="h-3.5 w-3.5" />
                          {t(`Beste: ${r.best}`, `Best: ${r.best}`)}
                        </span>
                      )}
                    </span>
                    {r && r.rewardsLeft > 0 && <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[11.5px] font-semibold text-accent">+XP ×{r.rewardsLeft}</span>}
                    <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />
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

/** One game: its start, the round itself, and the result (score, stars, XP). */
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
  const again = () => {
    setResult(null);
    setRound((n) => n + 1);
    setPhase('play');
  };

  return (
    <div className="space-y-4" data-testid="game-page" data-phase={phase}>
      <Link to="/p/spellen" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Spelletjes', 'Games')}</Link>
      <header className="flex items-center gap-3">
        <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-canvas text-[30px]">{game.icon}</span>
        <div className="min-w-0">
          <h1 className="t-page">{nl ? game.nl : game.en}</h1>
          <p className="text-[14.5px] text-ink-600">{nl ? game.aboutNl : game.aboutEn}</p>
        </div>
      </header>

      {phase === 'start' && (
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <StarGoals game={game} />
          {row && row.plays > 0 && <p className="mt-3 flex items-center gap-1.5 text-[14px] text-ink-700"><Trophy className="h-4 w-4 text-[#c9a14a]" aria-hidden />{t(`Je beste score: ${row.best} ${game.unitNl}`, `Your best score: ${row.best} ${game.unitEn}`)}</p>}
          <p className="mt-1 text-[13.5px] text-ink-600">{row?.rewardsLeft ? t(`Vandaag nog ${row.rewardsLeft} ${row.rewardsLeft === 1 ? 'ronde' : 'rondes'} met XP.`, `${row.rewardsLeft} more ${row.rewardsLeft === 1 ? 'round' : 'rounds'} with XP today.`) : row ? t('Vandaag geen XP meer voor dit spel, maar spelen voor je beste score kan altijd.', 'No more XP for this game today, but playing for your best score is always possible.') : null}</p>
          <Button size="xl" className="mt-4 w-full" data-testid="game-start" icon={<Play className="h-5 w-5" />} onClick={() => setPhase('play')}>{t('Start', 'Start')}</Button>
        </div>
      )}

      {phase === 'play' && (
        <div className="rounded-2xl border border-line bg-white p-3 shadow-card sm:p-4" data-testid="game-area">
          <Suspense fallback={<div className="grid min-h-[300px] place-items-center"><Spinner /></div>}>
            <Game key={round} onDone={(s) => void finish(s)} steps={q.data?.steps} />
          </Suspense>
        </div>
      )}

      {phase === 'done' && (
        <div className="rounded-2xl border border-line bg-white p-5 text-center shadow-card" data-testid="game-result">
          {saving || !result ? (
            saving ? <Spinner /> : <Button onClick={again} icon={<RotateCcw className="h-4 w-4" />}>{t('Opnieuw', 'Again')}</Button>
          ) : (
            <>
              <p className="t-label">{t('Je score', 'Your score')}</p>
              <p className="text-[44px] font-extrabold leading-tight text-ink-950" data-testid="game-score">{result.score}</p>
              <p className="text-[14px] text-ink-600">{nl ? game.unitNl : game.unitEn}</p>
              <div className="mt-2 flex justify-center"><Stars n={result.stars} size="h-8 w-8" /></div>
              {result.newBest && <p className="mt-2 text-[15px] font-semibold text-[#8a5a00]">{t('Nieuw record!', 'New record!')}</p>}
              {result.xp > 0 && q.data?.gameOfDay === game.key && <p className="mt-2 text-[13px] font-semibold text-[#8a5a00]">{t(`Spel van de dag: ×${GAME_OF_DAY_BONUS} XP`, `Game of the day: ×${GAME_OF_DAY_BONUS} XP`)}</p>}
              <p className="mt-2 text-[15px] font-semibold text-accent" data-testid="game-xp">{result.xp > 0 ? t(`+${result.xp} XP voor je held`, `+${result.xp} XP for your hero`) : t('Geen XP meer vandaag voor dit spel', 'No more XP today for this game')}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button size="lg" data-testid="game-again" icon={<RotateCcw className="h-4 w-4" />} onClick={again}>{t('Nog een keer', 'Play again')}</Button>
                <Link to="/p/spellen" className="inline-flex h-11 items-center justify-center rounded-lg border border-line bg-white px-5 text-[15px] font-semibold text-ink-900">{t('Andere spelletjes', 'Other games')}</Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StarGoals({ game }: { game: Minigame }) {
  const { t, locale } = useI18n();
  const unit = locale === 'nl' ? game.unitNl : game.unitEn;
  return (
    <div>
      <p className="text-[14.5px] font-semibold text-ink-900">{t('Sterren', 'Stars')}</p>
      <ul className="mt-1 space-y-0.5 text-[14px] text-ink-700">
        {game.stars.map((s, i) => (
          <li key={i} className="flex items-center gap-2"><Stars n={i + 1} size="h-3.5 w-3.5" /><span>{t(`vanaf ${s} ${unit}`, `from ${s} ${unit}`)} · +{minigameXp(i + 1)} XP</span></li>
        ))}
      </ul>
    </div>
  );
}
