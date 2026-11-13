/**
 * The dojo in the village: Kyokushin karate as a skill with belts. For every belt a short list to
 * tick off, and an exam when the list is done. It is play and a training aid, not a real grading:
 * what a belt asks differs per organisation and the own sensei decides. The lists here are a
 * draft in the usual Kyokushin order (kihon, kata, kumite, condition) and are meant to be edited.
 */
export type Belt = { key: string; nl: string; en: string; color: string; grade: string; items: { nl: string; en: string }[] };

const it = (nl: string, en: string) => ({ nl, en });

export const BELTS: Belt[] = [
  { key: 'white', nl: 'Witte band', en: 'White belt', color: '#f4f2ec', grade: 'mukyu', items: [] },
  {
    key: 'orange', nl: 'Oranje band', en: 'Orange belt', color: '#f07d1a', grade: '10e–9e kyu',
    items: [
      it('Dojo-etiquette: groeten bij binnenkomst, “Osu”, in seiza zitten', 'Dojo etiquette: bow on entering, “Osu”, sit in seiza'),
      it('Standen: yoi-dachi, fudo-dachi en zenkutsu-dachi', 'Stances: yoi dachi, fudo dachi and zenkutsu dachi'),
      it('Stoten en weringen: seiken chudan-tsuki, jodan-uke en gedan-barai', 'Punches and blocks: seiken chudan tsuki, jodan uke and gedan barai'),
      it('Trappen: hiza-geri en mae-geri chudan', 'Kicks: hiza geri and mae geri chudan'),
      it('Kata: Taikyoku sono ichi', 'Kata: Taikyoku sono ichi'),
      it('Conditie: 10 push-ups en 20 squats', 'Condition: 10 push-ups and 20 squats'),
    ],
  },
  {
    key: 'blue', nl: 'Blauwe band', en: 'Blue belt', color: '#2759a0', grade: '8e–7e kyu',
    items: [
      it('Standen: kokutsu-dachi en kiba-dachi', 'Stances: kokutsu dachi and kiba dachi'),
      it('Handtechnieken: shuto-uchi en uraken', 'Hand techniques: shuto uchi and uraken'),
      it('Trappen: mae-geri jodan en mawashi-geri gedan', 'Kicks: mae geri jodan and mawashi geri gedan'),
      it('Kata: Taikyoku sono ni en sono san', 'Kata: Taikyoku sono ni and sono san'),
      it('Kata: Pinan sono ichi', 'Kata: Pinan sono ichi'),
      it('Conditie: 20 push-ups, 30 squats en 20 sit-ups', 'Condition: 20 push-ups, 30 squats and 20 sit-ups'),
    ],
  },
  {
    key: 'yellow', nl: 'Gele band', en: 'Yellow belt', color: '#e8c21a', grade: '6e–5e kyu',
    items: [
      it('Trappen: yoko-geri en ushiro-geri', 'Kicks: yoko geri and ushiro geri'),
      it('Combinaties van drie technieken, links en rechts', 'Combinations of three techniques, left and right'),
      it('Kata: Pinan sono ni en sono san', 'Kata: Pinan sono ni and sono san'),
      it('Afgesproken sparren: sanbon- en ippon-kumite', 'Arranged sparring: sanbon and ippon kumite'),
      it('Conditie: 30 push-ups, 40 squats en 30 sit-ups', 'Condition: 30 push-ups, 40 squats and 30 sit-ups'),
    ],
  },
  {
    key: 'green', nl: 'Groene band', en: 'Green belt', color: '#2f9e44', grade: '4e–3e kyu',
    items: [
      it('Kata: Sanchin, met de juiste ademhaling', 'Kata: Sanchin, with the right breathing'),
      it('Kata: Pinan sono yon', 'Kata: Pinan sono yon'),
      it('Trappen: mawashi-geri jodan en ushiro-mawashi-geri', 'Kicks: mawashi geri jodan and ushiro mawashi geri'),
      it('Vrij sparren, licht contact: 3 rondes van 2 minuten', 'Free sparring, light contact: 3 rounds of 2 minutes'),
      it('Conditie: 40 push-ups, 50 squats en 40 sit-ups', 'Condition: 40 push-ups, 50 squats and 40 sit-ups'),
    ],
  },
  {
    key: 'brown', nl: 'Bruine band', en: 'Brown belt', color: '#7a4a24', grade: '2e–1e kyu',
    items: [
      it('Kata: Pinan sono go en Gekisai dai', 'Kata: Pinan sono go and Gekisai dai'),
      it('Kata: Yantsu en Tsuki no kata', 'Kata: Yantsu and Tsuki no kata'),
      it('Alle basistechnieken uit de lagere banden foutloos', 'All basic techniques of the lower belts without fault'),
      it('Vrij sparren: 5 rondes van 2 minuten', 'Free sparring: 5 rounds of 2 minutes'),
      it('Een beginner een basistechniek uitleggen', 'Explain a basic technique to a beginner'),
      it('Conditie: 50 push-ups, 60 squats en 50 sit-ups', 'Condition: 50 push-ups, 60 squats and 50 sit-ups'),
    ],
  },
  {
    key: 'black', nl: 'Zwarte band', en: 'Black belt', color: '#1d1f1e', grade: 'shodan',
    items: [
      it('Kata: Tensho en Saiha', 'Kata: Tensho and Saiha'),
      it('Alle Pinan-kata achter elkaar, ook in ura', 'All Pinan kata in a row, also in ura'),
      it('Breektest (tameshiwari) zoals je dojo die vraagt', 'Breaking test (tameshiwari) as your dojo asks'),
      it('Kumite: 10 gevechten achter elkaar', 'Kumite: 10 fights in a row'),
      it('Minstens een jaar bruine band, en je sensei draagt je voor', 'At least a year as a brown belt, and your sensei puts you forward'),
      it('Conditie: 60 push-ups, 80 squats en 60 sit-ups', 'Condition: 60 push-ups, 80 squats and 60 sit-ups'),
    ],
  },
];

export const itemKey = (belt: number, i: number) => `${belt}:${i}`;
/** Every item key of the belt after `belt`, or none at the black belt. */
export const nextItems = (belt: number): string[] => (BELTS[belt + 1]?.items ?? []).map((_, i) => itemKey(belt + 1, i));
/** The exam for the next belt can be taken when its whole list is ticked. */
export const examReady = (belt: number, done: ReadonlySet<string>) => belt < BELTS.length - 1 && nextItems(belt).every((k) => done.has(k));
export const validItem = (key: string) => {
  const [b, i] = key.split(':').map(Number);
  return Number.isInteger(b) && Number.isInteger(i) && b >= 1 && b < BELTS.length && i >= 0 && i < BELTS[b].items.length;
};
