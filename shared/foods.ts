/**
 * Common foods with average values per 100 g (or ml), rounded, written for this app from general
 * nutrition knowledge (no copied database). Good enough to steer by, not a lab analysis: packaging
 * can differ. `portion` is what one piece, slice or serving usually weighs.
 */
export type Aisle = 'groente' | 'fruit' | 'zuivel' | 'vlees_vis' | 'vega' | 'brood_graan' | 'voorraad' | 'drinken' | 'snoep';
export type Food = {
  key: string;
  nl: string;
  en: string;
  /** Per 100 g or ml. */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** One portion: grams and how it is called ("boterham", "plak", "ei"). */
  portion: { g: number; nl: string; en: string };
  aisle: Aisle;
  /** Words people type for it (lower case). The Dutch name is always one. */
  alias: string[];
};

const f = (key: string, nl: string, en: string, kcal: number, protein: number, carbs: number, fat: number, portion: [number, string, string], aisle: Aisle, alias: string[] = []): Food => ({
  key, nl, en, kcal, protein, carbs, fat, portion: { g: portion[0], nl: portion[1], en: portion[2] }, aisle, alias: [nl.toLowerCase(), en.toLowerCase(), ...alias],
});

export const FOODS: Food[] = [
  // Bread and grains
  f('brood_volkoren', 'Volkorenbrood', 'Wholemeal bread', 230, 10, 40, 3, [35, 'boterham', 'slice'], 'brood_graan', ['brood', 'boterham', 'boterhammen', 'bruin brood', 'volkoren', 'snee', 'sneetje']),
  f('brood_wit', 'Witbrood', 'White bread', 250, 8, 47, 3, [35, 'boterham', 'slice'], 'brood_graan', ['wit brood', 'witte boterham']),
  f('wrap', 'Volkoren wrap', 'Wholemeal wrap', 300, 9, 48, 7, [60, 'wrap', 'wrap'], 'brood_graan', ['wraps', 'tortilla']),
  f('havermout', 'Havermout', 'Oats', 370, 13, 60, 7, [40, 'portie', 'serving'], 'brood_graan', ['haver', 'oats', 'pap', 'oatmeal', 'porridge']),
  f('muesli', 'Muesli', 'Muesli', 370, 10, 62, 7, [50, 'portie', 'serving'], 'brood_graan', ['granola', 'cruesli']),
  f('rijst', 'Rijst (ongekookt)', 'Rice (dry)', 350, 7, 78, 1, [75, 'portie', 'serving'], 'brood_graan', ['rijst', 'zilvervliesrijst', 'basmati']),
  f('pasta', 'Pasta (ongekookt)', 'Pasta (dry)', 355, 12.5, 70, 1.5, [85, 'portie', 'serving'], 'brood_graan', ['pasta', 'spaghetti', 'penne', 'macaroni', 'volkorenpasta']),
  f('aardappel', 'Aardappelen', 'Potatoes', 80, 2, 17, 0.1, [200, 'portie', 'serving'], 'groente', ['aardappel', 'aardappels', 'krieltjes', 'potato']),
  f('zoete_aardappel', 'Zoete aardappel', 'Sweet potato', 86, 1.6, 20, 0.1, [250, 'stuk', 'piece'], 'groente', ['bataat', 'sweet potato']),
  f('quinoa', 'Quinoa (ongekookt)', 'Quinoa (dry)', 370, 14, 64, 6, [70, 'portie', 'serving'], 'brood_graan', ['quinoa']),
  f('rijstwafel', 'Rijstwafel', 'Rice cake', 380, 8, 80, 3, [8, 'stuk', 'piece'], 'brood_graan', ['rijstwafels', 'rijstcracker']),
  // Meat, fish, eggs
  f('kipfilet', 'Kipfilet', 'Chicken breast', 110, 23, 0, 1.5, [125, 'filet', 'fillet'], 'vlees_vis', ['kip', 'kippenborst', 'chicken']),
  f('kalkoen', 'Kalkoenfilet', 'Turkey breast', 105, 23, 0, 1.2, [125, 'filet', 'fillet'], 'vlees_vis', ['kalkoen', 'turkey']),
  f('gehakt', 'Rundergehakt (mager)', 'Lean minced beef', 175, 20, 0, 10, [100, 'portie', 'serving'], 'vlees_vis', ['gehakt', 'rundergehakt', 'mince', 'ground beef']),
  f('biefstuk', 'Biefstuk', 'Steak', 125, 22, 0, 4, [150, 'stuk', 'piece'], 'vlees_vis', ['steak', 'rundvlees']),
  f('zalm', 'Zalm', 'Salmon', 200, 20, 0, 13, [125, 'moot', 'fillet'], 'vlees_vis', ['zalmfilet']),
  f('tonijn', 'Tonijn (blik, op water)', 'Tuna (tin, in water)', 110, 25, 0, 1, [112, 'blikje', 'tin'], 'vlees_vis', ['tonijn', 'tuna']),
  f('garnalen', 'Garnalen', 'Prawns', 80, 18, 0, 1, [100, 'portie', 'serving'], 'vlees_vis', ['garnaal', 'shrimp']),
  f('kipfilet_beleg', 'Kipfilet (beleg)', 'Sliced chicken', 105, 21, 1, 2, [15, 'plak', 'slice'], 'vlees_vis', ['kipfilet beleg', 'kipfiletplakjes']),
  f('ei', 'Ei', 'Egg', 140, 12.5, 0.5, 10, [55, 'ei', 'egg'], 'zuivel', ['eieren', 'ei', 'eitje', 'eggs', 'roerei', 'omelet', 'gekookt ei']),
  // Dairy
  f('kwark', 'Magere kwark', 'Low-fat quark', 60, 10, 4, 0.2, [250, 'bakje', 'tub'], 'zuivel', ['kwark', 'quark']),
  f('skyr', 'Skyr', 'Skyr', 60, 11, 4, 0.2, [150, 'portie', 'serving'], 'zuivel', ['skyr']),
  f('griekse_yoghurt', 'Griekse yoghurt (2%)', 'Greek yoghurt (2%)', 75, 9, 4, 2, [150, 'portie', 'serving'], 'zuivel', ['griekse yoghurt', 'greek yoghurt']),
  f('yoghurt', 'Magere yoghurt', 'Low-fat yoghurt', 40, 4, 5, 0.1, [150, 'schaaltje', 'bowl'], 'zuivel', ['yoghurt', 'yogurt']),
  f('melk', 'Halfvolle melk', 'Semi-skimmed milk', 46, 3.5, 4.7, 1.5, [200, 'glas', 'glass'], 'zuivel', ['melk', 'milk']),
  f('huttenkase', 'Hüttenkäse', 'Cottage cheese', 95, 12, 3, 4, [100, 'portie', 'serving'], 'zuivel', ['huttenkase', 'cottage cheese', 'cottage']),
  f('kaas', 'Kaas (48+)', 'Cheese', 350, 25, 0, 28, [20, 'plak', 'slice'], 'zuivel', ['kaas', 'cheese', 'plakje kaas']),
  f('mozzarella', 'Mozzarella', 'Mozzarella', 250, 18, 2, 19, [60, 'portie', 'serving'], 'zuivel'),
  f('feta', 'Feta', 'Feta', 260, 14, 1, 21, [40, 'portie', 'serving'], 'zuivel'),
  // Vegetarian protein
  f('tofu', 'Tofu', 'Tofu', 120, 13, 2, 7, [200, 'blok', 'block'], 'vega'),
  f('tempeh', 'Tempeh', 'Tempeh', 190, 19, 9, 11, [100, 'portie', 'serving'], 'vega'),
  f('linzen', 'Linzen (gekookt)', 'Lentils (cooked)', 115, 9, 20, 0.4, [200, 'portie', 'serving'], 'vega', ['linzen', 'lentils']),
  f('kikkererwten', 'Kikkererwten (blik)', 'Chickpeas (tin)', 120, 7, 16, 2.6, [120, 'portie', 'serving'], 'vega', ['kikkererwten', 'chickpeas']),
  f('bruine_bonen', 'Bruine bonen (blik)', 'Kidney beans (tin)', 90, 6, 13, 0.5, [200, 'portie', 'serving'], 'vega', ['bonen', 'kidneybonen', 'beans']),
  f('edamame', 'Edamame', 'Edamame', 120, 11, 9, 5, [150, 'portie', 'serving'], 'vega'),
  f('hummus', 'Hummus', 'Hummus', 280, 7, 14, 22, [30, 'eetlepel', 'tablespoon'], 'vega'),
  // Nuts, spreads, fats
  f('pindakaas', 'Pindakaas', 'Peanut butter', 600, 25, 15, 48, [15, 'eetlepel', 'tablespoon'], 'voorraad', ['pindakaas', 'peanut butter']),
  f('amandelen', 'Amandelen', 'Almonds', 600, 21, 22, 52, [25, 'handje', 'handful'], 'voorraad', ['amandel', 'noten', 'nuts']),
  f('walnoten', 'Walnoten', 'Walnuts', 680, 15, 14, 65, [15, 'handje', 'handful'], 'voorraad', ['walnoot']),
  f('pindas', "Pinda's", 'Peanuts', 590, 25, 13, 49, [25, 'handje', 'handful'], 'voorraad', ['pindas', 'pinda']),
  f('olijfolie', 'Olijfolie', 'Olive oil', 880, 0, 0, 100, [10, 'eetlepel', 'tablespoon'], 'voorraad', ['olie', 'olive oil']),
  f('boter', 'Boter', 'Butter', 740, 0.6, 0.6, 82, [10, 'klontje', 'knob'], 'zuivel', ['roomboter', 'margarine']),
  f('honing', 'Honing', 'Honey', 300, 0.3, 82, 0, [7, 'theelepel', 'teaspoon'], 'voorraad', ['honey']),
  f('passata', 'Passata (tomaten)', 'Passata', 30, 1.3, 5, 0.2, [200, 'portie', 'serving'], 'voorraad', ['tomatensaus', 'tomatenpuree', 'passata']),
  f('sojasaus', 'Sojasaus', 'Soy sauce', 60, 8, 6, 0.5, [15, 'eetlepel', 'tablespoon'], 'voorraad', ['soja', 'soy sauce']),
  f('whey', 'Eiwitpoeder (whey)', 'Protein powder (whey)', 380, 75, 8, 6, [30, 'schep', 'scoop'], 'voorraad', ['whey', 'eiwitshake', 'proteine shake', 'eiwitpoeder', 'shake', 'protein shake']),
  f('eiwitreep', 'Eiwitreep', 'Protein bar', 360, 30, 35, 12, [55, 'reep', 'bar'], 'snoep', ['proteine reep', 'protein bar']),
  // Fruit
  f('banaan', 'Banaan', 'Banana', 90, 1.1, 21, 0.3, [100, 'stuk', 'piece'], 'fruit', ['banaan', 'bananen', 'banana']),
  f('appel', 'Appel', 'Apple', 52, 0.3, 14, 0.2, [150, 'stuk', 'piece'], 'fruit', ['appels', 'apple']),
  f('peer', 'Peer', 'Pear', 57, 0.4, 15, 0.1, [150, 'stuk', 'piece'], 'fruit', ['peren', 'pear']),
  f('sinaasappel', 'Sinaasappel', 'Orange', 47, 0.9, 12, 0.1, [150, 'stuk', 'piece'], 'fruit', ['mandarijn', 'orange']),
  f('blauwe_bessen', 'Blauwe bessen', 'Blueberries', 57, 0.7, 14, 0.3, [75, 'bakje', 'punnet'], 'fruit', ['bessen', 'blueberries']),
  f('aardbeien', 'Aardbeien', 'Strawberries', 32, 0.7, 8, 0.3, [100, 'bakje', 'punnet'], 'fruit', ['aardbei', 'strawberries']),
  // Vegetables
  f('broccoli', 'Broccoli', 'Broccoli', 34, 2.8, 7, 0.4, [150, 'portie', 'serving'], 'groente'),
  f('spinazie', 'Spinazie', 'Spinach', 23, 2.9, 3.6, 0.4, [100, 'portie', 'serving'], 'groente', ['spinach']),
  f('sperziebonen', 'Sperziebonen', 'Green beans', 31, 1.8, 7, 0.1, [150, 'portie', 'serving'], 'groente', ['boontjes', 'green beans']),
  f('paprika', 'Paprika', 'Bell pepper', 31, 1, 6, 0.3, [150, 'stuk', 'piece'], 'groente', ['pepper']),
  f('tomaat', 'Tomaat', 'Tomato', 18, 0.9, 3.9, 0.2, [100, 'stuk', 'piece'], 'groente', ['tomaten', 'tomato', 'cherrytomaatjes']),
  f('komkommer', 'Komkommer', 'Cucumber', 15, 0.7, 3.6, 0.1, [100, 'portie', 'serving'], 'groente', ['cucumber']),
  f('wortel', 'Wortel', 'Carrot', 41, 0.9, 10, 0.2, [100, 'stuk', 'piece'], 'groente', ['wortels', 'wortelen', 'carrot']),
  f('ui', 'Ui', 'Onion', 40, 1.1, 9, 0.1, [100, 'stuk', 'piece'], 'groente', ['uien', 'onion']),
  f('knoflook', 'Knoflook', 'Garlic', 150, 6, 33, 0.5, [5, 'teentje', 'clove'], 'groente', ['garlic']),
  f('sla', 'Sla', 'Lettuce', 15, 1.4, 3, 0.2, [50, 'portie', 'serving'], 'groente', ['salade', 'lettuce', 'rucola']),
  f('courgette', 'Courgette', 'Courgette', 17, 1.2, 3, 0.3, [200, 'stuk', 'piece'], 'groente', ['zucchini']),
  f('champignons', 'Champignons', 'Mushrooms', 22, 3, 3, 0.3, [100, 'portie', 'serving'], 'groente', ['champignon', 'mushrooms']),
  f('avocado', 'Avocado', 'Avocado', 160, 2, 9, 15, [140, 'stuk', 'piece'], 'groente'),
  f('groentesoep', 'Groentesoep', 'Vegetable soup', 30, 1.5, 4, 1, [250, 'kom', 'bowl'], 'groente', ['soep', 'soup']),
  // Drinks and treats
  f('koffie', 'Koffie (zwart)', 'Coffee (black)', 1, 0.1, 0, 0, [125, 'kop', 'cup'], 'drinken', ['koffie', 'coffee', 'espresso']),
  f('thee', 'Thee', 'Tea', 1, 0, 0.2, 0, [200, 'kop', 'cup'], 'drinken', ['tea']),
  f('jus', "Sinaasappelsap", 'Orange juice', 45, 0.7, 10, 0.2, [200, 'glas', 'glass'], 'drinken', ['jus d orange', 'sap', 'juice']),
  f('frisdrank', 'Frisdrank (met suiker)', 'Soft drink', 42, 0, 10.6, 0, [250, 'glas', 'glass'], 'drinken', ['cola', 'fanta', 'frisdrank', 'soda']),
  f('bier', 'Bier', 'Beer', 43, 0.5, 3.6, 0, [250, 'glas', 'glass'], 'drinken', ['biertje', 'beer']),
  f('wijn', 'Wijn', 'Wine', 83, 0.1, 2.6, 0, [125, 'glas', 'glass'], 'drinken', ['wine']),
  f('chocolade', 'Pure chocolade', 'Dark chocolate', 550, 7, 45, 35, [10, 'stukje', 'piece'], 'snoep', ['chocola', 'chocolate']),
  f('chips', 'Chips', 'Crisps', 530, 6, 53, 33, [25, 'zakje', 'bag'], 'snoep', ['crisps']),
  f('pizza', 'Pizza', 'Pizza', 260, 11, 30, 10, [350, 'pizza', 'pizza'], 'snoep', ['pizza']),
  f('friet', 'Friet', 'Chips (fries)', 300, 3.5, 37, 15, [150, 'portie', 'serving'], 'snoep', ['patat', 'frietjes', 'fries']),
  f('koek', 'Koekje', 'Biscuit', 470, 6, 68, 19, [15, 'stuk', 'piece'], 'snoep', ['koekje', 'koekjes', 'biscuit', 'cookie']),
];

export const FOOD_BY_KEY: Record<string, Food> = Object.fromEntries(FOODS.map((x) => [x.key, x]));

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };
const r1 = (n: number) => Math.round(n * 10) / 10;
/** Values for `grams` of a food. */
export function macrosOf(food: Food, grams: number): Macros {
  const k = grams / 100;
  return { kcal: Math.round(food.kcal * k), protein: r1(food.protein * k), carbs: r1(food.carbs * k), fat: r1(food.fat * k) };
}
export function sumMacros(list: Macros[]): Macros {
  const s = list.reduce((a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  return { kcal: Math.round(s.kcal), protein: r1(s.protein), carbs: r1(s.carbs), fat: r1(s.fat) };
}

export const AISLES: { key: Aisle; nl: string; en: string }[] = [
  { key: 'groente', nl: 'Groente en aardappelen', en: 'Vegetables and potatoes' },
  { key: 'fruit', nl: 'Fruit', en: 'Fruit' },
  { key: 'zuivel', nl: 'Zuivel en eieren', en: 'Dairy and eggs' },
  { key: 'vlees_vis', nl: 'Vlees en vis', en: 'Meat and fish' },
  { key: 'vega', nl: 'Vegetarisch', en: 'Vegetarian' },
  { key: 'brood_graan', nl: 'Brood, pasta en rijst', en: 'Bread, pasta and rice' },
  { key: 'voorraad', nl: 'Voorraadkast', en: 'Pantry' },
  { key: 'drinken', nl: 'Drinken', en: 'Drinks' },
  { key: 'snoep', nl: 'Tussendoor', en: 'Treats' },
];

export const MEALS = ['ontbijt', 'lunch', 'diner', 'tussendoor'] as const;
export type Meal = (typeof MEALS)[number];
export const MEAL_TEXT: Record<Meal, [string, string]> = { ontbijt: ['Ontbijt', 'Breakfast'], lunch: ['Lunch', 'Lunch'], diner: ['Diner', 'Dinner'], tussendoor: ['Tussendoor', 'Snack'] };
/** The meal that fits the time of day (for a new entry). */
export function mealForHour(h: number): Meal {
  if (h < 10) return 'ontbijt';
  if (h < 14) return 'lunch';
  if (h >= 17 && h < 21) return 'diner';
  return 'tussendoor';
}
