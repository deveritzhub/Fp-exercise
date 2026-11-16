import { FOODS, FOOD_BY_KEY, type Food, type Meal } from './foods';

/**
 * "2 boterhammen met kaas, een appel en 250 g kwark": what someone ate, in their own words, read in
 * the app itself. Every item gets a food from the list and an amount in grams; what is not known is
 * kept apart. Only a proposal: the patient checks and adjusts before saving.
 */
export type ParsedFood = { text: string; food: Food | null; grams: number };
export type ParsedMeal = { items: ParsedFood[]; unknown: string[]; meal: Meal | null };

const norm = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9.,\s-]/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();

const COUNT_WORDS: Record<string, number> = { een: 1, eentje: 1, twee: 2, drie: 3, vier: 4, vijf: 5, half: 0.5, halve: 0.5, anderhalf: 1.5, a: 1, an: 1, one: 1, two: 2, three: 3 };
/** Unit words and their grams; `null` means "one portion of that food". */
const UNITS: [RegExp, number | null][] = [
  [/^(g|gr|gram|grams|ml)$/, 1],
  [/^(kg|kilo|liter|l)$/, 1000],
  [/^(stuk|stuks|stukje|stukjes|piece|pieces)$/, null],
  [/^(plak|plakken|plakje|plakjes|slice|slices)$/, 20],
  [/^(boterham|boterhammen|snee|sneetje|sneetjes|sneden)$/, 35],
  [/^(glas|glazen|glass|glasses)$/, 200],
  [/^(kop|kopje|kopjes|mok|cup|cups)$/, 125],
  [/^(bakje|bakjes|tub)$/, null],
  [/^(schep|scheppen|scoop|scoops)$/, 30],
  [/^(handje|handjes|handful)$/, 25],
  [/^(el|eetlepel|eetlepels|tbsp)$/, 15],
  [/^(tl|theelepel|theelepels|tsp)$/, 5],
  [/^(kom|kommetje|bowl)$/, 250],
  [/^(blik|blikje|tin)$/, null],
  [/^(reep|repen|bar)$/, null],
  [/^(portie|porties|bord|serving)$/, null],
];
const MEAL_WORDS: [RegExp, Meal][] = [
  [/\b(ontbijt|ontbeten|breakfast)\b/, 'ontbijt'],
  [/\b(lunch|geluncht)\b/, 'lunch'],
  [/\b(diner|avondeten|avondmaal|dinner|gegeten vanavond)\b/, 'diner'],
  [/\b(tussendoor|snack|tussendoortje)\b/, 'tussendoor'],
];
const FILLER = new Set(['ik', 'heb', 'had', 'gegeten', 'gedronken', 'vandaag', 'als', 'voor', 'bij', 'de', 'het', 'nog', 'ook', 'wat', 'beetje', 'i', 'ate', 'had', 'for', 'with', 'some', 'the', 'ontbijt', 'lunch', 'diner', 'avondeten', 'tussendoor', 'snack', 'breakfast', 'dinner']);

/** The food whose name or alias appears in the words, the longest name winning. */
export function findFood(words: string[]): { food: Food; used: number } | null {
  let best: { food: Food; used: number; exact: boolean } | null = null;
  for (const food of FOODS) {
    for (const a of food.alias) {
      const aw = norm(a).split(' ');
      for (let i = 0; i + aw.length <= words.length; i++) {
        const ok = aw.every((w, k) => words[i + k] === w || (w.length >= 4 && words[i + k].startsWith(w) && words[i + k].length - w.length <= 3));
        if (!ok) continue;
        // Longest name wins; at equal length a whole word beats a word that only starts with it ("appelsap" over "appel").
        const exact = aw.every((w, k) => words[i + k] === w);
        if (!best || aw.length > best.used || (aw.length === best.used && exact && !best.exact)) best = { food, used: aw.length, exact };
      }
    }
  }
  return best && { food: best.food, used: best.used };
}

function piece(raw: string, carry: number | null): { item: ParsedFood | null; count: number | null; unknown: string[] } {
  const words = raw.split(' ').filter(Boolean);
  let count: number | null = null;
  let grams: number | null = null;
  let unitPortion = false;
  let unitG: number | null = null;
  const rest: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const n = /^\d+([.,]\d+)?$/.test(w) ? Number(w.replace(',', '.')) : COUNT_WORDS[w];
    if (n !== undefined && !Number.isNaN(n)) {
      const unit = UNITS.find(([re]) => re.test(words[i + 1] ?? ''));
      if (unit && unit[1] === 1) grams = n;
      else if (unit && unit[1] === 1000) grams = n * 1000;
      else if (unit) {
        count = n;
        if (unit[1] === null) unitPortion = true;
        else unitG = unit[1];
        // "boterham" is a unit and a food at once.
        if (/^(boterham|boterhammen|snee|sneetje|sneetjes|sneden)$/.test(words[i + 1])) rest.push('boterham');
      } else count = n;
      if (unit) i++;
      continue;
    }
    // "250g": the unit stuck to the number.
    const glued = w.match(/^(\d+(?:[.,]\d+)?)(g|gr|gram|ml|kg)$/);
    if (glued) {
      grams = Number(glued[1].replace(',', '.')) * (glued[2] === 'kg' ? 1000 : 1);
      continue;
    }
    const lone = UNITS.find(([re]) => re.test(w));
    if (lone && lone[1] !== 1 && lone[1] !== 1000) {
      // A unit without a number ("een plak" was handled above; "plakje kaas" means one).
      count ??= 1;
      if (lone[1] === null) unitPortion = true;
      else unitG = lone[1];
      if (/^(boterham|boterhammen|snee|sneetje|sneetjes)$/.test(w)) rest.push('boterham');
      continue;
    }
    if (!FILLER.has(w)) rest.push(w);
  }
  if (!rest.length) return { item: null, count, unknown: [] };
  const hit = findFood(rest);
  if (!hit) return { item: null, count, unknown: [rest.join(' ')] };
  const food = hit.food;
  const n = count ?? carry ?? 1;
  // A unit like "plak" or "glas" is used as the food's own portion when the food is sold that way.
  const g = grams ?? (unitPortion || unitG === null ? n * food.portion.g : food.portion.g === unitG || food.key === 'brood_volkoren' ? n * food.portion.g : n * unitG);
  return { item: { text: raw, food, grams: Math.max(1, Math.round(g)) }, count: count ?? (grams === null ? n : null), unknown: [] };
}

export function parseFoodText(text: string): ParsedMeal {
  const t = norm(text);
  const meal = MEAL_WORDS.find(([re]) => re.test(t))?.[1] ?? null;
  const out: ParsedMeal = { items: [], unknown: [], meal };
  for (const part of t.split(/\s*(?:,|;|\+|\ben\b|\band\b|\bplus\b|\n)\s*/).filter(Boolean)) {
    // "2 boterhammen met kaas": the count of the bread goes for the cheese too (a slice on each).
    const [main, ...extras] = part.split(/\s+(?:met|with)\s+/);
    const first = piece(main, null);
    if (first.item) out.items.push(first.item);
    out.unknown.push(...first.unknown);
    const carry = first.item && first.item.food && ['brood_volkoren', 'brood_witte', 'brood_wit', 'wrap', 'rijstwafel'].includes(first.item.food.key) ? first.count : null;
    for (const x of extras) {
      const p = piece(x, carry);
      if (p.item) out.items.push(p.item);
      out.unknown.push(...p.unknown);
    }
  }
  return out;
}

export { FOOD_BY_KEY };
