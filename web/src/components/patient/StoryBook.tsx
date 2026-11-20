import { useQuery } from '@tanstack/react-query';
import { BookOpen, Check, Coins, MapPin, Sparkles } from 'lucide-react';
import { STORY, STORY_TITLE, type StoryGoal } from '@shared/story';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

type Text = { title: string; text: string; done: string };
export type StoryState = {
  step: number;
  total: number;
  finished: boolean;
  chapter: number;
  quest: { key: string; goal: StoryGoal; nl: Text; en: Text; have: number; need: number; reward: { xp: number; coins: number } } | null;
  justDone: { key: string; chapter: number; xp: number; coins: number; chapterDone: boolean }[];
};
export const STORY_QUERY = ['patient-story'] as const;
export const useStory = (enabled = true) => useQuery({ queryKey: STORY_QUERY, queryFn: () => api.get<StoryState>('/patient/hero/story'), enabled, staleTime: 30_000 });

/** The quest's text and its done-text, by key. */
export const questText = (key: string) => {
  for (const ch of STORY) for (const q of ch.quests) if (q.key === key) return q;
  return null;
};

/**
 * The story book: the chapter you are in, its opening, the quest that is open (what to do, how far,
 * what it gives) and the quests already done in this chapter. `onGo` walks the hero there.
 */
export function StoryBook({ story, onGo }: { story: StoryState; onGo: (goal: StoryGoal) => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const ch = STORY[story.chapter];
  const q = story.quest;
  const firstOfChapter = STORY.slice(0, story.chapter).reduce((n, c) => n + c.quests.length, 0);
  const doneHere = ch.quests.slice(0, Math.max(0, story.step - firstOfChapter));
  const L = (x: { nl: Text; en: Text }) => (nl ? x.nl : x.en);
  const canGo = q && q.goal.type !== 'level';
  return (
    <div className="space-y-4" data-testid="story-book" data-step={story.step}>
      <div className="rounded-2xl border border-[#e4bc63] bg-[linear-gradient(180deg,#2f4a3f,#1c2f28)] p-4 text-white">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-wide text-[#ffd76a]"><BookOpen className="h-4 w-4" aria-hidden />{nl ? STORY_TITLE.nl : STORY_TITLE.en}</p>
        <h3 className="mt-1 font-display text-[19px] font-bold">{nl ? ch.nl.title : ch.en.title}</h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-white/90">{story.finished ? (nl ? ch.nl.outro : ch.en.outro) : nl ? ch.nl.intro : ch.en.intro}</p>
        <div className="mt-3 flex items-center gap-2 text-[12.5px] text-white/75">
          <span className="relative block h-2 flex-1 overflow-hidden rounded-full bg-black/30" aria-hidden><span className="absolute inset-y-0 left-0 rounded-full bg-[#ffd76a]" style={{ width: `${Math.round((story.step / story.total) * 100)}%` }} /></span>
          <span className="tabular-nums">{t(`${story.step} van ${story.total} quests`, `${story.step} of ${story.total} quests`)}</span>
        </div>
      </div>

      {q ? (
        <section className="rounded-2xl border-2 border-[#e4bc63] bg-[#fbf0d9] p-4" aria-labelledby="story-quest" data-testid="story-quest" data-quest={q.key}>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#855806]">{t('Je quest', 'Your quest')}</p>
          <h4 id="story-quest" className="mt-0.5 text-[17px] font-semibold text-ink-950">{L(q).title}</h4>
          <p className="mt-1 text-[14.5px] leading-relaxed text-ink-800">{L(q).text}</p>
          {q.need > 1 && (
            <p className="mt-2 text-[13.5px] font-semibold text-[#6b4705]" data-testid="story-progress">{t(`${q.have} van ${q.need}`, `${q.have} of ${q.need}`)}</p>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-ink-700">
            <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-[#b8892a]" aria-hidden />+{q.reward.xp} {t('avonturen-XP', 'adventure XP')}</span>
            <span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-[#b8892a]" aria-hidden />+{q.reward.coins} {t('muntjes', 'coins')}</span>
          </p>
          {canGo && <Button className="mt-3" icon={<MapPin className="h-4 w-4" aria-hidden />} onClick={() => onGo(q.goal)} data-testid="story-go">{t('Breng me erheen', 'Take me there')}</Button>}
        </section>
      ) : (
        <p className="rounded-2xl border border-[#e4bc63] bg-[#fbf0d9] p-4 text-[15px] font-semibold text-ink-950">{t('Het verhaal is uit. De Bron stroomt weer, dankzij jou. 🌟', 'The story is done. The Spring flows again, thanks to you. 🌟')}</p>
      )}

      {doneHere.length > 0 && (
        <section aria-labelledby="story-done">
          <h4 id="story-done" className="text-[14px] font-semibold text-ink-950">{t('Al gedaan in dit hoofdstuk', 'Done in this chapter')}</h4>
          <ul className="mt-1.5 space-y-1.5">
            {doneHere.map((dq) => (
              <li key={dq.key} className={cn('flex items-start gap-2 rounded-xl border border-line bg-white p-2.5 text-[13.5px]')}>
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2f8a45]" aria-hidden />
                <span><strong className="text-ink-950">{L(dq).title}.</strong> <span className="text-ink-700">{L(dq).done}</span></span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
