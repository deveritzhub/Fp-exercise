import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Check, ChefHat, ChevronDown, ChevronLeft, ChevronRight, Clock, Copy, Droplets, Leaf, Minus, Plus, Printer, Settings2, Share2, ShoppingCart, Sparkles, Star, Trash2, Utensils, Wand2 } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Button, Dialog, ErrorState, Notice, Select, Spinner, Textarea, useToast } from '@/components/ui';
import { AISLES, FOODS, FOOD_BY_KEY, MEALS, MEAL_TEXT, macrosOf, mealForHour, sumMacros, type Macros, type Meal } from '@shared/foods';
import { parseFoodText } from '@shared/foodText';
import { GOALS, GOAL_TEXT, RECIPES, RECIPE_BY_KEY, planWeek, recipeGoals, recipeMacros, shoppingList, type Diet, type NutritionGoal, type PlanItem, type Recipe } from '@shared/recipes';
import { ACTIVITY, KCAL_FLOOR, PLAN_GOALS, dayProgress, type Activity, type NutritionProfile, type PlanGoal, type Targets } from '@shared/nutritionTargets';
import { WATER } from '@shared/survival';
import type { HeroState } from '@/lib/types';

type DayItem = { id: string; meal: Meal; name: string; foodKey: string | null; grams: number } & Macros;
type OwnFood = { id: string; name: string; kcal: number; protein: number; carbs: number; fat: number; portionG: number };
type ItemIn = { foodKey?: string | null; ownFoodId?: string | null; name: string; grams: number; kcal?: number; protein?: number };
type Favorite = { id: string; name: string; meal: Meal; items: ItemIn[] };
type Profile = NutritionProfile & { diet: Diet };
type DayData = {
  day: string; today: string; daysBack: number; items: DayItem[]; totals: Macros; recent: { name: string; foodKey: string | null; grams: number }[];
  proteinGoal: number | null; profile: Profile; weightKg: number | null; heightCm: number | null; targets: Targets | null; ownFoods: OwnFood[]; favorites: Favorite[];
};
type Plan = { items: PlanItem[]; checked: string[]; goal: NutritionGoal | null; extras: { id: string; text: string }[] };
type Week = { days: { day: string; kcal: number; protein: number; mainMeals: number }[]; targets: Targets | null; hideKcal: boolean };
/** One line to check before saving. Grams, or a number of portions ("2 boterhammen"). */
type Draft = { id: number; foodKey: string | null; ownFoodId: string | null; name: string; grams: number; unit: 'g' | 'portie'; count: number; portionG: number | null; portionName: string | null; per100: Macros | null; kcal: number; protein: number };

const TABS = ['vandaag', 'recepten', 'weekplan', 'boodschappen'] as const;
type Tab = (typeof TABS)[number];
const DAYS_NL = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
const DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
let draftId = 1;
const n1 = (x: number) => Math.round(x * 10) / 10;
const iso = (d: Date) => d.toLocaleDateString('sv-SE');
const addDays = (day: string, n: number) => iso(new Date(new Date(day + 'T12:00:00').getTime() + n * 86400_000));

/**
 * Voeding: what you ate (typed in your own words, searched, or one tap on a favourite), a daily guide
 * from your goal, the week at a glance, recipes for your goal and diet, a week plan for cooking ahead
 * and the shopping list that comes out of it. Private: only you see it. Never red numbers or "too
 * much": the protein of every meal also fills your protein meter.
 */
export function NutritionPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Voeding', 'Nutrition'));
  const [params, setParams] = useSearchParams();
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as Tab) : 'vandaag';
  const base = useQuery({ queryKey: ['food-day'], queryFn: () => api.get<DayData>('/patient/food') });
  const plan = useQuery({ queryKey: ['meal-plan'], queryFn: () => api.get<Plan>('/patient/meal-plan') });
  const label: Record<Tab, [string, string]> = { vandaag: ['Vandaag', 'Today'], recepten: ['Recepten', 'Recipes'], weekplan: ['Weekplan', 'Week plan'], boodschappen: ['Boodschappen', 'Shopping'] };
  const go = (k: Tab) => setParams({ tab: k }, { replace: true });

  return (
    <div className="space-y-5">
      <Link to="/p" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Vandaag', 'Today')}</Link>
      <header>
        <h1 className="t-page flex items-center gap-2"><Utensils className="h-7 w-7 text-accent" aria-hidden />{t('Voeding', 'Nutrition')}</h1>
        <p className="mt-1 text-[15px] text-ink-600">{t('Houd bij wat je eet, kies recepten die bij je doel passen, plan je week en neem je boodschappenlijst mee. Alleen jij ziet dit.', 'Track what you eat, pick recipes for your goal, plan your week and take your shopping list along. Only you see this.')}</p>
      </header>
      <div role="tablist" aria-label={t('Onderdelen van voeding', 'Parts of nutrition')} className="grid grid-cols-2 gap-1 rounded-xl bg-sage p-1 min-[440px]:grid-cols-4">
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} data-tab={k} onClick={() => go(k)}
            className="min-h-[44px] rounded-lg px-1 text-[13.5px] font-semibold text-ink-700 aria-selected:bg-white aria-selected:text-ink-950 aria-selected:shadow-card">
            {t(...label[k])}
          </button>
        ))}
      </div>
      {base.isError ? <ErrorState error={base.error} /> : !base.data || !plan.data ? <Spinner /> : (
        <div role="tabpanel" aria-label={t(...label[tab])}>
          {tab === 'vandaag' && <TodayTab base={base.data} />}
          {tab === 'recepten' && <RecipesTab plan={plan.data} base={base.data} />}
          {tab === 'weekplan' && <PlanTab plan={plan.data} base={base.data} onShop={() => go('boodschappen')} onRecipes={() => go('recepten')} />}
          {tab === 'boodschappen' && <ShoppingTab plan={plan.data} onPlan={() => go('weekplan')} />}
        </div>
      )}
      <p className="rounded-xl bg-sage/60 px-3 py-2.5 text-[13px] leading-relaxed text-ink-700" data-testid="nutrition-disclaimer">
        {t('Dit is een hulpmiddel, geen dieetadvies. Waarden zijn gemiddelden per product. Heb je zorgen over eten, je gewicht of een aandoening? Praat met je huisarts of een diëtist.', 'This is a tool, not dietary advice. Values are averages per product. Worried about eating, your weight or a condition? Talk to your GP or a dietitian.')}
      </p>
    </div>
  );
}

function useSavePlan() {
  const qc = useQueryClient();
  const toast = useToast();
  const { locale } = useI18n();
  return async (next: Plan) => {
    qc.setQueryData(['meal-plan'], next);
    try {
      qc.setQueryData(['meal-plan'], await api.put<Plan>('/patient/meal-plan', next));
    } catch (e) {
      toast(describeError(e, locale), 'bad');
      void qc.invalidateQueries({ queryKey: ['meal-plan'] });
    }
  };
}

/** Saving food for a meal on a day; refreshes that day, today, the week and the hero. */
function useLogFood() {
  const qc = useQueryClient();
  const toast = useToast();
  const { t, locale } = useI18n();
  return async (meal: Meal, items: ItemIn[], day: string, quiet = false) => {
    try {
      const r = await api.post<DayData>('/patient/food', { meal, day, items });
      qc.setQueryData(['food-day', day], r);
      void qc.invalidateQueries({ queryKey: ['food-day'] });
      void qc.invalidateQueries({ queryKey: ['food-week'] });
      void qc.invalidateQueries({ queryKey: ['patient-hero'] });
      if (!quiet) {
        const p = n1(r.items.filter((i) => i.meal === meal).reduce((s, i) => s + i.protein, 0));
        toast(t(`Opgeslagen bij ${MEAL_TEXT[meal][0].toLowerCase()}: nu ${p} g eiwit bij deze maaltijd.`, `Saved to ${MEAL_TEXT[meal][1].toLowerCase()}: now ${p} g protein for this meal.`), 'ok');
      }
      return true;
    } catch (e) {
      toast(describeError(e, locale), 'bad');
      return false;
    }
  };
}

function TodayTab({ base }: { base: DayData }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const log = useLogFood();
  const [day, setDay] = useState(base.today);
  const q = useQuery({ queryKey: ['food-day', day], queryFn: () => api.get<DayData>(`/patient/food?day=${day}`), initialData: day === base.today ? base : undefined });
  const data = q.data ?? base;
  const hide = data.profile.hideKcal;
  const [meal, setMeal] = useState<Meal>(() => mealForHour(new Date().getHours()));
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [ownOpen, setOwnOpen] = useState(false);
  const [favFor, setFavFor] = useState<Meal | null>(null);

  const foodDraft = (foodKey: string, grams?: number): Draft => {
    const f = FOOD_BY_KEY[foodKey];
    const g = grams ?? f.portion.g;
    const m = macrosOf(f, g);
    const whole = Math.abs(g / f.portion.g - Math.round(g / f.portion.g)) < 0.01 && g >= f.portion.g;
    return { id: draftId++, foodKey, ownFoodId: null, name: nl ? f.nl : f.en, grams: g, unit: whole ? 'portie' : 'g', count: whole ? Math.round(g / f.portion.g) : 1, portionG: f.portion.g, portionName: nl ? f.portion.nl : f.portion.en, per100: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat }, kcal: m.kcal, protein: m.protein };
  };
  const ownDraft = (o: OwnFood, grams?: number): Draft => {
    const g = grams ?? o.portionG;
    return { id: draftId++, foodKey: null, ownFoodId: o.id, name: o.name, grams: g, unit: 'g', count: 1, portionG: o.portionG, portionName: t('portie', 'serving'), per100: { kcal: o.kcal, protein: o.protein, carbs: o.carbs, fat: o.fat }, kcal: Math.round((o.kcal * g) / 100), protein: n1((o.protein * g) / 100) };
  };
  const recompute = (d: Draft): Draft => {
    const grams = d.unit === 'portie' && d.portionG ? Math.max(1, Math.round(d.count * d.portionG)) : d.grams;
    if (!d.per100) return { ...d, grams };
    return { ...d, grams, kcal: Math.round((d.per100.kcal * grams) / 100), protein: n1((d.per100.protein * grams) / 100) };
  };
  const patch = (id: number, p: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.id === id ? recompute({ ...d, ...p }) : d)));
  const read = () => {
    const r = parseFoodText(text);
    if (r.meal) setMeal(r.meal);
    setDrafts((d) => [...d, ...r.items.filter((i) => i.food).map((i) => foodDraft(i.food!.key, i.grams))]);
    setUnknown(r.unknown);
    setText('');
  };
  const toItems = (ds: Draft[]): ItemIn[] => ds.map((d) => (d.foodKey ? { foodKey: d.foodKey, name: d.name, grams: d.grams } : d.ownFoodId ? { ownFoodId: d.ownFoodId, name: d.name, grams: d.grams } : { foodKey: null, name: d.name, grams: d.grams, kcal: d.kcal, protein: d.protein }));
  const save = async () => {
    setBusy(true);
    const ok = await log(meal, toItems(drafts), day);
    setBusy(false);
    if (ok) { setDrafts([]); setUnknown([]); }
  };
  const remove = async (id: string) => {
    try {
      qc.setQueryData(['food-day', day], await api.del<DayData>(`/patient/food/${id}`));
      void qc.invalidateQueries({ queryKey: ['food-day'] });
      void qc.invalidateQueries({ queryKey: ['food-week'] });
      void qc.invalidateQueries({ queryKey: ['patient-hero'] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    }
  };
  // The day before, meal by meal, as it was.
  const copyYesterday = async () => {
    try {
      const y = await api.get<DayData>(`/patient/food?day=${addDays(day, -1)}`);
      if (!y.items.length) return toast(t('De dag ervoor is nog niets ingevuld.', 'Nothing was logged the day before.'));
      setBusy(true);
      for (const m of MEALS) {
        const its = y.items.filter((i) => i.meal === m);
        if (its.length) await log(m, its.map((i) => (i.foodKey ? { foodKey: i.foodKey, name: i.name, grams: i.grams } : { foodKey: null, name: i.name, grams: i.grams, kcal: i.kcal, protein: i.protein })), day, true);
      }
      toast(t('Alles van de dag ervoor staat er nu ook.', 'Everything from the day before is here too.'), 'ok');
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };

  const tg = data.targets;
  const goalP = tg?.protein ?? data.proteinGoal;
  const pPct = goalP ? Math.min(100, Math.round((data.totals.protein / goalP) * 100)) : null;
  const progress = tg ? dayProgress(data.totals.kcal, tg.kcal) : null;
  const draftTotal = sumMacros(drafts.map((d) => ({ kcal: d.kcal, protein: d.protein, carbs: 0, fat: 0 })));
  const dayLabel = (d: string) => (d === base.today ? t('Vandaag', 'Today') : d === addDays(base.today, -1) ? t('Gisteren', 'Yesterday') : new Date(d + 'T12:00:00').toLocaleDateString(nl ? 'nl-NL' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' }));
  const earliest = addDays(base.today, -base.daysBack);

  return (
    <div className="space-y-4">
      {/* Which day: today, or a forgotten day of the past week. */}
      <div className="flex items-center justify-between gap-2" data-testid="day-picker">
        <Button size="sm" variant="secondary" disabled={day <= earliest} onClick={() => setDay(addDays(day, -1))} aria-label={t('Dag eerder', 'Day before')} icon={<ChevronLeft className="h-4 w-4" />} />
        <p className="text-[16px] font-semibold capitalize text-ink-950" aria-live="polite" data-testid="day-label">{dayLabel(day)}</p>
        <Button size="sm" variant="secondary" disabled={day >= base.today} onClick={() => setDay(addDays(day, 1))} aria-label={t('Dag later', 'Day after')} icon={<ChevronRight className="h-4 w-4" />} />
      </div>

      {/* The day at a glance, against the guide. */}
      <section aria-label={t('Deze dag in cijfers', 'This day in numbers')} data-testid="food-totals" className="rounded-2xl border border-line bg-white p-4 shadow-card">
        <div className="flex items-start justify-between gap-3">
          {!hide ? (
            <p><span className="font-display text-[34px] font-bold leading-none tabular-nums" data-testid="kcal-today">{data.totals.kcal}</span> <span className="text-[15px] text-ink-600">{tg ? `/ ${tg.kcal} kcal` : 'kcal'}</span></p>
          ) : (
            <p className="text-[15px] font-semibold text-ink-800">{t('Calorieën staan uit', 'Calories are hidden')}</p>
          )}
          <Button size="sm" variant="secondary" data-testid="open-goals" onClick={() => setGoalsOpen(true)} icon={<Settings2 className="h-4 w-4" />}>{tg ? t('Doelen', 'Goals') : t('Stel doelen in', 'Set goals')}</Button>
        </div>
        {progress && !hide && (
          <p className="mt-1 text-[14px] text-ink-700" data-testid="day-progress">
            {{ start: t('Nog niets gegeten vandaag.', 'Nothing eaten yet today.'), onderweg: t('Je bent onderweg.', 'You are on your way.'), bijna: t('Bijna je richtlijn voor vandaag.', 'Nearly at your guide for today.'), gehaald: t('Richtlijn van vandaag gehaald.', 'Today’s guide reached.') }[progress]}
          </p>
        )}
        <div className="mt-3 space-y-2">
          <Bar label={t('Eiwit', 'Protein')} value={data.totals.protein} goal={goalP} unit="g" testId="protein-today" />
          {tg && !hide && <Bar label={t('Koolhydraten', 'Carbs')} value={data.totals.carbs} goal={tg.carbs} unit="g" />}
          {tg && !hide && <Bar label={t('Vet', 'Fat')} value={data.totals.fat} goal={tg.fat} unit="g" />}
          {!tg && <p className="text-[13px] text-ink-600">{t('Stel je doelen in voor een persoonlijke richtlijn voor eiwit, koolhydraten en vet.', 'Set your goals for a personal guide for protein, carbs and fat.')}</p>}
          {pPct === null && !tg && <p className="text-[13px] text-ink-600">{t('Nog geen eiwitdoel.', 'No protein goal yet.')}</p>}
        </div>
        {tg?.floorApplied && <p className="mt-2 text-[13px] text-ink-700">{t(`Je richtlijn staat op het minimum van ${KCAL_FLOOR[data.profile.sex ?? 'v']} kcal. Minder eten zonder begeleiding raden we af.`, `Your guide is at the minimum of ${KCAL_FLOOR[data.profile.sex ?? 'v']} kcal. Eating less without guidance is not advised.`)}</p>}
      </section>

      <WaterCard />

      {/* Entering food. */}
      <section aria-labelledby="food-add-h" data-testid="food-add" className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <h2 id="food-add-h" className="text-[17px] font-bold">{t('Eten toevoegen', 'Add food')}</h2>
          <Button size="sm" variant="secondary" data-testid="copy-yesterday" loading={busy && !drafts.length} onClick={() => void copyYesterday()} icon={<Copy className="h-4 w-4" />}>{t('Zelfde als dag ervoor', 'Same as day before')}</Button>
        </div>
        <Select label={t('Maaltijd', 'Meal')} value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
          {MEALS.map((m) => <option key={m} value={m}>{nl ? MEAL_TEXT[m][0] : MEAL_TEXT[m][1]}</option>)}
        </Select>
        {data.favorites.length > 0 && (
          <div>
            <p className="mb-1.5 text-[13.5px] font-semibold text-ink-800">{t('Je favorieten:', 'Your favourites:')}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.favorites.map((f) => (
                <span key={f.id} className="inline-flex items-center">
                  <Button size="sm" variant="secondary" data-favorite={f.name} icon={<Star className="h-4 w-4 fill-[#E3B655] text-[#b8892a]" />}
                    onClick={() => { setMeal(f.meal); setDrafts((d) => [...d, ...f.items.map((i) => (i.foodKey && FOOD_BY_KEY[i.foodKey] ? foodDraft(i.foodKey, i.grams) : i.ownFoodId && data.ownFoods.find((o) => o.id === i.ownFoodId) ? ownDraft(data.ownFoods.find((o) => o.id === i.ownFoodId)!, i.grams) : { id: draftId++, foodKey: null, ownFoodId: null, name: i.name, grams: i.grams, unit: 'g' as const, count: 1, portionG: null, portionName: null, per100: null, kcal: i.kcal ?? 0, protein: i.protein ?? 0 }))]); }}>{f.name}</Button>
                  <button type="button" aria-label={t(`Favoriet ${f.name} verwijderen`, `Delete favourite ${f.name}`)} className="grid h-11 w-9 place-items-center text-ink-500 hover:text-ink-800"
                    onClick={async () => { try { qc.setQueryData(['food-day', day], await api.del<DayData>(`/patient/food/favorites/${f.id}`)); void qc.invalidateQueries({ queryKey: ['food-day'] }); } catch (e) { toast(describeError(e, locale), 'bad'); } }}><Trash2 className="h-3.5 w-3.5" aria-hidden /></button>
                </span>
              ))}
            </div>
          </div>
        )}
        <Textarea label={t('Wat heb je gegeten?', 'What did you eat?')} rows={2} maxLength={400} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={t('Bijv. 2 boterhammen met kaas, een appel en 250 g kwark', 'E.g. 2 slices of bread with cheese, an apple and 250 g quark')} />
        <Button variant="secondary" className="w-full" data-testid="read-food" disabled={!text.trim()} onClick={read} icon={<Sparkles className="h-4 w-4" />}>{t('Lees wat ik at', 'Read what I ate')}</Button>
        {data.recent.length > 0 && (
          <div>
            <p className="mb-1.5 text-[13.5px] font-semibold text-ink-800">{t('Wat je vaak eet:', 'What you often eat:')}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.recent.map((r) => (
                <Button key={`${r.name}-${r.foodKey}`} size="sm" variant="secondary" data-recent-food={r.foodKey ?? r.name} icon={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    const own = data.ownFoods.find((o) => o.name === r.name);
                    setDrafts((d) => [...d, r.foodKey && FOOD_BY_KEY[r.foodKey] ? foodDraft(r.foodKey, r.grams) : own ? ownDraft(own, r.grams) : { id: draftId++, foodKey: null, ownFoodId: null, name: r.name, grams: r.grams, unit: 'g', count: 1, portionG: null, portionName: null, per100: null, kcal: 0, protein: 0 }]);
                  }}>{r.name}</Button>
              ))}
            </div>
          </div>
        )}
        {unknown.length > 0 && (
          <Notice tone="info">
            {t(`Niet herkend: ${unknown.join(', ')}. Zoek het hieronder, maak er een eigen product van, of voeg het toe als gerecht met eigen waarden.`, `Not recognised: ${unknown.join(', ')}. Search below, make it an own product, or add it as a dish with your own values.`)}
            <span className="mt-2 flex flex-wrap gap-1.5">
              {unknown.map((u) => <Button key={u} size="sm" variant="secondary" onClick={() => { setDrafts((d) => [...d, { id: draftId++, foodKey: null, ownFoodId: null, name: u.charAt(0).toUpperCase() + u.slice(1), grams: 100, unit: 'g', count: 1, portionG: null, portionName: null, per100: null, kcal: 0, protein: 0 }]); setUnknown((x) => x.filter((y) => y !== u)); }}>{t(`“${u}” met eigen waarden`, `“${u}” with own values`)}</Button>)}
            </span>
          </Notice>
        )}
        <FoodPicker own={data.ownFoods} onPick={(key) => setDrafts((d) => [...d, foodDraft(key)])} onPickOwn={(o) => setDrafts((d) => [...d, ownDraft(o)])} />
        <Button size="sm" variant="secondary" data-testid="add-own-food" onClick={() => setOwnOpen(true)} icon={<Plus className="h-4 w-4" />}>{t('Eigen product maken', 'Make an own product')}</Button>
        {drafts.length > 0 && (
          <div className="space-y-2" data-testid="food-preview">
            <p className="text-[14.5px] font-semibold text-ink-900">{t('Klopt dit?', 'Is this right?')}</p>
            <ul className="space-y-2">
              {drafts.map((d) => (
                <li key={d.id} data-food={d.foodKey ?? (d.ownFoodId ? 'mine' : 'own')} className="rounded-xl border border-line p-3">
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-[15px] font-semibold text-ink-950">{d.name}{!d.foodKey && !d.ownFoodId ? t(' (eigen waarden)', ' (own values)') : ''}</p>
                    <button type="button" aria-label={t(`${d.name} weghalen`, `Remove ${d.name}`)} onClick={() => setDrafts((ds) => ds.filter((x) => x.id !== d.id))} className="-mr-1 -mt-1 grid h-11 w-11 place-items-center rounded-lg text-ink-600 hover:bg-ink-50"><Trash2 className="h-4 w-4" aria-hidden /></button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-end gap-2">
                    {d.portionG && d.per100 ? (
                      <>
                        <label className="flex flex-col text-[13.5px] font-medium text-ink-800">
                          {t('Hoeveel', 'Amount')}
                          <span className="mt-1 flex gap-1">
                            <input type="number" inputMode="decimal" min={0.5} max={d.unit === 'g' ? 3000 : 20} step={d.unit === 'g' ? 5 : 0.5} value={d.unit === 'g' ? d.grams : d.count}
                              onChange={(e) => patch(d.id, d.unit === 'g' ? { grams: Math.max(1, Math.min(3000, Number(e.target.value) || 0)) } : { count: Math.max(0.5, Math.min(20, Number(e.target.value) || 0)) })}
                              className="h-11 w-20 rounded-lg border border-line bg-white px-2 text-[16px] text-ink-950" aria-label={t(`Hoeveelheid ${d.name}`, `Amount of ${d.name}`)} />
                            <select value={d.unit} onChange={(e) => patch(d.id, e.target.value === 'g' ? { unit: 'g' } : { unit: 'portie', count: Math.max(0.5, n1(d.grams / (d.portionG ?? 100))) })}
                              aria-label={t(`Eenheid ${d.name}`, `Unit of ${d.name}`)} className="h-11 rounded-lg border border-line bg-white px-2 text-[15px] text-ink-950">
                              <option value="g">{t('gram', 'grams')}</option>
                              <option value="portie">{`× ${d.portionName ?? t('portie', 'serving')} (${d.portionG} g)`}</option>
                            </select>
                          </span>
                        </label>
                        <p className="pb-2.5 text-[13.5px] text-ink-700">{!hide && `${d.kcal} kcal · `}{n1(d.protein)} g {t('eiwit', 'protein')}{d.unit === 'portie' ? ` · ${d.grams} g` : ''}</p>
                      </>
                    ) : (
                      <>
                        <NumberField label={t('Gram', 'Grams')} value={d.grams} min={1} max={3000} onChange={(v) => patch(d.id, { grams: v })} />
                        {!hide && <NumberField label="kcal" value={d.kcal} min={0} max={5000} onChange={(v) => patch(d.id, { kcal: v })} />}
                        <NumberField label={t('Eiwit (g)', 'Protein (g)')} value={d.protein} min={0} max={400} onChange={(v) => patch(d.id, { protein: v })} />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[14px] text-ink-800">{hide ? t(`Samen: ${n1(draftTotal.protein)} g eiwit.`, `Together: ${n1(draftTotal.protein)} g protein.`) : t(`Samen: ${draftTotal.kcal} kcal en ${n1(draftTotal.protein)} g eiwit.`, `Together: ${draftTotal.kcal} kcal and ${n1(draftTotal.protein)} g protein.`)}</p>
            <Button className="w-full" size="lg" data-testid="save-food" loading={busy} onClick={() => void save()}>{t(`Opslaan bij ${MEAL_TEXT[meal][0].toLowerCase()}`, `Save to ${MEAL_TEXT[meal][1].toLowerCase()}`)}</Button>
          </div>
        )}
      </section>

      {/* What was eaten, per meal. */}
      <section aria-labelledby="food-day-h" className="space-y-2">
        <h2 id="food-day-h" className="text-[17px] font-bold">{day === base.today ? t('Gegeten vandaag', 'Eaten today') : t('Gegeten op deze dag', 'Eaten on this day')}</h2>
        {data.items.length === 0 ? (
          <p className="rounded-2xl bg-sage/60 px-4 py-3 text-[15px] text-ink-800">{t('Nog niets ingevuld voor deze dag.', 'Nothing logged for this day yet.')}</p>
        ) : MEALS.filter((m) => data.items.some((i) => i.meal === m)).map((m) => {
          const items = data.items.filter((i) => i.meal === m);
          const tot = sumMacros(items);
          return (
            <div key={m} className="rounded-2xl border border-line bg-white shadow-card" data-meal={m}>
              <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
                <p className="text-[15px] font-semibold">{nl ? MEAL_TEXT[m][0] : MEAL_TEXT[m][1]} <span className="text-[13px] font-normal text-ink-600">· {!hide && `${tot.kcal} kcal · `}{n1(tot.protein)} g {t('eiwit', 'protein')}</span></p>
                <button type="button" data-save-favorite={m} onClick={() => setFavFor(m)} aria-label={t(`${MEAL_TEXT[m][0]} bewaren als favoriet`, `Save ${MEAL_TEXT[m][1].toLowerCase()} as favourite`)} className="grid h-11 w-11 place-items-center rounded-lg text-[#b8892a] hover:bg-ink-50"><Star className="h-4 w-4" aria-hidden /></button>
              </div>
              <ul className="divide-y divide-line">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 px-4 py-1.5 text-[14.5px]">
                    <span className="min-w-0 flex-1"><span className="font-medium text-ink-900">{i.name}</span> <span className="text-ink-600">· {i.grams} g · {!hide && `${i.kcal} kcal · `}{n1(i.protein)} g {t('eiwit', 'protein')}</span></span>
                    <button type="button" aria-label={t(`${i.name} verwijderen`, `Delete ${i.name}`)} onClick={() => void remove(i.id)} className="grid h-11 w-11 place-items-center rounded-lg text-ink-600 hover:bg-ink-50"><Trash2 className="h-4 w-4" aria-hidden /></button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <WeekOverview hide={hide} />

      <GoalsDialog open={goalsOpen} onClose={() => setGoalsOpen(false)} data={data} />
      <OwnFoodDialog open={ownOpen} onClose={() => setOwnOpen(false)} onMade={(o) => setDrafts((d) => [...d, ownDraft(o)])} />
      <FavoriteDialog meal={favFor} onClose={() => setFavFor(null)} items={favFor ? data.items.filter((i) => i.meal === favFor) : []} />
    </div>
  );
}

function Bar({ label, value, goal, unit, testId }: { label: string; value: number; goal: number | null; unit: string; testId?: string }) {
  const pct = goal ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      <p className="flex justify-between text-[14px] font-semibold text-ink-900"><span>{label}</span><span className="tabular-nums" data-testid={testId}>{n1(value)}{goal ? ` / ${goal}` : ''} {unit}</span></p>
      {goal ? <span className="mt-1 block h-2.5 overflow-hidden rounded-full bg-sage" aria-hidden><span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></span> : null}
    </div>
  );
}

/** Water of today, with a glass to add: it also fills the hero's flask in the village. */
function WaterCard() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const hero = useQuery({ queryKey: ['patient-hero'], queryFn: () => api.get<HeroState>('/patient/hero') });
  const w = hero.data?.logs?.survival.water;
  const [busy, setBusy] = useState(false);
  if (!w) return null;
  return (
    <section aria-label={t('Water vandaag', 'Water today')} data-testid="water-card" className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
      <Droplets className="h-7 w-7 shrink-0 text-[#2f7fc4]" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink-950">{t('Water vandaag', 'Water today')}: {(w.ml / 1000).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB', { maximumFractionDigits: 2 })} / {(w.target / 1000).toLocaleString(locale === 'nl' ? 'nl-NL' : 'en-GB', { maximumFractionDigits: 1 })} l</span>
        <span className="mt-1 block h-2 overflow-hidden rounded-full bg-sage" aria-hidden><span className="block h-full rounded-full bg-[#2f7fc4]" style={{ width: `${Math.round(Math.min(1, w.ratio) * 100)}%` }} /></span>
      </span>
      <Button size="sm" loading={busy} data-testid="add-water" onClick={async () => {
        setBusy(true);
        try {
          await api.post('/patient/logs/water', { ml: WATER.glassMl });
          await qc.invalidateQueries({ queryKey: ['patient-hero'] });
          toast(t('Glas water ingevuld, ook in de veldfles van je held.', 'Glass of water logged, in your hero’s flask too.'), 'ok');
        } catch (e) {
          toast(describeError(e, locale), 'bad');
        } finally {
          setBusy(false);
        }
      }} icon={<Plus className="h-4 w-4" />}>{t('Glas', 'Glass')}</Button>
    </section>
  );
}

/** The last seven days: a bar per day, and a star for every day with breakfast, lunch and dinner. */
function WeekOverview({ hide }: { hide: boolean }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const q = useQuery({ queryKey: ['food-week'], queryFn: () => api.get<Week>('/patient/food/week') });
  if (!q.data) return null;
  const { days, targets } = q.data;
  const by = hide ? 'protein' : 'kcal';
  const goal = hide ? targets?.protein ?? null : targets?.kcal ?? null;
  const max = Math.max(goal ?? 0, ...days.map((d) => d[by])) || 1;
  const full = days.filter((d) => d.mainMeals >= 3).length;
  return (
    <section aria-labelledby="week-h" data-testid="week-overview" className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <h2 id="week-h" className="text-[17px] font-bold">{t('Deze week', 'This week')}</h2>
      <p className="text-[13.5px] text-ink-700">{t(`${full} van 7 dagen ontbijt, lunch en diner ingevuld.`, `${full} of 7 days with breakfast, lunch and dinner logged.`)} {hide ? t('Balk: eiwit.', 'Bar: protein.') : t('Balk: kcal.', 'Bar: kcal.')}</p>
      <ul className="mt-3 grid grid-cols-7 items-end gap-1.5" style={{ height: 120 }}>
        {days.map((d) => {
          const h = Math.round((d[by] / max) * 90);
          const label = new Date(d.day + 'T12:00:00').toLocaleDateString(nl ? 'nl-NL' : 'en-GB', { weekday: 'short' });
          return (
            <li key={d.day} className="flex h-full flex-col items-center justify-end gap-1" aria-label={`${label}: ${hide ? `${d.protein} g eiwit` : `${d.kcal} kcal`}, ${d.mainMeals}/3 ${t('maaltijden', 'meals')}`}>
              {d.mainMeals >= 3 ? <Star className="h-3.5 w-3.5 fill-[#E3B655] text-[#b8892a]" aria-hidden /> : <span className="h-3.5" aria-hidden />}
              <span className="w-full rounded-t-md bg-accent/80" style={{ height: Math.max(3, h) }} aria-hidden />
              <span className="text-[11.5px] text-ink-600" aria-hidden>{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GoalsDialog({ open, onClose, data }: { open: boolean; onClose: () => void; data: DayData }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const [f, setF] = useState({ ...data.profile, weightKg: data.weightKg, heightCm: data.heightCm });
  useEffect(() => { if (open) setF({ ...data.profile, weightKg: data.weightKg, heightCm: data.heightCm }); }, [open, data.profile, data.weightKg, data.heightCm]);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const r = await api.put<DayData>('/patient/nutrition/profile', f);
      qc.setQueryData(['food-day'], r);
      void qc.invalidateQueries({ queryKey: ['food-day'] });
      void qc.invalidateQueries({ queryKey: ['food-week'] });
      void qc.invalidateQueries({ queryKey: ['patient-hero'] });
      toast(r.targets ? t(`Je richtlijn: ${r.profile.hideKcal ? '' : `${r.targets.kcal} kcal, `}${r.targets.protein} g eiwit per dag.`, `Your guide: ${r.profile.hideKcal ? '' : `${r.targets.kcal} kcal, `}${r.targets.protein} g protein a day.`) : t('Opgeslagen.', 'Saved.'), 'ok');
      onClose();
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  const num = (v: string) => (v === '' ? null : Number(v));
  return (
    <Dialog open={open} onClose={onClose} title={t('Je doelen', 'Your goals')} size="md" sheet
      description={t('Hiermee rekent de app een richtlijn uit voor calorieën, eiwit, koolhydraten en vet. Alleen jij ziet dit.', 'The app uses this to work out a guide for calories, protein, carbs and fat. Only you see this.')}
      footer={<Button className="w-full" size="lg" loading={busy} data-testid="save-goals" onClick={() => void save()}>{t('Opslaan', 'Save')}</Button>}>
      <div className="space-y-3" data-testid="goals-form">
        <fieldset>
          <legend className="mb-1 text-[14px] font-semibold">{t('Je doel', 'Your goal')}</legend>
          <div className="grid grid-cols-3 gap-1.5">
            {PLAN_GOALS.map((g) => (
              <button key={g.key} type="button" aria-pressed={f.goal === g.key} data-plan-goal={g.key} onClick={() => setF({ ...f, goal: g.key as PlanGoal })}
                className={cn('min-h-[48px] rounded-xl border px-2 text-[14px] font-semibold', f.goal === g.key ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-white text-ink-800')}>{nl ? g.nl : g.en}</button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-2">
          <Select label={t('Geslacht (voor de berekening)', 'Sex (for the calculation)')} value={f.sex ?? ''} onChange={(e) => setF({ ...f, sex: (e.target.value || null) as 'm' | 'v' | null })}>
            <option value="">{t('Kies', 'Choose')}</option>
            <option value="v">{t('Vrouw', 'Female')}</option>
            <option value="m">{t('Man', 'Male')}</option>
          </Select>
          <label className="flex flex-col text-[14px] font-medium text-ink-800">{t('Geboortejaar', 'Birth year')}
            <input type="number" inputMode="numeric" min={1900} max={2020} value={f.birthYear ?? ''} onChange={(e) => setF({ ...f, birthYear: num(e.target.value) })} className="mt-1 h-11 rounded-lg border border-line bg-white px-2 text-[16px] text-ink-950" />
          </label>
          <label className="flex flex-col text-[14px] font-medium text-ink-800">{t('Gewicht (kg)', 'Weight (kg)')}
            <input type="number" inputMode="decimal" min={30} max={300} step={0.1} value={f.weightKg ?? ''} onChange={(e) => setF({ ...f, weightKg: num(e.target.value) })} className="mt-1 h-11 rounded-lg border border-line bg-white px-2 text-[16px] text-ink-950" />
          </label>
          <label className="flex flex-col text-[14px] font-medium text-ink-800">{t('Lengte (cm)', 'Height (cm)')}
            <input type="number" inputMode="numeric" min={100} max={230} value={f.heightCm ?? ''} onChange={(e) => setF({ ...f, heightCm: num(e.target.value) })} className="mt-1 h-11 rounded-lg border border-line bg-white px-2 text-[16px] text-ink-950" />
          </label>
        </div>
        <Select label={t('Hoe actief ben je?', 'How active are you?')} value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value as Activity })}>
          {ACTIVITY.map((a) => <option key={a.key} value={a.key}>{nl ? `${a.nl} · ${a.hintNl}` : `${a.en} · ${a.hintEn}`}</option>)}
        </Select>
        <Select label={t('Wat eet je?', 'What do you eat?')} value={f.diet} onChange={(e) => setF({ ...f, diet: e.target.value as Diet })}>
          <option value="alles">{t('Alles', 'Everything')}</option>
          <option value="vegetarisch">{t('Vegetarisch', 'Vegetarian')}</option>
          <option value="veganistisch">{t('Veganistisch', 'Vegan')}</option>
        </Select>
        <label className="flex min-h-[48px] items-start gap-3 rounded-xl border border-line p-3">
          <input type="checkbox" checked={f.hideKcal} onChange={(e) => setF({ ...f, hideKcal: e.target.checked })} className="mt-0.5 h-5 w-5 accent-[rgb(var(--accent))]" data-testid="hide-kcal" />
          <span><span className="block text-[15px] font-semibold">{t('Calorieën verbergen', 'Hide calories')}</span><span className="block text-[13px] text-ink-700">{t('Je ziet dan alleen eiwit en of je goed gegeten hebt. Fijn als cijfers je onrustig maken.', 'You then only see protein and whether you ate well. Good if numbers make you uneasy.')}</span></span>
        </label>
        <p className="text-[12.5px] text-ink-600">{t('De richtlijn is een schatting (Mifflin-St Jeor). Wie zwanger is, borstvoeding geeft of een aandoening heeft: overleg met je huisarts of diëtist.', 'The guide is an estimate (Mifflin-St Jeor). If you are pregnant, breastfeeding or have a condition: check with your GP or dietitian.')}</p>
      </div>
    </Dialog>
  );
}

function OwnFoodDialog({ open, onClose, onMade }: { open: boolean; onClose: () => void; onMade: (o: OwnFood) => void }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const empty = { name: '', kcal: 0, protein: 0, carbs: 0, fat: 0, portionG: 100 };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const r = await api.post<DayData>('/patient/food/own', f);
      qc.setQueryData(['food-day'], r);
      void qc.invalidateQueries({ queryKey: ['food-day'] });
      const made = r.ownFoods.find((o) => o.name === f.name.trim());
      if (made) onMade(made);
      setF(empty);
      onClose();
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    } finally {
      setBusy(false);
    }
  };
  const field = (k: keyof typeof empty, label: string, max: number) => (
    <label className="flex flex-col text-[14px] font-medium text-ink-800">{label}
      <input type="number" inputMode="decimal" min={0} max={max} step={0.1} value={f[k] as number} onChange={(e) => setF({ ...f, [k]: Math.max(0, Math.min(max, Number(e.target.value) || 0)) })} className="mt-1 h-11 rounded-lg border border-line bg-white px-2 text-[16px] text-ink-950" />
    </label>
  );
  return (
    <Dialog open={open} onClose={onClose} title={t('Eigen product', 'Own product')} size="md" sheet
      description={t('Neem de waarden per 100 gram over van de verpakking.', 'Copy the values per 100 grams from the packaging.')}
      footer={<Button className="w-full" size="lg" loading={busy} disabled={f.name.trim().length < 2} data-testid="save-own-food" onClick={() => void save()}>{t('Bewaren', 'Save')}</Button>}>
      <div className="space-y-3">
        <label className="flex flex-col text-[14px] font-medium text-ink-800">{t('Naam', 'Name')}
          <input value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} className="mt-1 h-11 rounded-lg border border-line bg-white px-3 text-[16px] text-ink-950" placeholder={t('Bijv. proteïnepudding vanille', 'E.g. vanilla protein pudding')} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {field('kcal', t('kcal per 100 g', 'kcal per 100 g'), 900)}
          {field('protein', t('Eiwit per 100 g', 'Protein per 100 g'), 100)}
          {field('carbs', t('Koolhydraten per 100 g', 'Carbs per 100 g'), 100)}
          {field('fat', t('Vet per 100 g', 'Fat per 100 g'), 100)}
          {field('portionG', t('Eén portie (gram)', 'One serving (grams)'), 1000)}
        </div>
      </div>
    </Dialog>
  );
}

function FavoriteDialog({ meal, onClose, items }: { meal: Meal | null; onClose: () => void; items: DayItem[] }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  useEffect(() => { if (meal) setName(locale === 'nl' ? `Mijn ${MEAL_TEXT[meal][0].toLowerCase()}` : `My ${MEAL_TEXT[meal][1].toLowerCase()}`); }, [meal, locale]);
  const save = async () => {
    if (!meal) return;
    try {
      const r = await api.post<DayData>('/patient/food/favorites', { name, meal, items: items.map((i) => (i.foodKey ? { foodKey: i.foodKey, name: i.name, grams: i.grams } : { foodKey: null, name: i.name, grams: i.grams, kcal: i.kcal, protein: i.protein })) });
      qc.setQueryData(['food-day'], r);
      void qc.invalidateQueries({ queryKey: ['food-day'] });
      toast(t(`Bewaard als favoriet: ${name}. Eén tik en het staat er weer.`, `Saved as favourite: ${name}. One tap and it is back.`), 'ok');
      onClose();
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    }
  };
  return (
    <Dialog open={!!meal} onClose={onClose} title={t('Bewaren als favoriet', 'Save as favourite')} size="sm"
      footer={<Button className="w-full" data-testid="save-favorite" disabled={name.trim().length < 2} onClick={() => void save()}>{t('Bewaren', 'Save')}</Button>}>
      <label className="flex flex-col text-[14px] font-medium text-ink-800">{t('Naam', 'Name')}
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} className="mt-1 h-11 rounded-lg border border-line bg-white px-3 text-[16px] text-ink-950" />
      </label>
      <p className="mt-2 text-[13.5px] text-ink-700">{items.map((i) => i.name).join(', ')}</p>
    </Dialog>
  );
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <label className="flex flex-col text-[13.5px] font-medium text-ink-800">
      {label}
      <input type="number" inputMode="decimal" min={min} max={max} value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        className="mt-1 h-11 w-24 rounded-lg border border-line bg-white px-2 text-[16px] text-ink-950" />
    </label>
  );
}

/** Search the food list and your own products by name. */
function FoodPicker({ own, onPick, onPickOwn }: { own: OwnFood[]; onPick: (key: string) => void; onPickOwn: (o: OwnFood) => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const hits = useMemo(() => (s.length < 2 ? [] : FOODS.filter((f) => f.alias.some((a) => a.includes(s))).slice(0, 6)), [s]);
  const mine = s.length < 2 ? [] : own.filter((o) => o.name.toLowerCase().includes(s)).slice(0, 4);
  return (
    <div>
      <label className="flex flex-col text-[14px] font-medium text-ink-800">
        {t('Of zoek een product', 'Or search a product')}
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Bijv. kwark, kip, banaan', 'E.g. quark, chicken, banana')} className="mt-1 h-11 rounded-lg border border-line bg-white px-3 text-[16px] text-ink-950" />
      </label>
      {(hits.length > 0 || mine.length > 0) && (
        <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={t('Gevonden producten', 'Products found')}>
          {mine.map((o) => <li key={o.id}><Button size="sm" variant="secondary" data-pick-own={o.name} icon={<Star className="h-4 w-4" />} onClick={() => { onPickOwn(o); setQ(''); }}>{o.name}</Button></li>)}
          {hits.map((f) => <li key={f.key}><Button size="sm" variant="secondary" data-pick-food={f.key} icon={<Plus className="h-4 w-4" />} onClick={() => { onPick(f.key); setQ(''); }}>{nl ? f.nl : f.en}</Button></li>)}
        </ul>
      )}
    </div>
  );
}

function RecipesTab({ plan, base }: { plan: Plan; base: DayData }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const savePlan = useSavePlan();
  const log = useLogFood();
  const toast = useToast();
  const hide = base.profile.hideKcal;
  const [goal, setGoal] = useState<NutritionGoal>(plan.goal ?? (base.profile.goal === 'afvallen' ? 'afvallen' : base.profile.goal === 'spiergroei' ? 'spiergroei' : 'gezond'));
  const [meal, setMeal] = useState<Meal | 'alle'>('alle');
  const [diet, setDiet] = useState<Diet>(base.profile.diet);
  const [prepOnly, setPrepOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [cook, setCook] = useState<{ r: Recipe; servings: number } | null>(null);
  const list = RECIPES.filter((r) => recipeGoals(r).includes(goal) && (meal === 'alle' || r.meal === meal) && (diet === 'alles' || (diet === 'vegetarisch' ? r.vegetarian : r.vegan)) && (!prepOnly || r.prep))
    .sort((a, b) => (goal === 'afvallen' ? recipeMacros(a).kcal - recipeMacros(b).kcal : recipeMacros(b).protein - recipeMacros(a).protein));
  const chip = (on: boolean) => cn('min-h-[44px] rounded-full border px-3 text-[14px] font-semibold', on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-white text-ink-800');
  const addToPlan = (r: Recipe, day: number, servings: number) => {
    void savePlan({ ...plan, goal, items: [...plan.items, { day, meal: r.meal, recipe: r.key, servings }] });
    toast(t(`${r.nl} staat op ${DAYS_NL[day].toLowerCase()} in je weekplan.`, `${r.en} is on ${DAYS_EN[day]} in your week plan.`), 'ok');
  };

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-[15px] font-semibold">{t('Je doel', 'Your goal')}</legend>
        <div className="flex flex-wrap gap-1.5">
          {GOALS.map((g) => (
            <button key={g} type="button" aria-pressed={goal === g} data-goal={g} onClick={() => { setGoal(g); void savePlan({ ...plan, goal: g }); }} className={chip(goal === g)}>{nl ? GOAL_TEXT[g][0] : GOAL_TEXT[g][1]}</button>
          ))}
        </div>
        <p className="mt-1 text-[13.5px] text-ink-600">{nl ? GOAL_TEXT[goal][2] : GOAL_TEXT[goal][3]}</p>
      </fieldset>
      <div className="flex flex-wrap gap-1.5" aria-label={t('Filters', 'Filters')}>
        {(['alle', ...MEALS] as const).map((m) => (
          <button key={m} type="button" aria-pressed={meal === m} onClick={() => setMeal(m)} className={chip(meal === m)}>{m === 'alle' ? t('Alles', 'All') : nl ? MEAL_TEXT[m][0] : MEAL_TEXT[m][1]}</button>
        ))}
        <button type="button" aria-pressed={diet === 'vegetarisch'} data-diet="vegetarisch" onClick={() => setDiet(diet === 'vegetarisch' ? 'alles' : 'vegetarisch')} className={chip(diet === 'vegetarisch')}><Leaf className="mr-1 inline h-4 w-4" aria-hidden />{t('Vegetarisch', 'Vegetarian')}</button>
        <button type="button" aria-pressed={diet === 'veganistisch'} data-diet="veganistisch" onClick={() => setDiet(diet === 'veganistisch' ? 'alles' : 'veganistisch')} className={chip(diet === 'veganistisch')}><Leaf className="mr-1 inline h-4 w-4" aria-hidden />{t('Veganistisch', 'Vegan')}</button>
        <button type="button" aria-pressed={prepOnly} onClick={() => setPrepOnly(!prepOnly)} className={chip(prepOnly)}><ChefHat className="mr-1 inline h-4 w-4" aria-hidden />{t('Om te preppen', 'For meal prep')}</button>
      </div>
      {list.length === 0 && <p className="rounded-2xl bg-sage/60 px-4 py-3 text-[15px]">{t('Geen recepten met deze filters. Zet een filter uit.', 'No recipes with these filters. Turn a filter off.')}</p>}
      <ul className="space-y-2" data-testid="recipe-list">
        {list.map((r) => {
          const m = recipeMacros(r);
          const isOpen = open === r.key;
          return (
            <li key={r.key} data-recipe={r.key} className="rounded-2xl border border-line bg-white shadow-card">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.key)} className="flex w-full items-start gap-3 p-3 text-left sm:p-4">
                {!isOpen && <RecipePhoto k={r.key} small className="h-[72px] w-[72px] shrink-0 rounded-xl" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold leading-snug text-ink-950">{nl ? r.nl : r.en}</span>
                  <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[13.5px] text-ink-700">
                    <span>{nl ? MEAL_TEXT[r.meal][0] : MEAL_TEXT[r.meal][1]}</span>·<span className="inline-flex items-center gap-0.5"><Clock className="h-3.5 w-3.5" aria-hidden />{r.minutes} min</span>{!hide && <>·<span>{m.kcal} kcal</span></>}·<span className="font-semibold text-ink-900">{n1(m.protein)} g {t('eiwit', 'protein')}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {r.prep && <span className="rounded-full bg-sage px-2 py-0.5 text-[12px] font-semibold text-ink-800">{t('Prep: 3–4 dagen houdbaar', 'Prep: keeps 3–4 days')}</span>}
                    {r.vegan ? <span className="rounded-full bg-sage px-2 py-0.5 text-[12px] font-semibold text-ink-800">{t('Veganistisch', 'Vegan')}</span> : r.vegetarian && <span className="rounded-full bg-sage px-2 py-0.5 text-[12px] font-semibold text-ink-800">{t('Vegetarisch', 'Vegetarian')}</span>}
                  </span>
                </span>
                <ChevronDown className={cn('mt-1 h-5 w-5 shrink-0 text-ink-500 transition-transform', isOpen && 'rotate-180')} aria-hidden />
              </button>
              {isOpen && <RecipeDetail r={r} hide={hide} onAdd={(d, s) => addToPlan(r, d, s)} onCook={(s) => setCook({ r, servings: s })} onAte={() => void log(r.meal, r.ingredients.map((i) => ({ foodKey: i.food, name: nl ? FOOD_BY_KEY[i.food].nl : FOOD_BY_KEY[i.food].en, grams: i.g })), base.today)} />}
            </li>
          );
        })}
      </ul>
      <CookMode cook={cook} onClose={() => setCook(null)} />
    </div>
  );
}

/** The photo of a dish (public/recipes/<key>.webp); a soft tile with a cooking pot when it is missing. */
function RecipePhoto({ k, className, small }: { k: string; className?: string; small?: boolean }) {
  const [gone, setGone] = useState(false);
  if (gone) return <span aria-hidden className={cn('grid place-items-center bg-sage/70 text-ink-500', className)}><ChefHat className="h-6 w-6" /></span>;
  return <img src={`/recipes/${k}${small ? '-sm' : ''}.webp`} alt="" loading="lazy" decoding="async" data-testid="recipe-photo" onError={() => setGone(true)} className={cn('bg-sage/60 object-cover', className)} />;
}

function RecipeDetail({ r, hide, onAdd, onAte, onCook }: { r: Recipe; hide: boolean; onAdd: (day: number, servings: number) => void; onAte: () => void; onCook: (servings: number) => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [day, setDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [servings, setServings] = useState(r.prep ? 3 : 1);
  const m = recipeMacros(r);
  return (
    <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
      <RecipePhoto k={r.key} className="aspect-[4/3] w-full rounded-xl" />
      <p className="text-[13.5px] text-ink-700">{t('Per portie', 'Per serving')}: {!hide && `${m.kcal} kcal · `}{n1(m.protein)} g {t('eiwit', 'protein')} · {n1(m.carbs)} g {t('koolhydraten', 'carbs')} · {n1(m.fat)} g {t('vet', 'fat')}</p>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h3 className="text-[15px] font-semibold">{t(`Ingrediënten voor ${servings} ${servings === 1 ? 'portie' : 'porties'}`, `Ingredients for ${servings} ${servings === 1 ? 'serving' : 'servings'}`)}</h3>
          <ServingsStepper value={servings} onChange={setServings} />
        </div>
        <ul className="mt-1 list-disc pl-5 text-[15px] text-ink-800" data-testid="ingredients">{r.ingredients.map((i) => <li key={i.food}>{Math.round(i.g * servings)} g {(nl ? FOOD_BY_KEY[i.food].nl : FOOD_BY_KEY[i.food].en).toLowerCase()}</li>)}</ul>
      </div>
      <div>
        <h3 className="text-[15px] font-semibold">{t('Zo maak je het', 'How to make it')}</h3>
        <ol className="mt-1 list-decimal pl-5 text-[15px] text-ink-800">{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        <Button size="sm" variant="secondary" className="mt-2" data-testid="cook-mode" onClick={() => onCook(servings)} icon={<ChefHat className="h-4 w-4" />}>{t('Kookmodus', 'Cooking mode')}</Button>
      </div>
      <div className="rounded-xl bg-sage/60 p-3">
        <p className="text-[14.5px] font-semibold">{t('In je weekplan', 'In your week plan')}</p>
        <div className="mt-1.5 flex flex-wrap items-end gap-2">
          <Select label={t('Dag', 'Day')} value={day} onChange={(e) => setDay(Number(e.target.value))} className="min-w-[140px]">
            {DAYS_NL.map((d, i) => <option key={d} value={i}>{nl ? d : DAYS_EN[i]}</option>)}
          </Select>
        </div>
        {r.prep && <p className="mt-1.5 text-[13px] text-ink-700">{t('Tip: kook meerdere porties tegelijk en verdeel ze over bakjes.', 'Tip: cook several servings at once and split them over boxes.')}</p>}
        <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          <Button data-testid="add-to-plan" icon={<CalendarDays className="h-4 w-4" />} onClick={() => onAdd(day, servings)}>{t(`Zet in weekplan (${servings}×)`, `Add to week plan (${servings}×)`)}</Button>
          <Button variant="secondary" data-testid="ate-recipe" icon={<Check className="h-4 w-4" />} onClick={onAte}>{t('Ik heb dit gegeten', 'I ate this')}</Button>
        </div>
      </div>
    </div>
  );
}

/** Cooking mode: one step at a time, big, and the screen stays on (where the phone allows it). */
function CookMode({ cook, onClose }: { cook: { r: Recipe; servings: number } | null; onClose: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [step, setStep] = useState(0);
  useEffect(() => {
    setStep(0);
    if (!cook) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as unknown as { wakeLock?: { request: (k: 'screen') => Promise<{ release: () => Promise<void> }> } };
    void nav.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => undefined);
    return () => { void lock?.release().catch(() => undefined); };
  }, [cook]);
  if (!cook) return null;
  const { r, servings } = cook;
  const steps = r.steps;
  const last = step >= steps.length - 1;
  return (
    <Dialog open onClose={onClose} title={nl ? r.nl : r.en} size="lg" description={t(`${servings} ${servings === 1 ? 'portie' : 'porties'} · stap ${step + 1} van ${steps.length}`, `${servings} ${servings === 1 ? 'serving' : 'servings'} · step ${step + 1} of ${steps.length}`)}
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button size="lg" variant="secondary" disabled={step === 0} onClick={() => setStep(step - 1)} icon={<ChevronLeft className="h-5 w-5" />}>{t('Vorige', 'Back')}</Button>
          <Button size="lg" data-testid="cook-next" onClick={() => (last ? onClose() : setStep(step + 1))} icon={last ? <Check className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}>{last ? t('Klaar', 'Done') : t('Volgende', 'Next')}</Button>
        </div>
      }>
      <div data-testid="cook-step" aria-live="polite">
        {step === 0 && (
          <ul className="mb-4 list-disc pl-5 text-[16px] text-ink-800">{r.ingredients.map((i) => <li key={i.food}>{Math.round(i.g * servings)} g {(nl ? FOOD_BY_KEY[i.food].nl : FOOD_BY_KEY[i.food].en).toLowerCase()}</li>)}</ul>
        )}
        <p className="text-[24px] font-semibold leading-snug text-ink-950">{steps[step]}</p>
      </div>
    </Dialog>
  );
}

function ServingsStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useI18n();
  return (
    <span className="flex flex-col text-[13.5px] font-medium text-ink-800">
      {t('Porties', 'Servings')}
      <span className="mt-1 flex items-center gap-1">
        <button type="button" aria-label={t('Een portie minder', 'One serving less')} onClick={() => onChange(Math.max(1, value - 1))} className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-white"><Minus className="h-4 w-4" aria-hidden /></button>
        <span className="w-6 text-center text-[16px] font-semibold tabular-nums" aria-live="polite">{value}</span>
        <button type="button" aria-label={t('Een portie meer', 'One serving more')} onClick={() => onChange(Math.min(8, value + 1))} className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-white"><Plus className="h-4 w-4" aria-hidden /></button>
      </span>
    </span>
  );
}

function PlanTab({ plan, base, onShop, onRecipes }: { plan: Plan; base: DayData; onShop: () => void; onRecipes: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const savePlan = useSavePlan();
  const toast = useToast();
  const [variant, setVariant] = useState(0);
  const set = (items: PlanItem[]) => void savePlan({ ...plan, items });
  const hide = base.profile.hideKcal;
  const goal: NutritionGoal = plan.goal ?? (base.profile.goal === 'afvallen' ? 'afvallen' : base.profile.goal === 'spiergroei' ? 'spiergroei' : 'gezond');
  const fill = (v: number) => {
    setVariant(v);
    void savePlan({ ...plan, goal, items: planWeek(goal, base.profile.diet, v), checked: [] });
    toast(t('Je week is gevuld. Prep-gerechten komen drie dagen terug: één keer koken, drie keer eten.', 'Your week is filled. Prep dishes come back three days in a row: cook once, eat three times.'), 'ok');
  };
  const filler = (
    <div className="space-y-2 rounded-2xl border border-line bg-white p-4 shadow-card" data-testid="fill-week">
      <p className="text-[15px] text-ink-800">{t(`Laat de app je week vullen voor ${nl ? GOAL_TEXT[goal][0].toLowerCase() : GOAL_TEXT[goal][1].toLowerCase()}${base.profile.diet !== 'alles' ? `, ${base.profile.diet}` : ''}. Je kunt daarna alles aanpassen.`, `Let the app fill your week for ${GOAL_TEXT[goal][1].toLowerCase()}${base.profile.diet !== 'alles' ? `, ${base.profile.diet === 'veganistisch' ? 'vegan' : 'vegetarian'}` : ''}. You can change everything afterwards.`)}</p>
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <Button data-testid="fill-week-button" icon={<Wand2 className="h-4 w-4" />} onClick={() => fill(variant)}>{plan.items.length ? t('Vul opnieuw', 'Fill again') : t('Vul mijn week', 'Fill my week')}</Button>
        {plan.items.length > 0 && <Button variant="secondary" data-testid="fill-other" onClick={() => fill(variant + 1)} icon={<Sparkles className="h-4 w-4" />}>{t('Iets anders', 'Something else')}</Button>}
      </div>
    </div>
  );
  if (!plan.items.length) {
    return (
      <div className="space-y-3">
        {filler}
        <div className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-card" data-testid="plan-empty">
          <p className="text-[15px] text-ink-800">{t('Of kies zelf recepten bij Recepten en zet ze op een dag. Dan maken we je boodschappenlijst.', 'Or pick recipes yourself under Recipes and put them on a day. Then we make your shopping list.')}</p>
          <Button variant="secondary" onClick={onRecipes} icon={<ChefHat className="h-4 w-4" />}>{t('Naar de recepten', 'To the recipes')}</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3" data-testid="week-plan">
      {filler}
      {DAYS_NL.map((d, di) => {
        const items = plan.items.map((it, idx) => ({ it, idx })).filter((x) => x.it.day === di);
        if (!items.length) return null;
        const tot = sumMacros(items.map((x) => recipeMacros(RECIPE_BY_KEY[x.it.recipe])));
        return (
          <section key={d} aria-label={nl ? d : DAYS_EN[di]} className="rounded-2xl border border-line bg-white shadow-card">
            <p className="flex items-baseline justify-between border-b border-line px-4 py-2.5 text-[15px] font-semibold"><span>{nl ? d : DAYS_EN[di]}</span><span className="text-[13px] font-normal text-ink-600">{t('per portie', 'per serving')}: {!hide && `${tot.kcal} kcal · `}{n1(tot.protein)} g {t('eiwit', 'protein')}</span></p>
            <ul className="divide-y divide-line">
              {items.map(({ it, idx }) => {
                const r = RECIPE_BY_KEY[it.recipe];
                return (
                  <li key={idx} className="flex flex-wrap items-center gap-2 px-4 py-2">
                    <span className="min-w-0 flex-1 text-[15px]"><span className="block text-[12.5px] text-ink-600">{nl ? MEAL_TEXT[it.meal][0] : MEAL_TEXT[it.meal][1]}</span>{nl ? r.nl : r.en}</span>
                    <ServingsStepper value={it.servings} onChange={(v) => set(plan.items.map((x, k) => (k === idx ? { ...x, servings: v } : x)))} />
                    <button type="button" aria-label={t(`${r.nl} uit je weekplan halen`, `Remove ${r.en} from your week plan`)} onClick={() => set(plan.items.filter((_, k) => k !== idx))} className="grid h-11 w-11 place-items-center rounded-lg text-ink-600 hover:bg-ink-50"><Trash2 className="h-4 w-4" aria-hidden /></button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
        <Button onClick={onShop} icon={<ShoppingCart className="h-4 w-4" />} data-testid="to-shopping">{t('Naar je boodschappenlijst', 'To your shopping list')}</Button>
        <Button variant="secondary" onClick={onRecipes} icon={<Plus className="h-4 w-4" />}>{t('Recept toevoegen', 'Add a recipe')}</Button>
      </div>
    </div>
  );
}

function ShoppingTab({ plan, onPlan }: { plan: Plan; onPlan: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const savePlan = useSavePlan();
  const toast = useToast();
  const lines = useMemo(() => shoppingList(plan.items), [plan.items]);
  // Ticks answer at once; the save follows.
  const [ticks, setTicks] = useState<string[]>(plan.checked);
  useEffect(() => setTicks(plan.checked), [plan.checked]);
  const [extra, setExtra] = useState('');
  const checked = new Set(ticks);
  const extras = plan.extras ?? [];
  const toggle = (key: string) => {
    const next = checked.has(key) ? ticks.filter((k) => k !== key) : [...ticks, key];
    setTicks(next);
    void savePlan({ ...plan, checked: next });
  };
  const amountOf = (l: (typeof lines)[number]) => {
    const f = FOOD_BY_KEY[l.food];
    return l.pieces !== null ? `${l.pieces} ${nl ? (l.pieces === 1 ? f.portion.nl : f.portion.nl === 'ei' ? 'eieren' : `${f.portion.nl}s`) : f.portion.en + (l.pieces === 1 ? '' : 's')} (${l.grams} g)` : l.grams >= 1000 ? `${n1(l.grams / 1000)} kg` : `${l.grams} g`;
  };
  const asText = () => [
    ...lines.filter((l) => !checked.has(l.food)).map((l) => `- ${nl ? FOOD_BY_KEY[l.food].nl : FOOD_BY_KEY[l.food].en}: ${amountOf(l)}`),
    ...extras.filter((x) => !checked.has(x.id)).map((x) => `- ${x.text}`),
  ].join('\n');
  const share = async () => {
    const text = `${t('Boodschappen', 'Shopping')}\n${asText()}`;
    const nav = navigator as Navigator & { share?: (d: { title: string; text: string }) => Promise<void> };
    try {
      if (nav.share) await nav.share({ title: t('Boodschappen', 'Shopping'), text });
      else {
        await navigator.clipboard.writeText(text);
        toast(t('Lijst gekopieerd. Plak hem in een bericht of notitie.', 'List copied. Paste it into a message or note.'), 'ok');
      }
    } catch { /* closed the share sheet */ }
  };
  const addExtra = () => {
    const text = extra.trim();
    if (!text) return;
    void savePlan({ ...plan, extras: [...extras, { id: `x-${Date.now().toString(36)}`, text: text.slice(0, 60) }] });
    setExtra('');
  };
  if (!lines.length && !extras.length) {
    return (
      <div className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-card">
        <p className="text-[15px] text-ink-800">{t('Nog geen boodschappen: zet eerst recepten in je weekplan, of zet hieronder zelf iets op de lijst.', 'No shopping yet: put recipes in your week plan first, or add something to the list below.')}</p>
        <Button onClick={onPlan} icon={<CalendarDays className="h-4 w-4" />}>{t('Naar je weekplan', 'To your week plan')}</Button>
        <ExtraInput value={extra} onChange={setExtra} onAdd={addExtra} />
      </div>
    );
  }
  const left = lines.filter((l) => !checked.has(l.food)).length + extras.filter((x) => !checked.has(x.id)).length;
  return (
    <div className="space-y-3" data-testid="shopping-list">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[15px] text-ink-800">{left === 0 ? t('Alles is binnen. Lekker koken!', 'Everything is in. Enjoy cooking!') : t(`Nog ${left} van ${lines.length + extras.length} producten.`, `${left} of ${lines.length + extras.length} products to go.`)}</p>
        <span className="flex gap-1.5 print:hidden">
          <Button size="sm" variant="secondary" data-testid="share-list" onClick={() => void share()} icon={<Share2 className="h-4 w-4" />}>{t('Delen', 'Share')}</Button>
          <Button size="sm" variant="secondary" onClick={() => window.print()} icon={<Printer className="h-4 w-4" />}>{t('Printen', 'Print')}</Button>
        </span>
      </div>
      {AISLES.filter((a) => lines.some((l) => l.aisle === a.key)).map((a) => (
        <section key={a.key} aria-labelledby={`aisle-${a.key}`} className="rounded-2xl border border-line bg-white shadow-card">
          <h2 id={`aisle-${a.key}`} className="border-b border-line px-4 py-2.5 text-[15px] font-semibold">{nl ? a.nl : a.en}</h2>
          <ul className="divide-y divide-line">
            {lines.filter((l) => l.aisle === a.key).map((l) => (
              <li key={l.food}>
                <label className="flex min-h-[48px] cursor-pointer items-center gap-3 px-4 py-2">
                  <input type="checkbox" checked={checked.has(l.food)} onChange={() => toggle(l.food)} data-shop={l.food} className="h-5 w-5 accent-[rgb(var(--accent))]" />
                  <span className={cn('flex-1 text-[15px]', checked.has(l.food) && 'text-ink-500 line-through')}>{nl ? FOOD_BY_KEY[l.food].nl : FOOD_BY_KEY[l.food].en}</span>
                  <span className="text-[14px] tabular-nums text-ink-700">{amountOf(l)}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section aria-labelledby="aisle-extra" className="rounded-2xl border border-line bg-white shadow-card" data-testid="shopping-extras">
        <h2 id="aisle-extra" className="border-b border-line px-4 py-2.5 text-[15px] font-semibold">{t('Zelf toegevoegd', 'Added yourself')}</h2>
        <ul className="divide-y divide-line">
          {extras.map((x) => (
            <li key={x.id} className="flex items-center">
              <label className="flex min-h-[48px] flex-1 cursor-pointer items-center gap-3 px-4 py-2">
                <input type="checkbox" checked={checked.has(x.id)} onChange={() => toggle(x.id)} className="h-5 w-5 accent-[rgb(var(--accent))]" />
                <span className={cn('flex-1 text-[15px]', checked.has(x.id) && 'text-ink-500 line-through')}>{x.text}</span>
              </label>
              <button type="button" aria-label={t(`${x.text} van de lijst halen`, `Remove ${x.text} from the list`)} onClick={() => void savePlan({ ...plan, extras: extras.filter((y) => y.id !== x.id), checked: ticks.filter((k) => k !== x.id) })} className="grid h-11 w-11 place-items-center text-ink-600 print:hidden"><Trash2 className="h-4 w-4" aria-hidden /></button>
            </li>
          ))}
        </ul>
        <div className="p-3 print:hidden"><ExtraInput value={extra} onChange={setExtra} onAdd={addExtra} /></div>
      </section>
      {ticks.length > 0 && <Button variant="secondary" className="w-full print:hidden" onClick={() => { setTicks([]); void savePlan({ ...plan, checked: [] }); }}>{t('Vinkjes wissen', 'Clear ticks')}</Button>}
    </div>
  );
}

function ExtraInput({ value, onChange, onAdd }: { value: string; onChange: (v: string) => void; onAdd: () => void }) {
  const { t } = useI18n();
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); onAdd(); }}>
      <label className="sr-only" htmlFor="shop-extra">{t('Zelf iets toevoegen', 'Add something yourself')}</label>
      <input id="shop-extra" value={value} maxLength={60} onChange={(e) => onChange(e.target.value)} placeholder={t('Bijv. koffie, wc-papier', 'E.g. coffee, toilet paper')} className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-[16px] text-ink-950" />
      <Button type="submit" data-testid="add-extra" disabled={!value.trim()} icon={<Plus className="h-4 w-4" />}>{t('Toevoegen', 'Add')}</Button>
    </form>
  );
}
