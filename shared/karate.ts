/**
 * The dojo in the village: Kyokushin karate as a skill with belts. For every grade the list of the
 * NKKO / KWF syllabus to tick off, and an exam when the list is done. The lists follow the syllabus
 * and the KWF dan requirements (version 2021) as supplied by the practice owner; technique names are
 * kept as written there. It stays a training aid: the real grading is the sensei's.
 */
export type KarateCat = 'tachikata' | 'tsuki' | 'uke' | 'keri' | 'ido' | 'kata' | 'renraku' | 'stamina' | 'kumite' | 'kokyu' | 'other';
export const KARATE_CATS: Record<KarateCat, { nl: string; en: string }> = {
  tachikata: { nl: 'Tachikata · standen', en: 'Tachikata · stances' },
  tsuki: { nl: 'Tsuki · stoten en slagen', en: 'Tsuki · punches and strikes' },
  uke: { nl: 'Uke · weringen', en: 'Uke · blocks' },
  keri: { nl: 'Keri · trappen', en: 'Keri · kicks' },
  ido: { nl: 'Ido · verplaatsen', en: 'Ido · moving' },
  kata: { nl: 'Kata', en: 'Kata' },
  renraku: { nl: 'Renraku · combinaties', en: 'Renraku · combinations' },
  stamina: { nl: 'Conditie', en: 'Stamina' },
  kumite: { nl: 'Kumite', en: 'Kumite' },
  kokyu: { nl: 'Kokyu ho · ademhaling', en: 'Kokyu ho · breathing' },
  other: { nl: 'Overig', en: 'Other' },
};
export type KarateItem = { cat: KarateCat; nl: string; en: string };
export type Belt = { key: string; nl: string; en: string; color: string; stripe: boolean; grade: string; items: KarateItem[] };

/** One line of the syllabus; the technique names are the same in both languages. */
const it = (cat: KarateCat, nl: string, en = nl): KarateItem => ({ cat, nl, en });
const stamina = (push: number, sit: number, squat: number, jump = '') =>
  it('stamina', `${push} push-ups, ${sit} sit-ups, ${squat} squats${jump ? `; ${jump}` : ''}`);
const kumite = (n: number) => it('kumite', `Jiyu kumite ${n} × 60 seconden`, `Jiyu kumite ${n} × 60 seconds`);

const ORANGE = '#f07d1a', BLUE = '#2759a0', YELLOW = '#e8c21a', GREEN = '#2f9e44', BROWN = '#7a4a24';

export const BELTS: Belt[] = [
  { key: 'white', nl: 'Witte band', en: 'White belt', color: '#f4f2ec', stripe: false, grade: 'mukyu', items: [] },
  {
    key: 'kyu10', nl: 'Oranje band', en: 'Orange belt', color: ORANGE, stripe: false, grade: '10e kyu',
    items: [
      it('tachikata', 'Yoi, Fudo dachi, Sanchin dachi, Zenkutsu dachi'),
      it('tsuki', 'Seiken oi tsuki (J/C/G), Seiken gyaku tsuki (J/C/G), Seiken morote tsuki (J/C/G), Seiken ago uchi'),
      it('uke', '(Seiken/Shuto) Jodan uke, (Seiken/Shuto) Mae gedan barai'),
      it('keri', 'Hiza geri, Kin geri, Mae geri (J/C)'),
      it('ido', 'Zenkutsu dachi, Sanchin dachi'),
      it('kata', 'Taikyoku sono ichi, Taikyoku sono ni'),
      stamina(15, 40, 15),
      it('kumite', 'Ippon kumite'),
      it('kokyu', 'Nogare (omote, ura), Kiai'),
    ],
  },
  {
    key: 'kyu9', nl: 'Oranje band met streep', en: 'Orange belt with stripe', color: ORANGE, stripe: true, grade: '9e kyu',
    items: [
      it('tachikata', 'Musubi dachi, Heiko dachi, Heisoku dachi, Kokutsu dachi'),
      it('tsuki', 'Seiken shita tsuki, Seiken tate tsuki (J/C/G), Seiken kagi tsuki, Hiji ate (J/C)'),
      it('uke', '(Seiken/Shuto) Chudan soto uke, (Seiken/Shuto) Chudan uchi uke'),
      it('keri', 'Mae keage, Yoko keage, Uchi mawashi keage, Soto mawashi keage'),
      it('ido', 'Kokutsu dachi'),
      it('kata', 'Taikyoku sono san'),
      stamina(20, 45, 20),
      it('kumite', 'Yakusoku kumite, Sambon kumite'),
    ],
  },
  {
    key: 'kyu8', nl: 'Blauwe band', en: 'Blue belt', color: BLUE, stripe: false, grade: '8e kyu',
    items: [
      it('tachikata', 'Kiba dachi, Tsuru ashi dachi, Kumite no kamae'),
      it('tsuki', 'Uraken ganmen uchi, Uraken sayu ganmen uchi, Uraken mawashi uchi, Uraken oroshi ganmen uchi, Uraken hizo uchi'),
      it('uke', '(Seiken/Shuto) Uchi uke / gedan barai, Morote chudan uchi uke'),
      it('keri', 'Kansetsu geri, Yoko geri (J/C), Mawashi geri (J/C/G)'),
      it('ido', 'Kiba dachi'),
      it('kata', 'Sokugi taikyoku sono ichi, sono ni, sono san'),
      it('renraku', 'Mae geri, chudan gyaku tsuki · Chudan soto uke, mae gedan barai, chudan gyaku tsuki'),
      stamina(30, 50, 30, 'Tobi geri'),
      kumite(2),
    ],
  },
  {
    key: 'kyu7', nl: 'Blauwe band met streep', en: 'Blue belt with stripe', color: BLUE, stripe: true, grade: '7e kyu',
    items: [
      it('tachikata', 'Uchi hachiji dachi, Neko ashi dachi, Shiko dachi'),
      it('tsuki', 'Tettsui komi kami, Tettsui oroshi ganmen uchi, Tettsui hizo uchi, Tettsui yoko uchi (J/C/G) mae, Tettsui yoko uchi (J/C/G)'),
      it('uke', 'Shuto mawashi uke, Mae shuto mawashi uke'),
      it('keri', 'Jodan uchi heisoku geri, Ago jodan geri'),
      it('ido', 'Neko ashi dachi'),
      it('kata', 'Pinan sono ichi, Sanchin no kata'),
      stamina(35, 55, 35, 'Tobi geri + 10 cm'),
      kumite(3),
      it('kokyu', 'Ibuki sankai'),
    ],
  },
  {
    key: 'kyu6', nl: 'Gele band', en: 'Yellow belt', color: YELLOW, stripe: false, grade: '6e kyu',
    items: [
      it('tachikata', 'Kake ashi dachi'),
      it('tsuki', 'Shuto yoko ganmen uchi, Shuto sakotsu uchi, Shuto hizo uchi, Shuto sakotsu uchi komi, Ushiro hiji ate, Nihon nukite, Yonhon nukite (J/C)'),
      it('uke', 'Enkei gyaku tsuki, Mawashi gedan barai, Juji gedan barai, Hiji uke, Jodan shuto uchi uke'),
      it('keri', 'Ushiro geri (J/C/G) op 3 manieren, Ushiro mawashi geri (J/C/G)', 'Ushiro geri (J/C/G) in 3 methods, Ushiro mawashi geri (J/C/G)'),
      it('ido', 'Kake ashi dachi'),
      it('kata', 'Pinan sono ni, Pinan sono san'),
      stamina(40, 60, 40, 'Tobi geri + 15 cm'),
      kumite(4),
    ],
  },
  {
    key: 'kyu5', nl: 'Gele band met streep', en: 'Yellow belt with stripe', color: YELLOW, stripe: true, grade: '5e kyu',
    items: [
      it('tachikata', 'Moro ashi dachi'),
      it('tsuki', 'Shotei uchi (J/C/G), Age hiji ate (J/C), Oroshi hiji ate, Jun tsuki (J/C/G)'),
      it('uke', '(Seiken/Shuto) Juji uke (J/G), Shotei uke (J/C/G)'),
      it('keri', 'Oroshi uchi kakato geri, Oroshi soto kakato geri'),
      it('ido', 'Moro ashi dachi'),
      it('kata', 'Pinan sono yon'),
      stamina(45, 65, 45, 'Tobi geri + 15 cm'),
      kumite(5),
    ],
  },
  {
    key: 'kyu4', nl: 'Groene band', en: 'Green belt', color: GREEN, stripe: false, grade: '4e kyu',
    items: [
      it('tsuki', 'Koken uchi (J/G/C), Mae hiji ate (J/C), Haishu uchi (J/C)'),
      it('uke', 'Koken uke (J/C/G)'),
      it('keri', 'Kake geri (J/C/G)'),
      it('ido', 'Ura ido'),
      it('kata', 'Pinan sono go · Taikyoku sono ichi ura, sono ni ura, sono san ura'),
      it('renraku', 'Mae geri, yoko geri, ushiro geri, chudan gyaku tsuki'),
      stamina(50, 70, 50, 'Tobi geri + 20 cm'),
      kumite(6),
    ],
  },
  {
    key: 'kyu3', nl: 'Groene band met streep', en: 'Green belt with stripe', color: GREEN, stripe: true, grade: '3e kyu',
    items: [
      it('tsuki', 'Hira ken tsuki (J/C), Hira ken oroshi uchi, Hira ken mawashi uchi'),
      it('uke', 'Gedan shuto morote uke, Gedan shotei morote uke'),
      it('keri', 'Mae kakato geri (J/C/G), Age kakato ushiro geri'),
      it('kata', 'Tsuki no kata'),
      stamina(55, 75, 55, 'Tobi geri + 20 cm'),
      kumite(10),
    ],
  },
  {
    key: 'kyu2', nl: 'Bruine band', en: 'Brown belt', color: BROWN, stripe: false, grade: '2e kyu',
    items: [
      it('tsuki', 'Ryuto ken tsuki (J/C), Nakayubi ippon ken (J/C), Oyayubi ippon ken (J/C), Hitosashi yubi ippon ken (J/C), Yama tsuki'),
      it('uke', 'Kake uke (J/C), Morote kake uke'),
      it('keri', 'Tobi mae geri, Tobi nidan geri'),
      it('ido', 'Kumite no kamae: okuri ashi, fumi ashi, kosa ashi, oi ashi (mae, sagari), in verschillende hoeken', 'Kumite no kamae: okuri ashi, fumi ashi, kosa ashi, oi ashi (mae, sagari), various angles'),
      it('kata', 'Gekisai dai, Tensho'),
      it('renraku', 'Achteruit in gedan barai, vooruit met ago uchi en gyaku tsuki, één stap mae geri (oi ashi), mawashi geri, ushiro geri, gedan barai, gyaku tsuki', 'Back in gedan barai, forward with ago uchi and gyaku tsuki, one step mae geri (oi ashi), mawashi geri, ushiro geri, gedan barai, gyaku tsuki'),
      stamina(60, 80, 60, 'Tobi geri + 30 cm'),
      kumite(12),
    ],
  },
  {
    key: 'kyu1', nl: 'Bruine band met streep', en: 'Brown belt with stripe', color: BROWN, stripe: true, grade: '1e kyu',
    items: [
      it('tsuki', 'Keiki uchi, Haito uchi (J/C/G), Morote haito uchi (J/C)'),
      it('uke', 'Chudan haito uchi uke, Osae uke'),
      it('keri', 'Yoko tobi geri, Mawashi tobi geri, Ushiro tobi geri, Ushiro mawashi tobi geri'),
      it('kata', 'Gekisai sho, Yantsu'),
      it('renraku', 'A: oi tsuki, gyaku tsuki, oi tsuki, shita tsuki · B: mawashi geri met het voorste been, oi tsuki, gyaku tsuki, mawashi geri met het achterste been', 'A: oi tsuki, gyaku tsuki, oi tsuki, shita tsuki · B: mawashi geri with the front leg, oi tsuki, gyaku tsuki, mawashi geri with the back leg'),
      stamina(65, 100, 65, 'Tobi geri + 30 cm'),
      kumite(15),
    ],
  },
  {
    key: 'dan1', nl: 'Zwarte band', en: 'Black belt', color: '#1d1f1e', stripe: false, grade: 'shodan · senpai',
    items: [
      it('other', 'Minstens 1 jaar 1e kyu, en minstens 16 jaar', 'At least 1 year as 1st kyu, and at least 16 years of age'),
      it('other', 'Deelname aan een KWF-zomerkamp in het jaar voor het examen', 'Took part in a KWF summer camp the year before grading'),
      it('other', 'Kennis van alle technieken uit de syllabus van alle kyu-graden, en van zelfverdediging', 'Knowledge of all syllabus techniques of every kyu, and of self-defence'),
      it('tsuki', 'Toho uchi, Age jodan tsuki'),
      it('uke', 'Morote haito uchi uke'),
      it('kata', 'Saifa · Pinan sono ichi tot en met go in ura', 'Saifa · Pinan sono ichi to go in ura'),
      it('renraku', 'Mawashi geri, ushiro mawashi geri, jodan mae geri, mawashi geri, ushiro mawashi geri'),
      stamina(75, 150, 75, 'Tobi geri + 30 cm'),
      kumite(20),
      it('other', 'Bijdragen aan je nationale federatie', 'Contribute to your national federation'),
    ],
  },
];

/** The dojo kun, the oath of the Kyokushin dojo. */
export const DOJO_KUN: { nl: string; en: string }[] = [
  { nl: 'Wij zullen ons hart en lichaam trainen voor een vaste, onwankelbare geest.', en: 'We will train our hearts and bodies, for a firm unshaken spirit.' },
  { nl: 'Wij zullen de ware betekenis van de krijgsweg nastreven, zodat onze zintuigen mettertijd alert zijn.', en: 'We will pursue the true meaning of the Martial Way, so that in time our senses may be alert.' },
  { nl: 'Met ware kracht zullen wij een geest van zelfverloochening ontwikkelen.', en: 'With true vigor, we will seek to cultivate a spirit of self-denial.' },
  { nl: 'Wij zullen de regels van hoffelijkheid in acht nemen, onze meerderen respecteren en afzien van geweld.', en: 'We will observe the rules of courtesy, respect our superiors, and refrain from violence.' },
  { nl: 'Wij zullen onze religieuze principes volgen en nooit de ware deugd van nederigheid vergeten.', en: 'We will follow our religious principles, and never forget the true virtue of humility.' },
  { nl: 'Wij zullen opzien naar wijsheid en kracht, en geen andere verlangens zoeken.', en: 'We will look upwards to wisdom and strength, not seeking other desires.' },
  { nl: 'Ons hele leven zullen wij, door de discipline van karate, de ware betekenis van de Kyokushin-weg proberen te vervullen.', en: 'All our lives, through the discipline of Karate, we will seek to fulfill the true meaning of the Kyokushin Way.' },
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
