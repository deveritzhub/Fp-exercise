import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Award, CalendarCheck, Check, ChevronRight, CircleCheck, Dumbbell, Flag, HeartPulse, Hourglass, Lock, MapPin, Move, PersonStanding, Shield, Sparkles, Target, Gift, Crown, Trophy, Zap, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/cn';
import { Button, Card, Dialog, ErrorState, Input, Notice, ProgressBar, Spinner, useToast } from '@/components/ui';
import { HeroAvatar, SPORT_ICON } from '@/components/hero/HeroAvatar';
import { EYE_COLOURS, HAIR_COLOURS, HumanFigure, KIT, SKIN_TONES } from '@/components/hero/HumanFigure';
import { BodyMap, painWord, type PainEntries } from '@/components/hero/BodyMap';
import { BADGES, BODY_AREAS, CHECKIN_XP, DEFAULT_LOOK, GEAR, HERO_OPTIONS, SKILLS, XP, titleFor, type HeroLook, type SkillKey } from '@shared/hero';
import type { HeroState } from '@/lib/types';
import { PainTrendList } from '@/components/hero/PainTrend';
import { FriendsCard } from './FriendsPage';

export const HERO_LATER_KEY = 'fp.heroLater';
export const useHero = () => useQuery({ queryKey: ['patient-hero'], queryFn: () => api.get<HeroState>('/patient/hero') });

const SPORTS: Record<string, [string, string]> = {
  running: ['Hardlopen', 'Running'], football: ['Voetbal', 'Football'], fitness: ['Fitness', 'Fitness'], cycling: ['Fietsen', 'Cycling'],
  tennis: ['Tennis / padel', 'Tennis / padel'], swimming: ['Zwemmen', 'Swimming'], hockey: ['Hockey', 'Hockey'], dance: ['Dansen', 'Dance'],
  walking: ['Wandelen', 'Walking'], other: ['Iets anders', 'Something else'],
};
const LABELS: Record<string, Record<string, [string, string]>> = {
  frame: { f: ['Vrouwelijk figuur', 'Feminine figure'], m: ['Mannelijk figuur', 'Masculine figure'] },
  build: { slim: ['Slank', 'Slim'], average: ['Gemiddeld', 'Average'], athletic: ['Sportief', 'Athletic'], full: ['Vol', 'Full'] },
  hair: { short: ['Kort', 'Short'], long: ['Lang', 'Long'], ponytail: ['Staart', 'Ponytail'], bun: ['Knot', 'Bun'], curly: ['Krullen', 'Curly'], afro: ['Afro', 'Afro'], buzz: ['Heel kort', 'Buzz cut'], none: ['Kaal', 'Bald'] },
  hairColor: { black: ['Zwart', 'Black'], darkbrown: ['Donkerbruin', 'Dark brown'], brown: ['Bruin', 'Brown'], blond: ['Blond', 'Blond'], red: ['Rood', 'Red'], grey: ['Grijs', 'Grey'] },
  eyeColor: { brown: ['Bruin', 'Brown'], darkbrown: ['Donkerbruin', 'Dark brown'], blue: ['Blauw', 'Blue'], green: ['Groen', 'Green'], hazel: ['Hazelaar', 'Hazel'], grey: ['Grijs', 'Grey'] },
  beard: { none: ['Geen', 'None'], stubble: ['Stoppels', 'Stubble'], moustache: ['Snor', 'Moustache'], beard: ['Baard', 'Beard'] },
  glasses: { none: ['Geen bril', 'No glasses'], round: ['Ronde bril', 'Round glasses'], square: ['Rechthoekige bril', 'Square glasses'] },
  outfit: { forest: ['Bosgroen', 'Forest'], sand: ['Zand', 'Sand'], ocean: ['Oceaan', 'Ocean'], berry: ['Bes', 'Berry'], slate: ['Leisteen', 'Slate'], sun: ['Zon', 'Sun'] },
};
type Opt<K extends keyof typeof HERO_OPTIONS> = (typeof HERO_OPTIONS)[K][number];

/** A row of radio choices (real radio buttons: keyboard and screen reader friendly). */
function Choice<T extends string>({ legend, name, value, options, onChange, render, cols = 'grid-cols-3' }: { legend: string; name: string; value: T; options: readonly T[]; onChange: (v: T) => void; render: (v: T, checked: boolean) => React.ReactNode; cols?: string }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[15px] font-semibold text-ink-900">{legend}</legend>
      <div className={cn('grid gap-2', cols)}>
        {options.map((o) => (
          <label key={o} className={cn('tap relative flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-xl border bg-white p-2 text-center text-[14px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent', value === o ? 'border-accent bg-accent-soft font-semibold text-accent' : 'border-line text-ink-700 hover:border-ink-300')}>
            {/* The radio covers the whole card: tapped anywhere, still a native radio for keyboard and screen readers. */}
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
            {render(o, value === o)}
            {value === o && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" aria-hidden />}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** First visit (or "Uiterlijk aanpassen"): build the sports hero step by step, then mark where it hurts. */
export function HeroSetupPage({ edit = false }: { edit?: boolean }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const L = (k: string, v: string) => LABELS[k][v][nl ? 0 : 1];
  useDocumentMeta(edit ? t('Uiterlijk aanpassen', 'Change look') : t('Maak je sportheld', 'Create your sports hero'));
  const { user } = useSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useHero();
  const [step, setStep] = useState(1);
  const [look, setLook] = useState<HeroLook>({ heroName: '', ...DEFAULT_LOOK });
  const [pain, setPain] = useState<PainEntries>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data?.hero) {
      const { createdAt: _c, ...h } = q.data.hero;
      setLook(h);
    } else if (user && !look.heroName) setLook((l) => ({ ...l, heroName: user.fullName.split(' ')[0] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, user]);
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner />;
  const steps = edit ? 4 : 5;
  const set = <K extends keyof HeroLook>(k: K, v: HeroLook[K]) => setLook((l) => ({ ...l, [k]: v }));
  const swatch = (bg: string) => <span className="h-7 w-7 shrink-0 rounded-full border border-ink-200 shadow-xs" style={{ background: bg }} aria-hidden />;

  const finish = async (withPain: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await api.put('/patient/hero', look);
      if (!edit) await api.post('/patient/hero/pain-map', { entries: withPain ? Object.entries(pain).map(([area, score]) => ({ area, score })) : [] });
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
      toast(edit ? t('Je sportheld is bijgewerkt', 'Your sports hero is updated') : t('Je sportheld is klaar!', 'Your sports hero is ready!'));
      nav('/p/held');
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  const nextBack = (next: () => void, nextLabel = t('Volgende', 'Next'), loading = false) => (
    <div className="grid grid-cols-2 gap-2">
      <Button size="xl" variant="secondary" onClick={() => setStep(step - 1)}>{t('Vorige', 'Back')}</Button>
      <Button size="xl" loading={loading} onClick={next}>{nextLabel}</Button>
    </div>
  );
  const titles: Record<number, [string, string]> = {
    1: [edit ? 'Uiterlijk aanpassen' : 'Maak je sportheld', edit ? 'Change look' : 'Create your sports hero'],
    2: ['Je lichaam', 'Your body'],
    3: ['Gezicht en haar', 'Face and hair'],
    4: ['Je tenue', 'Your kit'],
    5: ['Waar heb je pijn?', 'Where does it hurt?'],
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to={edit ? '/p/held' : '/p'} onClick={() => { if (!edit) { try { sessionStorage.setItem(HERO_LATER_KEY, '1'); } catch { /* storage unavailable */ } } }} className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700">
          {edit ? <><ArrowLeft className="h-4 w-4" aria-hidden />{t('Terug', 'Back')}</> : t('Later', 'Later')}
        </Link>
        <span className="text-[14px] text-ink-600">{t(`Stap ${step} van ${steps}`, `Step ${step} of ${steps}`)}</span>
      </div>

      <div className="text-center">
        <h1 className="t-page">{titles[step][nl ? 0 : 1]}</h1>
        <p className="mx-auto mt-1 max-w-sm text-[15px] text-ink-600">
          {step === 1 && t('Jij bent de held van je eigen herstel. Maak een sportheld die op jou lijkt: elke training levert XP op.', 'You are the hero of your own recovery. Make a sports hero who looks like you: every workout earns XP.')}
          {step === 5 && t('Tik op je held waar je pijn hebt en geef aan hoeveel. Zo zie je straks hoe je herstelt, en je fysiotherapeut ziet het ook.', 'Tap your hero where it hurts and say how much. Later you see how you recover, and your physiotherapist sees it too.')}
        </p>
      </div>

      {error && <Notice tone="bad">{error}</Notice>}

      {step >= 2 && step <= 4 && (
        <div className="flex justify-center rounded-2xl bg-sage/60 py-3" role="img" aria-label={t(`Voorbeeld van ${look.heroName || 'je held'}`, `Preview of ${look.heroName || 'your hero'}`)}>
          <HumanFigure look={look} className="h-[300px] w-auto" />
        </div>
      )}

      {step === 1 && (
        <Card className="space-y-5 p-5">
          <div className="flex justify-center"><HeroAvatar look={look} size={112} level={1} /></div>
          <Input label={t('Naam van je held', 'Name of your hero')} value={look.heroName} maxLength={40} onChange={(e) => set('heroName', e.target.value)} />
          <Choice legend={t('Jouw sport', 'Your sport')} name="sport" cols="grid-cols-2" value={look.sport as Opt<'sport'>} options={HERO_OPTIONS.sport} onChange={(v) => set('sport', v)}
            render={(v) => { const Icon = SPORT_ICON[v]; return <><Icon className="h-4 w-4 shrink-0" aria-hidden />{SPORTS[v][nl ? 0 : 1]}</>; }} />
          <Button size="xl" className="w-full" disabled={!look.heroName.trim()} onClick={() => setStep(2)}>{t('Volgende', 'Next')}</Button>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-5 p-5">
          <Choice legend={t('Figuur', 'Figure')} name="frame" cols="grid-cols-2" value={look.frame as Opt<'frame'>} options={HERO_OPTIONS.frame} onChange={(v) => set('frame', v)} render={(v) => L('frame', v)} />
          <Choice legend={t('Bouw', 'Build')} name="build" cols="grid-cols-2" value={look.build as Opt<'build'>} options={HERO_OPTIONS.build} onChange={(v) => set('build', v)} render={(v) => L('build', v)} />
          <Choice legend={t('Huidskleur', 'Skin tone')} name="skin" cols="grid-cols-5" value={look.skin as Opt<'skin'>} options={HERO_OPTIONS.skin} onChange={(v) => set('skin', v)}
            render={(v) => <>{swatch(SKIN_TONES[v])}<span className="sr-only">{t(`Huidskleur ${v.slice(1)} van 10`, `Skin tone ${v.slice(1)} of 10`)}</span></>} />
          {nextBack(() => setStep(3))}
        </Card>
      )}

      {step === 3 && (
        <Card className="space-y-5 p-5">
          <Choice legend={t('Kapsel', 'Hairstyle')} name="hair" cols="grid-cols-4" value={look.hair as Opt<'hair'>} options={HERO_OPTIONS.hair} onChange={(v) => set('hair', v)}
            render={(v) => <span className="flex flex-col items-center gap-1 text-[12.5px] leading-tight"><HeroAvatar look={{ ...look, hair: v }} size={44} plain />{L('hair', v)}</span>} />
          <Choice legend={t('Haarkleur', 'Hair colour')} name="hairColor" cols="grid-cols-2" value={look.hairColor as Opt<'hairColor'>} options={HERO_OPTIONS.hairColor} onChange={(v) => set('hairColor', v)}
            render={(v) => <>{swatch(HAIR_COLOURS[v])}<span className="text-[13px]">{L('hairColor', v)}</span></>} />
          <Choice legend={t('Oogkleur', 'Eye colour')} name="eyeColor" cols="grid-cols-2" value={look.eyeColor as Opt<'eyeColor'>} options={HERO_OPTIONS.eyeColor} onChange={(v) => set('eyeColor', v)}
            render={(v) => <>{swatch(EYE_COLOURS[v])}<span className="text-[13px]">{L('eyeColor', v)}</span></>} />
          <Choice legend={t('Baard', 'Beard')} name="beard" cols="grid-cols-2" value={look.beard as Opt<'beard'>} options={HERO_OPTIONS.beard} onChange={(v) => set('beard', v)} render={(v) => L('beard', v)} />
          <Choice legend={t('Bril', 'Glasses')} name="glasses" cols="grid-cols-1 min-[400px]:grid-cols-3" value={look.glasses as Opt<'glasses'>} options={HERO_OPTIONS.glasses} onChange={(v) => set('glasses', v)} render={(v) => <span className="text-[13px]">{L('glasses', v)}</span>} />
          {nextBack(() => setStep(4))}
        </Card>
      )}

      {step === 4 && (
        <Card className="space-y-5 p-5">
          <Choice legend={t('Kleur van je tenue', 'Colour of your kit')} name="outfit" cols="grid-cols-2" value={look.outfit as Opt<'outfit'>} options={HERO_OPTIONS.outfit} onChange={(v) => set('outfit', v)}
            render={(v) => <>{swatch(KIT[v].main)}<span className="text-[13px]">{L('outfit', v)}</span></>} />
          {edit ? nextBack(() => finish(false), t('Opslaan', 'Save'), busy) : nextBack(() => setStep(5))}
        </Card>
      )}

      {step === 5 && (
        <Card className="space-y-4 p-5">
          <BodyMap entries={pain} onChange={setPain} look={look} />
          <p className="text-center text-[13.5px] text-ink-600">
            {Object.keys(pain).length
              ? t(`${Object.keys(pain).length} ${Object.keys(pain).length === 1 ? 'plek' : 'plekken'} aangegeven`, `${Object.keys(pain).length} area(s) marked`)
              : t('Nog niets aangegeven.', 'Nothing marked yet.')}
          </p>
          <div className="grid gap-2">
            <Button size="xl" loading={busy} disabled={!Object.keys(pain).length} onClick={() => finish(true)}>{t('Klaar: start mijn avontuur', 'Done: start my journey')}</Button>
            <Button size="lg" variant="ghost" disabled={busy} onClick={() => finish(false)}>{t('Ik heb nergens pijn', 'I have no pain anywhere')}</Button>
            <Button size="lg" variant="ghost" disabled={busy} onClick={() => setStep(4)}>{t('Vorige', 'Back')}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

const SKILL_ICON: Record<SkillKey, LucideIcon> = {
  strength: Dumbbell, mobility: Move, balance: PersonStanding, stability: Shield, power: Zap,
  endurance: HeartPulse, sport: Trophy, discipline: CalendarCheck, recovery: Sparkles,
};

/** RuneScape-style skills: every skill levels from 1 to 99 on its own. */
function Skills({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [open, setOpen] = useState<SkillKey | null>(null);
  const sel = d.skills.find((k) => k.key === open);
  const info = SKILLS.find((k) => k.key === open);
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="skills-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="skills-title" className="t-section">{t('Skills', 'Skills')}</h2>
        <span className="text-[14px] text-ink-600">{t('Totaal level', 'Total level')} <strong className="font-display text-[18px] tabular-nums text-ink-950">{d.totalLevel}</strong></span>
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {d.skills.map((k) => {
          const Icon = SKILL_ICON[k.key];
          const meta = SKILLS.find((x) => x.key === k.key)!;
          return (
            <li key={k.key}>
              <button
                type="button"
                onClick={() => setOpen(k.key)}
                className="tap flex min-h-[96px] w-full flex-col items-center justify-center gap-1 rounded-xl border border-line bg-canvas p-2 text-center hover:border-ink-300"
              >
                <Icon className="h-5 w-5 text-accent" aria-hidden />
                <span className="w-full break-words text-[12.5px] font-medium leading-tight text-ink-700">{nl ? meta.nl : meta.en}</span>
                <span className="font-display text-[20px] font-bold leading-none tabular-nums text-ink-950"><span className="sr-only">level </span>{k.level}<span className="text-[12px] font-medium text-ink-500">/99</span></span>
                <span className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100" aria-hidden><span className="block h-full rounded-full bg-accent" style={{ width: `${k.progress * 100}%` }} /></span>
              </button>
            </li>
          );
        })}
      </ul>
      <Dialog open={!!sel} onClose={() => setOpen(null)} size="sm" title={sel && info ? `${nl ? info.nl : info.en} · level ${sel.level}` : ''}
        footer={<Button onClick={() => setOpen(null)}>{t('Sluiten', 'Close')}</Button>}>
        {sel && info && (
          <div className="space-y-3 text-[15px]">
            <p className="text-ink-700">{t('Zo train je deze skill:', 'How to train this skill:')} {nl ? info.howNl : info.howEn}</p>
            <div>
              <div className="flex justify-between text-[14px]"><span>{sel.xp} XP</span><span className="text-ink-600">{sel.level < 99 ? t(`nog ${sel.to - sel.xp} XP tot level ${sel.level + 1}`, `${sel.to - sel.xp} XP to level ${sel.level + 1}`) : t('Maximaal level!', 'Maximum level!')}</span></div>
              <ProgressBar value={sel.progress} className="mt-1.5 h-2.5" label={t('Voortgang naar het volgende level', 'Progress to the next level')} />
            </div>
          </div>
        )}
      </Dialog>
    </section>
  );
}

/** The main quest: the goal, the route (phases), how far the patient has come and the expected time to the goal. */
function Quest({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const q = d.quest;
  const fmt = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const days = d.totals.since ? Math.max(1, Math.round((Date.now() - new Date(d.totals.since).getTime()) / 86400_000)) : null;
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="quest-title">
      <p className="t-label flex items-center gap-1.5"><Flag className="h-4 w-4" aria-hidden />{t('Hoofdquest', 'Main quest')}</p>
      {!q ? (
        <>
          <h2 id="quest-title" className="t-section mt-1">{t('Nog geen quest', 'No quest yet')}</h2>
          <p className="mt-1 text-[15px] text-ink-600">{t('Zodra je fysiotherapeut een programma voor je klaarzet, zie je hier je doel en de weg ernaartoe.', 'As soon as your physiotherapist sets up a programme for you, you see your goal and the road to it here.')}</p>
        </>
      ) : (
        <>
          <h2 id="quest-title" className="t-section mt-1">{q.title}</h2>
          {q.goal && <p className="mt-1 text-[15px] text-ink-800"><strong>{t('Doel', 'Goal')}:</strong> {q.goal}</p>}
          {q.timeline ? (
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-[14px]">
                <span className="font-semibold text-ink-900">{t(`Week ${q.timeline.week} van ${q.timeline.totalWeeks}`, `Week ${q.timeline.week} of ${q.timeline.totalWeeks}`)}</span>
                <span className="tabular-nums text-ink-600">{t(`${Math.round(q.timeline.progress * 100)}% onderweg`, `${Math.round(q.timeline.progress * 100)}% of the way`)}</span>
              </div>
              <ProgressBar value={q.timeline.progress} className="mt-1.5 h-3" label={t('Voortgang naar je doel', 'Progress to your goal')} />
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-sand-soft px-3 py-2.5 text-[14.5px] text-ink-800">
                <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-sand-ink" aria-hidden />
                <span>
                  {q.timeline.weeksLeft > 0
                    ? t(`Volgens het schema bereik je je doel rond ${fmt(q.timeline.expectedEnd)}: nog ongeveer ${q.timeline.weeksLeft} ${q.timeline.weeksLeft === 1 ? 'week' : 'weken'}.`, `According to the schedule you reach your goal around ${fmt(q.timeline.expectedEnd)}: about ${q.timeline.weeksLeft} more week(s).`)
                    : t('Je zit aan het einde van het schema. Je fysiotherapeut bespreekt met je hoe je verder gaat.', 'You are at the end of the schedule. Your physiotherapist discusses the next steps with you.')}
                </span>
              </p>
              <p className="mt-1.5 text-[13px] text-ink-600">{t('Dit is een verwachting: iedereen herstelt in een eigen tempo, en je fysiotherapeut beslist wanneer je verder gaat.', 'This is an estimate: everyone recovers at their own pace, and your physiotherapist decides when you move on.')}</p>
            </div>
          ) : (
            <p className="mt-2 text-[14px] text-ink-600">{t('Voor dit programma is geen einddatum gepland; je fysiotherapeut bepaalt de duur.', 'This programme has no planned end date; your physiotherapist decides the duration.')}</p>
          )}
          {q.phases.length > 1 && (
            <ol className="mt-4 space-y-2" aria-label={t('Route van je revalidatie', 'Route of your rehabilitation')}>
              {q.phases.map((ph) => (
                <li key={ph.no} className={cn('flex gap-3 rounded-xl border p-3', ph.status === 'current' ? 'border-accent/40 bg-accent-soft' : 'border-line')}>
                  <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', ph.status === 'done' ? 'bg-accent text-accent-ink' : ph.status === 'current' ? 'bg-white text-accent ring-2 ring-accent' : 'bg-ink-100 text-ink-500')} aria-hidden>
                    {ph.status === 'done' ? <CircleCheck className="h-4 w-4" /> : ph.status === 'current' ? <MapPin className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold text-ink-900">
                      {ph.name ?? t(`Fase ${ph.no}`, `Phase ${ph.no}`)}
                      {ph.weeks && <span className="font-normal text-ink-600"> · {t('week', 'week')} {ph.weeks}</span>}
                      <span className="sr-only"> ({ph.status === 'done' ? t('voltooid', 'completed') : ph.status === 'current' ? t('je bent hier', 'you are here') : t('nog op slot', 'still locked')})</span>
                    </span>
                    {ph.goal && <span className="block text-[13.5px] text-ink-700">{ph.goal}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
        <div><dt className="text-[12.5px] text-ink-600">{t('Onderweg', 'On the road')}</dt><dd className="font-display text-[18px] font-bold tabular-nums">{days ? t(`${days} d`, `${days} d`) : '—'}</dd></div>
        <div><dt className="text-[12.5px] text-ink-600">{t('Trainingen', 'Workouts')}</dt><dd className="font-display text-[18px] font-bold tabular-nums">{d.totals.sessions}</dd></div>
        <div><dt className="text-[12.5px] text-ink-600">{t('Pijn start → nu', 'Pain start → now')}</dt><dd className="font-display text-[18px] font-bold tabular-nums">{d.totals.painStart ?? '—'} → {d.totals.painNow ?? '—'}</dd></div>
      </dl>
    </section>
  );
}

/** Daily check-in: a five-second score for the main sore area. */
function DailyCheckin({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState<number>(d.checkin.today?.score ?? 3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = BODY_AREAS.find((a) => a.key === d.checkin.area);
  const question = area ? t(`Hoe voelt je ${area.nl.toLowerCase()} vandaag?`, `How does your ${area.en.toLowerCase()} feel today?`) : t('Hoeveel pijn of ongemak heb je vandaag?', 'How much pain or discomfort do you have today?');
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/patient/hero/checkin', { area: d.checkin.area, score });
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
      toast(t(`Dagcheck opgeslagen: +${CHECKIN_XP} XP`, `Daily check-in saved: +${CHECKIN_XP} XP`));
      setEditing(false);
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  if (d.checkin.today && !editing) {
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-ok/25 bg-ok-soft p-4" aria-label={t('Dagcheck', 'Daily check-in')}>
        <CircleCheck className="h-6 w-6 shrink-0 text-ok" aria-hidden />
        <p className="min-w-0 flex-1 text-[15px] text-ink-800">
          {t('Dagcheck gedaan', 'Daily check-in done')}: <strong>{d.checkin.today.score}/10</strong> · {painWord(d.checkin.today.score, nl)}
        </p>
        <button type="button" onClick={() => { setScore(d.checkin.today!.score); setEditing(true); }} className="min-h-[44px] px-2 text-[14px] font-medium text-accent">{t('Aanpassen', 'Change')}</button>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-accent/25 bg-accent-soft p-5" aria-labelledby="checkin-title">
      <p className="t-label">{t('Dagcheck', 'Daily check-in')} · +{CHECKIN_XP} XP</p>
      <h2 id="checkin-title" className="t-section mt-1">{question}</h2>
      {error && <Notice tone="bad" className="mt-2">{error}</Notice>}
      <div className="mt-3 flex items-baseline justify-between text-[15px]">
        <label htmlFor="checkin-score" className="text-ink-700">{t('0 = geen pijn, 10 = ergst denkbaar', '0 = no pain, 10 = worst imaginable')}</label>
        <span className="tabular-nums"><strong className="font-display text-[22px]">{score}</strong>/10 · {painWord(score, nl)}</span>
      </div>
      <input id="checkin-score" type="range" min={0} max={10} step={1} value={score} onChange={(e) => setScore(Number(e.target.value))} className="mt-2 h-11 w-full accent-[rgb(var(--accent))]" aria-valuetext={`${score}/10, ${painWord(score, nl)}`} />
      <Button size="lg" className="mt-2 w-full" loading={busy} onClick={save}>{t('Opslaan', 'Save')}</Button>
    </section>
  );
}

/** This week's three quests and the week chest. */
function WeeklyQuests({ d }: { d: HeroState }) {
  const { t } = useI18n();
  const w = d.weekly;
  const label = (q: HeroState['weekly']['quests'][number]) => {
    if (q.key === 'train') return q.target === 1 ? t('Doe 1 training', 'Do 1 workout') : t(`Train ${q.target} dagen`, `Train on ${q.target} days`);
    if (q.key === 'checkin') return t('Doe een dagcheck of werk je pijnkaart bij', 'Do a daily check-in or update your body map');
    const sk = SKILLS.find((k) => k.key === q.skill)!;
    return t(`Skill van de week: doe 2 oefeningen voor ${sk.nl}`, `Skill of the week: do 2 exercises for ${sk.en}`);
  };
  const allDone = w.quests.every((q) => q.done);
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="weekly-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="weekly-title" className="t-section">{t('Weekquests', 'Weekly quests')}</h2>
        <span className="text-[13px] text-ink-600">{t(`week van ${new Date(w.weekStart + 'T12:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}`, `week of ${new Date(w.weekStart + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`)}</span>
      </div>
      <ul className="mt-3 space-y-2">
        {w.quests.map((q) => (
          <li key={q.key} className={cn('flex items-center gap-3 rounded-xl border p-3', q.done ? 'border-ok/30 bg-ok-soft' : 'border-line')}>
            {q.done ? <CircleCheck className="h-6 w-6 shrink-0 text-ok" aria-hidden /> : <Target className="h-6 w-6 shrink-0 text-ink-500" aria-hidden />}
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-medium text-ink-900">{label(q)}</span>
              <span className="block text-[13px] text-ink-600">{q.progress}/{q.target} · +{w.xpPerQuest} XP{q.done ? t(' · gehaald', ' · done') : ''}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className={cn('mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[14px]', allDone ? 'bg-sand-soft font-semibold text-sand-ink' : 'bg-canvas text-ink-700')}>
        <Gift className="h-4 w-4 shrink-0" aria-hidden />
        {allDone ? t(`Weekkist geopend: +${w.chestXp} XP!`, `Week chest opened: +${w.chestXp} XP!`) : t(`Haal alle drie voor de weekkist: +${w.chestXp} XP`, `Complete all three for the week chest: +${w.chestXp} XP`)}
      </p>
      <p className="mt-2 text-[12.5px] text-ink-600">{t('Weekquests zijn een extraatje: een week missen kost je niets, en meer trainen dan gepland is nooit nodig.', 'Weekly quests are a bonus: missing a week costs nothing, and training more than planned is never needed.')}</p>
    </section>
  );
}

/** Gear: unlocked by progress; the patient chooses what the hero wears. */
function GearCard({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const toggle = async (key: string) => {
    const on = d.gear.equipped.includes(key);
    const next = on ? d.gear.equipped.filter((g) => g !== key) : [...d.gear.equipped, key];
    setBusy(key);
    try {
      await api.put('/patient/hero/gear', { equipped: next });
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="gear-title">
      <h2 id="gear-title" className="t-section">{t(`Uitrusting (${d.gear.unlocked.length} van ${GEAR.length})`, `Gear (${d.gear.unlocked.length} of ${GEAR.length})`)}</h2>
      <ul className="mt-3 space-y-2">
        {GEAR.map((g) => {
          const unlocked = d.gear.unlocked.includes(g.key);
          const worn = d.gear.equipped.includes(g.key);
          return (
            <li key={g.key} className={cn('flex items-center gap-3 rounded-xl border p-3', unlocked ? 'border-line' : 'border-line bg-canvas')}>
              {unlocked ? <Crown className="h-5 w-5 shrink-0 text-sand-ink" aria-hidden /> : <Lock className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-ink-900">{nl ? g.nl : g.en}</span>
                <span className="block text-[13px] text-ink-600">{unlocked ? t('Vrijgespeeld', 'Unlocked') : t(`Nog op slot: ${g.unlockNl}`, `Locked: ${g.unlockEn}`)}</span>
              </span>
              {unlocked && (
                <Button size="sm" variant={worn ? 'primary' : 'secondary'} className="h-11" aria-pressed={worn} loading={busy === g.key} onClick={() => toggle(g.key)}>
                  {worn ? t('Aan', 'On') : t('Aandoen', 'Wear')}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The character sheet: the hero with their pain, the main quest, skills and badges. */
export function HeroPage() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  useDocumentMeta(t('Mijn sportheld', 'My sports hero'));
  const q = useHero();
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner />;
  const d = q.data;
  if (!d.hero) {
    return (
      <Card className="space-y-4 p-6 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-accent" aria-hidden />
        <h1 className="t-page">{t('Maak je sportheld', 'Create your sports hero')}</h1>
        <p className="text-[15px] text-ink-600">{t('Bouw je eigen personage en volg je herstel als een avontuur.', 'Build your own character and follow your recovery as a journey.')}</p>
        <Link to="/p/held/nieuw" className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-accent text-base font-semibold text-accent-ink">{t('Beginnen', 'Start')}</Link>
      </Card>
    );
  }
  const L = d.level;
  const look = { ...d.hero, gear: d.gear.equipped };
  const toEntries = (c: HeroState['painMap']['current']) => Object.fromEntries((c?.entries ?? []).map((e) => [e.area, e.score]));
  const earned = d.badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="hero-name">
        <div className="flex items-center gap-4">
          <HeroAvatar look={look} size={80} level={L.level} />
          <div className="min-w-0">
            <p className="t-label">{t(`Level ${L.level}`, `Level ${L.level}`)} · {titleFor(L.level, nl)}</p>
            <h1 id="hero-name" className="t-page [overflow-wrap:anywhere]">{d.hero.heroName}</h1>
            <Link to="/p/held/uiterlijk" className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-accent">{t('Uiterlijk aanpassen', 'Change look')}</Link>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[14px]">
            <span className="font-semibold text-ink-900">{L.xp} XP</span>
            <span className="text-ink-600">{t(`nog ${L.to - L.xp} XP tot level ${L.level + 1}`, `${L.to - L.xp} XP to level ${L.level + 1}`)}</span>
          </div>
          <ProgressBar value={L.progress} className="mt-1.5 h-3" label={t(`Voortgang naar level ${L.level + 1}`, `Progress to level ${L.level + 1}`)} />
        </div>
        <details className="mt-3 text-[14px] text-ink-700">
          <summary className="min-h-[44px] cursor-pointer py-2 font-medium text-ink-800">{t('Hoe verdien ik XP?', 'How do I earn XP?')}</summary>
          <ul className="space-y-1 pb-1">
            <li>+{XP.session} XP · {t('een training afgerond', 'a workout completed')}</li>
            <li>+{XP.painReported} XP · {t('je pijn doorgegeven na de training (ook als die hoog is)', 'your pain reported after the workout (also when it is high)')}</li>
            <li>+{XP.redFlag} XP · {t('een alarmsignaal gemeld', 'a warning sign reported')}</li>
            <li>+{XP.painCheckin} XP · {t('je pijnkaart bijgewerkt (1× per week)', 'your body map updated (once a week)')}</li>
          </ul>
          <p className="text-ink-600">{t('Elke oefening traint ook skills, zoals Kracht of Balans. Doorgaan met pijn levert nooit extra punten op, en een rustdag kost je niets.', 'Every exercise also trains skills, such as Strength or Balance. Training through pain never earns extra points, and a rest day costs you nothing.')}</p>
        </details>
      </section>

      <DailyCheckin d={d} />
      <WeeklyQuests d={d} />
      <Quest d={d} />

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="map-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="map-title" className="t-section">{t('Je held en je pijn', 'Your hero and your pain')}</h2>
            <p className="text-[13.5px] text-ink-600">
              {d.painMap.current ? t(`Laatst bijgewerkt ${new Date(d.painMap.current.recordedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`, `Last updated ${new Date(d.painMap.current.recordedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`) : t('Nog niet ingevuld', 'Not filled in yet')}
            </p>
          </div>
          <Link to="/p/held/pijn" className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg bg-accent-soft px-3 text-[14px] font-semibold text-accent">{t('Bijwerken', 'Update')}<ChevronRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        {d.painMap.current && d.painMap.current.entries.length === 0 && (
          <Notice tone="ok" className="mt-3">{t('Je gaf aan dat je nergens pijn hebt.', 'You reported no pain anywhere.')}</Notice>
        )}
        <BodyMap entries={toEntries(d.painMap.current)} compare={d.painMap.checkins > 1 ? toEntries(d.painMap.baseline) : undefined} look={look} className="mt-3" />
        {d.trends.some((tr) => tr.points.length > 1) && (
          <div className="mt-4 border-t border-line pt-4">
            <h3 className="t-card mb-2">{t('Verloop per plek', 'Trend per area')}</h3>
            <PainTrendList trends={d.trends.filter((tr) => tr.points.length > 1)} />
          </div>
        )}
      </section>

      <Skills d={d} />
      <FriendsCard />
      <GearCard d={d} />

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="badges-title">
        <h2 id="badges-title" className="t-section">{t(`Badges (${earned} van ${d.badges.length})`, `Badges (${earned} of ${d.badges.length})`)}</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {BADGES.map((b) => {
            const has = d.badges.find((x) => x.key === b.key)?.earned;
            return (
              <li key={b.key} className={cn('rounded-xl border p-3', has ? 'border-accent/30 bg-accent-soft' : 'border-line bg-canvas')}>
                <div className={cn('flex items-center gap-1.5 text-[14px] font-semibold', has ? 'text-accent' : 'text-ink-600')}>
                  {has ? <Award className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
                  {nl ? b.nl : b.en}
                </div>
                <p className="mt-0.5 text-[13px] text-ink-600">{nl ? b.descNl : b.descEn}</p>
                <p className="sr-only">{has ? t('Behaald', 'Earned') : t('Nog te halen', 'Not earned yet')}</p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/** Update the body map (a new check-in; the history is kept). */
export function PainCheckinPage() {
  const { t, locale } = useI18n();
  useDocumentMeta(t('Pijnkaart bijwerken', 'Update body map'));
  const q = useHero();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [pain, setPain] = useState<PainEntries | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data && pain === null) setPain(Object.fromEntries((q.data.painMap.current?.entries ?? []).map((e) => [e.area, e.score])));
  }, [q.data, pain]);
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data || pain === null) return <Spinner />;
  const save = async (entries: PainEntries) => {
    setBusy(true);
    setError(null);
    try {
      await api.post('/patient/hero/pain-map', { entries: Object.entries(entries).map(([area, score]) => ({ area, score })) });
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
      toast(t('Pijnkaart opgeslagen', 'Body map saved'));
      nav('/p/held');
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-5">
      <Link to="/p/held" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Terug', 'Back')}</Link>
      <div>
        <h1 className="t-page">{t('Hoe voelt het nu?', 'How does it feel now?')}</h1>
        <p className="mt-1 text-[15px] text-ink-600">{t('Pas de scores aan, tik nieuwe plekken aan of haal plekken weg die geen pijn meer doen.', 'Adjust the scores, tap new areas or remove areas that no longer hurt.')}</p>
      </div>
      {error && <Notice tone="bad">{error}</Notice>}
      <Card className="space-y-4 p-5">
        <BodyMap entries={pain} onChange={setPain} look={q.data.hero ?? undefined} />
        <div className="grid gap-2">
          <Button size="xl" loading={busy} onClick={() => save(pain)}>{t('Opslaan', 'Save')}</Button>
          <Button size="lg" variant="ghost" disabled={busy} onClick={() => save({})}>{t('Ik heb nergens pijn meer', 'I have no pain anywhere now')}</Button>
        </div>
      </Card>
    </div>
  );
}

/** Small hero card on the home screen. */
export function HeroHomeCard() {
  const { t, locale } = useI18n();
  const q = useHero();
  if (!q.data) return null;
  const d = q.data;
  if (!d.hero) {
    return (
      <Link to="/p/held/nieuw" className="flex items-center gap-4 rounded-2xl border border-accent/25 bg-accent-soft p-4">
        <Sparkles className="h-8 w-8 shrink-0 text-accent" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink-900">{t('Maak je sportheld', 'Create your sports hero')}</span>
          <span className="block text-[14px] text-ink-700">{t('Verdien XP met elke training en volg je herstel.', 'Earn XP with every workout and follow your recovery.')}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-accent" aria-hidden />
      </Link>
    );
  }
  return (
    <Link to="/p/held" className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-card">
      <HeroAvatar look={{ ...d.hero, gear: d.gear.equipped }} size={60} level={d.level.level} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink-900">{d.hero.heroName}</span>
        <span className="block text-[13.5px] text-ink-600">{t(`Level ${d.level.level}`, `Level ${d.level.level}`)} · {titleFor(d.level.level, locale === 'nl')} · {d.level.xp} XP</span>
        <span className="block text-[13px] font-medium text-accent">
          {!d.checkin.today ? t('Dagcheck nog te doen', 'Daily check-in to do') : t(`Weekquests: ${d.weekly.quests.filter((q) => q.done).length}/3`, `Weekly quests: ${d.weekly.quests.filter((q) => q.done).length}/3`)}
        </span>
        <ProgressBar value={d.level.progress} className="mt-1.5 h-2" label={t(`Voortgang naar level ${d.level.level + 1}`, `Progress to level ${d.level.level + 1}`)} />
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />
    </Link>
  );
}
