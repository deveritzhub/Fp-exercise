// Oefenbibliotheek. Elke oefening heeft standaardwaarden voor sets (s), herhalingen (r)
// en vasthouden in seconden (h). Pas teksten gerust aan de werkwijze van je praktijk aan.
window.EXERCISES = [
  // Nek
  { id: "nek-kin", cat: "Nek", title: "Kin intrekken",
    desc: "Zit of sta rechtop. Trek je kin recht naar achteren (een 'dubbele kin'), zonder je hoofd te kantelen. Houd vast en ontspan weer.",
    s: 2, r: 10, h: 5 },
  { id: "nek-draai", cat: "Nek", title: "Nek draaien",
    desc: "Zit rechtop. Draai je hoofd rustig zo ver als comfortabel naar links, terug naar het midden en daarna naar rechts. Blijf binnen de pijngrens.",
    s: 2, r: 10, h: 0 },
  { id: "nek-zij", cat: "Nek", title: "Zijwaartse nekrek",
    desc: "Zit rechtop en laat je oor rustig richting je schouder zakken, zonder je schouder op te trekken. Voel een rek aan de andere kant. Wissel van kant.",
    s: 2, r: 3, h: 20 },

  // Schouder
  { id: "sch-pendel", cat: "Schouder", title: "Pendeloefening",
    desc: "Steun met je gezonde arm op een tafel en buig licht voorover. Laat de pijnlijke arm ontspannen hangen en maak kleine cirkels, ook in de andere richting.",
    s: 2, r: 15, h: 0 },
  { id: "sch-knijp", cat: "Schouder", title: "Schouderbladen knijpen",
    desc: "Zit of sta rechtop. Trek je schouderbladen naar achteren en iets omlaag, alsof je ze in je achterzak wilt stoppen. Houd vast en ontspan.",
    s: 2, r: 10, h: 5 },
  { id: "sch-exo", cat: "Schouder", title: "Buitenwaarts draaien met elastiek",
    desc: "Houd een elastiek vast met beide handen, ellebogen 90 graden gebogen tegen je zij. Draai je onderarmen naar buiten, ellebogen blijven tegen je lichaam.",
    s: 3, r: 12, h: 0 },
  { id: "sch-wand", cat: "Schouder", title: "Armen langs de muur schuiven",
    desc: "Sta met je onderarmen tegen de muur. Schuif je armen rustig omhoog zo ver als comfortabel en weer terug, zonder je schouders op te trekken.",
    s: 2, r: 10, h: 0 },

  // Rug
  { id: "rug-katkoe", cat: "Rug", title: "Kat en koe",
    desc: "Ga op handen en knieën zitten. Maak je rug rustig bol (kat) en daarna hol (koe). Beweeg in je eigen tempo, met de ademhaling mee.",
    s: 2, r: 10, h: 0 },
  { id: "rug-knieborst", cat: "Rug", title: "Knie naar borst",
    desc: "Lig op je rug met gebogen knieën. Trek één knie met je handen rustig richting je borst, houd vast en wissel van been.",
    s: 2, r: 5, h: 20 },
  { id: "rug-bekken", cat: "Rug", title: "Bekken kantelen",
    desc: "Lig op je rug met gebogen knieën. Druk je onderrug zacht in de grond door je bekken te kantelen, houd vast en ontspan weer.",
    s: 2, r: 10, h: 5 },
  { id: "rug-brug", cat: "Rug", title: "Bruggetje",
    desc: "Lig op je rug met gebogen knieën, voeten plat. Span je billen aan en til je bekken op tot je lichaam een rechte lijn vormt van knieën tot schouders. Langzaam terug.",
    s: 3, r: 10, h: 3 },
  { id: "rug-vogelhond", cat: "Rug", title: "Vogel-hond",
    desc: "Ga op handen en knieën zitten. Strek tegelijk je rechterarm en linkerbeen uit, houd je rug stil en recht. Terug en wissel van kant.",
    s: 2, r: 8, h: 5 },

  // Heup
  { id: "heup-clam", cat: "Heup", title: "Schelp (clamshell)",
    desc: "Lig op je zij met gebogen heupen en knieën, voeten op elkaar. Til je bovenste knie op zonder je bekken naar achteren te laten rollen. Langzaam terug.",
    s: 3, r: 12, h: 0 },
  { id: "heup-zijlig", cat: "Heup", title: "Been zijwaarts heffen",
    desc: "Lig op je zij met het onderste been gebogen. Til het bovenste, gestrekte been op tot ongeveer heuphoogte, met de tenen naar voren. Langzaam terug.",
    s: 3, r: 10, h: 0 },
  { id: "heup-flexrek", cat: "Heup", title: "Heupbuigerrek",
    desc: "Zet één knie op de grond (op een kussen) en de andere voet voor je. Schuif je bekken rustig naar voren tot je een rek voelt aan de voorkant van de heup.",
    s: 2, r: 3, h: 30 },

  // Knie
  { id: "knie-quad", cat: "Knie", title: "Bovenbeenspier aanspannen",
    desc: "Zit of lig met gestrekt been en een opgerolde handdoek onder de knie. Druk de knie in de handdoek door je bovenbeen aan te spannen. Houd vast en ontspan.",
    s: 3, r: 10, h: 5 },
  { id: "knie-slr", cat: "Knie", title: "Gestrekt been heffen",
    desc: "Lig op je rug, één knie gebogen. Span het bovenbeen van het gestrekte been aan en til het op tot de hoogte van de andere knie. Langzaam terug.",
    s: 3, r: 10, h: 2 },
  { id: "knie-stoel", cat: "Knie", title: "Opstaan uit een stoel",
    desc: "Zit op het voorste deel van een stevige stoel. Sta op zonder je handen te gebruiken (indien mogelijk) en ga gecontroleerd weer zitten.",
    s: 3, r: 10, h: 0 },
  { id: "knie-opstap", cat: "Knie", title: "Opstappen",
    desc: "Stap met één voet op een traptree of verhoging en strek dat been tot je erop staat. Stap gecontroleerd terug. Houd eventueel de leuning vast.",
    s: 3, r: 10, h: 0 },

  // Enkel / voet
  { id: "enkel-kuit", cat: "Enkel & voet", title: "Kuitheffen",
    desc: "Sta rechtop, eventueel met steun van een muur of stoel. Kom rustig op je tenen en zak gecontroleerd terug.",
    s: 3, r: 15, h: 0 },
  { id: "enkel-alfabet", cat: "Enkel & voet", title: "Enkelalfabet",
    desc: "Zit met je voet los van de grond. Schrijf met je grote teen het alfabet in de lucht, bewegend vanuit de enkel.",
    s: 1, r: 1, h: 0 },
  { id: "enkel-balans", cat: "Enkel & voet", title: "Op één been staan",
    desc: "Sta op één been naast een stoel of aanrecht voor de veiligheid. Probeer je evenwicht te bewaren. Makkelijk? Doe het met je ogen dicht.",
    s: 3, r: 1, h: 30 },

  // Algemeen
  { id: "alg-wandel", cat: "Algemeen", title: "Wandelen",
    desc: "Wandel in een rustig tot stevig tempo. Bouw de duur geleidelijk op volgens afspraak met je fysiotherapeut. Bij 'vasthouden' staat het aantal minuten.",
    s: 1, r: 1, h: 20, unit: "min" },
  { id: "alg-adem", cat: "Algemeen", title: "Buikademhaling",
    desc: "Lig of zit ontspannen met een hand op je buik. Adem rustig in door je neus zodat je buik omhoog komt, en adem langzaam uit door je mond.",
    s: 1, r: 10, h: 0 },
];
