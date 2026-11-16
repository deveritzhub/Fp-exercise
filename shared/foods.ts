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
  f('noedels', 'Volkoren noedels (ongekookt)', 'Wholemeal noodles (dry)', 350, 13, 68, 2.5, [70, 'portie', 'serving'], 'brood_graan', ['noedels', 'mie', 'noodles']),
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
  f('sojayoghurt', 'Sojayoghurt (naturel)', 'Soy yoghurt (plain)', 50, 4, 2.5, 2.5, [150, 'schaaltje', 'bowl'], 'vega', ['soja yoghurt', 'plantaardige yoghurt', 'soy yogurt', 'alpro']),
  f('sojadrink', 'Sojadrink (ongezoet)', 'Soy drink (unsweetened)', 35, 3.3, 1, 1.8, [200, 'glas', 'glass'], 'vega', ['sojamelk', 'soja melk', 'soy milk', 'plantaardige melk']),
  f('hummus', 'Hummus', 'Hummus', 280, 7, 14, 22, [30, 'eetlepel', 'tablespoon'], 'vega'),
  // Nuts, spreads, fats
  f('pindakaas', 'Pindakaas', 'Peanut butter', 600, 25, 15, 48, [15, 'eetlepel', 'tablespoon'], 'voorraad', ['pindakaas', 'peanut butter']),
  f('amandelen', 'Amandelen', 'Almonds', 600, 21, 22, 52, [25, 'handje', 'handful'], 'voorraad', ['amandel', 'noten', 'nuts']),
  f('walnoten', 'Walnoten', 'Walnuts', 680, 15, 14, 65, [15, 'handje', 'handful'], 'voorraad', ['walnoot']),
  f('pindas', "Pinda's", 'Peanuts', 590, 25, 13, 49, [25, 'handje', 'handful'], 'voorraad', ['pindas', 'pinda']),
  f('olijfolie', 'Olijfolie', 'Olive oil', 880, 0, 0, 100, [10, 'eetlepel', 'tablespoon'], 'voorraad', ['olie', 'olive oil']),
  f('boter', 'Boter', 'Butter', 740, 0.6, 0.6, 82, [10, 'klontje', 'knob'], 'zuivel', ['roomboter']),
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
  // Dutch staples (added 2026-11-17): meat and fish
  f('lamskotelet', 'Lamskotelet', 'Lamb chop', 280, 25, 0, 20, [80, 'kotelet', 'chop'], 'vlees_vis', ['lamskoteletten', 'lam', 'lamsvlees', 'lamb', 'lamb chops']),
  f('varkenshaas', 'Varkenshaas', 'Pork tenderloin', 120, 22, 0, 3.5, [125, 'portie', 'serving'], 'vlees_vis', ['varkensvlees', 'pork']),
  f('karbonade', 'Karbonade', 'Pork chop', 230, 24, 0, 15, [125, 'karbonade', 'chop'], 'vlees_vis', ['karbonades', 'varkenskotelet', 'pork chop']),
  f('speklap', 'Speklap', 'Pork belly slice', 330, 17, 0, 29, [100, 'speklap', 'slice'], 'vlees_vis', ['speklappen', 'buikspek']),
  f('spek', 'Spekjes', 'Bacon', 330, 15, 0, 30, [50, 'portie', 'serving'], 'vlees_vis', ['spek', 'spekblokjes', 'ontbijtspek']),
  f('slavink', 'Slavink', 'Slavink', 280, 14, 3, 24, [100, 'slavink', 'piece'], 'vlees_vis', ['slavinken']),
  f('gehaktbal', 'Gehaktbal', 'Meatball', 240, 16, 6, 17, [100, 'gehaktbal', 'meatball'], 'vlees_vis', ['gehaktballen', 'bal gehakt', 'meatballs']),
  f('rookworst', 'Rookworst', 'Smoked sausage', 300, 12, 2, 27, [75, 'portie', 'serving'], 'vlees_vis', ['worst', 'smoked sausage']),
  f('braadworst', 'Braadworst', 'Bratwurst', 280, 14, 2, 24, [100, 'worst', 'sausage'], 'vlees_vis', ['braadworsten', 'bratwurst', 'saucijs']),
  f('hamburger', 'Hamburger', 'Burger patty', 240, 17, 2, 18, [100, 'hamburger', 'patty'], 'vlees_vis', ['hamburgers', 'burger', 'burgers']),
  f('kipdij', 'Kippendij', 'Chicken thigh', 180, 19, 0, 11.5, [100, 'portie', 'serving'], 'vlees_vis', ['kipdij', 'kipdijen', 'kippendijen', 'kipdijfilet', 'chicken thighs']),
  f('kippenpoot', 'Kippenpoot', 'Chicken drumstick', 200, 18, 0, 14, [150, 'poot', 'drumstick'], 'vlees_vis', ['kippenpoten', 'drumstick', 'kippenbout']),
  f('kipschnitzel', 'Kipschnitzel', 'Chicken schnitzel', 220, 18, 12, 11, [120, 'schnitzel', 'schnitzel'], 'vlees_vis', ['schnitzel', 'schnitzels']),
  f('kipnuggets', 'Kipnuggets', 'Chicken nuggets', 260, 15, 17, 15, [100, 'portie', 'serving'], 'vlees_vis', ['nuggets']),
  f('shoarma', 'Shoarma', 'Shawarma', 200, 20, 1, 13, [150, 'portie', 'serving'], 'vlees_vis', ['shawarma', 'kebab', 'doner', 'gyros']),
  f('stoofvlees', 'Stoofvlees', 'Beef stew meat', 190, 29, 0, 8, [125, 'portie', 'serving'], 'vlees_vis', ['runderlap', 'runderlappen', 'draadjesvlees', 'sukadelap', 'hachee']),
  f('entrecote', 'Entrecote', 'Sirloin steak', 200, 22, 0, 12.5, [150, 'stuk', 'piece'], 'vlees_vis', ['entrecôte', 'ribeye']),
  f('ham', 'Ham (beleg)', 'Sliced ham', 110, 18, 1, 4, [15, 'plak', 'slice'], 'vlees_vis', ['ham', 'achterham', 'beenham', 'hamplak']),
  f('rookvlees', 'Rookvlees', 'Smoked beef', 120, 24, 1, 2, [10, 'plak', 'slice'], 'vlees_vis', ['rosbief', 'fricandeau']),
  f('salami', 'Salami', 'Salami', 400, 22, 1, 34, [10, 'plak', 'slice'], 'vlees_vis', ['cervelaat', 'chorizo']),
  f('leverworst', 'Leverworst', 'Liver sausage', 300, 13, 4, 26, [15, 'plak', 'slice'], 'vlees_vis', ['boterhamworst', 'pate', 'paté']),
  f('filet_americain', 'Filet americain', 'Steak tartare spread', 220, 14, 2, 17.5, [20, 'boterham', 'slice'], 'vlees_vis', ['americain', 'filet americain']),
  f('kabeljauw', 'Kabeljauw', 'Cod', 80, 18, 0, 0.7, [125, 'filet', 'fillet'], 'vlees_vis', ['cod', 'kabeljauwfilet']),
  f('witvis', 'Witvis (koolvis, pangasius)', 'White fish', 75, 16, 0, 1, [125, 'filet', 'fillet'], 'vlees_vis', ['koolvis', 'pangasius', 'tilapia', 'schol', 'vis', 'visfilet']),
  f('haring', 'Haring', 'Herring', 210, 15, 0, 16.5, [80, 'haring', 'herring'], 'vlees_vis', ['haringen', 'hollandse nieuwe', 'maatjes', 'maatjesharing']),
  f('makreel', 'Makreel (gerookt)', 'Smoked mackerel', 300, 19, 0, 25, [70, 'portie', 'serving'], 'vlees_vis', ['makreel', 'gerookte makreel', 'mackerel']),
  f('kibbeling', 'Kibbeling', 'Battered fish bites', 230, 13, 15, 13, [150, 'portie', 'serving'], 'vlees_vis', ['kibbeling']),
  f('lekkerbekje', 'Lekkerbekje', 'Battered fish fillet', 230, 13, 14, 13.5, [150, 'stuk', 'piece'], 'vlees_vis', ['gebakken vis']),
  f('vissticks', 'Vissticks', 'Fish fingers', 210, 12, 18, 10, [25, 'stick', 'finger'], 'vlees_vis', ['visstick', 'fish fingers', 'fish sticks']),
  f('mosselen', 'Mosselen', 'Mussels', 90, 13, 3.5, 2.5, [250, 'portie', 'serving'], 'vlees_vis', ['mossel', 'mussels']),
  f('forel', 'Forel', 'Trout', 140, 20, 0, 6.5, [125, 'filet', 'fillet'], 'vlees_vis', ['trout']),
  f('sardines', 'Sardines (blik)', 'Sardines (tin)', 200, 24, 0, 11.5, [90, 'blikje', 'tin'], 'vlees_vis', ['sardientjes', 'sardine']),
  f('gerookte_zalm', 'Gerookte zalm', 'Smoked salmon', 180, 22, 0, 10, [20, 'plak', 'slice'], 'vlees_vis', ['gerookte zalm', 'smoked salmon']),
  // Dutch staples: bread, spreads and breakfast
  f('bolletje', 'Wit bolletje', 'White roll', 270, 9, 50, 3, [50, 'bolletje', 'roll'], 'brood_graan', ['broodje', 'broodjes', 'bol', 'puntje', 'kaiserbroodje']),
  f('stokbrood', 'Stokbrood', 'Baguette', 260, 9, 52, 1.5, [50, 'stuk', 'piece'], 'brood_graan', ['baguette', 'stokbroodje']),
  f('krentenbol', 'Krentenbol', 'Currant bun', 280, 8, 52, 4, [60, 'krentenbol', 'bun'], 'brood_graan', ['krentenbollen', 'rozijnenbol']),
  f('croissant', 'Croissant', 'Croissant', 410, 8, 45, 21, [50, 'croissant', 'croissant'], 'brood_graan', ['croissantje']),
  f('beschuit', 'Beschuit', 'Rusk', 410, 10, 75, 6, [10, 'beschuit', 'rusk'], 'brood_graan', ['beschuitje', 'beschuiten']),
  f('crackers', 'Crackers', 'Crackers', 420, 11, 70, 10, [10, 'cracker', 'cracker'], 'brood_graan', ['cracker', 'knackebrod', 'knäckebröd', 'volkorencracker']),
  f('ontbijtkoek', 'Ontbijtkoek', 'Dutch spiced cake', 330, 4, 74, 1.5, [25, 'plak', 'slice'], 'brood_graan', ['peperkoek', 'ontbijtkoek']),
  f('cornflakes', 'Cornflakes', 'Cornflakes', 380, 7, 84, 1, [30, 'portie', 'serving'], 'brood_graan', ['ontbijtgranen', 'cereal', 'cereals']),
  f('couscous', 'Couscous (ongekookt)', 'Couscous (dry)', 360, 13, 72, 2, [70, 'portie', 'serving'], 'brood_graan', ['bulgur']),
  f('pannenkoek', 'Pannenkoek', 'Pancake', 200, 6, 27, 7.5, [100, 'pannenkoek', 'pancake'], 'brood_graan', ['pannenkoeken', 'pancakes', 'flensje']),
  f('poffertjes', 'Poffertjes', 'Mini pancakes', 230, 6, 35, 7, [100, 'portie', 'serving'], 'snoep', ['poffertje']),
  f('hagelslag', 'Hagelslag', 'Chocolate sprinkles', 480, 5, 70, 20, [15, 'boterham', 'slice'], 'voorraad', ['vlokken', 'chocoladevlokken', 'muisjes', 'sprinkles']),
  f('jam', 'Jam', 'Jam', 230, 0.5, 56, 0.2, [15, 'boterham', 'slice'], 'voorraad', ['confituur', 'marmelade', 'jam']),
  f('appelstroop', 'Appelstroop', 'Apple syrup', 270, 1, 66, 0.2, [15, 'boterham', 'slice'], 'voorraad', ['stroop']),
  f('chocopasta', 'Chocoladepasta', 'Chocolate spread', 540, 6, 57, 31, [15, 'boterham', 'slice'], 'voorraad', ['chocopasta', 'nutella', 'hazelnootpasta']),
  f('margarine', 'Halvarine / margarine', 'Margarine', 360, 0, 0.5, 40, [5, 'besmeren', 'spread'], 'zuivel', ['halvarine', 'margarine', 'smeervet', 'blue band']),
  // Dutch staples: dairy
  f('karnemelk', 'Karnemelk', 'Buttermilk', 40, 3.5, 4.5, 0.5, [200, 'glas', 'glass'], 'zuivel', ['karnemelk', 'buttermilk']),
  f('chocomelk', 'Chocolademelk', 'Chocolate milk', 70, 3.5, 10, 1.5, [200, 'glas', 'glass'], 'zuivel', ['chocomel', 'chocolademelk', 'warme chocolademelk']),
  f('vla', 'Vla', 'Custard', 100, 3, 16, 2.5, [150, 'schaaltje', 'bowl'], 'zuivel', ['vanillevla', 'chocoladevla', 'pudding', 'custard']),
  f('volle_yoghurt', 'Volle yoghurt', 'Full-fat yoghurt', 60, 3.5, 4.5, 3, [150, 'schaaltje', 'bowl'], 'zuivel', ['volle yoghurt', 'turkse yoghurt']),
  f('drinkyoghurt', 'Drinkyoghurt', 'Drinking yoghurt', 70, 3, 11, 1.3, [200, 'glas', 'glass'], 'zuivel', ['yogidrink', 'drinkyoghurt', 'fristi']),
  f('slagroom', 'Slagroom', 'Whipped cream', 340, 2, 3, 35, [20, 'toef', 'dollop'], 'zuivel', ['room', 'kookroom', 'cream']),
  f('magere_kaas', 'Magere kaas (30+)', 'Reduced-fat cheese', 270, 30, 0, 16.5, [20, 'plak', 'slice'], 'zuivel', ['magere kaas', 'light kaas', 'kaas 30']),
  f('smeerkaas', 'Smeerkaas', 'Cheese spread', 230, 11, 4, 19, [20, 'boterham', 'slice'], 'zuivel', ['smeerkaasje']),
  f('geitenkaas', 'Geitenkaas', 'Goat cheese', 330, 22, 1, 26.5, [30, 'portie', 'serving'], 'zuivel', ['geitenkaasje', 'goat cheese']),
  f('brie', 'Brie', 'Brie', 340, 20, 0, 29, [30, 'portie', 'serving'], 'zuivel', ['camembert']),
  f('parmezaan', 'Parmezaanse kaas', 'Parmesan', 400, 33, 0, 29.5, [10, 'eetlepel', 'tablespoon'], 'zuivel', ['parmezaan', 'parmesan', 'geraspte kaas']),
  f('roomkaas', 'Roomkaas', 'Cream cheese', 250, 6, 4, 23, [20, 'boterham', 'slice'], 'zuivel', ['philadelphia', 'cream cheese']),
  f('eiersalade', 'Eiersalade', 'Egg salad', 230, 7, 3, 21, [30, 'boterham', 'slice'], 'zuivel', ['eiersalade']),
  // Dutch staples: warm meals and snacks from the snack bar
  f('stamppot_boerenkool', 'Boerenkoolstamppot', 'Kale mash', 110, 3, 13, 5, [350, 'bord', 'plate'], 'groente', ['stamppot', 'boerenkoolstamppot', 'stamppot boerenkool']),
  f('hutspot', 'Hutspot', 'Carrot and onion mash', 85, 2, 13, 2.5, [350, 'bord', 'plate'], 'groente', ['hutspot']),
  f('stamppot_zuurkool', 'Zuurkoolstamppot', 'Sauerkraut mash', 95, 2.5, 12, 4, [350, 'bord', 'plate'], 'groente', ['zuurkoolstamppot', 'stamppot zuurkool']),
  f('aardappelpuree', 'Aardappelpuree', 'Mashed potatoes', 100, 2, 14, 4, [200, 'portie', 'serving'], 'groente', ['puree', 'aardappelpuree', 'mashed potatoes']),
  f('erwtensoep', 'Erwtensoep', 'Split pea soup', 90, 6, 9, 3.5, [300, 'kom', 'bowl'], 'groente', ['snert', 'erwtensoep']),
  f('tomatensoep', 'Tomatensoep', 'Tomato soup', 45, 1.5, 6, 1.5, [250, 'kom', 'bowl'], 'groente', ['tomatensoep', 'tomato soup']),
  f('nasi', 'Nasi goreng', 'Fried rice', 160, 6, 22, 5, [350, 'bord', 'plate'], 'brood_graan', ['nasi', 'nasi goreng', 'gebakken rijst', 'fried rice']),
  f('bami', 'Bami goreng', 'Fried noodles', 160, 7, 21, 5.5, [350, 'bord', 'plate'], 'brood_graan', ['bami', 'bami goreng']),
  f('lasagne', 'Lasagne', 'Lasagne', 150, 8, 13, 7, [350, 'portie', 'serving'], 'brood_graan', ['lasagna', 'macaronischotel', 'ovenschotel']),
  f('kapsalon', 'Kapsalon', 'Kapsalon', 250, 13, 17, 15, [450, 'bakje', 'tray'], 'snoep', ['kapsalon']),
  f('loempia', 'Loempia', 'Spring roll', 220, 6, 25, 11, [150, 'loempia', 'roll'], 'snoep', ['loempia', 'springroll']),
  f('tosti', 'Tosti ham-kaas', 'Toasted ham and cheese sandwich', 270, 15, 25, 12, [120, 'tosti', 'toastie'], 'brood_graan', ['tosti', 'tostis', 'tosti ham kaas']),
  f('kroket', 'Kroket', 'Croquette', 230, 6, 20, 14, [70, 'kroket', 'croquette'], 'snoep', ['kroketten', 'croquette']),
  f('frikandel', 'Frikandel', 'Frikandel', 250, 11, 8, 19, [70, 'frikandel', 'piece'], 'snoep', ['frikandellen', 'frikadel']),
  f('kaassouffle', 'Kaassoufflé', 'Cheese soufflé snack', 300, 9, 26, 18, [70, 'stuk', 'piece'], 'snoep', ['kaassouffle', 'kaassoufflé']),
  f('bitterbal', 'Bitterbal', 'Bitterbal', 260, 6, 18, 18, [20, 'bitterbal', 'piece'], 'snoep', ['bitterballen']),
  f('mayonaise', 'Mayonaise', 'Mayonnaise', 680, 1, 2, 75, [20, 'klodder', 'dollop'], 'voorraad', ['mayo', 'mayonaise', 'mayonnaise']),
  f('fritessaus', 'Fritessaus', 'Fries sauce', 300, 1, 9, 29, [20, 'klodder', 'dollop'], 'voorraad', ['fritessaus', 'frietsaus']),
  f('ketchup', 'Ketchup', 'Ketchup', 110, 1.5, 24, 0.2, [15, 'klodder', 'dollop'], 'voorraad', ['tomatenketchup', 'curry', 'curryketchup']),
  f('satesaus', 'Satésaus', 'Peanut sauce', 220, 6, 12, 16, [50, 'portie', 'serving'], 'voorraad', ['satesaus', 'pindasaus', 'saté']),
  // Dutch staples: vegetables and fruit
  f('boerenkool', 'Boerenkool', 'Kale', 40, 3.5, 3, 1, [200, 'portie', 'serving'], 'groente', ['kale']),
  f('andijvie', 'Andijvie', 'Endive', 15, 1.5, 1.5, 0.2, [200, 'portie', 'serving'], 'groente', ['andijvie']),
  f('spruitjes', 'Spruitjes', 'Brussels sprouts', 45, 4, 5, 0.5, [200, 'portie', 'serving'], 'groente', ['spruiten', 'spruitje', 'brussels sprouts']),
  f('bloemkool', 'Bloemkool', 'Cauliflower', 25, 2, 3, 0.3, [200, 'portie', 'serving'], 'groente', ['cauliflower']),
  f('rodekool', 'Rode kool', 'Red cabbage', 25, 1.5, 4, 0.2, [150, 'portie', 'serving'], 'groente', ['rodekool', 'rode kool met appel']),
  f('witlof', 'Witlof', 'Chicory', 17, 1.2, 2.5, 0.2, [150, 'portie', 'serving'], 'groente', ['chicory']),
  f('prei', 'Prei', 'Leek', 30, 1.5, 5, 0.3, [150, 'portie', 'serving'], 'groente', ['leek']),
  f('doperwten', 'Doperwten', 'Peas', 70, 5.5, 9, 0.5, [150, 'portie', 'serving'], 'groente', ['erwten', 'erwtjes', 'peas', 'erwtjes en wortelen']),
  f('mais', 'Maïs', 'Sweetcorn', 90, 3, 16, 1.5, [100, 'portie', 'serving'], 'groente', ['mais', 'maïskolf', 'corn']),
  f('bietjes', 'Rode bieten', 'Beetroot', 40, 1.5, 7.5, 0.1, [150, 'portie', 'serving'], 'groente', ['bietjes', 'bieten', 'beetroot']),
  f('pompoen', 'Pompoen', 'Pumpkin', 30, 1, 6, 0.1, [200, 'portie', 'serving'], 'groente', ['pumpkin', 'pompoensoep']),
  f('aubergine', 'Aubergine', 'Aubergine', 25, 1, 4, 0.2, [150, 'portie', 'serving'], 'groente', ['eggplant']),
  f('zuurkool', 'Zuurkool', 'Sauerkraut', 20, 1.2, 2.5, 0.3, [150, 'portie', 'serving'], 'groente', ['sauerkraut']),
  f('wokgroente', 'Wokgroenten', 'Stir-fry vegetables', 30, 1.5, 4, 0.3, [200, 'portie', 'serving'], 'groente', ['wokgroente', 'roerbakgroente', 'groentemix', 'stir fry vegetables']),
  f('olijven', 'Olijven', 'Olives', 140, 1, 1, 14.5, [30, 'handje', 'handful'], 'voorraad', ['olijf', 'olives']),
  f('augurk', 'Augurk', 'Gherkin', 20, 0.5, 4, 0.1, [30, 'augurk', 'gherkin'], 'voorraad', ['augurken', 'zilveruitjes', 'pickles']),
  f('mandarijn', 'Mandarijn', 'Mandarin', 50, 0.8, 11, 0.2, [70, 'mandarijn', 'mandarin'], 'fruit', ['mandarijnen', 'clementine', 'clementines']),
  f('druiven', 'Druiven', 'Grapes', 70, 0.6, 16, 0.2, [100, 'tros', 'bunch'], 'fruit', ['druif', 'grapes']),
  f('kiwi', 'Kiwi', 'Kiwi', 60, 1, 12, 0.5, [75, 'kiwi', 'kiwi'], 'fruit', ['kiwis', "kiwi's"]),
  f('ananas', 'Ananas', 'Pineapple', 50, 0.5, 11.5, 0.1, [150, 'portie', 'serving'], 'fruit', ['pineapple']),
  f('mango', 'Mango', 'Mango', 60, 0.8, 14, 0.3, [150, 'portie', 'serving'], 'fruit', ['mango']),
  f('meloen', 'Meloen', 'Melon', 35, 0.6, 8, 0.1, [200, 'partje', 'wedge'], 'fruit', ['watermeloen', 'melon']),
  f('frambozen', 'Frambozen', 'Raspberries', 45, 1.2, 6, 0.5, [100, 'bakje', 'punnet'], 'fruit', ['framboos', 'raspberries']),
  f('rozijnen', 'Rozijnen', 'Raisins', 300, 3, 70, 0.5, [15, 'handje', 'handful'], 'fruit', ['krenten', 'raisins']),
  f('dadels', 'Dadels', 'Dates', 290, 2.5, 67, 0.4, [8, 'dadel', 'date'], 'fruit', ['dadel', 'dates', 'medjoul']),
  f('appelmoes', 'Appelmoes', 'Apple sauce', 75, 0.3, 18, 0.1, [100, 'portie', 'serving'], 'fruit', ['appelmoes', 'apple sauce']),
  f('cashewnoten', 'Cashewnoten', 'Cashews', 600, 18, 27, 47, [25, 'handje', 'handful'], 'voorraad', ['cashew', 'cashews']),
  f('notenmix', 'Gemengde noten', 'Mixed nuts', 620, 20, 15, 54, [25, 'handje', 'handful'], 'voorraad', ['noten', 'notenmix', 'mixed nuts']),
  f('studentenhaver', 'Studentenhaver', 'Trail mix', 480, 13, 40, 30, [25, 'handje', 'handful'], 'voorraad', ['trail mix']),
  // Dutch staples: vegetarian
  f('vegaburger', 'Vegaburger', 'Veggie burger', 200, 15, 10, 11, [80, 'burger', 'burger'], 'vega', ['vegetarische burger', 'veggie burger', 'plantaardige burger']),
  f('vega_kip', 'Vegetarische kipstukjes', 'Vegetarian chicken pieces', 170, 20, 5, 7.5, [100, 'portie', 'serving'], 'vega', ['vega kip', 'vegetarische kip', 'vegan kip', 'kipstuckjes']),
  f('falafel', 'Falafel', 'Falafel', 330, 13, 31, 18, [20, 'balletje', 'ball'], 'vega', ['falafelballetjes']),
  f('witte_bonen', 'Witte bonen in tomatensaus', 'Baked beans', 90, 5, 13, 0.5, [200, 'portie', 'serving'], 'vega', ['witte bonen', 'baked beans']),
  // Dutch staples: drinks
  f('cola_light', 'Cola light / zero', 'Diet cola', 1, 0, 0.1, 0, [250, 'glas', 'glass'], 'drinken', ['cola zero', 'cola light', 'light frisdrank', 'pepsi max']),
  f('appelsap', 'Appelsap', 'Apple juice', 45, 0.1, 10.5, 0, [200, 'glas', 'glass'], 'drinken', ['appelsap', 'apple juice']),
  f('smoothie', 'Smoothie', 'Smoothie', 55, 0.7, 12, 0.3, [250, 'glas', 'glass'], 'drinken', ['smoothies']),
  f('sportdrank', 'Sportdrank', 'Sports drink', 25, 0, 6, 0, [500, 'flesje', 'bottle'], 'drinken', ['isotone drank', 'aa drink', 'aquarius', 'sports drink']),
  f('cappuccino', 'Cappuccino', 'Cappuccino', 40, 2.2, 3.2, 2, [150, 'kop', 'cup'], 'drinken', ['latte', 'koffie verkeerd', 'koffie met melk', 'flat white']),
  f('energiedrank', 'Energiedrank', 'Energy drink', 45, 0, 11, 0, [250, 'blikje', 'can'], 'drinken', ['red bull', 'energy drink', 'monster energy']),
  // Dutch staples: sweets
  f('stroopwafel', 'Stroopwafel', 'Stroopwafel', 450, 4, 64, 19, [30, 'stroopwafel', 'stroopwafel'], 'snoep', ['stroopwafels']),
  f('drop', 'Drop', 'Liquorice', 360, 3, 85, 0.5, [10, 'portie', 'serving'], 'snoep', ['dropjes', 'liquorice']),
  f('snoep', 'Snoep (winegums)', 'Sweets (wine gums)', 340, 5, 80, 0, [20, 'handje', 'handful'], 'snoep', ['snoepjes', 'winegums', 'zuurtjes', 'spekjes snoep', 'sweets']),
  f('ijs', 'IJs', 'Ice cream', 200, 3.5, 24, 10, [60, 'bolletje', 'scoop'], 'snoep', ['ijsje', 'roomijs', 'ice cream', 'magnum']),
  f('appeltaart', 'Appeltaart', 'Apple pie', 260, 3, 36, 12, [120, 'punt', 'slice'], 'snoep', ['taart', 'apple pie', 'gebak']),
  f('tompouce', 'Tompouce', 'Tompouce', 330, 4, 40, 17, [80, 'tompouce', 'pastry'], 'snoep', ['tompoes', 'tompouces']),
  f('gevulde_koek', 'Gevulde koek', 'Almond-filled biscuit', 440, 7, 55, 21, [70, 'stuk', 'piece'], 'snoep', ['gevulde koek', 'gevulde koeken']),
  f('speculaas', 'Speculaas', 'Speculoos', 480, 6, 70, 19, [10, 'koekje', 'biscuit'], 'snoep', ['speculaasje', 'speculoos']),
  f('pepernoten', 'Pepernoten', 'Pepernoten', 420, 6, 75, 10, [30, 'handje', 'handful'], 'snoep', ['kruidnoten', 'pepernoot']),
  f('oliebol', 'Oliebol', 'Dutch doughnut', 300, 6, 40, 13, [70, 'oliebol', 'doughnut'], 'snoep', ['oliebollen']),
  f('popcorn', 'Popcorn', 'Popcorn', 470, 9, 60, 22, [30, 'portie', 'serving'], 'snoep', ['popcorn']),
  f('borrelnootjes', 'Borrelnootjes', 'Coated peanuts', 520, 15, 40, 33, [25, 'handje', 'handful'], 'snoep', ['japanse mix', 'nootjes']),
  f('mueslireep', 'Mueslireep', 'Muesli bar', 400, 6, 65, 13, [25, 'reep', 'bar'], 'snoep', ['granolareep', 'mueslirepen', 'muesli bar']),
  // Dutch staples: pantry
  f('pesto', 'Pesto', 'Pesto', 450, 5, 5, 45, [20, 'eetlepel', 'tablespoon'], 'voorraad', ['pesto']),
  f('kokosmelk', 'Kokosmelk', 'Coconut milk', 180, 2, 3, 18, [100, 'portie', 'serving'], 'voorraad', ['coconut milk', 'santen']),
  f('suiker', 'Suiker', 'Sugar', 400, 0, 100, 0, [5, 'theelepel', 'teaspoon'], 'voorraad', ['klontje', 'suikerklontje', 'sugar']),
  f('bakolie', 'Zonnebloemolie', 'Sunflower oil', 900, 0, 0, 100, [10, 'eetlepel', 'tablespoon'], 'voorraad', ['zonnebloemolie', 'bakolie', 'frituurolie', 'arachideolie']),
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
