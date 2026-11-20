import type { CreatureKind, LootKey } from './adventure';

/**
 * The story of the village: "The Chronicle of the Silent Spring", in chapters of quests. One quest is
 * open at a time; each asks for something the game already has (talk to someone, go somewhere, beat
 * creatures, gather loot, do the real exercises, grow) and gives adventure XP and coins when done.
 * The real exercises are part of the story: they are what makes the Spring flow again.
 */
export type StoryGoal =
  | { type: 'talk'; who: string }
  | { type: 'visit'; place: 'well' | 'cave' }
  | { type: 'win'; kind: CreatureKind; n: number }
  | { type: 'loot'; item: LootKey; n: number }
  | { type: 'workout'; n: number }
  | { type: 'level'; n: number }
  | { type: 'weapon' }
  | { type: 'armour' };

type Text = { title: string; text: string; done: string };
export type StoryQuest = { key: string; nl: Text; en: Text; goal: StoryGoal };
export type StoryChapter = { key: string; nl: { title: string; intro: string; outro: string }; en: { title: string; intro: string; outro: string }; quests: StoryQuest[] };

export const STORY_TITLE = { nl: 'De Kroniek van de Stille Bron', en: 'The Chronicle of the Silent Spring' };

export const STORY: StoryChapter[] = [
  {
    key: 'spring',
    nl: {
      title: 'Hoofdstuk 1 · De Stille Bron',
      intro: 'Lang geleden stroomde de Bron op het dorpsplein vol leven. Wie ervan dronk, voelde zijn spieren soepel en zijn hart sterk. Maar sinds kort kruipt er een grijze Stilte uit de Schaduwvallei. Gewrichten worden stijf, mensen blijven op de bank hangen, en de fontein spuit steeds zachter. Het dorp heeft een held nodig. Die held ben jij.',
      outro: 'De eerste schaduw is verdreven en de fontein klatert weer een beetje. Maar de Gildemeester kijkt bezorgd naar het westen: dit was pas het begin.',
    },
    en: {
      title: 'Chapter 1 · The Silent Spring',
      intro: 'Long ago the Spring on the village square flowed full of life. Whoever drank from it felt their muscles supple and their heart strong. But lately a grey Stillness creeps out of the Shadow valley. Joints grow stiff, people stay on the couch, and the fountain sprays ever softer. The village needs a hero. That hero is you.',
      outro: 'The first shadow is chased away and the fountain splashes a little again. But the Guild master looks worried towards the west: this was only the beginning.',
    },
    quests: [
      { key: 'call', goal: { type: 'talk', who: 'guild' },
        nl: { title: 'Het gilde roept', text: 'Ga naar de Gildehal. De Gildemeester wil je spreken.', done: 'De Gildemeester kijkt je ernstig aan. “De Stilte is wakker. Begin klein, held: wie zichzelf sterk maakt, maakt het hele dorp sterk.”' },
        en: { title: 'The guild calls', text: 'Go to the Guild hall. The Guild master wants to speak with you.', done: 'The Guild master looks at you gravely. “The Stillness is awake. Start small, hero: whoever makes themselves strong makes the whole village strong.”' } },
      { key: 'water', goal: { type: 'visit', place: 'well' },
        nl: { title: 'Water uit de oude put', text: 'Drink bij de oude waterput aan de markt. Het water geeft kracht voor de reis.', done: 'Koel en helder. Je voelt je wakker worden, alsof de reis nu echt begint.' },
        en: { title: 'Water from the old well', text: 'Drink at the old well by the market. Its water gives strength for the journey.', done: 'Cool and clear. You feel yourself waking up, as if the journey truly begins now.' } },
      { key: 'slimes', goal: { type: 'win', kind: 'slime', n: 3 },
        nl: { title: 'Slijm bij de vijver', text: 'Bij de vijver in het park kruipen Stijfheidsslijmen, de eerste dienaren van de Stilte. Versla er drie.', done: 'De slijmen lossen op in het gras. Waar ze lagen, groeit het groen meteen weer.' },
        en: { title: 'Slime by the pond', text: 'Stiffness slimes, the first servants of the Stillness, creep by the pond in the park. Beat three of them.', done: 'The slimes melt into the grass. Where they lay, the green grows back at once.' } },
      { key: 'train', goal: { type: 'workout', n: 1 },
        nl: { title: 'De kracht van de Bron', text: 'Echte kracht komt van binnen. Doe je oefeningen bij de tv in de oefenzaal van je praktijk.', done: 'Terwijl je traint, spuit de fontein op het plein een stukje hoger. Het dorp merkt het: de Bron luistert naar jou.' },
        en: { title: 'The strength of the Spring', text: 'Real strength comes from within. Do your exercises at the TV in your practice’s exercise room.', done: 'While you train, the fountain on the square sprays a little higher. The village notices: the Spring listens to you.' } },
    ],
  },
  {
    key: 'sword',
    nl: {
      title: 'Hoofdstuk 2 · Het Zwaard van Ochtendlicht',
      intro: 'De Wapensmid heeft een oud verhaal gehoord: in de tijd van de eerste helden smeedde zijn overgrootvader wapens die gloeiden als de ochtendzon. Wie zo’n wapen draagt, schrikt de Stilte af. Maar het vuur van de smederij is bijna uit.',
      outro: 'De smederij gloeit weer en jij draagt je eerste wapen. In de verte, voorbij de muur, hoor je iets huilen.',
    },
    en: {
      title: 'Chapter 2 · The Sword of Morning Light',
      intro: 'The Weaponsmith has heard an old tale: in the days of the first heroes his great-grandfather forged weapons that glowed like the morning sun. Whoever carries such a weapon frightens the Stillness. But the smithy’s fire has nearly gone out.',
      outro: 'The smithy glows again and you carry your first weapon. Far off, beyond the wall, something howls.',
    },
    quests: [
      { key: 'smith', goal: { type: 'talk', who: 'smithy' },
        nl: { title: 'De smid zoekt hulp', text: 'Loop naar de Smederij op het plein en praat met de Wapensmid.', done: '“Hout voor het vuur en steen voor de oven,” bromt de smid. “Dan smeed ik weer zoals vroeger.”' },
        en: { title: 'The smith needs help', text: 'Walk to the Smithy on the square and talk to the Weaponsmith.', done: '“Wood for the fire and stone for the oven,” the smith grumbles. “Then I forge like in the old days again.”' } },
      { key: 'wood', goal: { type: 'loot', item: 'wood', n: 5 },
        nl: { title: 'Hout uit het woud', text: 'Hak hout in het westelijke woud of raap takken. De smid heeft 5 hout nodig.', done: 'Een flinke stapel hout. Het vuur in de smederij laait op.' },
        en: { title: 'Wood from the forest', text: 'Chop wood in the western forest or pick up twigs. The smith needs 5 wood.', done: 'A fine pile of wood. The fire in the smithy blazes up.' } },
      { key: 'stone', goal: { type: 'loot', item: 'stone', n: 3 },
        nl: { title: 'Steen voor de oven', text: 'Breek rotsen of raap steentjes op. De oven van de smid heeft 3 steen nodig.', done: 'De oven is weer heel. Hij gloeit oranje, net als in de verhalen.' },
        en: { title: 'Stone for the oven', text: 'Break rocks or pick up pebbles. The smith’s oven needs 3 stone.', done: 'The oven is whole again. It glows orange, just like in the stories.' } },
      { key: 'arm', goal: { type: 'weapon' },
        nl: { title: 'Een wapen in de hand', text: 'Koop of maak je eerste wapen: een staf, een boog of een toverstokje.', done: '“Een held zonder wapen is als een fysio zonder handen,” lacht de smid. “Ga nu. De weide wacht.”' },
        en: { title: 'A weapon in hand', text: 'Buy or make your first weapon: a staff, a bow or a wand.', done: '“A hero without a weapon is like a physio without hands,” the smith laughs. “Go now. The meadow is waiting.”' } },
    ],
  },
  {
    key: 'meadow',
    nl: {
      title: 'Hoofdstuk 3 · Het Lied van de Weide',
      intro: 'In de weide bij de stallen zingen de boeren niet meer. De kippen zijn wild geworden en de koeien zijn onrustig: de Stilte heeft ook hen bereikt. Syabend, de fysiotherapeut in de oefenzaal, weet hoe je sterker wordt zonder je te bezeren.',
      outro: 'In de weide klinkt weer gezang. Je harnas kraakt nieuw en stevig. Op het prikbord hangt een nieuw bericht…',
    },
    en: {
      title: 'Chapter 3 · The Song of the Meadow',
      intro: 'In the meadow by the stables the farmers sing no more. The chickens have gone wild and the cows are restless: the Stillness has reached them too. Syabend, the physiotherapist in the exercise room, knows how to grow stronger without getting hurt.',
      outro: 'Singing sounds in the meadow again. Your armour creaks new and sturdy. On the notice board hangs a new message…',
    },
    quests: [
      { key: 'advice', goal: { type: 'talk', who: 'practice' },
        nl: { title: 'Raad van de fysio', text: 'Praat met Syabend in de oefenzaal van je praktijk.', done: '“Rustig opbouwen,” zegt Syabend. “Elke dag een beetje, dan word je onverslaanbaar. En vergeet je harnas niet.”' },
        en: { title: 'The physio’s advice', text: 'Talk to Syabend in your practice’s exercise room.', done: '“Build up calmly,” says Syabend. “A little every day, and you become unbeatable. And don’t forget your armour.”' } },
      { key: 'chickens', goal: { type: 'win', kind: 'chicken', n: 3 },
        nl: { title: 'Wilde kippen', text: 'Vang de drie wildste kippen in de weide bij de stallen.', done: 'De kippen kakelen weer vrolijk. Een boer geeft je een knipoog.' },
        en: { title: 'Wild chickens', text: 'Catch the three wildest chickens in the meadow by the stables.', done: 'The chickens cluck happily again. A farmer gives you a wink.' } },
      { key: 'leather', goal: { type: 'armour' },
        nl: { title: 'Een harnas van huid', text: 'Laat bij de Pantsermaker een harnas maken. Koeienhuiden haal je in de weide (of betaal met bessen).', done: 'Het leren harnas zit als gegoten. De klappen van de Stilte doen nu minder pijn.' },
        en: { title: 'Armour of hide', text: 'Have the Armourer make you armour. Cowhides come from the meadow (or pay with berries).', done: 'The leather armour fits like a glove. The Stillness’s blows hurt less now.' } },
      { key: 'grow', goal: { type: 'level', n: 4 },
        nl: { title: 'Groeien als avonturier', text: 'Word avonturier 4. Versla wezens, hak hout en train in de boksschool.', done: 'Je voelt het: je bent geen beginner meer. De wolven aan de poort zullen het merken.' },
        en: { title: 'Growing as an adventurer', text: 'Reach adventurer 4. Beat creatures, chop wood and train in the boxing school.', done: 'You feel it: you are no beginner anymore. The wolves at the gate will notice.' } },
    ],
  },
  {
    key: 'wolves',
    nl: {
      title: 'Hoofdstuk 4 · Wolven aan de Poort',
      intro: '’s Nachts hoort het dorp gehuil bij de zuidpoort. De wolven uit het Wolvenwoud zijn brutaal geworden; de Stilte maakt ze hongerig. De bode heeft een noodkreet op het prikbord gehangen.',
      outro: 'De roedel trekt zich terug in het woud. Maar in hun ogen zag je iets dat niet van henzelf was: een grijze gloed uit de Schaduwvallei.',
    },
    en: {
      title: 'Chapter 4 · Wolves at the Gate',
      intro: 'At night the village hears howling at the south gate. The wolves of the Wolf wood have grown bold; the Stillness makes them hungry. The messenger has pinned a cry for help on the notice board.',
      outro: 'The pack retreats into the forest. But in their eyes you saw something that was not their own: a grey glow from the Shadow valley.',
    },
    quests: [
      { key: 'notice', goal: { type: 'talk', who: 'board' },
        nl: { title: 'Bericht op het prikbord', text: 'Praat met de bode bij het prikbord op het plein.', done: '“De wolven komen elke nacht dichterbij,” fluistert de bode. “Word sterker, en ga dan door de zuidpoort.”' },
        en: { title: 'A message on the board', text: 'Talk to the messenger at the notice board on the square.', done: '“The wolves come closer every night,” the messenger whispers. “Grow stronger, then go through the south gate.”' } },
      { key: 'ready', goal: { type: 'level', n: 6 },
        nl: { title: 'Klaar voor de jacht', text: 'Word avonturier 6: dan laten de wolven zich zien.', done: 'Je bent klaar. Achter de zuidpoort ruik je dennen, en wolf.' },
        en: { title: 'Ready for the hunt', text: 'Reach adventurer 6: then the wolves show themselves.', done: 'You are ready. Beyond the south gate you smell pine, and wolf.' } },
      { key: 'pack', goal: { type: 'win', kind: 'wolf', n: 3 },
        nl: { title: 'De roedel', text: 'Versla drie wolven in het Wolvenwoud ten zuiden van de poort.', done: 'De laatste wolf druipt af. Het huilen houdt op.' },
        en: { title: 'The pack', text: 'Beat three wolves in the Wolf wood south of the gate.', done: 'The last wolf slinks away. The howling stops.' } },
      { key: 'stronger', goal: { type: 'workout', n: 3 },
        nl: { title: 'Sterker dan de roedel', text: 'Train drie keer met je echte oefeningen. Een sterke held is een sterk dorp.', done: 'Je benen zijn sterker, je adem rustiger. De fontein spuit nu tot boven de bankjes.' },
        en: { title: 'Stronger than the pack', text: 'Train three times with your real exercises. A strong hero is a strong village.', done: 'Your legs are stronger, your breath calmer. The fountain now sprays above the benches.' } },
    ],
  },
  {
    key: 'shadow',
    nl: {
      title: 'Hoofdstuk 5 · De Schaduwvallei',
      intro: 'Ten zuidwesten van het dorp ligt de Schaduwvallei, waar de Stilte vandaan komt. Daar leven geen dieren, maar zware gevoelens die vorm hebben gekregen: trots, woede, angst. De Sensei in de dojo weet hoe je ze verslaat.',
      outro: 'Je staat bij de grotmond. Uit de diepte stijgt een koude adem op. Daar beneden, in de onderwereld, woont degene die de Stilte zond.',
    },
    en: {
      title: 'Chapter 5 · The Shadow Valley',
      intro: 'South-west of the village lies the Shadow valley, where the Stillness comes from. No animals live there, only heavy feelings that have taken shape: pride, anger, fear. The Sensei in the dojo knows how to beat them.',
      outro: 'You stand at the cave mouth. A cold breath rises from the depth. Down there, in the underworld, lives the one who sent the Stillness.',
    },
    quests: [
      { key: 'sensei', goal: { type: 'talk', who: 'dojo' },
        nl: { title: 'De les van de Sensei', text: 'Ga naar de dojo en praat met de Sensei.', done: '“Osu. Een gevoel versla je niet door het weg te duwen,” zegt de Sensei. “Je kijkt het aan, ademt, en doet wat goed voor je is.”' },
        en: { title: 'The Sensei’s lesson', text: 'Go to the dojo and talk to the Sensei.', done: '“Osu. You do not beat a feeling by pushing it away,” says the Sensei. “You look at it, breathe, and do what is good for you.”' } },
      { key: 'pride', goal: { type: 'win', kind: 'pride', n: 2 },
        nl: { title: 'De Pronkpauw', text: 'Versla twee Pronkpauwen in de Schaduwvallei (vanaf avonturier 4).', done: 'De pauwen laten hun veren hangen. Trots maakt plaats voor iets beters: echte trots op wat je doet.' },
        en: { title: 'The Peacock of pride', text: 'Beat two Peacocks of pride in the Shadow valley (from adventurer 4).', done: 'The peacocks drop their feathers. Pride makes room for something better: real pride in what you do.' } },
      { key: 'rage', goal: { type: 'win', kind: 'rage', n: 2 },
        nl: { title: 'De Vuurkoppen', text: 'Versla twee Vuurkoppen (vanaf avonturier 6). Water helpt: drink genoeg vandaag.', done: 'De vlammen doven. Wat overblijft is warmte, geen woede.' },
        en: { title: 'The Hotheads', text: 'Beat two Hotheads (from adventurer 6). Water helps: drink enough today.', done: 'The flames die down. What remains is warmth, not anger.' } },
      { key: 'cave', goal: { type: 'visit', place: 'cave' },
        nl: { title: 'De grot onder de vallei', text: 'Zoek de grotmond in de Schaduwvallei en daal af in de onderwereld.', done: 'Fakkels flakkeren langs de wanden. Je bent niet bang. Nou ja, een beetje. Maar je gaat toch.' },
        en: { title: 'The cave under the valley', text: 'Find the cave mouth in the Shadow valley and go down into the underworld.', done: 'Torches flicker along the walls. You are not afraid. Well, a little. But you go anyway.' } },
    ],
  },
  {
    key: 'lord',
    nl: {
      title: 'Hoofdstuk 6 · De Schaamtevorst',
      intro: 'Diep in de onderwereld zit de Schaamtevorst op zijn troon van gebroken kettingen. Hij is het die de Stilte zond: wie zich schaamt, beweegt niet meer, en wie niet beweegt, wordt stil. Dinish, de fysiotherapeut boven in de praktijk, heeft je iets belangrijks te vertellen.',
      outro: 'De Schaamtevorst valt en de kettingen breken. Boven, op het plein, schiet de fontein hoger dan ooit en het hele dorp juicht. De Stilte is verslagen. Maar een held weet: de Bron blijft alleen stromen zolang jij blijft bewegen.',
    },
    en: {
      title: 'Chapter 6 · The Shame Lord',
      intro: 'Deep in the underworld the Shame lord sits on his throne of broken chains. He sent the Stillness: whoever is ashamed stops moving, and whoever stops moving grows still. Dinish, the physiotherapist upstairs in the practice, has something important to tell you.',
      outro: 'The Shame lord falls and the chains break. Up on the square the fountain shoots higher than ever and the whole village cheers. The Stillness is beaten. But a hero knows: the Spring keeps flowing only as long as you keep moving.',
    },
    quests: [
      { key: 'dinish', goal: { type: 'talk', who: 'treatment' },
        nl: { title: 'Wat Dinish weet', text: 'Ga naar boven in de praktijk en praat met Dinish in behandelkamer 2.', done: '“Schaamte maakt je klein,” zegt Dinish. “Maar elke stap die je zet, telt. Ook de kleine. Daar kan geen vorst tegenop.”' },
        en: { title: 'What Dinish knows', text: 'Go upstairs in the practice and talk to Dinish in treatment room 2.', done: '“Shame makes you small,” says Dinish. “But every step you take counts. The small ones too. No lord can stand against that.”' } },
      { key: 'mighty', goal: { type: 'level', n: 16 },
        nl: { title: 'Een held van formaat', text: 'Word avonturier 16. De Schaamtevorst is de sterkste van allemaal.', done: 'Je bent sterker dan je ooit dacht. Tijd om af te dalen.' },
        en: { title: 'A hero of stature', text: 'Reach adventurer 16. The Shame lord is the strongest of all.', done: 'You are stronger than you ever thought. Time to go down.' } },
      { key: 'throne', goal: { type: 'win', kind: 'shame_lord', n: 1 },
        nl: { title: 'De troon van kettingen', text: 'Versla de Schaamtevorst achterin de onderwereld.', done: 'Met een laatste klap breken de kettingen. De Schaamtevorst verdwijnt als mist in de zon.' },
        en: { title: 'The throne of chains', text: 'Beat the Shame lord at the far end of the underworld.', done: 'With one last blow the chains break. The Shame lord vanishes like mist in the sun.' } },
      { key: 'flow', goal: { type: 'workout', n: 1 },
        nl: { title: 'De Bron stroomt weer', text: 'Train nog één keer, als held van het dorp. Voor de Bron, en voor jezelf.', done: 'De fontein klatert, de vogels zingen, de honden rennen over het plein. Dit is jouw dorp, en jij hebt het gered.' },
        en: { title: 'The Spring flows again', text: 'Train once more, as the hero of the village. For the Spring, and for yourself.', done: 'The fountain splashes, the birds sing, the dogs run across the square. This is your village, and you saved it.' } },
    ],
  },
];

/** All quests in order, with their chapter. */
export const STORY_STEPS = STORY.flatMap((c, ci) => c.quests.map((q, qi) => ({ chapter: ci, index: qi, quest: q })));
/** What finishing a quest gives: more in later chapters. */
export const storyReward = (chapter: number) => ({ xp: 30 + chapter * 25, coins: 10 + chapter * 8 });
