import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChefHat, ChevronDown, Clock, Leaf, Minus, Plus, ShoppingCart, Sparkles, Trash2, Utensils, CalendarDays } from 'lucide-react';
import { api } from '@/lib/api';
import { describeError, useI18n } from '@/lib/i18n';
import { useDocumentMeta } from '@/lib/meta';
import { cn } from '@/lib/cn';
import { Button, ErrorState, Notice, Select, Spinner, Textarea, useToast } from '@/components/ui';
import { AISLES, FOODS, FOOD_BY_KEY, MEALS, MEAL_TEXT, macrosOf, mealForHour, sumMacros, type Macros, type Meal } from '@shared/foods';
import { parseFoodText } from '@shared/foodText';
import { GOALS, GOAL_TEXT, RECIPES, RECIPE_BY_KEY, recipeGoals, recipeMacros, shoppingList, type NutritionGoal, type PlanItem, type Recipe } from '@shared/recipes';

type DayItem = { id: string; meal: Meal; name: string; foodKey: string | null; grams: number } & Macros;
type DayData = { day: string; items: DayItem[]; totals: Macros; recent: { name: string; foodKey: string | null; grams: number }[]; proteinGoal: number | null };
type Plan = { items: PlanItem[]; checked: string[]; goal: NutritionGoal | null };
type Draft = { id: number; foodKey: string | null; name: string; grams: number; kcal: number; protein: number };

const TABS = ['vandaag', 'recepten', 'weekplan', 'boodschappen'] as const;
type Tab = (typeof TABS)[number];
const DAYS_NL = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
const DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
let draftId = 1;
const n1 = (x: number) => Math.round(x * 10) / 10;

/**
 * Voeding: what you ate today (typed in your own words, or one tap on what you often eat), recipes
 * for your goal, a week plan for cooking ahead, and the shopping list that comes out of it. Private:
 * only you see it. The protein of every meal also fills your protein meter.
 */
export function NutritionPage() {
  const { t } = useI18n();
  useDocumentMeta(t('Voeding', 'Nutrition'));
  const [params, setParams] = useSearchParams();
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as Tab) : 'vandaag';
  const day = useQuery({ queryKey: ['food-day'], queryFn: () => api.get<DayData>('/patient/food') });
  const plan = useQuery({ queryKey: ['meal-plan'], queryFn: () => api.get<Plan>('/patient/meal-plan') });
  const label: Record<Tab, [string, string]> = { vandaag: ['Vandaag', 'Today'], recepten: ['Recepten', 'Recipes'], weekplan: ['Weekplan', 'Week plan'], boodschappen: ['Boodschappen', 'Shopping'] };

  return (
    <div className="space-y-5">
      <Link to="/p" className="inline-flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-ink-700"><ArrowLeft className="h-4 w-4" aria-hidden />{t('Vandaag', 'Today')}</Link>
      <header>
        <h1 className="t-page flex items-center gap-2"><Utensils className="h-7 w-7 text-accent" aria-hidden />{t('Voeding', 'Nutrition')}</h1>
        <p className="mt-1 text-[15px] text-ink-600">{t('Houd bij wat je eet, kies recepten die bij je doel passen, plan je week en neem je boodschappenlijst mee. Alleen jij ziet dit.', 'Track what you eat, pick recipes for your goal, plan your week and take your shopping list along. Only you see this.')}</p>
      </header>
      <div role="tablist" aria-label={t('Onderdelen van voeding', 'Parts of nutrition')} className="grid grid-cols-2 gap-1 rounded-xl bg-sage p-1 min-[440px]:grid-cols-4">
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} data-tab={k} onClick={() => setParams({ tab: k }, { replace: true })}
            className="min-h-[44px] rounded-lg px-1 text-[13.5px] font-semibold text-ink-700 aria-selected:bg-white aria-selected:text-ink-950 aria-selected:shadow-card">
            {t(...label[k])}
          </button>
        ))}
      </div>
      {day.isError ? <ErrorState error={day.error} /> : !day.data || !plan.data ? <Spinner /> : (
        <div role="tabpanel" aria-label={t(...label[tab])}>
          {tab === 'vandaag' && <TodayTab data={day.data} />}
          {tab === 'recepten' && <RecipesTab plan={plan.data} />}
          {tab === 'weekplan' && <PlanTab plan={plan.data} onShop={() => setParams({ tab: 'boodschappen' }, { replace: true })} onRecipes={() => setParams({ tab: 'recepten' }, { replace: true })} />}
          {tab === 'boodschappen' && <ShoppingTab plan={plan.data} onPlan={() => setParams({ tab: 'weekplan' }, { replace: true })} />}
        </div>
      )}
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

/** Logging food: a meal, what you ate in your own words, checked before saving. */
function useLogFood() {
  const qc = useQueryClient();
  const toast = useToast();
  const { t, locale } = useI18n();
  return async (meal: Meal, items: { foodKey: string | null; name: string; grams: number; kcal?: number; protein?: number }[]) => {
    try {
      const r = await api.post<DayData>('/patient/food', { meal, items });
      qc.setQueryData(['food-day'], r);
      void qc.invalidateQueries({ queryKey: ['patient-hero'] });
      const p = n1(items.reduce((s, i) => s + (i.foodKey ? macrosOf(FOOD_BY_KEY[i.foodKey], i.grams).protein : i.protein ?? 0), 0));
      toast(t(`Opgeslagen bij ${MEAL_TEXT[meal][0].toLowerCase()}: ${p} g eiwit.`, `Saved to ${MEAL_TEXT[meal][1].toLowerCase()}: ${p} g protein.`), 'ok');
      return true;
    } catch (e) {
      toast(describeError(e, locale), 'bad');
      return false;
    }
  };
}

function TodayTab({ data }: { data: DayData }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const qc = useQueryClient();
  const toast = useToast();
  const log = useLogFood();
  const [meal, setMeal] = useState<Meal>(() => mealForHour(new Date().getHours()));
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const foodDraft = (foodKey: string | null, name: string, grams: number): Draft => {
    const m = foodKey ? macrosOf(FOOD_BY_KEY[foodKey], grams) : { kcal: 0, protein: 0 };
    return { id: draftId++, foodKey, name, grams, kcal: m.kcal, protein: m.protein };
  };
  const read = () => {
    const r = parseFoodText(text);
    if (r.meal) setMeal(r.meal);
    setDrafts((d) => [...d, ...r.items.filter((i) => i.food).map((i) => foodDraft(i.food!.key, nl ? i.food!.nl : i.food!.en, i.grams))]);
    setUnknown(r.unknown);
    setText('');
  };
  const patch = (id: number, p: Partial<Draft>) => setDrafts((ds) => ds.map((d) => {
    if (d.id !== id) return d;
    const next = { ...d, ...p };
    if (next.foodKey && p.grams !== undefined) Object.assign(next, { kcal: macrosOf(FOOD_BY_KEY[next.foodKey], next.grams).kcal, protein: macrosOf(FOOD_BY_KEY[next.foodKey], next.grams).protein });
    return next;
  }));
  const save = async () => {
    setBusy(true);
    const ok = await log(meal, drafts.map((d) => (d.foodKey ? { foodKey: d.foodKey, name: d.name, grams: d.grams } : { foodKey: null, name: d.name, grams: d.grams, kcal: d.kcal, protein: d.protein })));
    setBusy(false);
    if (ok) { setDrafts([]); setUnknown([]); }
  };
  const remove = async (id: string) => {
    try {
      qc.setQueryData(['food-day'], await api.del<DayData>(`/patient/food/${id}`));
      void qc.invalidateQueries({ queryKey: ['patient-hero'] });
    } catch (e) {
      toast(describeError(e, locale), 'bad');
    }
  };
  const goal = data.proteinGoal;
  const pct = goal ? Math.min(100, Math.round((data.totals.protein / goal) * 100)) : null;
  const draftTotal = sumMacros(drafts.map((d) => ({ kcal: d.kcal, protein: d.protein, carbs: 0, fat: 0 })));

  return (
    <div className="space-y-4">
      {/* The day at a glance. */}
      <section aria-label={t('Vandaag in cijfers', 'Today in numbers')} data-testid="food-totals" className="rounded-2xl border border-line bg-white p-4 shadow-card">
        <div className="flex items-end justify-between gap-3">
          <p><span className="font-display text-[34px] font-bold leading-none tabular-nums" data-testid="kcal-today">{data.totals.kcal}</span> <span className="text-[15px] text-ink-600">kcal</span></p>
          <p className="text-right text-[13.5px] text-ink-700">{t('Koolhydraten', 'Carbs')} {n1(data.totals.carbs)} g · {t('vet', 'fat')} {n1(data.totals.fat)} g</p>
        </div>
        <div className="mt-3">
          <p className="flex justify-between text-[14px] font-semibold text-ink-900"><span>{t('Eiwit', 'Protein')}</span><span className="tabular-nums" data-testid="protein-today">{n1(data.totals.protein)}{goal ? ` / ${goal}` : ''} g</span></p>
          {pct !== null && <span className="mt-1 block h-2.5 overflow-hidden rounded-full bg-sage" aria-hidden><span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></span>}
          {goal === null && <p className="mt-1 text-[13px] text-ink-600">{t('Vul je gewicht in bij Logboek → Eiwit voor je persoonlijke eiwitdoel.', 'Fill in your weight under Logbook → Protein for your own protein goal.')}</p>}
        </div>
      </section>

      {/* Entering food. */}
      <section aria-labelledby="food-add-h" data-testid="food-add" className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-card">
        <h2 id="food-add-h" className="text-[17px] font-bold">{t('Eten toevoegen', 'Add food')}</h2>
        <Select label={t('Maaltijd', 'Meal')} value={meal} onChange={(e) => setMeal(e.target.value as Meal)}>
          {MEALS.map((m) => <option key={m} value={m}>{nl ? MEAL_TEXT[m][0] : MEAL_TEXT[m][1]}</option>)}
        </Select>
        <Textarea label={t('Wat heb je gegeten?', 'What did you eat?')} rows={2} maxLength={400} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={t('Bijv. 2 boterhammen met kaas, een appel en 250 g kwark', 'E.g. 2 slices of bread with cheese, an apple and 250 g quark')} />
        <Button variant="secondary" className="w-full" data-testid="read-food" disabled={!text.trim()} onClick={read} icon={<Sparkles className="h-4 w-4" />}>{t('Lees wat ik at', 'Read what I ate')}</Button>
        {data.recent.length > 0 && (
          <div>
            <p className="mb-1.5 text-[13.5px] font-semibold text-ink-800">{t('Wat je vaak eet:', 'What you often eat:')}</p>
            <div className="flex flex-wrap gap-1.5">
              {data.recent.map((r) => (
                <Button key={`${r.name}-${r.foodKey}`} size="sm" variant="secondary" data-recent-food={r.foodKey ?? r.name} icon={<Plus className="h-4 w-4" />}
                  onClick={() => setDrafts((d) => [...d, r.foodKey && FOOD_BY_KEY[r.foodKey] ? foodDraft(r.foodKey, r.name, r.grams) : { id: draftId++, foodKey: null, name: r.name, grams: r.grams, kcal: 0, protein: 0 }])}>{r.name}</Button>
              ))}
            </div>
          </div>
        )}
        {unknown.length > 0 && (
          <Notice tone="info">
            {t(`Niet herkend: ${unknown.join(', ')}. Kies hieronder zelf iets, of voeg het toe als eigen gerecht.`, `Not recognised: ${unknown.join(', ')}. Pick something below, or add it as your own dish.`)}
            <span className="mt-2 flex flex-wrap gap-1.5">
              {unknown.map((u) => <Button key={u} size="sm" variant="secondary" onClick={() => { setDrafts((d) => [...d, { id: draftId++, foodKey: null, name: u.charAt(0).toUpperCase() + u.slice(1), grams: 100, kcal: 0, protein: 0 }]); setUnknown((x) => x.filter((y) => y !== u)); }}>{t(`“${u}” als eigen gerecht`, `“${u}” as own dish`)}</Button>)}
            </span>
          </Notice>
        )}
        <FoodPicker onPick={(key) => setDrafts((d) => [...d, foodDraft(key, nl ? FOOD_BY_KEY[key].nl : FOOD_BY_KEY[key].en, FOOD_BY_KEY[key].portion.g)])} />
        {drafts.length > 0 && (
          <div className="space-y-2" data-testid="food-preview">
            <p className="text-[14.5px] font-semibold text-ink-900">{t('Klopt dit?', 'Is this right?')}</p>
            <ul className="space-y-2">
              {drafts.map((d) => (
                <li key={d.id} data-food={d.foodKey ?? 'own'} className="rounded-xl border border-line p-3">
                  <div className="flex items-start gap-2">
                    <p className="min-w-0 flex-1 text-[15px] font-semibold text-ink-950">{d.name}{d.foodKey ? '' : t(' (eigen gerecht)', ' (own dish)')}</p>
                    <button type="button" aria-label={t(`${d.name} weghalen`, `Remove ${d.name}`)} onClick={() => setDrafts((ds) => ds.filter((x) => x.id !== d.id))} className="-mr-1 -mt-1 grid h-11 w-11 place-items-center rounded-lg text-ink-600 hover:bg-ink-50"><Trash2 className="h-4 w-4" aria-hidden /></button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-end gap-2">
                    <NumberField label={t('Gram', 'Grams')} value={d.grams} min={1} max={3000} onChange={(v) => patch(d.id, { grams: v })} />
                    {d.foodKey ? (
                      <p className="pb-2.5 text-[13.5px] text-ink-700">{d.kcal} kcal · {n1(d.protein)} g {t('eiwit', 'protein')}{FOOD_BY_KEY[d.foodKey] ? ` · 1 ${nl ? FOOD_BY_KEY[d.foodKey].portion.nl : FOOD_BY_KEY[d.foodKey].portion.en} = ${FOOD_BY_KEY[d.foodKey].portion.g} g` : ''}</p>
                    ) : (
                      <>
                        <NumberField label="kcal" value={d.kcal} min={0} max={5000} onChange={(v) => patch(d.id, { kcal: v })} />
                        <NumberField label={t('Eiwit (g)', 'Protein (g)')} value={d.protein} min={0} max={400} onChange={(v) => patch(d.id, { protein: v })} />
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[14px] text-ink-800">{t(`Samen: ${draftTotal.kcal} kcal en ${n1(draftTotal.protein)} g eiwit.`, `Together: ${draftTotal.kcal} kcal and ${n1(draftTotal.protein)} g protein.`)}</p>
            <Button className="w-full" size="lg" data-testid="save-food" loading={busy} onClick={() => void save()}>{t(`Opslaan bij ${MEAL_TEXT[meal][0].toLowerCase()}`, `Save to ${MEAL_TEXT[meal][1].toLowerCase()}`)}</Button>
          </div>
        )}
      </section>

      {/* What was eaten, per meal. */}
      <section aria-labelledby="food-day-h" className="space-y-2">
        <h2 id="food-day-h" className="text-[17px] font-bold">{t('Gegeten vandaag', 'Eaten today')}</h2>
        {data.items.length === 0 ? (
          <p className="rounded-2xl bg-sage/60 px-4 py-3 text-[15px] text-ink-800">{t('Nog niets bijgehouden vandaag.', 'Nothing tracked yet today.')}</p>
        ) : MEALS.filter((m) => data.items.some((i) => i.meal === m)).map((m) => {
          const items = data.items.filter((i) => i.meal === m);
          const tot = sumMacros(items);
          return (
            <div key={m} className="rounded-2xl border border-line bg-white shadow-card" data-meal={m}>
              <p className="flex items-baseline justify-between border-b border-line px-4 py-2.5 text-[15px] font-semibold"><span>{nl ? MEAL_TEXT[m][0] : MEAL_TEXT[m][1]}</span><span className="text-[13px] font-normal text-ink-600">{tot.kcal} kcal · {n1(tot.protein)} g {t('eiwit', 'protein')}</span></p>
              <ul className="divide-y divide-line">
                {items.map((i) => (
                  <li key={i.id} className="flex items-center gap-2 px-4 py-1.5 text-[14.5px]">
                    <span className="min-w-0 flex-1"><span className="font-medium text-ink-900">{i.name}</span> <span className="text-ink-600">· {i.grams} g · {i.kcal} kcal · {n1(i.protein)} g {t('eiwit', 'protein')}</span></span>
                    <button type="button" aria-label={t(`${i.name} verwijderen`, `Delete ${i.name}`)} onClick={() => void remove(i.id)} className="grid h-11 w-11 place-items-center rounded-lg text-ink-600 hover:bg-ink-50"><Trash2 className="h-4 w-4" aria-hidden /></button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
      <p className="text-[12.5px] text-ink-600">{t('Waarden zijn gemiddelden per product; verpakkingen kunnen iets afwijken.', 'Values are averages per product; packaging can differ a little.')}</p>
    </div>
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

/** Search the food list by name. */
function FoodPicker({ onPick }: { onPick: (key: string) => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [q, setQ] = useState('');
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return FOODS.filter((f) => f.alias.some((a) => a.includes(s))).slice(0, 6);
  }, [q]);
  return (
    <div>
      <label className="flex flex-col text-[14px] font-medium text-ink-800">
        {t('Of zoek een product', 'Or search a product')}
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Bijv. kwark, kip, banaan', 'E.g. quark, chicken, banana')} className="mt-1 h-11 rounded-lg border border-line bg-white px-3 text-[16px] text-ink-950" />
      </label>
      {hits.length > 0 && (
        <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={t('Gevonden producten', 'Products found')}>
          {hits.map((f) => <li key={f.key}><Button size="sm" variant="secondary" data-pick-food={f.key} icon={<Plus className="h-4 w-4" />} onClick={() => { onPick(f.key); setQ(''); }}>{nl ? f.nl : f.en}</Button></li>)}
        </ul>
      )}
    </div>
  );
}

function RecipesTab({ plan }: { plan: Plan }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const savePlan = useSavePlan();
  const log = useLogFood();
  const toast = useToast();
  const [goal, setGoal] = useState<NutritionGoal>(plan.goal ?? 'gezond');
  const [meal, setMeal] = useState<Meal | 'alle'>('alle');
  const [veg, setVeg] = useState(false);
  const [prepOnly, setPrepOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const list = RECIPES.filter((r) => recipeGoals(r).includes(goal) && (meal === 'alle' || r.meal === meal) && (!veg || r.vegetarian) && (!prepOnly || r.prep))
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
        <button type="button" aria-pressed={veg} onClick={() => setVeg(!veg)} className={chip(veg)}><Leaf className="mr-1 inline h-4 w-4" aria-hidden />{t('Vegetarisch', 'Vegetarian')}</button>
        <button type="button" aria-pressed={prepOnly} onClick={() => setPrepOnly(!prepOnly)} className={chip(prepOnly)}><ChefHat className="mr-1 inline h-4 w-4" aria-hidden />{t('Om te preppen', 'For meal prep')}</button>
      </div>
      {list.length === 0 && <p className="rounded-2xl bg-sage/60 px-4 py-3 text-[15px]">{t('Geen recepten met deze filters. Zet een filter uit.', 'No recipes with these filters. Turn a filter off.')}</p>}
      <ul className="space-y-2" data-testid="recipe-list">
        {list.map((r) => {
          const m = recipeMacros(r);
          const isOpen = open === r.key;
          return (
            <li key={r.key} data-recipe={r.key} className="rounded-2xl border border-line bg-white shadow-card">
              <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : r.key)} className="flex w-full items-start gap-3 p-4 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold leading-snug text-ink-950">{nl ? r.nl : r.en}</span>
                  <span className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[13.5px] text-ink-700">
                    <span>{nl ? MEAL_TEXT[r.meal][0] : MEAL_TEXT[r.meal][1]}</span>·<span className="inline-flex items-center gap-0.5"><Clock className="h-3.5 w-3.5" aria-hidden />{r.minutes} min</span>·<span>{m.kcal} kcal</span>·<span className="font-semibold text-ink-900">{n1(m.protein)} g {t('eiwit', 'protein')}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {r.prep && <span className="rounded-full bg-sage px-2 py-0.5 text-[12px] font-semibold text-ink-800">{t('Prep: 3–4 dagen houdbaar', 'Prep: keeps 3–4 days')}</span>}
                    {r.vegetarian && <span className="rounded-full bg-sage px-2 py-0.5 text-[12px] font-semibold text-ink-800">{t('Vegetarisch', 'Vegetarian')}</span>}
                  </span>
                </span>
                <ChevronDown className={cn('mt-1 h-5 w-5 shrink-0 text-ink-500 transition-transform', isOpen && 'rotate-180')} aria-hidden />
              </button>
              {isOpen && <RecipeDetail r={r} onAdd={(d, s) => addToPlan(r, d, s)} onAte={() => void log(r.meal, r.ingredients.map((i) => ({ foodKey: i.food, name: nl ? FOOD_BY_KEY[i.food].nl : FOOD_BY_KEY[i.food].en, grams: i.g })))} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RecipeDetail({ r, onAdd, onAte }: { r: Recipe; onAdd: (day: number, servings: number) => void; onAte: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const [day, setDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [servings, setServings] = useState(r.prep ? 3 : 1);
  const m = recipeMacros(r);
  return (
    <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
      <p className="text-[13.5px] text-ink-700">{t('Per portie', 'Per serving')}: {m.kcal} kcal · {n1(m.protein)} g {t('eiwit', 'protein')} · {n1(m.carbs)} g {t('koolhydraten', 'carbs')} · {n1(m.fat)} g {t('vet', 'fat')}</p>
      <div>
        <h3 className="text-[15px] font-semibold">{t('Ingrediënten (1 portie)', 'Ingredients (1 serving)')}</h3>
        <ul className="mt-1 list-disc pl-5 text-[15px] text-ink-800">{r.ingredients.map((i) => <li key={i.food}>{i.g} g {(nl ? FOOD_BY_KEY[i.food].nl : FOOD_BY_KEY[i.food].en).toLowerCase()}</li>)}</ul>
      </div>
      <div>
        <h3 className="text-[15px] font-semibold">{t('Zo maak je het', 'How to make it')}</h3>
        <ol className="mt-1 list-decimal pl-5 text-[15px] text-ink-800">{r.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </div>
      <div className="rounded-xl bg-sage/60 p-3">
        <p className="text-[14.5px] font-semibold">{t('In je weekplan', 'In your week plan')}</p>
        <div className="mt-1.5 flex flex-wrap items-end gap-2">
          <Select label={t('Dag', 'Day')} value={day} onChange={(e) => setDay(Number(e.target.value))} className="min-w-[140px]">
            {DAYS_NL.map((d, i) => <option key={d} value={i}>{nl ? d : DAYS_EN[i]}</option>)}
          </Select>
          <ServingsStepper value={servings} onChange={setServings} />
        </div>
        {r.prep && <p className="mt-1.5 text-[13px] text-ink-700">{t('Tip: kook meerdere porties tegelijk en verdeel ze over bakjes.', 'Tip: cook several servings at once and split them over boxes.')}</p>}
        <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
          <Button data-testid="add-to-plan" icon={<CalendarDays className="h-4 w-4" />} onClick={() => onAdd(day, servings)}>{t('Zet in weekplan', 'Add to week plan')}</Button>
          <Button variant="secondary" data-testid="ate-recipe" icon={<Check className="h-4 w-4" />} onClick={onAte}>{t('Ik heb dit gegeten', 'I ate this')}</Button>
        </div>
      </div>
    </div>
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

function PlanTab({ plan, onShop, onRecipes }: { plan: Plan; onShop: () => void; onRecipes: () => void }) {
  const { t, locale } = useI18n();
  const nl = locale === 'nl';
  const savePlan = useSavePlan();
  const set = (items: PlanItem[]) => void savePlan({ ...plan, items });
  if (!plan.items.length) {
    return (
      <div className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-card" data-testid="plan-empty">
        <p className="text-[15px] text-ink-800">{t('Je weekplan is nog leeg. Kies recepten bij Recepten en zet ze op een dag. Dan maken we je boodschappenlijst.', 'Your week plan is still empty. Pick recipes under Recipes and put them on a day. Then we make your shopping list.')}</p>
        <Button onClick={onRecipes} icon={<ChefHat className="h-4 w-4" />}>{t('Naar de recepten', 'To the recipes')}</Button>
      </div>
    );
  }
  return (
    <div className="space-y-3" data-testid="week-plan">
      {DAYS_NL.map((d, di) => {
        const items = plan.items.map((it, idx) => ({ it, idx })).filter((x) => x.it.day === di);
        if (!items.length) return null;
        const tot = sumMacros(items.map((x) => recipeMacros(RECIPE_BY_KEY[x.it.recipe])));
        return (
          <section key={d} aria-label={nl ? d : DAYS_EN[di]} className="rounded-2xl border border-line bg-white shadow-card">
            <p className="flex items-baseline justify-between border-b border-line px-4 py-2.5 text-[15px] font-semibold"><span>{nl ? d : DAYS_EN[di]}</span><span className="text-[13px] font-normal text-ink-600">{t('per portie', 'per serving')}: {tot.kcal} kcal · {n1(tot.protein)} g {t('eiwit', 'protein')}</span></p>
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
  const lines = useMemo(() => shoppingList(plan.items), [plan.items]);
  // Ticks answer at once; the save follows.
  const [ticks, setTicks] = useState<string[]>(plan.checked);
  useEffect(() => setTicks(plan.checked), [plan.checked]);
  const checked = new Set(ticks);
  if (!lines.length) {
    return (
      <div className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-card">
        <p className="text-[15px] text-ink-800">{t('Nog geen boodschappen: zet eerst recepten in je weekplan.', 'No shopping yet: put recipes in your week plan first.')}</p>
        <Button onClick={onPlan} icon={<CalendarDays className="h-4 w-4" />}>{t('Naar je weekplan', 'To your week plan')}</Button>
      </div>
    );
  }
  const toggle = (key: string) => {
    const next = checked.has(key) ? ticks.filter((k) => k !== key) : [...ticks, key];
    setTicks(next);
    void savePlan({ ...plan, checked: next });
  };
  const left = lines.filter((l) => !checked.has(l.food)).length;
  return (
    <div className="space-y-3" data-testid="shopping-list">
      <p className="text-[15px] text-ink-800">{left === 0 ? t('Alles is binnen. Lekker koken!', 'Everything is in. Enjoy cooking!') : t(`Nog ${left} van ${lines.length} producten.`, `${left} of ${lines.length} products to go.`)}</p>
      {AISLES.filter((a) => lines.some((l) => l.aisle === a.key)).map((a) => (
        <section key={a.key} aria-labelledby={`aisle-${a.key}`} className="rounded-2xl border border-line bg-white shadow-card">
          <h2 id={`aisle-${a.key}`} className="border-b border-line px-4 py-2.5 text-[15px] font-semibold">{nl ? a.nl : a.en}</h2>
          <ul className="divide-y divide-line">
            {lines.filter((l) => l.aisle === a.key).map((l) => {
              const f = FOOD_BY_KEY[l.food];
              const amount = l.pieces !== null ? `${l.pieces} ${nl ? (l.pieces === 1 ? f.portion.nl : f.portion.nl === 'ei' ? 'eieren' : `${f.portion.nl}s`) : f.portion.en + (l.pieces === 1 ? '' : 's')} (${l.grams} g)` : l.grams >= 1000 ? `${n1(l.grams / 1000)} kg` : `${l.grams} g`;
              return (
                <li key={l.food}>
                  <label className="flex min-h-[48px] cursor-pointer items-center gap-3 px-4 py-2">
                    <input type="checkbox" checked={checked.has(l.food)} onChange={() => toggle(l.food)} data-shop={l.food} className="h-5 w-5 accent-[rgb(var(--accent))]" />
                    <span className={cn('flex-1 text-[15px]', checked.has(l.food) && 'text-ink-500 line-through')}>{nl ? f.nl : f.en}</span>
                    <span className="text-[14px] tabular-nums text-ink-700">{amount}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {ticks.length > 0 && <Button variant="secondary" className="w-full" onClick={() => { setTicks([]); void savePlan({ ...plan, checked: [] }); }}>{t('Vinkjes wissen', 'Clear ticks')}</Button>}
    </div>
  );
}
