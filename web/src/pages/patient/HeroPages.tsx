import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Award, Check, ChevronRight, Lock, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/cn';
import { Button, Card, ErrorState, Input, Notice, ProgressBar, Spinner, useToast } from '@/components/ui';
import { HeroAvatar, OUTFIT, SKIN, SPORT_ICON } from '@/components/hero/HeroAvatar';
import { BodyMap, type PainEntries } from '@/components/hero/BodyMap';
import { PhaseTimeline } from '@/components/app/PhaseInfo';
import { BADGES, HERO_OPTIONS, XP, titleFor, type HeroLook } from '@shared/hero';
import type { HeroState } from '@/lib/types';

export const HERO_LATER_KEY = 'fp.heroLater';
export const useHero = () => useQuery({ queryKey: ['patient-hero'], queryFn: () => api.get<HeroState>('/patient/hero') });

const SPORTS: Record<string, [string, string]> = {
  running: ['Hardlopen', 'Running'], football: ['Voetbal', 'Football'], fitness: ['Fitness', 'Fitness'], cycling: ['Fietsen', 'Cycling'],
  tennis: ['Tennis / padel', 'Tennis / padel'], swimming: ['Zwemmen', 'Swimming'], hockey: ['Hockey', 'Hockey'], dance: ['Dansen', 'Dance'],
  walking: ['Wandelen', 'Walking'], other: ['Iets anders', 'Something else'],
};
const HAIR: Record<string, [string, string]> = {
  short: ['Kort', 'Short'], long: ['Lang', 'Long'], curly: ['Krullen', 'Curly'], bun: ['Knot', 'Bun'], buzz: ['Heel kort', 'Buzz cut'], none: ['Geen', 'None'],
};
const OUTFITS: Record<string, [string, string]> = {
  forest: ['Bosgroen', 'Forest'], sand: ['Zand', 'Sand'], ocean: ['Oceaan', 'Ocean'], berry: ['Bes', 'Berry'], slate: ['Leisteen', 'Slate'], sun: ['Zon', 'Sun'],
};

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

/** First visit (or "Uiterlijk aanpassen"): build the sports hero, then mark where it hurts. */
export function HeroSetupPage({ edit = false }: { edit?: boolean }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  useDocumentMeta(edit ? t('Uiterlijk aanpassen', 'Change look') : t('Maak je sportheld', 'Create your sports hero'));
  const { user } = useSession();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useHero();
  const [step, setStep] = useState(1);
  const [look, setLook] = useState<HeroLook>({ heroName: '', skin: 's3', hair: 'short', outfit: 'forest', sport: 'running' });
  const [pain, setPain] = useState<PainEntries>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (q.data?.hero) setLook({ heroName: q.data.hero.heroName, skin: q.data.hero.skin, hair: q.data.hero.hair, outfit: q.data.hero.outfit, sport: q.data.hero.sport });
    else if (user && !look.heroName) setLook((l) => ({ ...l, heroName: user.fullName.split(' ')[0] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, user]);
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner />;
  const steps = edit ? 2 : 3;

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to={edit ? '/p/held' : '/p'} onClick={() => { if (!edit) { try { sessionStorage.setItem(HERO_LATER_KEY, '1'); } catch { /* storage unavailable */ } } }} className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700">
          {edit ? <><ArrowLeft className="h-4 w-4" aria-hidden />{t('Terug', 'Back')}</> : t('Later', 'Later')}
        </Link>
        <span className="text-[14px] text-ink-600">{t(`Stap ${step} van ${steps}`, `Step ${step} of ${steps}`)}</span>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <HeroAvatar look={look} size={112} level={1} />
        <h1 className="t-page">{step === 3 ? t('Waar heb je pijn?', 'Where does it hurt?') : edit ? t('Uiterlijk aanpassen', 'Change look') : t('Maak je sportheld', 'Create your sports hero')}</h1>
        <p className="max-w-sm text-[15px] text-ink-600">
          {step === 1 && t('Jij bent de held van je eigen herstel. Elke training levert XP op en brengt je een level verder.', 'You are the hero of your own recovery. Every workout earns XP and takes you a level further.')}
          {step === 2 && t('Kies hoe je sportheld eruitziet.', 'Choose how your sports hero looks.')}
          {step === 3 && t('Tik op de plekken waar je pijn hebt en geef aan hoeveel. Zo zie je straks hoe je herstelt, en je fysiotherapeut ziet het ook.', 'Tap where it hurts and say how much. Later you see how you recover, and your physiotherapist sees it too.')}
        </p>
      </div>

      {error && <Notice tone="bad">{error}</Notice>}

      {step === 1 && (
        <Card className="space-y-5 p-5">
          <Input label={t('Naam van je held', 'Name of your hero')} value={look.heroName} maxLength={40} onChange={(e) => setLook({ ...look, heroName: e.target.value })} />
          <Choice
            legend={t('Jouw sport', 'Your sport')}
            name="sport"
            cols="grid-cols-2"
            value={look.sport as (typeof HERO_OPTIONS.sport)[number]}
            options={HERO_OPTIONS.sport}
            onChange={(v) => setLook({ ...look, sport: v })}
            render={(v) => {
              const Icon = SPORT_ICON[v];
              return <><Icon className="h-4 w-4 shrink-0" aria-hidden />{SPORTS[v][nl ? 0 : 1]}</>;
            }}
          />
          <Button size="xl" className="w-full" disabled={!look.heroName.trim()} onClick={() => setStep(2)}>{t('Volgende', 'Next')}</Button>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-5 p-5">
          <Choice legend={t('Huidskleur', 'Skin tone')} name="skin" value={look.skin as (typeof HERO_OPTIONS.skin)[number]} options={HERO_OPTIONS.skin} onChange={(v) => setLook({ ...look, skin: v })}
            render={(v) => <><span className="h-7 w-7 rounded-full border border-ink-200" style={{ background: SKIN[v] }} aria-hidden /><span className="sr-only">{t(`Huidskleur ${v.slice(1)}`, `Skin tone ${v.slice(1)}`)}</span></>} />
          <Choice legend={t('Haar', 'Hair')} name="hair" value={look.hair as (typeof HERO_OPTIONS.hair)[number]} options={HERO_OPTIONS.hair} onChange={(v) => setLook({ ...look, hair: v })}
            render={(v) => <span className="flex flex-col items-center gap-1"><HeroAvatar look={{ ...look, hair: v }} size={40} />{HAIR[v][nl ? 0 : 1]}</span>} />
          <Choice legend={t('Tenue', 'Kit')} name="outfit" value={look.outfit as (typeof HERO_OPTIONS.outfit)[number]} options={HERO_OPTIONS.outfit} onChange={(v) => setLook({ ...look, outfit: v })}
            render={(v) => <><span className="h-5 w-5 shrink-0 rounded-full" style={{ background: OUTFIT[v].main }} aria-hidden />{OUTFITS[v][nl ? 0 : 1]}</>} />
          <div className="grid grid-cols-2 gap-2">
            <Button size="xl" variant="secondary" onClick={() => setStep(1)}>{t('Vorige', 'Back')}</Button>
            {edit ? (
              <Button size="xl" loading={busy} onClick={() => finish(false)}>{t('Opslaan', 'Save')}</Button>
            ) : (
              <Button size="xl" onClick={() => setStep(3)}>{t('Volgende', 'Next')}</Button>
            )}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="space-y-4 p-5">
          <BodyMap entries={pain} onChange={setPain} />
          <p className="text-center text-[13.5px] text-ink-600">
            {Object.keys(pain).length
              ? t(`${Object.keys(pain).length} ${Object.keys(pain).length === 1 ? 'plek' : 'plekken'} aangegeven`, `${Object.keys(pain).length} area(s) marked`)
              : t('Nog niets aangegeven.', 'Nothing marked yet.')}
          </p>
          <div className="grid gap-2">
            <Button size="xl" loading={busy} disabled={!Object.keys(pain).length} onClick={() => finish(true)}>{t('Klaar: start mijn avontuur', 'Done: start my journey')}</Button>
            <Button size="lg" variant="ghost" disabled={busy} onClick={() => finish(false)}>{t('Ik heb nergens pijn', 'I have no pain anywhere')}</Button>
            <Button size="lg" variant="ghost" disabled={busy} onClick={() => setStep(2)}>{t('Vorige', 'Back')}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="flex items-baseline justify-between text-[14px]">
        <span className="font-medium text-ink-800">{label}</span>
        <span className="tabular-nums text-ink-600">{value === null ? t('nog geen data', 'no data yet') : `${value}/10`}</span>
      </div>
      <ProgressBar value={value === null ? 0 : value / 10} className="mt-1.5 h-2" label={`${label}: ${value === null ? '—' : `${value}/10`}`} />
    </div>
  );
}

/** The character sheet: hero, level and XP, chapter (phase), stats, body map and badges. */
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
  const toEntries = (c: HeroState['painMap']['current']) => Object.fromEntries((c?.entries ?? []).map((e) => [e.area, e.score]));
  const earned = d.badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="hero-name">
        <div className="flex items-center gap-4">
          <HeroAvatar look={d.hero} size={96} level={L.level} />
          <div className="min-w-0">
            <p className="t-label">{t(`Level ${L.level}`, `Level ${L.level}`)} · {titleFor(L.level, nl)}</p>
            <h1 id="hero-name" className="t-page [overflow-wrap:anywhere]">{d.hero.heroName}</h1>
            <Link to="/p/held/uiterlijk" className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-accent">{t('Uiterlijk aanpassen', 'Change look')}</Link>
          </div>
        </div>
        <div className="mt-4">
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
          <p className="text-ink-600">{t('Doorgaan met pijn levert nooit extra punten op, en een rustdag kost je niets.', 'Training through pain never earns extra points, and a rest day costs you nothing.')}</p>
        </details>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="chapter-title">
        <h2 id="chapter-title" className="t-section">{t('Je avontuur', 'Your journey')}</h2>
        {d.chapter ? (
          <>
            <p className="mt-1 text-[15px] text-ink-800">{d.chapter.title}</p>
            {d.chapter.count > 1 && <PhaseTimeline phaseNo={d.chapter.no} phaseCount={d.chapter.count} className="mt-3" />}
            {d.chapter.goal && <p className="mt-3 text-[14.5px] text-ink-700"><strong>{t('Doel van dit hoofdstuk', 'Goal of this chapter')}:</strong> {d.chapter.goal}</p>}
            <p className="mt-2 text-[13.5px] text-ink-600">{t('Het volgende hoofdstuk zet je fysiotherapeut klaar zodra je eraan toe bent.', 'Your physiotherapist unlocks the next chapter when you are ready.')}</p>
          </>
        ) : (
          <p className="mt-1 text-[15px] text-ink-600">{t('Elke training brengt je verder. Je fysiotherapeut kan je revalidatie in hoofdstukken (fases) opdelen.', 'Every workout takes you further. Your physiotherapist can divide your rehabilitation into chapters (phases).')}</p>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="stats-title">
        <h2 id="stats-title" className="t-section">{t('Eigenschappen', 'Attributes')}</h2>
        <Stat label={t('Doorzetten', 'Consistency')} value={d.stats.consistency} />
        <Stat label={t('Herstel', 'Recovery')} value={d.stats.recovery} />
        <Stat label={t('Kracht', 'Strength')} value={d.stats.strength} />
        <Stat label={t('Mobiliteit', 'Mobility')} value={d.stats.mobility} />
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="map-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="map-title" className="t-section">{t('Pijnkaart', 'Body map')}</h2>
            <p className="text-[13.5px] text-ink-600">
              {d.painMap.current ? t(`Laatst bijgewerkt ${new Date(d.painMap.current.recordedAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}`, `Last updated ${new Date(d.painMap.current.recordedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`) : t('Nog niet ingevuld', 'Not filled in yet')}
            </p>
          </div>
          <Link to="/p/held/pijn" className="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg bg-accent-soft px-3 text-[14px] font-semibold text-accent">{t('Bijwerken', 'Update')}<ChevronRight className="h-4 w-4" aria-hidden /></Link>
        </div>
        {d.painMap.current && d.painMap.current.entries.length === 0 ? (
          <Notice tone="ok" className="mt-3">{t('Je gaf aan dat je nergens pijn hebt.', 'You reported no pain anywhere.')}</Notice>
        ) : (
          <BodyMap entries={toEntries(d.painMap.current)} compare={d.painMap.checkins > 1 ? toEntries(d.painMap.baseline) : undefined} className="mt-3" />
        )}
      </section>

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
        <BodyMap entries={pain} onChange={setPain} />
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
      <HeroAvatar look={d.hero} size={60} level={d.level.level} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-ink-900">{d.hero.heroName}</span>
        <span className="block text-[13.5px] text-ink-600">{t(`Level ${d.level.level}`, `Level ${d.level.level}`)} · {titleFor(d.level.level, locale === 'nl')} · {d.level.xp} XP</span>
        <ProgressBar value={d.level.progress} className="mt-1.5 h-2" label={t(`Voortgang naar level ${d.level.level + 1}`, `Progress to level ${d.level.level + 1}`)} />
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-400" aria-hidden />
    </Link>
  );
}
