import { PhotoGearThumbnail } from '../../components/hero/PhotoEquipment';
import { GearArtwork } from '../../components/hero/RpgGear';
import '../../components/hero/rpg.css';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Award, BookOpen, Brain, CalendarCheck, Check, ChevronRight, CircleCheck, Coins, Dumbbell, Flag, HeartPulse, Hourglass, Lock, MapPin, Move, Pencil, PersonStanding, Shield, Sparkles, Target, Gift, Crown, Trophy, Utensils, Droplets, Zap, Swords, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { useSession } from '@/lib/session';
import { cn } from '@/lib/cn';
import { Button, Card, Dialog, ErrorState, Input, Notice, ProgressBar, ScaleInput, Segmented, Spinner, useToast } from '@/components/ui';
import { HeroAvatar, SPORT_ICON } from '@/components/hero/HeroAvatar';
import { HeroPhoto } from '@/components/hero/HeroPhoto';
import { COMPOUND_LABEL, TIER_LABEL } from '@shared/strengthStandards';
import { HumanFigure, SKIN_TONES, type FigureLook } from '@/components/hero/HumanFigure';
import { BodyMap, painWord, type PainEntries } from '@/components/hero/BodyMap';
import { MOBILITY_MEASURE_XP } from '@shared/mobilityTests';
import { BADGES, BOSSES, SEASONS, BODY_KIND_LABEL, bodyShape, BODY_AREAS, CHECKIN_XP, DEFAULT_LOOK, FUTURE_REWARDS, GEAR, GEAR_SLOT, GEAR_TIERS, SHOWCASE_MAX, WALL_BADGES_MAX, TROPHY_TIERS, GEAR_SLOTS, HERO_OPTIONS, onePerSlot, type GearSlot, METRICS, SKILL_EMBLEM_LEVEL, SKILLS, XP, comboTitles, hairPreset, heroNickname, metricInRange, skinGroup, HAIR_PRESETS, HAIR_PRESET_KEYS, SKIN_GROUPS, parseMetric, sceneForTotal, skillLockLabel, skillTitle, titleFor, type HeroLook, type SkillKey } from '@shared/hero';
import { LOG_XP } from '@shared/patientLogs';
import { quizQuestions } from '@shared/muscleAtlas';
import type { HeroState } from '@/lib/types';
import { PainTrendList } from '@/components/hero/PainTrend';
import { Fold } from '@/components/app/Fold';
import { SurvivalPanel } from '@/components/patient/Survival';
import { FriendsCard } from './FriendsPage';
import { RehabRoute } from '@/components/hero/RehabRoute';

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

const swatch = (bg: string) => <span className="h-7 w-7 shrink-0 rounded-full border border-ink-200 shadow-xs" style={{ background: bg }} aria-hidden />;

/** Strength level ceiling: real lifts relative to body weight decide how far the level can go. */
function StrengthCeiling({ c }: { c: NonNullable<HeroState['skills'][number]['ceiling']> }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const L = (k: keyof typeof COMPOUND_LABEL) => COMPOUND_LABEL[k][nl ? 0 : 1];
  return (
    <div className="rounded-xl bg-canvas p-3 text-[14px] text-ink-700" data-testid="strength-ceiling">
      <p className="font-semibold text-ink-900">{t(`Maximaal level nu: ${c.cap}`, `Maximum level now: ${c.cap}`)} · {TIER_LABEL[c.tier][nl ? 0 : 1]}</p>
      {c.reason === 'no_compound' && <p>{t('Log een squat, deadlift, bankdrukken of overhead press in je krachtlog om hoger te kunnen. Level 99 vraagt elite-niveau.', 'Log a squat, deadlift, bench press or overhead press in your strength log to go higher. Level 99 takes elite lifting.')}</p>}
      {c.reason === 'no_weight' && <p>{t('Vul je lichaamsgewicht in: het plafond hangt af van je lift ten opzichte van je eigen gewicht.', 'Enter your body weight: the ceiling depends on your lift relative to your own weight.')}</p>}
      {c.best && <p>{t(`Beste lift: ${L(c.best.lift)} ${c.best.oneRmKg.toLocaleString('nl-NL')} kg = ${c.best.ratio.toLocaleString('nl-NL')}× je lichaamsgewicht.`, `Best lift: ${L(c.best.lift)} ${c.best.oneRmKg} kg = ${c.best.ratio}× your body weight.`)}</p>}
      {c.next && <p>{t(`Volgende stap: ${L(c.next.lift)} ${c.next.kg.toLocaleString('nl-NL')} kg (1RM) → maximaal level ${c.next.cap}.`, `Next step: ${L(c.next.lift)} ${c.next.kg} kg (1RM) → maximum level ${c.next.cap}.`)}</p>}
      {c.capped && <p className="font-medium text-accent">{t('Je XP telt gewoon door; je level gaat verder zodra je sterker wordt.', 'Your XP keeps counting; your level moves on as soon as you get stronger.')}</p>}
    </div>
  );
}

/** Play as yourself, or as a guest hero: a real person who agreed to be offered (e.g. the practice owner). */
function GuestHeroChoice({ guests, value, onChange }: { guests: { key: string; name: string }[]; value: string | null; onChange: (key: string | null) => void }) {
  const { t } = useI18n();
  if (!guests.length) return null;
  const options = ['own', ...guests.map((g) => g.key)];
  return (
    <Choice legend={t('Wie is je held?', 'Who is your hero?')} name="guestHero" cols="grid-cols-2" value={value ?? 'own'} options={options}
      onChange={(k) => onChange(k === 'own' ? null : k)}
      render={(k) => {
        const g = guests.find((x) => x.key === k);
        return g ? (
          <span className="flex flex-col items-center gap-1.5 py-1 text-[13px] leading-tight">
            <span className="h-16 w-16 overflow-hidden rounded-full bg-[#ece4d6]" aria-hidden><img src={`/api/hero-assets/avatar/${g.key}`} alt="" className="h-full w-full scale-[2.4] object-cover object-[50%_0%] [transform-origin:50%_8%]" /></span>
            {t(`Speel als ${g.name}`, `Play as ${g.name}`)}
          </span>
        ) : (
          <span className="py-1 text-[13px]">{t('Mijn eigen held', 'My own hero')}</span>
        );
      }} />
  );
}

/** Five skin tones: the groups the photos exist for. */
function SkinChoice({ look, onChange }: { look: HeroLook; onChange: (skin: string) => void }) {
  const { t } = useI18n();
  return (
    <Choice legend={t('Huidskleur', 'Skin tone')} name="skin" cols="grid-cols-5" value={skinGroup(look.skin) as (typeof SKIN_GROUPS)[number]} options={SKIN_GROUPS} onChange={onChange}
      render={(v) => <>{swatch(SKIN_TONES[v])}<span className="sr-only">{t(`Huidskleur ${SKIN_GROUPS.indexOf(v) + 1} van 5`, `Skin tone ${SKIN_GROUPS.indexOf(v) + 1} of 5`)}</span></>} />
  );
}

/** Four hairstyles per figure, each shown on the hero's own photo. */
function HairChoice({ look, onChange }: { look: HeroLook; onChange: (fields: { hair: string; hairColor: string; beard: string }) => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const fr = look.frame === 'm' ? 'm' : 'f';
  const presets = HAIR_PRESETS[fr];
  return (
    <Choice legend={t('Kapsel', 'Hairstyle')} name="hairPreset" cols="grid-cols-2" value={hairPreset(look)} options={HAIR_PRESET_KEYS}
      onChange={(k) => { const p = presets[k]; onChange({ hair: p.hair, hairColor: p.hairColor, beard: p.beard }); }}
      render={(k) => {
        const p = presets[k];
        return <span className="flex flex-col items-center gap-1.5 py-1 text-[13px] leading-tight"><HeroAvatar key={`${fr}${k}${look.skin}`} look={{ ...look, hair: p.hair, hairColor: p.hairColor, beard: p.beard }} size={64} plain />{nl ? p.nl : p.en}</span>;
      }} />
  );
}

/** Tick every sport you do (at least one). The first one ticked is the main sport, shown on the badge. */
function SportPicker({ look, onChange }: { look: HeroLook; onChange: (sports: string[]) => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const chosen = look.sports?.length ? look.sports : [look.sport];
  const toggle = (v: string) => {
    const next = chosen.includes(v) ? chosen.filter((x) => x !== v) : [...chosen, v];
    if (next.length) onChange(next);
  };
  return (
    <fieldset>
      <legend className="mb-1 text-[15px] font-semibold text-ink-900">{t('Jouw sporten', 'Your sports')}</legend>
      <p className="mb-2 text-[13.5px] text-ink-600">{t('Vink alles aan wat je doet. De eerste is je hoofdsport.', 'Tick everything you do. The first one is your main sport.')}</p>
      <div className="grid grid-cols-2 gap-2">
        {HERO_OPTIONS.sport.map((v) => {
          const on = chosen.includes(v);
          const Icon = SPORT_ICON[v];
          return (
            <label key={v} className={cn('tap relative flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-xl border bg-white p-2 text-center text-[14px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent', on ? 'border-accent bg-accent-soft font-semibold text-accent' : 'border-line text-ink-700 hover:border-ink-300')}>
              <input type="checkbox" name="sports" value={v} checked={on} onChange={() => toggle(v)} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
              <Icon className="h-4 w-4 shrink-0" aria-hidden />{SPORTS[v][nl ? 0 : 1]}
              {on && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" aria-hidden />}
              {on && chosen[0] === v && chosen.length > 1 && <span className="absolute bottom-1 right-1.5 text-[10.5px] font-semibold uppercase tracking-wide">{t('hoofd', 'main')}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** First visit: build the sports hero step by step, then mark where it hurts. Later edits use HeroProfilePage. */
export function HeroSetupPage() {
  const { t, locale, kind } = useI18n();
  const nl = locale === 'nl';
  const L = (k: string, v: string) => LABELS[k][v][nl ? 0 : 1];
  useDocumentMeta(t('Maak je sportheld', 'Create your sports hero'));
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
  const steps = 4;
  const set = <K extends keyof HeroLook>(k: K, v: HeroLook[K]) => setLook((l) => ({ ...l, [k]: v }));

  const finish = async (withPain: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await api.put('/patient/hero', look);
      await api.post('/patient/hero/pain-map', { entries: withPain ? Object.entries(pain).map(([area, score]) => ({ area, score })) : [] });
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
      toast(t('Je sportheld is klaar!', 'Your sports hero is ready!'));
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
    1: ['Maak je sportheld', 'Create your sports hero'],
    2: ['Je lichaam', 'Your body'],
    3: ['Je kapsel', 'Your hairstyle'],
    4: ['Waar heb je pijn?', 'Where does it hurt?'],
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to="/p" onClick={() => { try { sessionStorage.setItem(HERO_LATER_KEY, '1'); } catch { /* storage unavailable */ } }} className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700">
          {t('Later', 'Later')}
        </Link>
        <span className="text-[14px] text-ink-600">{t(`Stap ${step} van ${steps}`, `Step ${step} of ${steps}`)}</span>
      </div>

      <div className="text-center">
        <h1 className="t-page">{titles[step][nl ? 0 : 1]}</h1>
        <p className="mx-auto mt-1 max-w-sm text-[15px] text-ink-600">
          {step === 1 && t('Jij bent de held van je eigen herstel. Maak een sportheld die op jou lijkt: elke training levert XP op.', 'You are the hero of your own recovery. Make a sports hero who looks like you: every workout earns XP.')}
          {step === 4 && (kind === 'physio'
            ? t('Tik op je held waar je pijn hebt en geef aan hoeveel. Zo zie je straks hoe je herstelt, en je fysiotherapeut ziet het ook.', 'Tap your hero where it hurts and say how much. Later you see how you recover, and your physiotherapist sees it too.')
            : t('Tik op je held waar je iets voelt en geef aan hoeveel. Dit is een dagboek voor jezelf: zo zie je hoe het verloopt.', 'Tap your hero where you feel something and say how much. This is a diary for yourself: you see how it goes over time.'))}
        </p>
      </div>

      {error && <Notice tone="bad">{error}</Notice>}

      {step >= 2 && step <= 3 && (
        <div className="flex justify-center rounded-2xl bg-sage/60 py-3" role="img" aria-label={t(`Voorbeeld van ${look.heroName || 'je held'}`, `Preview of ${look.heroName || 'your hero'}`)}>
          <HeroPhoto look={{ ...look, photo: look.photoKey ?? null }} gearChips={false} className="h-[300px] w-[200px]" />
        </div>
      )}

      {step === 1 && (
        <Card className="space-y-5 p-5">
          <div className="flex justify-center"><HeroAvatar look={look} size={112} level={1} /></div>
          <HeroNameField value={look.heroName} frame={look.frame} onChange={(v) => set('heroName', v)} />
          <SportPicker look={look} onChange={(sports) => setLook((l) => ({ ...l, sports, sport: sports[0] }))} />
          <Button size="xl" className="w-full" disabled={!look.heroName.trim()} onClick={() => setStep(2)}>{t('Volgende', 'Next')}</Button>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-5 p-5">
          <Choice legend={t('Figuur', 'Figure')} name="frame" cols="grid-cols-2" value={look.frame as Opt<'frame'>} options={HERO_OPTIONS.frame} onChange={(v) => set('frame', v)} render={(v) => L('frame', v)} />
          <Choice legend={t('Bouw', 'Build')} name="build" cols="grid-cols-2" value={look.build as Opt<'build'>} options={HERO_OPTIONS.build} onChange={(v) => set('build', v)} render={(v) => L('build', v)} />
          <SkinChoice look={look} onChange={(skin) => set('skin', skin)} />
          {nextBack(() => setStep(3))}
        </Card>
      )}

      {step === 3 && (
        <Card className="space-y-5 p-5">
          <GuestHeroChoice guests={q.data?.heroGuests ?? []} value={look.photoKey ?? null} onChange={(photoKey) => setLook((l) => ({ ...l, photoKey }))} />
          <HairChoice look={look} onChange={(fields) => setLook((l) => ({ ...l, ...fields }))} />
          {nextBack(() => setStep(4))}
        </Card>
      )}

      {step === 4 && (
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
            <Button size="lg" variant="ghost" disabled={busy} onClick={() => setStep(3)}>{t('Vorige', 'Back')}</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

const PROFILE_LABEL = ['Uiterlijk en maten aanpassen', 'Edit look and measurements'] as const;

/** Hero name with a "make up a name" button: a playful nickname from the patient's first name. */
function HeroNameField({ value, frame, onChange }: { value: string; frame: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  const { user } = useSession();
  const [n, setN] = useState(0);
  return (
    <div className="space-y-2">
      <Input label={t('Naam van je held', 'Name of your hero')} value={value} maxLength={40} onChange={(e) => onChange(e.target.value)} />
      <button
        type="button"
        onClick={() => {
          onChange(heroNickname(user?.fullName, frame, n));
          setN((x) => x + 1);
        }}
        className="tap inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-accent-soft px-4 text-[14.5px] font-semibold text-accent"
      >
        <Sparkles className="h-4 w-4" aria-hidden />
        {t('Verzin een naam', 'Make up a name')}
      </button>
    </div>
  );
}

/** The hero page's full-body photo, also the way into look + body measurements. */
function HeroPhotoLink({ look, level }: { look: FigureLook; level: number }) {
  const { t } = useI18n();
  return (
    <Link
      to="/p/held/uiterlijk"
      aria-label={t(`Uiterlijk en maten aanpassen, level ${level}`, `Edit look and measurements, level ${level}`)}
      className="tap relative block shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <HeroPhoto look={look} className="h-[184px] w-[123px] shadow-card" />
      <span className="absolute -left-1.5 -top-1.5 flex min-w-[28px] items-center justify-center rounded-full border-2 border-white bg-sand px-1.5 font-display text-[13px] font-bold leading-[24px] text-sand-ink" aria-hidden>{level}</span>
      <span className="absolute -bottom-1.5 -right-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white text-accent shadow-sm" aria-hidden>
        <Pencil className="h-4 w-4" />
      </span>
    </Link>
  );
}

/** The profile photo is the way into look + body measurements. */
function AvatarLink({ look, size, level }: { look: HeroLook & { gear?: string[] }; size: number; level?: number }) {
  const { t } = useI18n();
  return (
    <Link
      to="/p/held/uiterlijk"
      aria-label={level !== undefined ? t(`Uiterlijk en maten aanpassen, level ${level}`, `Edit look and measurements, level ${level}`) : t(PROFILE_LABEL[0], PROFILE_LABEL[1])}
      className="tap relative inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      <HeroAvatar look={look} size={size} level={level} photo />
      <span className="absolute -bottom-1 left-1/2 z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-white text-accent shadow-sm" aria-hidden>
        <Pencil className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function metricText(n: number | null, nl: boolean) {
  if (n === null) return '';
  const s = String(n);
  return nl ? s.replace('.', ',') : s;
}

/** One screen: live preview, look, and self-reported weight / body fat / height. */
export function HeroProfilePage() {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const L = (k: string, v: string) => LABELS[k][v][nl ? 0 : 1];
  useDocumentMeta(t('Uiterlijk en maten', 'Look and measurements'));
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useHero();
  const [look, setLook] = useState<HeroLook | null>(null);
  const [weight, setWeight] = useState('');
  const [fat, setFat] = useState('');
  const [height, setHeight] = useState('');
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!q.data?.hero || look) return;
    const h = q.data.hero;
    setLook({
      heroName: h.heroName, frame: h.frame, build: h.build, skin: h.skin, hair: h.hair, hairColor: h.hairColor,
      eyeColor: h.eyeColor, beard: h.beard, glasses: h.glasses, outfit: h.outfit, sport: h.sport, sports: h.sports ?? [h.sport], photoKey: h.photoKey ?? null,
    });
    const m = q.data.metrics;
    setWeight(metricText(m?.weightKg ?? null, nl));
    setFat(metricText(m?.bodyFatPct ?? null, nl));
    setHeight(metricText(m?.heightCm ?? null, nl));
    // Locale is fixed for this visit; prefilling once avoids wiping what the patient is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data || (q.data.hero && !look)) return <Spinner />;
  if (!q.data.hero || !look) {
    return (
      <Card className="space-y-4 p-6 text-center">
        <h1 className="t-page">{t('Maak eerst je sportheld', 'Create your sports hero first')}</h1>
        <Link to="/p/held/nieuw" className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-accent text-base font-semibold text-accent-ink">{t('Beginnen', 'Start')}</Link>
      </Card>
    );
  }
  const set = <K extends keyof HeroLook>(k: K, v: HeroLook[K]) => setLook({ ...look, [k]: v });
  const typed = (raw: string, setter: (v: string) => void) => setter(raw.replace(/[^\d.,]/g, '').replace(',', '.').replace(/\.(?=.*\.)/g, ''));
  const save = async () => {
    const weightKg = parseMetric(weight);
    const bodyFatPct = parseMetric(fat);
    const heightCm = parseMetric(height);
    const next: Record<string, string> = {};
    const bad = (key: string, label: string) => { next[key] = t(`${label} klopt niet.`, `${label} is not valid.`); };
    if (weight.trim() && (weightKg === null || !metricInRange('weightKg', weightKg))) bad('weightKg', t('Gewicht', 'Weight'));
    if (fat.trim() && (bodyFatPct === null || !metricInRange('bodyFatPct', bodyFatPct))) bad('bodyFatPct', t('Lichaamsvet', 'Body fat'));
    if (height.trim() && (heightCm === null || !metricInRange('heightCm', heightCm))) bad('heightCm', t('Lengte', 'Height'));
    setFieldError(next);
    if (!look.heroName.trim() || Object.keys(next).length) {
      setError(t('Controleer de velden hieronder.', 'Check the fields below.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.put('/patient/hero', look);
      await api.put('/patient/hero/metrics', { weightKg, bodyFatPct, heightCm });
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
      toast(t('Uiterlijk en maten opgeslagen', 'Look and measurements saved'));
      nav('/p/held');
    } catch (e) {
      setError(describeError(e, locale));
    } finally {
      setBusy(false);
    }
  };
  // The figure follows the measurements as you type: more body fat = fuller, high BMI with low fat = muscular.
  const shape = bodyShape({ weightKg: parseMetric(weight), heightCm: parseMetric(height), bodyFatPct: parseMetric(fat) }, look.frame);
  const personal = q.data.customPhoto && q.data.customPhoto !== q.data.hero?.photoKey ? q.data.customPhoto : null;
  const preview = { ...look, gear: q.data.gear.equipped, body: shape, photo: look.photoKey ?? personal };
  return (
    <div className="space-y-5">
      <Link to="/p/held" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Terug', 'Back')}</Link>
      <div>
        <h1 className="t-page">{t('Uiterlijk en maten', 'Look and measurements')}</h1>
        <p className="mt-1 text-[15px] text-ink-600">{t('Pas je held aan en vul, als je wilt, je eigen maten in. De maten zie alleen jij.', 'Change your hero and, if you want, fill in your own measurements. Only you see the measurements.')}</p>
      </div>
      {error && <Notice tone="bad">{error}</Notice>}
      <div className="flex justify-center rounded-2xl bg-sage/60 py-3" role="img" aria-label={t(`Voorbeeld van ${look.heroName || 'je held'}`, `Preview of ${look.heroName || 'your hero'}`)}>
        <HeroPhoto look={preview} className="h-[280px] w-[187px]" />
      </div>
      {shape && (
        <p className="-mt-2 text-center text-[14px] text-ink-700" aria-live="polite">
          {t('Lichaamsbouw van je held', 'Your hero’s build')}: <strong>{BODY_KIND_LABEL[shape.kind][nl ? 0 : 1]}</strong>
          <span className="text-ink-500"> · {t('vet', 'fat')} {shape.bodyFatPct.toLocaleString(nl ? 'nl-NL' : 'en-GB')}%{shape.estimated ? t(' (geschat uit BMI)', ' (estimated from BMI)') : ''}</span>
        </p>
      )}
      <Card className="space-y-5 p-5">
        <h2 className="t-section">{t('Uiterlijk', 'Look')}</h2>
        <HeroNameField value={look.heroName} frame={look.frame} onChange={(v) => set('heroName', v)} />
        <SportPicker look={look} onChange={(sports) => setLook({ ...look, sports, sport: sports[0] })} />
        <Choice legend={t('Figuur', 'Figure')} name="frame" cols="grid-cols-2" value={look.frame as Opt<'frame'>} options={HERO_OPTIONS.frame} onChange={(v) => set('frame', v)} render={(v) => L('frame', v)} />
        {shape ? (
          <p className="rounded-xl bg-canvas px-3 py-2.5 text-[14px] text-ink-700">{t('Je bouw volgt nu je eigen maten (gewicht, lengte en vetpercentage). Laat ze leeg om zelf een bouw te kiezen.', 'Your build now follows your own measurements (weight, height and body fat). Leave them empty to choose a build yourself.')}</p>
        ) : <Choice legend={t('Bouw', 'Build')} name="build" cols="grid-cols-2" value={look.build as Opt<'build'>} options={HERO_OPTIONS.build} onChange={(v) => set('build', v)} render={(v) => L('build', v)} />}
        <SkinChoice look={look} onChange={(skin) => set('skin', skin)} />
        <GuestHeroChoice guests={q.data.heroGuests ?? []} value={look.photoKey ?? null} onChange={(photoKey) => setLook({ ...look, photoKey })} />
        <HairChoice look={look} onChange={(fields) => setLook({ ...look, ...fields })} />
      </Card>
      <Card className="space-y-4 p-5">
        <h2 className="t-section">{t('Lichaamsmaten', 'Body measurements')}</h2>
        <p className="text-[14px] text-ink-600">{t('Optioneel. Wat jij zelf invult, geen meting van de praktijk en geen oordeel over je gezondheid.', 'Optional. What you fill in yourself, not a measurement by the practice and not a judgement of your health.')}</p>
        <Input label={t('Gewicht (kg)', 'Weight (kg)')} optional={t('optioneel', 'optional')} inputMode="decimal" autoComplete="off" value={weight} error={fieldError.weightKg} hint={t(`Tussen ${METRICS.weightKg.min} en ${METRICS.weightKg.max} kg, of leeg.`, `Between ${METRICS.weightKg.min} and ${METRICS.weightKg.max} kg, or leave empty.`)} onChange={(e) => typed(e.target.value, setWeight)} />
        <Input label={t('Lichaamsvet (%)', 'Body fat (%)')} optional={t('optioneel', 'optional')} inputMode="decimal" autoComplete="off" value={fat} error={fieldError.bodyFatPct} hint={t(`Tussen ${METRICS.bodyFatPct.min} en ${METRICS.bodyFatPct.max}%, of leeg.`, `Between ${METRICS.bodyFatPct.min} and ${METRICS.bodyFatPct.max}%, or leave empty.`)} onChange={(e) => typed(e.target.value, setFat)} />
        <Input label={t('Lengte (cm)', 'Height (cm)')} optional={t('optioneel', 'optional')} inputMode="decimal" autoComplete="off" value={height} error={fieldError.heightCm} hint={t(`Tussen ${METRICS.heightCm.min} en ${METRICS.heightCm.max} cm, of leeg.`, `Between ${METRICS.heightCm.min} and ${METRICS.heightCm.max} cm, or leave empty.`)} onChange={(e) => typed(e.target.value, setHeight)} />
      </Card>
      <Button size="xl" className="w-full" loading={busy} onClick={save}>{t('Opslaan', 'Save')}</Button>
    </div>
  );
}

const SKILL_ICON: Record<SkillKey, LucideIcon> = {
  strength: Dumbbell, mobility: Move, balance: PersonStanding, stability: Shield, power: Zap,
  endurance: HeartPulse, sport: Trophy, discipline: CalendarCheck, recovery: Sparkles, knowledge: BookOpen,
};

function estimateSentence(kg: number | null, pct: number | null, name: string, t: (nl: string, en: string) => string) {
  if (kg === null) return null;
  const shown = Math.round(kg);
  const arrow = pct === null ? '' : pct > 0 ? ` ↑ ${pct}% sinds start` : pct < 0 ? ` ↓ ${Math.abs(pct)}% sinds start` : ' → 0% sinds start';
  const arrowEn = pct === null ? '' : pct > 0 ? ` ↑ ${pct}% since the start` : pct < 0 ? ` ↓ ${Math.abs(pct)}% since the start` : ' → 0% since the start';
  return <span className="block text-[14px] text-ink-800"><span className="font-medium">{name}: </span>{t(`Geschat maximum: ${shown} kg${arrow}`, `Estimated maximum: ${shown} kg${arrowEn}`)}</span>;
}

/** RuneScape-style skills: every skill levels from 1 to 99 on its own. A locked skill is not level 1. */
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
          const name = nl ? meta.nl : meta.en;
          const reason = k.locked ? skillLockLabel(k.reason, k.phase, nl) : null;
          return (
            <li key={k.key}>
              <button
                type="button"
                onClick={() => setOpen(k.key)}
                className="tap flex min-h-[96px] w-full flex-col items-center justify-center gap-1 rounded-xl border border-line bg-canvas p-2 text-center hover:border-ink-300"
              >
                {reason ? <Lock className="h-5 w-5 text-ink-500" aria-hidden /> : <Icon className="h-5 w-5 text-accent" aria-hidden />}
                <span className="w-full break-words text-[12.5px] font-medium leading-tight text-ink-700">{name}</span>
                {reason ? (
                  <span className="w-full break-words text-[11.5px] font-semibold leading-tight text-ink-700">{reason}</span>
                ) : (
                  <>
                    <span className="font-display text-[20px] font-bold leading-none tabular-nums text-ink-950"><span className="sr-only">level </span>{k.level}<span className="text-[12px] font-medium text-ink-500">/99</span></span>
                    <span className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100" aria-hidden><span className="block h-full rounded-full bg-accent" style={{ width: `${k.progress * 100}%` }} /></span>
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <Dialog open={!!sel} onClose={() => setOpen(null)} size="sm" title={sel && info ? (sel.locked ? `${nl ? info.nl : info.en} · ${skillLockLabel(sel.reason, sel.phase, nl)}` : `${nl ? info.nl : info.en} · level ${sel.level}`) : ''}
        footer={<Button onClick={() => setOpen(null)}>{t('Sluiten', 'Close')}</Button>}>
        {sel && info && (
          <div className="space-y-3 text-[15px]">
            {sel.locked ? (
              <>
                <p className="text-ink-700">{skillLockLabel(sel.reason, sel.phase, nl)}. {nl ? info.howNl : info.howEn}</p>
                {(sel.key === 'power' || sel.key === 'sport') && <p className="text-[14px] text-ink-600">{t('Je fysiotherapeut zet dit vrij zodra je er veilig aan toe bent.', 'Your physiotherapist unlocks this once you are ready for it safely.')}</p>}
                <SkillActions skill={sel.key} onGo={() => setOpen(null)} />
              </>
            ) : (
              <>
                <p className="text-ink-700">{t('Zo train je deze skill:', 'How to train this skill:')} {nl ? info.howNl : info.howEn}</p>
                {skillTitle(sel.key, sel.level, nl) && <p className="font-semibold text-ink-900">{skillTitle(sel.key, sel.level, nl)}</p>}
                {sel.key === 'discipline' && d.disciplineStreak > 0 && <p className="text-ink-700">{t(`Reeks: ${d.disciplineStreak} volle weken. Eén vrije week per 8 weken telt niet als breuk.`, `Run: ${d.disciplineStreak} full weeks. One free week per 8 weeks does not break it.`)}</p>}
                {sel.key === 'strength' && sel.ceiling && <StrengthCeiling c={sel.ceiling} />}
                {sel.key === 'strength' && d.strengthEstimates.length > 0 && (
                  <ul className="space-y-1">
                    {d.strengthEstimates.map((e) => (
                      <li key={e.exerciseId}>{estimateSentence(e.latestKg, e.progressPct, nl ? e.nameNl : e.nameEn, t)}</li>
                    ))}
                  </ul>
                )}
                <SkillActions skill={sel.key} onGo={() => setOpen(null)} />
                <div>
                  <div className="flex justify-between text-[14px]"><span>{sel.xp} XP</span><span className="text-ink-600">{sel.level < 99 ? t(`nog ${sel.to - sel.xp} XP tot level ${sel.level + 1}`, `${sel.to - sel.xp} XP to level ${sel.level + 1}`) : t('Maximaal level!', 'Maximum level!')}</span></div>
                  <ProgressBar value={sel.progress} className="mt-1.5 h-2.5" label={t('Voortgang naar het volgende level', 'Progress to the next level')} />
                </div>
              </>
            )}
          </div>
        )}
      </Dialog>
    </section>
  );
}

/** Where to earn XP for a skill: one or two buttons straight to the right place. */
const SKILL_ACTIONS: Partial<Record<SkillKey, { to: string; nl: string; en: string }[]>> = {
  strength: [{ to: '/p/krachtlog', nl: 'Log een set in de Krachtlog', en: 'Log a set in the strength log' }, { to: '/p/kracht', nl: 'Start een krachtprogramma', en: 'Start a strength programme' }],
  mobility: [{ to: '/p/mobiliteit', nl: 'Start een mobiliteitsprogramma', en: 'Start a mobility programme' }, { to: '/p/mobiliteit/meten', nl: 'Meet je mobiliteit (1× per 2 weken XP)', en: 'Measure your mobility (XP once per 2 weeks)' }],
  balance: [{ to: '/p/logboek', nl: 'Log een eigen training', en: 'Log your own workout' }],
  stability: [{ to: '/p/krachtlog', nl: 'Log bijv. een plank in de Krachtlog', en: 'Log e.g. a plank in the strength log' }, { to: '/p/logboek', nl: 'Log een eigen training', en: 'Log your own workout' }],
  endurance: [{ to: '/p/logboek', nl: 'Log een eigen training', en: 'Log your own workout' }],
  knowledge: [{ to: '/p/spieren?tab=quiz', nl: 'Doe de quiz in de spierenatlas', en: 'Take the muscle atlas quiz' }],
  discipline: [{ to: '/p', nl: 'Naar je training van vandaag', en: 'To today’s workout' }],
  recovery: [{ to: '/p/held/pijn', nl: 'Doe je dagcheck', en: 'Do your daily check-in' }],
};
function SkillActions({ skill, onGo }: { skill: SkillKey; onGo: () => void }) {
  const { t } = useI18n();
  const acts = SKILL_ACTIONS[skill] ?? [];
  if (!acts.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {acts.map((a, i) => (
        <Link key={a.to} to={a.to} onClick={onGo} className={cn('tap inline-flex min-h-[48px] items-center justify-between gap-2 rounded-xl px-4 text-[15px] font-semibold', i === 0 ? 'bg-accent text-accent-ink' : 'border border-line bg-white text-ink-900')}>
          {t(a.nl, a.en)}<ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      ))}
    </div>
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
          <Link to="/p/wereld" className="mt-3 inline-flex min-h-[44px] items-center gap-2 font-semibold text-accent">
            <MapPin className="h-4 w-4" aria-hidden />{t('Open de wereldkaart', 'Open the world map')}
          </Link>
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
          {q.phases.length > 0 && <RehabRoute phases={q.phases} currentNo={q.phaseNo} />}
          <Link to="/p/wereld" className="mt-4 inline-flex min-h-[44px] items-center gap-2 font-semibold text-accent">
            <MapPin className="h-4 w-4" aria-hidden />{t('Open de wereldkaart', 'Open the world map')}
          </Link>
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
  // No preset score: a pre-filled number nudges people towards it.
  const [score, setScore] = useState<number | null>(d.checkin.today?.score ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = BODY_AREAS.find((a) => a.key === d.checkin.area);
  const question = area ? t(`Hoe voelt je ${area.nl.toLowerCase()} vandaag?`, `How does your ${area.en.toLowerCase()} feel today?`) : t('Hoeveel pijn of ongemak heb je vandaag?', 'How much pain or discomfort do you have today?');
  const save = async () => {
    if (score === null) {
      setError(t('Kies eerst een getal van 0 tot 10.', 'Choose a number from 0 to 10 first.'));
      return;
    }
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
      <div className="mt-3">
        <ScaleInput tone="pain" label={score === null ? t('Tik je score', 'Tap your score') : t(`Score vandaag: ${score}/10 · ${painWord(score, nl)}`, `Score today: ${score}/10 · ${painWord(score, nl)}`)} lowLabel={t('0 = geen pijn', '0 = no pain')} highLabel={t('10 = ergst denkbaar', '10 = worst imaginable')} value={score} onChange={(v) => { setScore(v); setError(null); }} />
      </div>
      <Button size="lg" className="mt-3 w-full" loading={busy} disabled={score === null} onClick={save}>{t('Opslaan', 'Save')}</Button>
    </section>
  );
}

/**
 * Weekly boss: this week's monster and its health. Training days and check-ins do the damage; doing
 * what is planned is enough. Compact on Vandaag, full on the hero page.
 */
const monthName = (month: string, locale: string, year = true) => new Date(month + '-15T12:00:00').toLocaleDateString(locale === 'nl' ? 'nl-NL' : 'en-GB', year ? { month: 'long', year: 'numeric' } : { month: 'long' });

/**
 * This month's season: the season boss falls after three bosses of the week in the month.
 * Won seasons stay as trophies. Same fair rules as the weekly boss.
 */
export function SeasonCard({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const s = d.weekly.season;
  if (!s) return null;
  const meta = SEASONS.find((x) => x.key === s.key)!;
  const boss = nl ? meta.bossNl : meta.bossEn;
  const beaten = Math.min(s.bossesBeaten, s.goal);
  return (
    <section id="seizoen" className="scroll-mt-20 overflow-hidden rounded-2xl border border-line bg-white shadow-card" aria-labelledby="season-title">
      <div className="bg-[linear-gradient(135deg,#29483c_0%,#3d6150_100%)] p-4 text-white">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-white/80">{t('Seizoen', 'Season')} · {monthName(s.month, locale)}</p>
        <h2 id="season-title" className="font-display text-[20px] font-bold leading-tight text-white">{nl ? meta.nl : meta.en}: {boss}</h2>
        <p className="mt-0.5 text-[14px] italic text-white/85">{s.won ? t('“Mijn seizoen is voorbij… jij wint.”', '“My season is over… you win.”') : `“${t(meta.taunt[0], meta.taunt[1])}”`}</p>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <p className="mb-2 text-[14px] font-medium text-ink-800">{s.won ? t(`Verslagen! +${s.xp} XP en een seizoensprijs.`, `Defeated! +${s.xp} XP and a season trophy.`) : t(`Versla ${s.goal} bazen van de week deze maand`, `Beat ${s.goal} bosses of the week this month`)}</p>
          <ol className="flex gap-2" aria-label={t(`${beaten} van ${s.goal} weekbazen verslagen`, `${beaten} of ${s.goal} weekly bosses beaten`)}>
            {Array.from({ length: s.goal }, (_, i) => (
              <li key={i} className={cn('flex h-11 flex-1 items-center justify-center rounded-xl border-2 text-[13px] font-semibold', i < beaten ? 'border-accent bg-accent-soft text-accent' : 'border-dashed border-line bg-canvas text-ink-500')} aria-hidden>
                {i < beaten ? <Check className="h-5 w-5" /> : `${t('Week', 'Week')} ${i + 1}`}
              </li>
            ))}
          </ol>
        </div>
        <p className="text-[13px] text-ink-600">{t('Doe wat gepland staat: extra trainen telt niet, een rustweek kost niets.', 'Do what is planned: extra training does not count, a rest week costs nothing.')}</p>
        {s.trophies.length > 0 && (
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink-800">{t(`Seizoensprijzen (${s.trophies.length})`, `Season trophies (${s.trophies.length})`)}</p>
            <ul className="flex flex-wrap gap-1.5">
              {s.trophies.map((x) => {
                const m = SEASONS.find((y) => y.key === x.key)!;
                return <li key={x.month} className="inline-flex items-center gap-1 rounded-full bg-sand-soft px-2.5 py-1 text-[12.5px] font-semibold text-sand-ink"><Trophy className="h-3.5 w-3.5" aria-hidden />{nl ? m.nl : m.en} · {monthName(x.month, locale)}</li>;
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export function BossCard({ d, compact = false }: { d: HeroState; compact?: boolean }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const b = d.weekly.boss;
  const [artFailed, setArtFailed] = useState(false);
  if (!b) return null;
  const meta = BOSSES.find((x) => x.key === b.key)!;
  const left = b.hp - b.damage;
  const name = nl ? meta.nl : meta.en;
  const art = !artFailed && <img src={`/api/hero-assets/award/boss_${b.key}`} alt="" loading="lazy" onError={() => setArtFailed(true)} className={cn('h-full w-full object-contain drop-shadow-[0_3px_4px_rgba(0,0,0,0.25)]', b.defeated && 'opacity-50 grayscale')} />;
  const bar = (
    <div className="h-3 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={b.hp} aria-valuenow={left} aria-label={t(`Leven van ${name}`, `${name}'s health`)}>
      <div className="h-full rounded-full bg-[#c2410c] transition-[width] duration-500" style={{ width: `${(left / b.hp) * 100}%` }} />
    </div>
  );
  if (compact) {
    return (
      <Link to="/p/held#boss" className="tap flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#f3e9e2_0%,#fff_100%)]" aria-hidden>{art || <Swords className="h-6 w-6 text-[#c2410c]" />}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold uppercase tracking-wide text-ink-600">{t('Baas van de week', 'Boss of the week')}</span>
          <span className="block truncate font-semibold text-ink-900">{b.defeated ? t(`${name} is verslagen!`, `${name} is defeated!`) : name}</span>
          <span className="mt-1 block">{bar}</span>
        </span>
        <span className="shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink-700">{b.defeated ? `+${b.xp} XP` : `${left}/${b.hp}`}</span>
      </Link>
    );
  }
  return (
    <section id="boss" className="scroll-mt-20 overflow-hidden rounded-2xl border border-line bg-white shadow-card" aria-labelledby="boss-title">
      <div className="flex items-center gap-4 bg-[linear-gradient(180deg,#f3e9e2_0%,#fff_100%)] p-4">
        <span className="flex h-24 w-24 shrink-0 items-center justify-center" aria-hidden>{art || <Swords className="h-10 w-10 text-[#c2410c]" />}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-600">{t('Baas van de week', 'Boss of the week')}</p>
          <h2 id="boss-title" className="font-display text-[20px] font-bold leading-tight text-ink-950">{name}</h2>
          <p className="mt-0.5 text-[14px] italic text-ink-600">{b.defeated ? t('“Nee! Je was te sterk…”', '“No! You were too strong…”') : `“${t(meta.taunt[0], meta.taunt[1])}”`}</p>
        </div>
      </div>
      <div className="space-y-3 p-4 pt-3">
        <div>
          <div className="mb-1 flex justify-between text-[14px] font-medium text-ink-700">
            <span>{b.defeated ? t('Verslagen!', 'Defeated!') : t('Leven', 'Health')}</span>
            <span className="tabular-nums">{left} / {b.hp}</span>
          </div>
          {bar}
        </div>
        <ul className="space-y-1.5 text-[14.5px] text-ink-800">
          {b.hits.map((h) => (
            <li key={h.source} className="flex items-center gap-2">
              {h.count >= h.max ? <CircleCheck className="h-5 w-5 shrink-0 text-ok" aria-hidden /> : <Target className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />}
              <span className="min-w-0 flex-1">{h.source === 'train' ? t(`Trainingsdagen ${h.count}/${h.max}`, `Training days ${h.count}/${h.max}`) : t(`Dagchecks ${h.count}/${h.max}`, `Daily check-ins ${h.count}/${h.max}`)}</span>
              <span className="shrink-0 font-semibold tabular-nums text-[#9a3412]">−{h.damage}</span>
            </li>
          ))}
        </ul>
        <p className={cn('rounded-lg px-3 py-2.5 text-[14px]', b.defeated ? 'bg-sand-soft font-semibold text-sand-ink' : 'bg-canvas text-ink-700')}>
          {b.defeated ? t(`Gewonnen: +${b.xp} XP (en dus muntjes). Volgende week wacht een nieuwe baas.`, `Won: +${b.xp} XP (and so coins). A new boss waits next week.`) : t(`Versla hem met je geplande trainingen en twee dagchecks: +${b.xp} XP. Extra trainen doet geen extra schade; rust is ook training.`, `Beat it with your planned workouts and two check-ins: +${b.xp} XP. Extra training does no extra damage; rest is training too.`)}
        </p>
        {(d.weekly.bossesDefeated ?? 0) > 0 && <p className="text-[13px] text-ink-600">{t(`Bazen verslagen: ${d.weekly.bossesDefeated}`, `Bosses defeated: ${d.weekly.bossesDefeated}`)}</p>}
      </div>
    </section>
  );
}

/**
 * Day chest: after today's check-in or a workout, open it for a few coins (more for days in a row).
 * The server decides the amount; opening is once a day.
 */
export function DayChestCard({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const [artFailed, setArtFailed] = useState(false);
  const c = d.chest;
  if (!c) return null;
  const open = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ coins: number }>('/patient/hero/chest');
      setWon(r.coins);
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  const opened = c.opened ?? (won !== null ? { coins: won } : null);
  const art = !artFailed && <img src={`/api/hero-assets/award/chest_${opened ? 'open' : 'closed'}`} alt="" loading="lazy" onError={() => setArtFailed(true)} className={cn('h-full w-full object-contain', won !== null && 'motion-safe:animate-[bounce_0.6s_ease-out_2]', !opened && !c.available && 'opacity-60 grayscale')} />;
  return (
    <section className={cn('flex items-center gap-3 rounded-2xl border p-3 shadow-card', opened ? 'border-line bg-white' : c.available ? 'border-sand/40 bg-sand-soft' : 'border-line bg-white')} aria-labelledby="chest-title">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center" aria-hidden>{art || <Gift className="h-8 w-8 text-sand-ink" />}</span>
      <div className="min-w-0 flex-1">
        <h2 id="chest-title" className="font-semibold text-ink-900">{t('Dagkist', 'Day chest')}{c.streak > 1 ? <span className="ml-1.5 text-[13px] font-medium text-ink-600">{t(`· ${c.streak} dagen op rij`, `· ${c.streak} days in a row`)}</span> : null}</h2>
        {opened ? (
          <p className="text-[14.5px] text-ink-700" role={won !== null ? 'status' : undefined}>{t(`+${opened.coins} muntjes vandaag. Morgen weer een kist!`, `+${opened.coins} coins today. Another chest tomorrow!`)}</p>
        ) : c.available ? (
          <p className="text-[14.5px] text-ink-700">{t('Je hebt hem verdiend. Wat zit erin?', 'You earned it. What’s inside?')}</p>
        ) : (
          <p className="text-[14.5px] text-ink-600">{t('Doe je dagcheck of een training om hem te openen.', 'Do your check-in or a workout to open it.')}</p>
        )}
      </div>
      {!opened && c.available && <Button size="lg" loading={busy} onClick={open}>{t('Openen', 'Open')}</Button>}
    </section>
  );
}

/** Day chest on Vandaag, once the patient has a hero. */
export function DayChestHomeCard() {
  const q = useHero();
  // Vandaag only shows the chest when it can be opened (and keeps it while you open it). Locked
  // ("do your check-in first") or already opened, it lives on the hero page.
  const ready = useRef(false);
  const c = q.data?.chest;
  if (c?.available && !c.opened) ready.current = true;
  if (!q.data?.hero || !ready.current) return null;
  return <DayChestCard d={q.data} />;
}

/** Everything the hero has collected, at a glance: coins, trophies, badges, bosses. Each tile opens where it lives. */
function HeroTotals({ d }: { d: HeroState }) {
  const { t } = useI18n();
  const trophies = d.trophies.filter((x) => x.earned).length;
  const badges = d.badges.filter((b) => b.earned).length;
  const tiles = [
    { to: '/p/held/inventaris', icon: Coins, value: d.gear.coins, label: t('muntjes', 'coins') },
    { to: '/p/held/inventaris#trophies-title', icon: Trophy, value: `${trophies}/${d.trophies.length}`, label: t('prijzen', 'trophies') },
    { to: '/p/held#fold-hero-badges', icon: Award, value: `${badges}/${d.badges.length}`, label: t('badges', 'badges') },
    { to: '/p/held#boss', icon: Swords, value: d.weekly.bossesDefeated ?? 0, label: t('bazen', 'bosses') },
  ];
  return (
    <ul className="mt-3 grid grid-cols-4 gap-1.5" aria-label={t('Verzameld', 'Collected')}>
      {tiles.map((x) => (
        <li key={x.label}>
          <Link to={x.to} className="tap flex min-h-[64px] flex-col items-center justify-center rounded-xl bg-canvas px-1 py-2 text-center hover:bg-ink-100">
            <x.icon className="h-4 w-4 text-sand-ink" aria-hidden />
            <span className="mt-0.5 font-display text-[16px] font-bold leading-none tabular-nums text-ink-950">{x.value}</span>
            <span className="mt-0.5 text-[11.5px] text-ink-600"><span className="sr-only"> </span>{x.label}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The boss on Vandaag, once the patient has a hero. */
export function BossHomeCard() {
  const q = useHero();
  if (!q.data?.hero) return null;
  return <BossCard d={q.data} compact />;
}

/** This week's three quests and the week chest. */
function WeeklyQuests({ d }: { d: HeroState }) {
  const { t } = useI18n();
  const w = d.weekly;
  const label = (q: HeroState['weekly']['quests'][number]) => {
    if (q.key === 'train') return q.target === 1 ? t('Doe 1 training', 'Do 1 workout') : t(`Train ${q.target} dagen`, `Train on ${q.target} days`);
    if (q.key === 'checkin') return t('Doe een dagcheck of werk je pijnkaart bij', 'Do a daily check-in or update your body map');
    const sk = SKILLS.find((k) => k.key === q.skill)!;
    return q.byTherapist
      ? t(`Gekozen door je fysiotherapeut: 2 oefeningen voor ${sk.nl}`, `Chosen by your physiotherapist: 2 exercises for ${sk.en}`)
      : t(`Skill van de week: doe 2 oefeningen voor ${sk.nl}`, `Skill of the week: do 2 exercises for ${sk.en}`);
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
          <li key={q.key}>
            <QuestRow to={w.links?.[q.key] ?? null} done={q.done}>
              {q.done ? <CircleCheck className="h-6 w-6 shrink-0 text-ok" aria-hidden /> : <Target className="h-6 w-6 shrink-0 text-ink-500" aria-hidden />}
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-medium text-ink-900">{label(q)}</span>
                <span className="block text-[13px] text-ink-600">{q.progress}/{q.target} · +{w.xpPerQuest} XP{q.done ? t(' · gehaald', ' · done') : ''}</span>
              </span>
              {w.links?.[q.key] && <ChevronRight className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />}
            </QuestRow>
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

/** A quest row; links to the page where the quest is done (today's training, body map, an exercise). */
function QuestRow({ to, done, children }: { to: string | null; done: boolean; children: React.ReactNode }) {
  const cls = cn('flex min-h-[44px] items-center gap-3 rounded-xl border p-3', done ? 'border-ok/30 bg-ok-soft' : 'border-line');
  return to ? <Link to={to} className={cn(cls, 'transition hover:border-ink-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--accent))]')}>{children}</Link> : <div className={cls}>{children}</div>;
}

/** Gear: bought in the shop with coins earned by training; the patient chooses what the hero wears. */
/** Product photo of a gear item (generated art); a lock or crown icon when there is none. */

/**
 * Inventory: every piece of gear in a grid. Unlocked pieces in colour, tap to wear or take off;
 * locked pieces in grey with a lock and how to unlock them; future rewards at the bottom.
 */
function GearCard({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loot, setLoot] = useState<string | null>(null);
  const [cape, setCape] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'shop'>('all');
  const save = async (next: string[], key: string) => {
    setBusy(key);
    try {
      await api.put('/patient/hero/gear', { equipped: next });
      setPreview(null);
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };
  const buy = async (key: string) => {
    setBusy(key);
    try {
      await api.post('/patient/hero/shop', { item: key });
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
      const g = GEAR.find((x) => x.key === key)!;
      setPreview(null);
      setLoot(key);
      toast(t(`${g.nl} gekocht en aangedaan`, `${g.en} bought and put on`), 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(null);
    }
  };
  // One piece per slot: wearing a new cap takes the old one off.
  const toggle = (key: string) => save(d.gear.equipped.includes(key) ? d.gear.equipped.filter((g) => g !== key) : onePerSlot([...d.gear.equipped, key]), key);
  const owned = (k: string) => d.gear.owned.includes(k);
  const items = [...GEAR].sort((a, b) => Number(owned(b.key)) - Number(owned(a.key)) || a.tier - b.tier || a.score - b.score);
  const shown = items.filter((g) => filter === 'all' || (filter === 'open') === owned(g.key));
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="gear-title">
      <h2 id="gear-title" className="t-section">{t(`Uitrusting (${d.gear.owned.length} van ${GEAR.length})`, `Gear (${d.gear.owned.length} of ${GEAR.length})`)}</h2>
      <GearStats d={d} />
      <p className="mt-2 text-[13.5px] text-ink-600">{t('Verzamel je eigen uitrusting. Tier toont de zeldzaamheid; itemlevel is de cosmetische waarde die meetelt voor je gearscore. Je hoeft geen hoger heldlevel te halen om een item te dragen.', 'Collect your own equipment. Tier shows rarity; item level is the cosmetic value contributing to your gear score. No hero-level requirement applies to wearing items.')}</p>

      <ul className="my-3 flex flex-wrap gap-2" aria-label={t('Uitrustingstiers', 'Equipment tiers')}>
        {GEAR_TIERS.map(tier => <li key={tier.key} className="rounded-lg border bg-white px-2 py-1 text-xs" style={{borderColor:tier.glow,color:tier.color}}>
          <span className="font-semibold">{tier.tier} · {nl ? tier.nl : tier.en}</span>
          <span className="ml-1">{(tier.tier-1)*20+1}–{tier.tier*20}</span>
        </li>)}
      </ul>
      <CharacterScreen d={d} onPreview={setPreview} preview={preview} busy={busy} onSave={save} onBuy={buy} />

      {preview && <div className="my-3 flex flex-wrap items-center gap-3" role="status"><span>{t('Paskamer — nog niet gekocht:', 'Preview — not purchased:')} {nl ? GEAR.find(g=>g.key===preview)?.nl : GEAR.find(g=>g.key===preview)?.en}</span><Button variant="secondary" onClick={()=>setPreview(null)}>{t('Preview sluiten','Close preview')}</Button></div>}
      <Dialog open={!!loot} onClose={()=>setLoot(null)} title={t('Nieuw in je collectie','New in your collection')} footer={<Button onClick={()=>setLoot(null)}>{t('Verder','Continue')}</Button>}>
        {loot && <div className="rpg-loot text-center" style={{'--gear-color':GEAR_TIERS[(GEAR.find(g=>g.key===loot)?.tier ?? 1)-1].glow} as CSSProperties}><div className="mx-auto h-40 w-40"><GearImg gearKey={loot}/></div><p className="font-bold">{nl ? GEAR.find(g=>g.key===loot)?.nl : GEAR.find(g=>g.key===loot)?.en}</p><p>{t('Je nieuwe item is aangetrokken.','Your new item is equipped.')}</p></div>}
      </Dialog>
      <div className="mt-4">
        <Segmented label={t('Toon', 'Show')} value={filter} onChange={setFilter} size="sm"
          options={[
            { value: 'all', label: t(`Alles (${GEAR.length})`, `All (${GEAR.length})`) },
            { value: 'open', label: t(`Mijn tas (${d.gear.owned.length})`, `My bag (${d.gear.owned.length})`) },
            { value: 'shop', label: t(`Winkel (${GEAR.length - d.gear.owned.length})`, `Shop (${GEAR.length - d.gear.owned.length})`) },
          ]} />
      </div>
      <ul className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
        {shown.map((g) => (
          <li key={g.key}>
            <GearTile g={g} d={d} busy={busy} onPreview={() => setPreview(g.key)} onToggle={() => toggle(g.key)} onBuy={() => buy(g.key)} />
          </li>
        ))}
      </ul>

      <Dialog open={cape} onClose={()=>setCape(false)} title={t('Meestercape — ontwerpvoorproefje','Master cape — design preview')} footer={<Button onClick={()=>setCape(false)}>{t('Sluiten','Close')}</Button>}>
        <p>{t('Toekomstige cosmetische beloning. Nog niet te verdienen of uit te rusten.','Future cosmetic reward. Not yet available to earn or equip.')}</p>
        <div className="rpg-stage rounded-xl mt-3"><HumanFigure rpg look={{...d.hero!,gear:['master_cape']}} viewBox="0 -10 200 440" className="mx-auto h-[400px]"/></div>
      </Dialog>
      <h3 className="mt-5 text-[14.5px] font-semibold text-ink-900">{t('Komt eraan', 'Coming up')}</h3>
      <ul className="mt-2 grid grid-cols-2 gap-2 min-[520px]:grid-cols-4">
        {FUTURE_REWARDS.map((r) => (
          <li key={r.key} className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-canvas p-2.5 text-[12.5px] text-ink-600">
            <Lock className="h-4 w-4 shrink-0 text-ink-500" aria-hidden />
            <span className="min-w-0"><span className="block font-semibold text-ink-700">{nl ? r.nl : r.en}</span>{t(`Skill level ${r.level}`, `Skill level ${r.level}`)}{r.key === 'master_cape' && <button type="button" onClick={()=>setCape(true)} className="block min-h-[44px] underline text-accent">{t('Ontwerp bekijken','View design')}</button>}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

type GearItem = (typeof GEAR)[number];

/** Coins (private) and gear score of what the hero wears. */
function GearStats({ d }: { d: HeroState }) {
  const { t } = useI18n();
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <span className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-sand-soft px-3 text-[14px] font-semibold text-sand-ink">
        <Coins className="h-4 w-4" aria-hidden />{t(`${d.gear.coins} muntjes`, `${d.gear.coins} coins`)}
        <span className="inline-flex items-center gap-0.5 text-[11.5px] font-medium opacity-80"><Lock className="h-3 w-3" aria-hidden />{t('privé', 'private')}</span>
      </span>
      <span className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-accent-soft px-3 text-[14px] font-semibold text-accent">
        <Shield className="h-4 w-4" aria-hidden />{t(`Gearscore ${d.gear.score}`, `Gear score ${d.gear.score}`)}
      </span>
    </div>
  );
}

/** Tier name in its colour plus the item's tier score. */
function TierTag({ g }: { g: GearItem }) {
  const { locale } = useI18n();
  const tier = GEAR_TIERS[g.tier - 1];
  return (
    <span className="gear-labels">
      <span className="gear-rarity" style={{color:tier.color}}>Tier {g.tier} · {locale === 'nl' ? tier.nl : tier.en}</span>
      <span className="gear-level">{locale === 'nl' ? 'Itemlevel' : 'Item level'} {g.itemLevel}</span>
    </span>
  );
}

/** One item: owned → wear / take off; not owned → buy with coins. */
function GearTile({ g, d, busy, onToggle, onBuy, onPreview }: { onPreview?: () => void; g: GearItem; d: HeroState; busy: string | null; onToggle: () => void; onBuy: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const name = nl ? g.nl : g.en;
  const tier = GEAR_TIERS[g.tier - 1];
  if (d.gear.owned.includes(g.key)) {
    const on = d.gear.equipped.includes(g.key);
    return (
      <button type="button" aria-pressed={on} disabled={busy !== null} onClick={onToggle}
        data-tier={g.tier} data-item={g.key}
        className={cn('gear-tile tap relative flex h-full w-full flex-col items-center gap-1 rounded-xl border-2 p-2 text-center transition-colors', on ? 'border-accent bg-accent-soft' : 'bg-white hover:border-ink-300')}
        style={{'--gear-color':tier.glow,borderColor:tier.color} as CSSProperties}>
        <span className="gear-art block h-20 w-20 overflow-hidden rounded-lg" aria-hidden><GearImg gearKey={g.key} /></span>
        <span className="max-w-full text-[12.5px] font-semibold leading-tight text-ink-900 [hyphens:auto] [overflow-wrap:anywhere]" lang={locale}>{name}</span>
        <TierTag g={g} />
        <span className={cn('text-[11.5px] font-medium', on ? 'text-accent' : 'text-ink-600')}>{on ? t('Uittrekken ✓', 'Unequip ✓') : t('Aandoen', 'Wear')}</span>
      </button>
    );
  }
  const short = g.price - d.gear.coins;
  return (
    <div data-tier={g.tier} data-item={g.key} className="gear-tile flex h-full flex-col items-center gap-1 rounded-xl border-2 bg-canvas p-2 text-center" style={{'--gear-color':tier.glow,borderColor:tier.color} as CSSProperties}>
      <span className="gear-art block h-20 w-20 overflow-hidden rounded-lg" aria-hidden><GearImg gearKey={g.key} className={short > 0 ? 'opacity-60' : ''} /></span>
      <span className="max-w-full text-[12.5px] font-semibold leading-tight text-ink-800 [hyphens:auto] [overflow-wrap:anywhere]" lang={locale}>{name}</span>
      <TierTag g={g} />
      {onPreview && <Button variant="secondary" size="sm" onClick={onPreview} aria-label={t(`Passen: ${name}`, `Try on: ${name}`)}>{t('Passen', 'Try on')}</Button>}
      {short > 0 ? (
        <span className="mt-auto inline-flex flex-wrap items-center justify-center gap-x-1 text-[11.5px] leading-tight text-ink-600"><span className="inline-flex items-center gap-0.5 font-semibold text-ink-800"><Coins className="h-3.5 w-3.5" aria-hidden />{g.price}</span>{t(`nog ${short} nodig`, `${short} more needed`)}</span>
      ) : (
        <Button size="sm" className="mt-auto min-h-[44px] w-full" loading={busy === g.key} disabled={busy !== null} onClick={onBuy}
          aria-label={t(`Kopen ${g.price} muntjes: ${name}`, `Buy ${g.price} coins: ${name}`)}>
          <Coins className="h-4 w-4" aria-hidden />{g.price}
        </Button>
      )}
    </div>
  );
}

const slotLabel = (k: GearSlot, nl: boolean) => { const s = GEAR_SLOTS.find((x) => x.key === k)!; return nl ? s.nl : s.en; };

/**
 * Character screen (RPG paper doll): the hero photo in the middle, a slot per body part around it.
 * Tap a slot to pick from the pieces that fit there; locked ones are shown in grey.
 */
function CharacterScreen({ d, busy, onSave, onBuy, preview, onPreview }: { onPreview: (key:string)=>void; preview?: string | null; d: HeroState; busy: string | null; onSave: (next: string[], key: string) => Promise<void>; onBuy: (key: string) => Promise<void> }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [open, setOpen] = useState<GearSlot | null>(null);
  const [illustrated, setIllustrated] = useState(() => { try { return sessionStorage.getItem('fp.inventory.illustrated') === 'true'; } catch { return false; } });
  useEffect(() => { try { sessionStorage.setItem('fp.inventory.illustrated', String(illustrated)); } catch { /* storage optional */ } }, [illustrated]);
  const look = { ...d.hero!, gear: [...(preview ? onePerSlot([...d.gear.equipped, preview]) : d.gear.equipped), ...(d.aids ?? [])], body: d.metrics ? bodyShape(d.metrics, d.hero!.frame) : null, photo: d.customPhoto ?? null };
  const inSlot = (k: GearSlot) => d.gear.equipped.find((g) => GEAR_SLOT[g] === k) ?? null;
  const slotBtn = (k: GearSlot) => {
    const item = inSlot(k);
    const g = item ? GEAR.find((x) => x.key === item) : null;
    const free = GEAR.filter((x) => GEAR_SLOT[x.key] === k && d.gear.owned.includes(x.key)).length;
    return (
      <button key={k} type="button" onClick={() => setOpen(k)} data-tier={g?.tier} title={g ? `${nl ? g.nl : g.en} · Tier ${g.tier} · Itemlevel ${g.itemLevel}` : undefined} style={g ? {borderColor:GEAR_TIERS[g.tier-1].color} : undefined}
        aria-label={g ? t(`${slotLabel(k, true)}: ${g.nl}. Tier ${g.tier}, IL ${g.itemLevel}. Wijzigen`, `${slotLabel(k, false)}: ${g.en}. Tier ${g.tier}, IL ${g.itemLevel}. Change`) : t(`${slotLabel(k, true)}${free ? ` +${free}` : ''}: leeg${free ? `, ${free} beschikbaar` : ''}`, `${slotLabel(k, false)}${free ? ` +${free}` : ''}: empty${free ? `, ${free} available` : ''}`)}
        className={cn('tap relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 text-center', g ? 'border-accent bg-white' : 'border-dashed border-line bg-canvas')}>
        {g ? <><span className="absolute inset-1 bottom-4 overflow-hidden rounded-lg" aria-hidden><GearImg gearKey={g.key} /></span><span className="absolute bottom-0.5 rounded bg-white/95 px-1 text-[10px] font-bold text-ink-800" aria-hidden>IL {g.itemLevel}</span></> : (
          <span className="px-0.5 text-[10.5px] font-semibold uppercase leading-tight tracking-wide text-ink-500" aria-hidden>{slotLabel(k, nl)}{free > 0 && <span className="mt-0.5 block text-[10px] font-bold text-accent">+{free}</span>}</span>
        )}
      </button>
    );
  };
  const side = (s: 'left' | 'right') => GEAR_SLOTS.filter((x) => x.side === s).map((x) => slotBtn(x.key));
  const sel = open ? GEAR_SLOTS.find((x) => x.key === open)! : null;
  const options = open ? GEAR.filter((x) => GEAR_SLOT[x.key] === open) : [];
  return (
    <div className="rpg-stage mt-3 rounded-2xl p-3 sm:p-6">
      <TrophyWall d={d} compact className="mb-2" />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] text-ink-700">{t('Verander je outfit zonder je behandelschema te veranderen.', 'Change your outfit without changing your treatment.')}</p>
        <button type="button" onClick={() => setIllustrated(x => !x)} aria-pressed={illustrated} className="tap inline-flex min-h-[44px] items-center rounded-full border border-accent bg-white px-3 text-[13px] font-semibold text-accent hover:bg-accent-soft">
          {illustrated ? t('Fotoweergave', 'Photo view') : t('RPG-weergave', 'RPG view')}
        </button>
      </div>
      <div className="grid grid-cols-[44px_1fr_44px] sm:grid-cols-[64px_1fr_64px] items-start gap-2">
        <div className="grid gap-2">{side('left')}</div>
        {illustrated ? <span className="flex h-full min-h-[300px] min-w-0 items-center justify-center overflow-hidden rounded-2xl rpg-podium" role="img" aria-label={t('Je geïllustreerde held met je gedragen uitrusting', 'Your illustrated hero wearing equipped items')}><HumanFigure rpg look={look} viewBox="0 -10 200 440" className="h-[420px] sm:h-[520px] w-full max-w-[260px]" /></span> : <span role="img" aria-label={t('Je fotorealistische held met je gedragen uitrusting', 'Your photographic hero wearing equipped items')} className="min-w-0"><HeroPhoto fittedGear look={look} className="h-[420px] sm:h-[520px] w-full" /></span>}
        <div className="grid gap-2">{side('right')}</div>
      </div>
      <div className="mx-auto mt-2 grid w-[136px] grid-cols-2 gap-2">{GEAR_SLOTS.filter((x) => x.side === 'bottom').map((x) => slotBtn(x.key))}</div>
      <Dialog open={!!sel} onClose={() => setOpen(null)} size="sm" title={sel ? (nl ? sel.nl : sel.en) : ''}
        footer={<Button variant="secondary" onClick={() => setOpen(null)}>{t('Sluiten', 'Close')}</Button>}>
        {sel && (
          <ul className="grid grid-cols-2 gap-2">
            {options.map((g) => {
              const mine = d.gear.owned.includes(g.key);
              const on = d.gear.equipped.includes(g.key);
              return (
                <li key={g.key}>
                  <GearTile g={g} d={d} busy={busy} onPreview={GEAR_SLOT[g.key] === 'outfit' ? ()=>{onPreview(g.key);setOpen(null);} : undefined}
                    onToggle={async () => { await onSave(on ? d.gear.equipped.filter((x) => x !== g.key) : onePerSlot([...d.gear.equipped, g.key]), g.key); setOpen(null); }}
                    onBuy={async () => { await onBuy(g.key); if (!mine) setOpen(null); }} />
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>
    </div>
  );
}

const tierOf = (tier: string) => TROPHY_TIERS.find((x) => x.key === tier)!;
const skillName = (k: string, nl: boolean) => { const s = SKILLS.find((x) => x.key === k); return s ? (nl ? s.nl : s.en) : k; };

function TrophyIcon({ tier, earned = true, size = 'md', art }: { tier: string; earned?: boolean; size?: 'sm' | 'md'; art?: string }) {
  const c = tierOf(tier).color;
  const [failed, setFailed] = useState(false);
  // Artwork per skill and tier (Higgsfield); a drawn cup when it is missing.
  if (art && !failed) {
    return (
      <span className={cn('relative block', size === 'sm' ? 'h-11 w-11' : 'h-16 w-16')} aria-hidden>
        <img src={`/api/hero-assets/award/${art}`} alt="" loading="lazy" onError={() => setFailed(true)} className={cn('h-full w-full object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.2)]', !earned && 'opacity-30 grayscale')} />
        {!earned && <Lock className="absolute bottom-0 right-0 h-3.5 w-3.5 text-ink-600" />}
      </span>
    );
  }
  return (
    <span className={cn('flex items-center justify-center rounded-full', size === 'sm' ? 'h-9 w-9' : 'h-12 w-12', earned ? '' : 'bg-ink-100')} style={earned ? { background: `radial-gradient(circle at 35% 30%, #fff 0%, ${c}33 55%, ${c}55 100%)` } : undefined} aria-hidden>
      {earned ? <Trophy className={size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'} style={{ color: c }} strokeWidth={2.2} /> : (
        <span className="relative"><Trophy className="h-5 w-5 text-ink-300" /><Lock className="absolute -bottom-1 -right-1.5 h-3 w-3 text-ink-500" /></span>
      )}
    </span>
  );
}

/** Pin an earned badge on the wall behind the hero, or take it off. */
function WallToggle({ d, badge, name }: { d: HeroState; badge: string; name: string }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const pinned = d.wallBadges ?? [];
  const on = pinned.includes(badge);
  const toggle = async () => {
    if (!on && pinned.length >= WALL_BADGES_MAX) {
      toast(t(`Er passen ${WALL_BADGES_MAX} badges op je muur. Haal er eerst een af.`, `Your wall holds ${WALL_BADGES_MAX} badges. Take one off first.`), 'bad');
      return;
    }
    setBusy(true);
    try {
      await api.put('/patient/hero/wall-badges', { badges: on ? pinned.filter((k) => k !== badge) : [...pinned, badge] });
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" aria-pressed={on} disabled={busy} onClick={toggle}
      className={cn('tap mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border px-2 text-[13.5px] font-semibold', on ? 'border-accent bg-white text-accent' : 'border-line bg-white text-ink-700')}>
      <span className="sr-only">{name}: </span>{on ? t('Op je muur', 'On your wall') : t('Aan muur hangen', 'Hang on wall')}
    </button>
  );
}

/** Wall colours: a dark green wall with soft vertical planks, so trophies and badges stand out. */
const WALL_BG = 'bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_2px,transparent_2px,transparent_46px),linear-gradient(180deg,#22392f_0%,#2f4d40_55%,#3d6150_100%)]';
const wallPlaced = (d: HeroState) => d.showcase.length > 0 || (d.wallBadges ?? []).length > 0;
const badgeName = (k: string, nl: boolean) => { const b = BADGES.find((x) => x.key === k); return b ? (nl ? b.nl : b.en) : k; };

function WallBadge({ k, nl, compact }: { k: string; nl: boolean; compact: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex flex-col items-center" title={badgeName(k, nl)}>
      <span className={cn('relative flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff8e6_0%,#e9dcc0_70%,#c9b48a_100%)] shadow-[0_3px_6px_rgba(0,0,0,0.35)] ring-2 ring-[#b8946a]', compact ? 'h-10 w-10' : 'h-14 w-14')}>
        {/* the pin it hangs on */}
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#d4a72c] shadow" aria-hidden />
        {failed ? <Award className={cn('text-[#8a6a46]', compact ? 'h-5 w-5' : 'h-7 w-7')} aria-hidden /> : (
          <img src={`/api/hero-assets/award/badge_${k}`} alt="" loading="lazy" onError={() => setFailed(true)} className="h-[86%] w-[86%] object-contain" />
        )}
      </span>
      {!compact && <span className="mt-1 max-w-[72px] truncate text-[10.5px] font-semibold text-white/90">{badgeName(k, nl)}</span>}
    </span>
  );
}

/**
 * The wall behind the hero: the trophies the patient put on the shelf and the badges they pinned.
 * Shows nothing when nothing is placed; the patient chooses in the trophy cabinet and badge list.
 */
function TrophyWall({ d, compact = false, className }: { d: HeroState; compact?: boolean; className?: string }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  if (!wallPlaced(d)) return null;
  const shown = d.showcase.map((k) => d.trophies.find((x) => x.key === k)).filter(Boolean) as HeroState['trophies'];
  const badges = d.wallBadges ?? [];
  const left = badges.slice(0, Math.ceil(badges.length / 2));
  const right = badges.slice(Math.ceil(badges.length / 2));
  const label = [...shown.map((x) => `${skillName(x.skill, nl)} ${nl ? tierOf(x.tier).nl : tierOf(x.tier).en}`), ...badges.map((k) => badgeName(k, nl))].join(', ');
  return (
    <div className={cn('flex items-end justify-center gap-3', className)} role="img" aria-label={t(`Muur achter je held: ${label}`, `Wall behind your hero: ${label}`)}>
      {left.length > 0 && <div className="flex gap-2 pb-2">{left.map((k) => <WallBadge key={k} k={k} nl={nl} compact={compact} />)}</div>}
      {shown.length > 0 && (
        <div className="min-w-[96px]">
          <div className={cn('flex items-end justify-center gap-2 px-2', compact ? 'min-h-[44px]' : 'min-h-[64px]')}>
            {shown.map((x) => (
              <span key={x.key} className="flex flex-col items-center">
                <TrophyIcon tier={x.tier} size={compact ? 'sm' : 'md'} art={`${x.skill}_${x.level}`} />
                {!compact && <span className="mt-0.5 text-[10.5px] font-semibold text-white/90">{skillName(x.skill, nl)}</span>}
              </span>
            ))}
          </div>
          <div className="h-2 rounded-full bg-[linear-gradient(180deg,#c9a77a_0%,#8a6a46_100%)] shadow-[0_3px_0_rgba(0,0,0,0.3)]" />
        </div>
      )}
      {right.length > 0 && <div className="flex gap-2 pb-2">{right.map((k) => <WallBadge key={k} k={k} nl={nl} compact={compact} />)}</div>}
    </div>
  );
}

/** Trophy cabinet: every skill with its five trophies; tap an earned one to put it on the shelf. */
function TrophyCabinet({ d }: { d: HeroState }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const earnedCount = d.trophies.filter((x) => x.earned).length;
  // One shelf per skill: its five trophies, the level now and how far the next one is.
  const rows = SKILLS.filter((s) => d.trophies.some((x) => x.skill === s.key)).map((s) => {
    const list = d.trophies.filter((x) => x.skill === s.key);
    const sk = d.skills.find((x) => x.key === s.key);
    const level = sk?.level ?? 1;
    const next = list.find((x) => !x.earned) ?? null;
    const prev = [...list].reverse().find((x) => x.earned)?.level ?? 1;
    const won = list.filter((x) => x.earned).length;
    const progress = next ? Math.min(1, Math.max(0, (level - prev) / Math.max(1, next.level - prev))) : 1;
    return { s, list, level, next, won, progress, locked: !!sk?.locked };
  });
  // Skills with prizes first, then the ones closest to their next trophy.
  rows.sort((a, b) => b.won - a.won || Number(a.locked) - Number(b.locked) || b.progress - a.progress);
  const closest = rows.filter((r) => r.next && !r.locked).sort((a, b) => (a.next!.level - a.level) - (b.next!.level - b.level))[0];
  const toggle = async (key: string) => {
    const on = d.showcase.includes(key);
    if (!on && d.showcase.length >= SHOWCASE_MAX) {
      toast(t(`Er passen ${SHOWCASE_MAX} prijzen op je plank. Haal er eerst een af.`, `Your shelf holds ${SHOWCASE_MAX} trophies. Take one off first.`), 'bad');
      return;
    }
    setBusy(true);
    try {
      await api.put('/patient/hero/showcase', { trophies: on ? d.showcase.filter((k) => k !== key) : [...d.showcase, key] });
      await qc.invalidateQueries({ queryKey: ['patient-hero'] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="trophies-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="trophies-title" className="t-section scroll-mt-20">{t('Prijzenkast', 'Trophy cabinet')}</h2>
          <p className="mt-1 text-[13.5px] text-ink-600">{t(`Een beker per skill bij level ${TROPHY_TIERS.map((x) => x.level).join(', ')}.`, `A trophy per skill at level ${TROPHY_TIERS.map((x) => x.level).join(', ')}.`)}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#fdf3e3] px-3 py-1 text-[13px] font-bold text-[#8a5a12]">{earnedCount}/{d.trophies.length}</span>
      </div>
      {closest && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-[14px] text-ink-800">
          <Trophy className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          <span>{t(`Eerstvolgende: ${closest.s.nl} ${tierOf(closest.next!.tier).nl}, nog ${closest.next!.level - closest.level} ${closest.next!.level - closest.level === 1 ? 'level' : 'levels'}.`, `Next up: ${closest.s.en} ${tierOf(closest.next!.tier).en}, ${closest.next!.level - closest.level} ${closest.next!.level - closest.level === 1 ? 'level' : 'levels'} to go.`)}</span>
        </p>
      )}
      {wallPlaced(d) ? <div className={cn('mt-3 rounded-xl p-3', WALL_BG)}><TrophyWall d={d} /></div> : earnedCount > 0 ? (
        <p className="mt-3 text-[13.5px] text-ink-600">{t(`Tik op een gewonnen beker om hem op de muur achter je held te hangen (max. ${SHOWCASE_MAX}).`, `Tap a won trophy to hang it on the wall behind your hero (max ${SHOWCASE_MAX}).`)}</p>
      ) : null}
      <ul className="mt-4 divide-y divide-line">
        {rows.filter((r) => !r.locked || r.won > 0).map(({ s, list, level, next, progress, locked }) => (
          <li key={s.key} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[15px] font-semibold text-ink-900">{nl ? s.nl : s.en}</p>
              <p className="text-[12.5px] text-ink-600">
                {locked ? t('Nog op slot', 'Still locked') : next ? t(`lv ${level} · ${tierOf(next.tier).nl} bij ${next.level}`, `lv ${level} · ${tierOf(next.tier).en} at ${next.level}`) : t('Alles gewonnen', 'All won')}
              </p>
            </div>
            {!locked && next && <ProgressBar value={progress} className="mt-1.5 h-1.5" label={t(`${s.nl}: op weg naar ${tierOf(next.tier).nl}`, `${s.en}: towards ${tierOf(next.tier).en}`)} />}
            {/* The shelf: five cups on a wooden plank; won ones can be hung on the wall. */}
            <div className="mt-2">
              <div className="grid grid-cols-5 items-end gap-1 px-1">
                {list.map((x) => {
                  const tier = tierOf(x.tier);
                  const on = d.showcase.includes(x.key);
                  const label = `${nl ? s.nl : s.en} ${nl ? tier.nl : tier.en}`;
                  return x.earned ? (
                    <button key={x.key} type="button" aria-pressed={on} disabled={busy} onClick={() => toggle(x.key)} title={on ? t('Hangt op je muur', 'On your wall') : t('Op de muur hangen', 'Hang on the wall')}
                      className={cn('tap relative flex min-h-[44px] flex-col items-center rounded-xl pt-1', on && 'bg-accent-soft ring-2 ring-accent')}>
                      <TrophyIcon tier={x.tier} size="sm" art={`${x.skill}_${x.level}`} />
                      <span className="sr-only">{label}{on ? `, ${t('hangt op je muur', 'on your wall')}` : ''}</span>
                      {on && <Check className="absolute right-0.5 top-0.5 h-3.5 w-3.5 text-accent" aria-hidden />}
                    </button>
                  ) : (
                    <div key={x.key} className={cn('flex flex-col items-center pt-1', x === next ? '' : 'opacity-70')}>
                      <TrophyIcon tier={x.tier} earned={false} size="sm" art={`${x.skill}_${x.level}`} />
                      <span className="sr-only">{label}, {t(`nog niet gewonnen, level ${x.level}`, `not won yet, level ${x.level}`)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="h-1.5 rounded-full bg-[linear-gradient(180deg,#d8bb92_0%,#9c7a52_100%)] shadow-[0_2px_0_rgba(0,0,0,0.12)]" aria-hidden />
              <div className="mt-0.5 grid grid-cols-5 gap-1 px-1 text-center text-[10.5px] text-ink-500" aria-hidden>
                {list.map((x) => <span key={x.key} className={x.earned ? 'font-semibold text-ink-800' : ''}>{x.level}</span>)}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {rows.some((r) => r.locked && r.won === 0) && (
        <p className="mt-3 flex items-start gap-2 border-t border-line pt-3 text-[13.5px] text-ink-600">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" aria-hidden />
          <span>{t('Nog op slot', 'Still locked')}: {rows.filter((r) => r.locked && r.won === 0).map((r) => (nl ? r.s.nl : r.s.en)).join(', ')}. {t('Hun bekers verschijnen zodra de skill opengaat.', 'Their trophies appear once the skill opens.')}</span>
        </p>
      )}
    </section>
  );
}

function BadgeArt({ k, earned }: { k: string; earned: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={`/api/hero-assets/award/badge_${k}`} alt="" aria-hidden loading="lazy" onError={() => setFailed(true)} className={cn('mx-auto mb-1 h-20 w-20 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.2)]', !earned && 'opacity-30 grayscale')} />;
}

function GearImg({ gearKey, className }: { gearKey: string; className?: string }) {
  return <PhotoGearThumbnail key={gearKey} item={gearKey} className={cn('h-full w-full object-contain p-1', className)} fallback={<GearArtwork item={gearKey} className={cn('h-full w-full p-1', className)} />} />;
}

function LogTeaser({ d }: { d: HeroState }) {
  const { t } = useI18n();
  const p = d.logs.protein;
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="log-teaser">
      <h2 id="log-teaser" className="t-section">{t('Logboek', 'Logbook')}</h2>
      <p className="mt-1 text-[13.5px] text-ink-600">{t('Vrijblijvend. Een dag overslaan kost niets.', 'Optional. Skipping a day costs nothing.')}</p>
      {p.goal === null ? (
        <p className="mt-3 text-[15px] text-ink-800">
          {p.targets
            ? t(`Kies je eiwitdoel: minimaal ${p.targets.minimum} g, suboptimaal ${p.targets.suboptimal} g of optimaal ${p.targets.optimal} g per dag.`, `Choose your protein goal: minimum ${p.targets.minimum} g, sub-optimal ${p.targets.suboptimal} g or optimal ${p.targets.optimal} g a day.`)
            : t('Vul je gewicht in: dan zie je hoeveel eiwit minimaal, suboptimaal en optimaal is voor jou.', 'Enter your weight to see how much protein is minimum, sub-optimal and optimal for you.')}
        </p>
      ) : (
        <div className="mt-3">
          <div className="flex justify-between text-[14px]">
            <span className="font-semibold text-ink-900">{t(`Eiwit ${p.grams} van ${p.goal} g`, `Protein ${p.grams} of ${p.goal} g`)}</span>
            <span className="text-ink-600">{p.hit ? t('Doel gehaald', 'Goal hit') : t(`nog ${Math.max(0, p.goal - p.grams)} g`, `${Math.max(0, p.goal - p.grams)} g to go`)}</span>
          </div>
          <ProgressBar value={p.grams / p.goal} className="mt-1.5 h-2.5" label={t('Eiwit vandaag', 'Protein today')} />
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link to="/p/logboek#eiwit" className="inline-flex h-11 items-center justify-center rounded-xl bg-accent text-[14px] font-semibold text-accent-ink">{t('Eiwit loggen', 'Log protein')}</Link>
        <Link to="/p/logboek#training" className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-white text-[14px] font-semibold text-ink-900">{t('Training loggen', 'Log a workout')}</Link>
      </div>
      <Link to="/p/logboek" className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-accent">{t('Hele logboek: gewicht, water, slaap en stappen', 'Full logbook: weight, water, sleep and steps')}<ChevronRight className="h-4 w-4" aria-hidden /></Link>
    </section>
  );
}

/** The muscle atlas and its quiz: the one entry in the app, next to the skills. */
function AtlasCard() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ['patient-atlas-quiz'], queryFn: () => api.get<{ correct: string[]; level2?: boolean }>('/patient/atlas/quiz'), staleTime: 60_000 });
  const total = quizQuestions().filter((x) => x.level === 1).length;
  const done = q.data ? quizQuestions().filter((x) => x.level === 1 && q.data.correct.includes(x.id)).length : null;
  return (
    <Link to="/p/spieren" className="tap flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 shadow-card hover:border-ink-300">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden><Brain className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold text-ink-900">{t('Spierenatlas & quiz', 'Muscle atlas & quiz')}</span>
        <span className="block text-[13.5px] text-ink-600">
          {done === null ? t('Spieren, zenuwen en je oefeningen', 'Muscles, nerves and your exercises') : t(`${done} van ${total} goed${q.data?.level2 ? ' · level 2 open' : ' · level 2 op slot'}`, `${done} of ${total} right${q.data?.level2 ? ' · level 2 open' : ' · level 2 locked'}`)}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
    </Link>
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
  const look = { ...d.hero, gear: [...d.gear.equipped, ...(d.aids ?? [])], body: d.metrics ? bodyShape(d.metrics, d.hero.frame) : null, photo: d.customPhoto ?? null };
  const scene = sceneForTotal(d.totalLevel);
  const emblems = d.skills.filter((s) => !s.locked && s.level >= SKILL_EMBLEM_LEVEL);
  const ownTitles = d.skills.flatMap((s) => {
    if (s.locked) return [];
    const name = skillTitle(s.key, s.level, nl);
    return name ? [name] : [];
  });
  const combos = comboTitles(Object.fromEntries(d.skills.filter((s) => !s.locked).map((s) => [s.key, s.level])), nl);
  const toEntries = (c: HeroState['painMap']['current']) => Object.fromEntries((c?.entries ?? []).map((e) => [e.area, e.score]));
  const earned = d.badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-5">
      <section className={cn('relative overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-card', scene?.key === 'gym' && 'bg-[linear-gradient(180deg,#efe6d4_0%,#fff_46%)]', scene?.key === 'stadium' && 'bg-[linear-gradient(180deg,#1b3a4a_0%,#fff_48%)]')} aria-labelledby="hero-name">
        {scene?.key === 'gym' && <svg aria-hidden className="pointer-events-none absolute right-3 top-3 h-10 w-24"><rect x="4" y="16" width="88" height="6" rx="2" fill="#29483c" opacity=".45" /><rect x="18" y="8" width="6" height="22" fill="#29483c" opacity=".45" /><rect x="72" y="8" width="6" height="22" fill="#29483c" opacity=".45" /></svg>}
        {scene?.key === 'stadium' && <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-16 w-full"><path d="M0,40 Q100,8 200,40 L200,0 L0,0 Z" fill="#143040" /><path d="M20,34 Q100,14 180,34" fill="none" stroke="#e2b84a" strokeWidth="2" /></svg>}
        <div className="flex items-center gap-4">
          <HeroPhotoLink look={look} level={L.level} />
          <div className="min-w-0">
            <p className="t-label">{t(`Level ${L.level}`, `Level ${L.level}`)} · {titleFor(L.level, nl)}</p>
            <h1 id="hero-name" className={cn('t-page [overflow-wrap:anywhere]', scene?.key === 'stadium' && 'text-white')}>{d.hero.heroName}</h1>
            {scene && <p className={cn('text-[12.5px] font-semibold', scene.key === 'stadium' ? 'text-sand' : 'text-ink-600')}>{nl ? scene.nl : scene.en}</p>}
            {(emblems.length > 0 || ownTitles.length > 0 || combos.length > 0) && (
              <p className={cn('text-[13px]', scene?.key === 'stadium' ? 'text-white/90' : 'text-ink-700')}>
                {emblems.length > 0 && <span className="mr-2">{t('Emblemen', 'Emblems')}: {emblems.map((s) => (nl ? SKILLS.find((k) => k.key === s.key)?.nl : SKILLS.find((k) => k.key === s.key)?.en)).join(', ')}</span>}
                {[...ownTitles, ...combos.map((c) => c.name)].join(' · ')}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3">
              <Link to="/p/held/uiterlijk" className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-accent">{t('Uiterlijk en maten', 'Look and measurements')}</Link>
              <Link to="/p/held/inventaris" className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-sand-soft px-3 text-[14px] font-semibold text-sand-ink"><Crown className="h-4 w-4" aria-hidden />{t(`Inventaris & winkel · ${d.gear.coins}`, `Inventory & shop · ${d.gear.coins}`)}</Link>
            </div>
          </div>
        </div>
        {wallPlaced(d) && (
          <Link to="/p/held/inventaris" className={cn('mt-3 block rounded-xl px-3 py-2', WALL_BG)} aria-label={t('Je muur, naar je prijzenkast', 'Your wall, to your trophy cabinet')}>
            <TrophyWall d={d} compact />
          </Link>
        )}
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[14px]">
            <span className="font-semibold text-ink-900">{L.xp} XP</span>
            <span className="text-ink-600">{t(`nog ${L.to - L.xp} XP tot level ${L.level + 1}`, `${L.to - L.xp} XP to level ${L.level + 1}`)}</span>
          </div>
          <ProgressBar value={L.progress} className="mt-1.5 h-3" label={t(`Voortgang naar level ${L.level + 1}`, `Progress to level ${L.level + 1}`)} />
        </div>
        <HeroTotals d={d} />
        <details className="mt-3 text-[14px] text-ink-700">
          <summary className="min-h-[44px] cursor-pointer py-2 font-medium text-ink-800">{t('Hoe verdien ik XP?', 'How do I earn XP?')}</summary>
          <ul className="space-y-1 pb-1">
            <li>+{XP.session} XP · {t('een training afgerond', 'a workout completed')}</li>
            <li>+{XP.painReported} XP · {t('je pijn doorgegeven na de training (ook als die hoog is)', 'your pain reported after the workout (also when it is high)')}</li>
            <li>+{XP.redFlag} XP · {t('een alarmsignaal gemeld', 'a warning sign reported')}</li>
            <li>+{XP.painCheckin} XP · {t('je pijnkaart bijgewerkt (1× per week)', 'your body map updated (once a week)')}</li>
            <li>+{LOG_XP.selfSession} XP · {t('een eigen training gelogd (maximaal 2 per dag)', 'a workout you log yourself (at most 2 a day)')}</li>
            <li>+{LOG_XP.proteinGoal} XP · {t('eiwitdoel van de dag gehaald (niet per hap)', 'protein goal for the day hit (not per bite)')}</li>
            <li>+{LOG_XP.stepGoal} XP · {t('stapdoel van de dag gehaald (niet per extra stap)', 'step goal for the day hit (not per extra step)')}</li>
            <li>+{MOBILITY_MEASURE_XP} XP · {t('je mobiliteit gemeten (1× per 2 weken, voor het meten, niet voor de uitslag)', 'your mobility measured (once per 2 weeks, for measuring, not for the result)')}</li>
          </ul>
          <p className="text-ink-600">{t('Elke oefening traint ook skills, zoals Kracht of Balans. Doorgaan met pijn levert nooit extra punten op, en een rustdag kost je niets.', 'Every exercise also trains skills, such as Strength or Balance. Training through pain never earns extra points, and a rest day costs you nothing.')}</p>
        </details>
      </section>

      <Fold id="hero-survival" defaultOpen icon={<Droplets className="h-5 w-5" />} title={t('Conditie van je held', 'Your hero’s condition')}
        summary={t(`Water ${Math.round(d.logs.survival.water.ratio * 100)}% · energie ${d.logs.survival.energy}%`, `Water ${Math.round(d.logs.survival.water.ratio * 100)}% · energy ${d.logs.survival.energy}%`)}>
        <SurvivalPanel d={d} />
      </Fold>
      <DailyCheckin d={d} />
      <Fold id="hero-log" icon={<Utensils className="h-5 w-5" />} title={t('Logboek', 'Logbook')}
        summary={d.logs.protein.goal !== null ? t(`Eiwit ${d.logs.protein.grams} van ${d.logs.protein.goal} g`, `Protein ${d.logs.protein.grams} of ${d.logs.protein.goal} g`) : t('Eiwit en eigen trainingen bijhouden', 'Track protein and your own workouts')}>
        <LogTeaser d={d} />
      </Fold>
      <DayChestCard d={d} />
      <BossCard d={d} />
      <SeasonCard d={d} />
      <Fold id="hero-weekly" defaultOpen icon={<Gift className="h-5 w-5" />} title={t('Weekquests', 'Weekly quests')}
        summary={t(`${d.weekly.quests.filter((x) => x.done).length} van ${d.weekly.quests.length} gehaald`, `${d.weekly.quests.filter((x) => x.done).length} of ${d.weekly.quests.length} done`)}>
        <WeeklyQuests d={d} />
      </Fold>
      <Fold id="hero-quest" icon={<Flag className="h-5 w-5" />} title={t('Hoofdquest', 'Main quest')}
        summary={d.quest?.timeline ? t(`Week ${d.quest.timeline.week} van ${d.quest.timeline.totalWeeks} · ${Math.round(d.quest.timeline.progress * 100)}% onderweg`, `Week ${d.quest.timeline.week} of ${d.quest.timeline.totalWeeks} · ${Math.round(d.quest.timeline.progress * 100)}% of the way`) : d.quest?.title ?? t('Nog geen quest', 'No quest yet')}>
        <Quest d={d} />
      </Fold>

      <Fold id="hero-map" icon={<MapPin className="h-5 w-5" />} title={t('Je held en je pijn', 'Your hero and your pain')}
        summary={!d.painMap.current ? t('Nog niet ingevuld', 'Not filled in yet') : d.painMap.current.entries.length === 0 ? t('Nergens pijn', 'No pain anywhere') : t(`${d.painMap.current.entries.length} plek(ken) · hoogste ${Math.max(...d.painMap.current.entries.map((e) => e.score))}/10`, `${d.painMap.current.entries.length} area(s) · highest ${Math.max(...d.painMap.current.entries.map((e) => e.score))}/10`)}>
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
      </Fold>

      <Fold id="hero-skills" icon={<Zap className="h-5 w-5" />} title={t('Skills', 'Skills')} summary={t(`Totaal level ${d.totalLevel}`, `Total level ${d.totalLevel}`)}>
        <Skills d={d} />
      </Fold>
      <AtlasCard />
      <FriendsCard />
      <Link to="/p/held/inventaris" className="tap flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 shadow-card hover:border-ink-300">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-soft text-sand-ink" aria-hidden><Crown className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold text-ink-900">{t('Inventaris', 'Inventory')}</span>
          <span className="block text-[13.5px] text-ink-600">{t(`Winkel · ${d.gear.coins} muntjes · gearscore ${d.gear.score}`, `Shop · ${d.gear.coins} coins · gear score ${d.gear.score}`)}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
      </Link>

      <Fold id="hero-badges" icon={<Award className="h-5 w-5" />} title={t('Badges', 'Badges')} summary={t(`${earned} van ${d.badges.length} behaald`, `${earned} of ${d.badges.length} earned`)}>
      <section className="rounded-2xl border border-line bg-white p-5 shadow-card" aria-labelledby="badges-title">
        <h2 id="badges-title" className="t-section">{t(`Badges (${earned} van ${d.badges.length})`, `Badges (${earned} of ${d.badges.length})`)}</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {BADGES.map((b) => {
            const has = d.badges.find((x) => x.key === b.key)?.earned;
            return (
              <li key={b.key} className={cn('rounded-xl border p-3', has ? 'border-accent/30 bg-accent-soft' : 'border-line bg-canvas')}>
                <BadgeArt k={b.key} earned={!!has} />
                <div className={cn('flex items-center gap-1.5 text-[14px] font-semibold', has ? 'text-accent' : 'text-ink-600')}>
                  {has ? <Award className="h-4 w-4" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
                  {nl ? b.nl : b.en}
                </div>
                <p className="mt-0.5 text-[13px] text-ink-600">{nl ? b.descNl : b.descEn}</p>
                <p className="sr-only">{has ? t('Behaald', 'Earned') : t('Nog te halen', 'Not earned yet')}</p>
                {has && <WallToggle d={d} badge={b.key} name={nl ? b.nl : b.en} />}
              </li>
            );
          })}
        </ul>
      </section>
      </Fold>
    </div>
  );
}

/** Update the body map (a new check-in; the history is kept). */
/** Inventory and shop: owned gear to wear, the rest to buy with coins. */
export function InventoryPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Inventaris', 'Inventory'));
  const q = useHero();
  if (q.isError) return <ErrorState error={q.error} />;
  if (!q.data) return <Spinner />;
  return (
    <div className="space-y-5">
      <Link to="/p/held" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Terug naar je held', 'Back to your hero')}</Link>
      <h1 className="t-page">{t('Inventaris', 'Inventory')}</h1>
      {q.data.hero ? <><GearCard d={q.data} /><TrophyCabinet d={q.data} /></> : <Notice tone="info">{t('Maak eerst je held.', 'Create your hero first.')}</Notice>}
    </div>
  );
}

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
  const heroLook = { ...d.hero, gear: [...d.gear.equipped, ...(d.aids ?? [])], body: d.metrics ? bodyShape(d.metrics, d.hero.frame) : null, photo: d.customPhoto ?? null };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
      <AvatarLink look={heroLook} size={64} level={d.level.level} />
      <Link to="/p/held" className="tap flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
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
    </div>
  );
}
