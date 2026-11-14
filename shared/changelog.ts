/**
 * Version history of FP Flow in plain words, newest first, from the first version on 22 October 2026.
 * One entry per release day. `for` says who notices it: patients, staff (therapists/owners) or both.
 * Shown in the app under "Wat is er nieuw?" → "Alle versies".
 */
export type ChangeFor = 'patient' | 'staff' | 'all';
export type ChangeItem = { nl: string; en: string; for: ChangeFor; clinical?: true };
export type Release = { date: string; titleNl: string; titleEn: string; items: ChangeItem[] };

export const RELEASES: Release[] = [
  {
    date: '2026-11-13',
    titleNl: 'Een dorp voor de praktijk',
    titleEn: 'A village for the practice',
    items: [
      { for: 'patient', nl: 'De gebouwen rond het plein hebben een binnenkant: je held loopt naar binnen tot aan de toonbank, waar de wapensmid, bibliothecaris, hofmeester, bode of gildemeester je te woord staat en je cijfers laat zien.', en: 'The buildings round the square have an inside: your hero walks in up to the counter, where the armourer, librarian, steward, messenger or guild master talks to you and shows your figures.' },
      { for: 'patient', nl: 'De dojo is nu een echt Japans gebouw met pannendak en schuifdeuren, en de acht wapens van de Avontuur-skill hebben een nieuw, gedetailleerd uiterlijk.', en: 'The dojo is now a real Japanese building with a tiled roof and sliding doors, and the eight weapons of the Adventure skill have a new, detailed look.' },
      { for: 'patient', nl: 'De kwaaltjes in het dorp hebben een nieuw uiterlijk met echte gezichten: het Stijfheidsslijm, het Dorstduiveltje, de Bankhanger en de Bankkoning met kroon.', en: 'The ailments in the village have a new look with real faces: the Stiffness slime, the Thirst imp, the Couch lurker and the crowned Couch king.' },
      { for: 'patient', nl: 'Het dorp is rustiger in beeld: de meters en de takenlijst klap je open met een tik, en “dorst” en “stijf” zijn korte labels. De bomen zijn voller.', en: 'The village is calmer on screen: the meters and the task list fold open with a tap, and “thirsty” and “stiff” are short labels. The trees are fuller.' },
      { for: 'patient', nl: 'Nieuw in het dorp: de Kyokushin-dojo. Karate is een eigen skill met banden van wit tot zwart. Per band vink je een lijst met eisen af en doe je examen; je held draagt de band in het dorp. Het is een oefenlijst in het spel: je sensei bepaalt je echte band.', en: 'New in the village: the Kyokushin dojo. Karate is a skill of its own with belts from white to black. For each belt you tick a list of requirements and take the exam; your hero wears the belt in the village. It is a practice list in the game: your sensei decides your real belt.' },
      { for: 'patient', nl: 'Je stappen van vandaag maken je held minder stijf: bij je stappendoel is het grootste deel van de stijfheid weg. In het dorp zie je hoeveel stappen je vandaag hebt.', en: 'Today’s steps make your hero less stiff: at your step goal most of the stiffness is gone. In the village you see how many steps you have today.' },
      { for: 'patient', nl: 'Avontuur is een eigen skill bij je held. Elk paar niveaus speel je een wapen vrij dat je held in de hand draagt: wandelstaf, bokshandschoenen, knots, smidshamer, zwaard, strijdbijl, speer en op level 16 het Heldenzwaard. Je held slaat nu echt, en grotere kwaaltjes duiken op vanaf level 3 en 5.', en: 'Adventure is a skill of its own on your hero. Every few levels bring a weapon your hero carries: walking staff, boxing gloves, club, smith’s hammer, sword, battle axe, spear and at level 16 the Hero’s sword. Your hero really swings now, and bigger ailments appear from level 3 and 5.' },
      { for: 'patient', nl: 'Nieuw in het dorp: de boksschool. Tik op het vlak dat oplicht voor een ronde op de bokszak; rake klappen geven avonturen-XP. En bij de waterput vul je een fles met twee glazen voor onderweg.', en: 'New in the village: the boxing school. Tap the pad that lights up for a round on the bag; hits give adventure XP. And at the well you fill a flask with two glasses for on the way.' },
      { for: 'patient', nl: 'Rond het dorp zitten kwaaltjes als wezentjes: het Stijfheidsslijm, het Dorstduiveltje en de Bankhanger. Versla ze voor avonturen-XP, een eigen niveau los van je echte level. Wat je vandaag echt goed deed, slaat dubbel zo hard.', en: 'Round the village sit little ailments as creatures: the Stiffness slime, the Thirst imp and the Couch lurker. Beat them for adventure XP, a level of its own apart from your real one. What you really did well today hits twice as hard.' },
      { for: 'patient', nl: 'De waterput op het plein werkt: loop erheen en log een glas water. Heeft je held dorst of is hij stijf, dan loopt hij trager tot je drinkt of even beweegt.', en: 'The well on the square works: walk there and log a glass of water. When your hero is thirsty or stiff it walks slower until you drink or move a little.' },
      { for: 'staff', nl: 'Dorp → “Mijn poppetje”: stel je eigen figuur samen. Zo loop je door het dorp, en zo sta je in de praktijk bij je eigen patiënten.', en: 'Village → “My figure”: put your own figure together. This is how you walk through the village, and how you stand in the practice for your own patients.' },
      { for: 'patient', nl: 'In het dorp zie je je eiwit, beweging en water van vandaag als meters. Tik erop om te loggen. In de praktijk staat je eigen fysiotherapeut, als die een poppetje heeft gemaakt.', en: 'In the village you see today’s protein, movement and water as meters. Tap one to log. In the practice stands your own physiotherapist, once they have made a figure.' },
      { for: 'patient', nl: 'Het Krachthonk is van binnen een echte sportschool: bakstenen muur, rubbervloer, een groene sprintbaan, een rek met klimtouw, springboxen en een leren bank.', en: 'Inside, the gym is a real gym now: a brick wall, a rubber floor, a green sprint lane, a rig with a climbing rope, jump boxes and a leather sofa.' },
      { for: 'staff', nl: 'Dorp: kies “Loop door het dorp”. Je start in de praktijk en loopt langs de huisjes van je patiënten. Bij een deur open je het dossier of kijk je binnen hoe het huis is ingericht.', en: 'Village: choose “Walk through the village”. You start in the practice and walk along your patients’ homes. At a door you open the record or look inside at how the home is furnished.' },
      { for: 'patient', nl: 'Je fysiotherapeut kan in het dorp van de praktijk bij je binnen kijken en ziet dan je meubels, niet je muntjes.', en: 'Your physiotherapist can look into your home in the practice village and sees your furniture, not your coins.' },
      { for: 'patient', nl: 'Nieuwe kleding voor je held: kies onder Uiterlijk een stof met patroon, zoals Ridder, Tovenaar, Flits of Maliën.', en: 'New clothing for your hero: under Look, pick a patterned cloth such as Knight, Wizard, Flash or Chain mail.' },
      { for: 'patient', nl: 'In de praktijk staat nu de fysiotherapeut, in het Krachthonk een coach en in de Mobiliteitsstudio de flowmeester.', en: 'The practice now has the physiotherapist, the gym a coach and the mobility studio the flow master.' },
      { for: 'patient', nl: 'Het dorp heeft een geschilderde bodem: gras, klaver, zandpaden en een kiezelplein, en geschilderde daken, muren en bomen.', en: 'The village has painted ground: grass, clover, sand paths and a pebbled square, and painted roofs, walls and trees.' },
      { for: 'patient', nl: 'Je hebt een eigen huis in het dorp. Het groeit met je level, van een kamp tot een villa, en je richt het in met meubels die je met muntjes koopt.', en: 'You have a home of your own in the village. It grows with your level, from a camp to a villa, and you furnish it with pieces bought with coins.' },
      { for: 'patient', nl: 'Het dorp kan op volledig scherm.', en: 'The village can go full screen.' },
      { for: 'patient', nl: 'Het dorp heeft een minikaart die met je meedraait, met een eigen teken per gebouw. Tik erop om ergens heen te lopen, of open de wereldkaart.', en: 'The village has a minimap that turns with you, with a sign of its own for every building. Tap it to walk somewhere, or open the world map.' },
      { for: 'patient', nl: 'In het dorp lopen een smid, een bode en een bibliothecaris rond, en het gras, de struiken en de bomen zijn voller.', en: 'A smith, a messenger and a librarian walk around the village, and the grass, bushes and trees are fuller.' },
      { for: 'patient', nl: 'In je dorp: tik op een taak en je held loopt er vanzelf heen, met de route op de grond. Tik op de kaart voor “Waar wil je heen?”.', en: 'In your village: tap a task and your hero walks there by itself, with the route on the ground. Tap the map for “Where do you want to go?”.' },
      { for: 'patient', nl: '“Bekijken” bij een bericht over een programma opent nu dat programma.', en: '“View” on a message about a programme now opens that programme.' },
      { for: 'staff', nl: 'Nieuw in het menu: Dorp. Elke patiënt heeft er een huisje met een nummer; namen zet je zelf aan. Het groeit met het level van de held: kamp, hut, huisje, woonhuis, landhuis, villa.', en: 'New in the menu: Village. Every patient has a numbered home there; you switch names on yourself. It grows with the hero’s level: camp, hut, cottage, house, manor, villa.' },
      { for: 'staff', nl: 'Een groene vlag bij een huisje betekent: deze week getraind. Kies een huisje voor het level en open van daaruit het dossier.', en: 'A green flag at a home means: trained this week. Pick a home for its level and open the record from there.' },
      { for: 'staff', nl: 'Op het dashboard staat de werklijst “Vraagt aandacht” nu direct onder de cijfers.', en: 'On the dashboard the work list “Needs attention” now comes straight under the figures.' },
      { for: 'patient', nl: 'Vandaag opent altijd op je training, ook als je nog geen held hebt gemaakt.', en: 'Today always opens on your workout, also when you have not made a hero yet.' },
    ],
  },
  {
    date: '2026-11-12',
    titleNl: 'Loop door je dorp',
    titleEn: 'Walk through your village',
    items: [
      { for: 'patient', nl: 'Je dorp is een 3D-wereld waar je held zelf rondloopt: tik op de grond of op een gebouw.', en: 'Your village is a 3D world your hero walks around in: tap the ground or a building.' },
      { for: 'patient', nl: 'In de oefenzaal staat een tv met je oefeningen van vandaag. Tik op een oefening voor de video en start daar je training.', en: 'The gym has a TV with your exercises for today. Tap an exercise for the video and start your workout there.' },
      { for: 'patient', nl: 'Na een training die je bij de tv startte, sta je terug in je dorp en zie je de XP boven je held.', en: 'After a workout started at the TV you are back in your village and see the XP above your hero.' },
    ],
  },
  {
    date: '2026-11-11',
    titleNl: 'Het beginscherm wordt een dorp',
    titleEn: 'Home becomes a village',
    items: [
      { for: 'all', nl: 'Donkere modus: kies Licht, Donker of Automatisch bij Instellingen of Account.', en: 'Dark mode: pick Light, Dark or Automatic in Settings or Account.' },
      { for: 'all', nl: 'Na een update zie je één keer een melding met wat er nieuw is, en hier de hele versiegeschiedenis.', en: 'After an update you see a one-time notice with what is new, and here the full version history.' },
      { for: 'patient', nl: 'Vandaag is een lobby: je held voor je eigen dorp, met een lucht die meegaat met het tijdstip.', en: 'Today is a lobby: your hero in front of your own village, with a sky that follows the time of day.' },
      { for: 'patient', nl: 'Dorpstegels (Prikbord, Smederij, Arena, Bibliotheek, Gildehal, Wereldkaart) met een stip als er iets wacht.', en: 'Village tiles (Notice board, Smithy, Arena, Library, Guild hall, World map) with a dot when something waits.' },
      { for: 'patient', nl: 'Je dorp groeit mee met je trainingen: huisjes, bazenvlaggen, een molen, akkers, een standbeeld en een vuurtoren.', en: 'Your village grows with your workouts: cottages, boss pennants, a windmill, fields, a statue and a lighthouse.' },
      { for: 'patient', nl: 'De wereldkaart is een 3D-eiland met je dorp en je route.', en: 'The world map is a 3D island with your village and route.' },
      { for: 'patient', nl: 'Na een training: juichende held, tellende XP en muntjes, level-ups met een schild in de kleur van je rang.', en: 'After a workout: a cheering hero, XP and coins counting up, level-ups with a shield in your rank colour.' },
      { for: 'patient', nl: 'Rangen per level: Brons, Zilver, Goud, Smaragd, Diamant en Meester.', en: 'Ranks per level: Bronze, Silver, Gold, Emerald, Diamond and Master.' },
    ],
  },
  {
    date: '2026-11-10',
    titleNl: 'Overzicht van oefenvideo\'s',
    titleEn: 'Exercise video overview',
    items: [
      { for: 'staff', nl: 'Lijst van oefeningen zonder video, met prioriteiten (voor de praktijkeigenaar).', en: 'List of exercises without a video, with priorities (for the practice owner).' },
    ],
  },
  {
    date: '2026-11-08',
    titleNl: 'Wereldkaart, ACL-route en gilderaid',
    titleEn: 'World map, ACL route and guild raid',
    items: [
      { for: 'patient', nl: 'Wereldkaart met je revalidatieroute als zones; alleen je fysiotherapeut geeft de volgende zone vrij.', en: 'World map with your rehab route as zones; only your physiotherapist opens the next zone.', clinical: true },
      { for: 'all', nl: 'ACL-route met meetbazen: een hoofdstukbaas valt pas als je meetdoel gehaald is.', en: 'ACL route with measurement bosses: a chapter boss falls only when your measurement goal is met.', clinical: true },
      { for: 'all', nl: 'Gilderaid: de praktijk verslaat samen één raidbaas per week, zonder ranglijst.', en: 'Guild raid: the practice defeats one raid boss a week together, with no ranking.' },
      { for: 'patient', nl: 'Erfstukken en herinneringen voor wie een hoofdstuk afrondt.', en: 'Heirlooms and keepsakes for finishing a chapter.' },
    ],
  },
  {
    date: '2026-11-06',
    titleNl: 'Klachtuitleg, pijnsignalen en sneltoetsen',
    titleEn: 'Complaint explanations, pain signals and shortcuts',
    items: [
      { for: 'staff', nl: 'Uitleg over een klacht naar de patiënt sturen vanuit de klachtwijzer.', en: 'Send the explanation of a complaint to the patient from the complaint guide.', clinical: true },
      { for: 'staff', nl: 'Dashboard waarschuwt bij oplopende pijn, ook per plek op de pijnkaart.', en: 'The dashboard warns when pain rises, also per spot on the pain map.', clinical: true },
      { for: 'staff', nl: 'Snelfilters in de patiëntenlijst, sneltoetsen (druk ?) en "Aan de slag" voor nieuwe therapeuten.', en: 'Quick filters in the patient list, keyboard shortcuts (press ?) and "Get started" for new therapists.' },
      { for: 'staff', nl: 'Programma kopiëren naar een andere patiënt; korte boodschap meesturen bij een wijziging.', en: 'Copy a programme to another patient; add a short message to a change.' },
      { for: 'patient', nl: '"Dit doet pijn" tijdens een oefening: lichtere variant of overslaan met een pijnscore.', en: '"This hurts" during an exercise: a lighter variation or skip with a pain score.' },
      { for: 'patient', nl: 'Oefeningen laten voorlezen, "Klaar voor vandaag" en "Komende week" op Vandaag.', en: 'Have exercises read aloud, "Done for today" and "The coming week" on Today.' },
      { for: 'patient', nl: 'Vrienden aanmoedigen met een vaste tekst, één keer per dag.', en: 'Cheer on friends with a fixed text, once a day.' },
      { for: 'all', nl: 'Beveiligingsupdates en "Wat is er nieuw?" in de app.', en: 'Security updates and "What\'s new?" in the app.' },
    ],
  },
  {
    date: '2026-11-05',
    titleNl: 'Klachtwijzer',
    titleEn: 'Complaint guide',
    items: [
      { for: 'staff', nl: 'Klachtwijzer: regio, klacht, keten, compensaties en een voorstel dat je met één tik een programma maakt.', en: 'Complaint guide: region, complaint, chain, compensations and a proposal you turn into a programme in one tap.', clinical: true },
      { for: 'staff', nl: 'Controlepagina met alle klinische teksten op één printbare pagina.', en: 'Review page with all clinical texts on one printable page.', clinical: true },
      { for: 'staff', nl: 'Uitnodigingslink kopiëren, via WhatsApp delen of als QR-code tonen.', en: 'Copy an invite link, share it via WhatsApp or show it as a QR code.' },
      { for: 'patient', nl: 'Eerste stappen voor nieuwe mensen op Vandaag, met vinkjes.', en: 'First steps for new people on Today, with ticks.' },
    ],
  },
  {
    date: '2026-11-04',
    titleNl: 'Mobiliteit zelf meten',
    titleEn: 'Measure your own mobility',
    items: [
      { for: 'patient', nl: 'Mobiliteit zelf meten met een meetlint, met grafiek en herinnering om opnieuw te meten.', en: 'Measure your mobility with a tape measure, with a chart and a reminder to measure again.' },
      { for: 'staff', nl: 'Patiënt vragen om te meten; metingen in dossier en voortgangsrapport.', en: 'Ask a patient to measure; measurements in the record and progress report.' },
      { for: 'staff', nl: 'Dashboard toont wie drie weken niet traint.', en: 'The dashboard shows who has not trained for three weeks.' },
      { for: 'patient', nl: 'Welkomstrondleiding, dagcheck met een schaal van 0 tot 10, en de app opent ook zonder internet.', en: 'Welcome tour, daily check-in on a 0-10 scale, and the app opens without internet too.' },
      { for: 'patient', nl: 'Prijzenkast per vaardigheid en uitrusting die beter op je held past.', en: 'Trophy cabinet per skill and gear that fits your hero better.' },
    ],
  },
  {
    date: '2026-11-03',
    titleNl: 'Spierenatlas en seizoenen',
    titleEn: 'Muscle atlas and seasons',
    items: [
      { for: 'all', nl: 'Spierenatlas met spieren, zenuwen, gekoppelde oefeningen en een quiz met XP.', en: 'Muscle atlas with muscles, nerves, linked exercises and a quiz with XP.' },
      { for: 'staff', nl: 'Spierkaart naar een patiënt sturen; gaten in de bibliotheek zien.', en: 'Send a muscle card to a patient; see gaps in the library.' },
      { for: 'patient', nl: 'Vraag van de dag, maandseizoenen met een seizoensbaas en een teamquest met maatjes.', en: 'Question of the day, monthly seasons with a season boss and a team quest with companions.' },
      { for: 'patient', nl: 'Krachtlog: advies voor volgende keer op basis van RIR, met grafiek per oefening.', en: 'Strength log: advice for next time based on RIR, with a chart per exercise.' },
    ],
  },
  {
    date: '2026-11-02',
    titleNl: 'Dagmissie, weekbaas en dagkist',
    titleEn: 'Daily mission, weekly boss and day chest',
    items: [
      { for: 'patient', nl: 'Missie van de dag; veiligheid gaat altijd voor (een gepauzeerd programma start nooit).', en: 'Mission of the day; safety always comes first (a paused programme never starts).' },
      { for: 'patient', nl: 'Weekbaas die door je trainingen verslagen wordt, en een dagkist met muntjes.', en: 'A weekly boss that your workouts defeat, and a day chest with coins.' },
      { for: 'patient', nl: 'Eigen routines met RIR en twintig extra krachtoefeningen; vier krachtprogramma\'s om zelf te starten.', en: 'Own routines with RIR and twenty more strength exercises; four strength programmes to start yourself.' },
      { for: 'patient', nl: 'Revalidatiehoofdstukken; alleen je fysiotherapeut geeft het volgende hoofdstuk vrij.', en: 'Rehab chapters; only your physiotherapist opens the next chapter.', clinical: true },
    ],
  },
  {
    date: '2026-11-01',
    titleNl: 'Sporthelden met uitrusting en winkel',
    titleEn: 'Sports heroes with gear and a shop',
    items: [
      { for: 'patient', nl: 'Fotorealistische held met kapsels, huidtinten en lichaamsbouw.', en: 'Photorealistic hero with hairstyles, skin tones and body types.' },
      { for: 'patient', nl: 'Muntjes verdienen en uitrusting kopen per tier; karakterscherm met een vak per lichaamsdeel.', en: 'Earn coins and buy gear by tier; character screen with a slot per body part.' },
      { for: 'patient', nl: 'Nieuwe tabbladen (Vandaag, Revalidatie, Kracht, Mobiliteit, Held) en een plusknop om snel iets te loggen.', en: 'New tabs (Today, Rehab, Strength, Mobility, Hero) and a plus button to log something quickly.' },
      { for: 'patient', nl: 'Krachtlog met 1RM-meter; zeven extra mobiliteitsprogramma\'s.', en: 'Strength log with a 1RM meter; seven more mobility programmes.' },
    ],
  },
  {
    date: '2026-10-31',
    titleNl: 'De sportheld is geboren',
    titleEn: 'The sports hero is born',
    items: [
      { for: 'patient', nl: 'Sportheld: personage, pijnkaart, XP, levels en badges.', en: 'Sports hero: character, pain map, XP, levels and badges.' },
      { for: 'staff', nl: 'Automatisch uitloggen na 30 minuten niets doen; de FP-bibliotheek zelf toevoegen.', en: 'Automatic logout after 30 idle minutes; add the FP library yourself.' },
    ],
  },
  {
    date: '2026-10-25',
    titleNl: 'Afdrukken en tekstgrootte',
    titleEn: 'Printing and text size',
    items: [
      { for: 'staff', nl: 'Programma en voortgangsrapport afdrukken of als PDF.', en: 'Print a programme and progress report or save as PDF.' },
      { for: 'patient', nl: 'Tekstgrootte: Normaal, Groot of Extra groot.', en: 'Text size: Normal, Large or Extra large.' },
      { for: 'all', nl: 'Toegankelijkheid nagelopen op alle schermen; nieuwe app-iconen.', en: 'Accessibility checked on every screen; new app icons.' },
    ],
  },
  {
    date: '2026-10-23',
    titleNl: 'Nieuw ontwerp',
    titleEn: 'New design',
    items: [
      { for: 'all', nl: 'Nieuw ontwerp in de kleuren van Functional Performance, op telefoon en computer.', en: 'New design in Functional Performance colours, on phone and computer.' },
      { for: 'staff', nl: 'Werklijst "Vraagt aandacht", duidelijke trouw, programma-editor met samenvatting en weekoverzicht.', en: 'Attention list, clear adherence, programme editor with summary and week overview.' },
      { for: 'patient', nl: 'Timers voor vasthouden en rust, verder waar je was, en alarmsignalen melden.', en: 'Hold and rest timers, resume where you were, and report warning signs.' },
      { for: 'all', nl: 'Praktijkbibliotheek met teksten voor 68 oefeningen en demonstratievideo\'s.', en: 'Practice library with texts for 68 exercises and demonstration videos.' },
    ],
  },
  {
    date: '2026-10-22',
    titleNl: 'Eerste versie',
    titleEn: 'First version',
    items: [
      { for: 'staff', nl: 'Oefenprogramma\'s samenstellen uit de bibliotheek en toewijzen aan patiënten, met fases.', en: 'Build exercise programmes from the library and assign them to patients, with phases.' },
      { for: 'patient', nl: 'Patiëntenapp om je oefeningen te doen en terug te koppelen, ook installeerbaar op je telefoon.', en: 'Patient app to do your exercises and give feedback, installable on your phone.' },
      { for: 'all', nl: 'Veilig inloggen met tweestapsverificatie; gegevens per praktijk strikt gescheiden.', en: 'Secure login with two-step verification; data strictly separated per practice.' },
      { for: 'all', nl: 'Feedbackknop, herinneringen en video\'s bij oefeningen.', en: 'Feedback button, reminders and videos with exercises.' },
    ],
  },
];

/** The releases a person sees: their own audience plus "all", and no clinical items for coach accounts. */
export function releasesFor(audience: 'patient' | 'staff', clinical: boolean): Release[] {
  return RELEASES.map((r) => ({ ...r, items: r.items.filter((x) => (x.for === 'all' || x.for === audience) && (clinical || !x.clinical)) })).filter((r) => r.items.length > 0);
}
