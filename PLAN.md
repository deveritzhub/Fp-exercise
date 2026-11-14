# PLAN: de patiënten-app in vijf fases premium maken

Status: **verkenning klaar, er is nog niets gebouwd. Wacht op akkoord.**
Opgesteld op 14 november 2026, op basis van de code op `claude/fp-exercise-platform-bcak8k`.

Lees eerst hoofdstuk 6 (botsingen met wat er al staat) en hoofdstuk 7 (open vragen). Daar zitten de
keuzes die alleen jij kunt maken.

---

## 1. Stack

| Laag | Wat |
| --- | --- |
| Web | React 18, TypeScript 5.9, Vite 6, Tailwind 3.4, React Router 7, TanStack Query 5 |
| 3D | three.js 0.186, zelf geschreven scènes (geen game-engine) |
| API | Hono 4 op Node 22, zod voor invoer |
| Data | PostgreSQL 16 met row-level security; 50 migraties in `server/db/migrations` |
| Tests | Vitest (40 testbestanden in `web`/`shared`, 51 in `server/test`), Playwright + axe (68 specs in `e2e`) |
| Hosting | Render (Starter, Frankfurt, 1 GB schijf), database bij Neon; deployt automatisch vanaf `claude/fp-exercise-platform-bcak8k` |
| CI | `.github/workflows/ci.yml`: typecheck, `vite build`, `npm test`, `npm run test:e2e` |

Twee dingen die afwijken van jouw werkwijze:

- **Er is geen linter.** `package.json` heeft geen `lint`-script en de aanwezige ESLint-opzet draait niet
  (verouderd configuratieformaat). "Build, linter en tests" wordt dus nu: typecheck, build, Vitest, Playwright.
  Voorstel: in fase 2 een werkende ESLint toevoegen (zie vraag 7.9).
- **Een tweede sessie werkt op dezelfde basisbranch** aan het poppetje (`hero3d-study`, ogen en haar). Dat is
  twee keer zonder botsing samengevoegd, maar fase 3a raakt hetzelfde gebied.

## 2. Schermen en routes (patiënt)

Alles onder `/p`, in `web/src/router.tsx`, met `web/src/layouts/PatientLayout.tsx` (kop, tabbalk, plusknop).

| Route | Scherm | Bestand |
| --- | --- | --- |
| `/p` | Vandaag | `pages/patient/PatientHome.tsx` + `components/patient/HomeLobby.tsx` |
| `/p/revalidatie`, `/p/kracht`, `/p/mobiliteit` | de drie onderdelen | `pages/patient/ModulePage.tsx` |
| `/p/programma/:id` (+ afdrukken, oefening) | programma | `pages/patient/` (programmaschermen) |
| `/p/sessie/:id` | training afspelen | `pages/patient/SessionPlayer.tsx` (832 regels) |
| `/p/voortgang` | voortgang | `pages/patient/PatientProgress.tsx` |
| `/p/held`, `/held/nieuw`, `/held/uiterlijk`, `/held/inventaris`, `/held/pijn` | held, uiterlijk, inventaris, pijnkaart | `pages/patient/HeroPages.tsx` (1.933 regels) |
| `/p/held/vrienden` | vrienden | `pages/patient/FriendsPage.tsx` |
| `/p/wereld` | wereldkaart (revalidatieroute, gilde) | `pages/patient/WorldMapPage.tsx` + `components/patient/Village3D.tsx` |
| `/p/dorp` | loopbaar dorp in 3D | `pages/patient/VillageWalkPage.tsx` (986) + `components/patient/WalkVillage3D.tsx` (2.389) |
| `/p/logboek` | logboek (eiwit, water, slaap, stappen, eigen training) | `pages/patient/LogbookPage.tsx` |
| `/p/krachtlog` | krachtlog, schema's, 1RM | `pages/patient/GymLogPage.tsx` + `components/patient/Strength.tsx` |
| `/p/mobiliteit/meten` | mobiliteitstests | `pages/patient/MobilityTestsPage.tsx` |
| `/p/berichten`, `/p/uitleg`, `/p/spieren` | berichten, klachtuitleg, spierenatlas | `MessagesPage`, `ComplaintExplanationPage`, `AtlasPage` |
| `/p/instellingen`, `/p/account`, `/p/versies` | instellingen | `pages/patient/SettingsPage.tsx`, `pages/AccountPage.tsx` |

De therapeutenkant (`/app/...`) valt buiten deze opdracht. Ik raak hem alleen waar gedeelde onderdelen
veranderen (fase 2).

## 3. Waar de gamification-logica zit

De regels staan in `shared/` (pure functies, getest), de optelsom in `server/src/routes/hero.ts` (`heroState`).

| Onderdeel | Regels | Opslag / route |
| --- | --- | --- |
| XP en level | `shared/hero.ts`: `XP` (training 50, pijnscore gemeld 10, alarmsignaal gemeld 25, pijnkaart 30), `xpFor`, `levelFor` | berekend uit sessies; niet apart opgeslagen |
| Skills | `shared/hero.ts`: `SKILL_XP`, `GYM_SET_XP = 5` per gelogde set | idem |
| Weekquests, weekkist, bazen, seizoen | `shared/hero.ts` (`QUEST_XP`, `CHEST_XP`, `BOSS_XP`, `SEASON_XP`), `server/src/lib/boss.ts` | `hero_*`-tabellen |
| Muntjes, uitrusting, gearscore | `shared/hero.ts` (`coinsEarned`, `GEAR`, `gearScore`) | `hero_purchases`, `hero_daily_chests` |
| Erfstuk, metgezellen (knieroute) | `shared/aclRoute.ts`, `shared/aclRewards.ts` | `acl_*`-tabellen |
| Logboek-XP (eiwit, water, slaap, stappen) | `shared/patientLogs.ts`, `shared/survival.ts`, `shared/protein.ts` | `*_logs`, `step_days` |
| Wereldkaart en zones | `shared/worldMap.ts`: trainingen tekenen alleen padpunten; een zone gaat nooit open door trainen | `server/src/routes/world.ts` |
| Dorpsgroei | `shared/villageGrowth.ts`, `shared/practiceVillage.ts` (zes huisniveaus) | berekend |
| Eigen huis en meubels | `shared/homeDecor.ts` | `hero_homes` |
| Avontuur (wezentjes, wapens, boksen) | `shared/adventure.ts` | `hero_adventure` |
| Karate (banden, exameneisen) | `shared/karate.ts` | `hero_karate` |
| Vrienden en aanmoedigingen | `shared/hero.ts` (vaste zinnen, geen vrije tekst), `routes/hero.ts` | `hero_friends`, `hero_cheers` |
| Spel of eenvoudig | `components/patient/ViewChoice.tsx` | `patient_views` |

Wat al klopt met jouw harde grenzen:

- **Grens 1 (scheiding):** vrienden zien alleen heldennaam, uiterlijk, level en skill-levels (staat zo op het
  vriendenscherm en in de SQL-functie). Aanmoedigingen zijn vaste zinnen.
- **Grens 2 (privacy):** kracht en mobiliteit zijn privé tot de patiënt deelt (`components/patient/Modules.tsx`,
  `ConsentToggle`; server in `routes/patientModules.ts`).
- **Grens 4 (geen vrije chat):** er is nergens vrije tekst tussen patiënten.
- **Grens 5 (zones):** `shared/worldMap.ts` opent een zone alleen na vrijgave door de fysiotherapeut.

Wat ik in fase 1 moet nalopen tegen **grens 3 (regelmaat, nooit volume)**: zie 6.5.

## 4. Waar de 3D-wereld zit

| Wat | Bestand |
| --- | --- |
| Loopbaar dorp (scène, camera, paden, kamers, figuren) | `web/src/components/patient/WalkVillage3D.tsx` |
| Pagina eromheen (HUD, taken, gesprekken, winkel, boksen) | `web/src/pages/patient/VillageWalkPage.tsx` |
| Loop- en padlogica (getest) | `web/src/components/patient/walk.ts` |
| Praktijk, huizen, meubels, wezens, wapens | `practice3d.ts`, `house3d.ts`, `home3d.ts`, `creatures3d.ts`, `weapons3d.ts`, `components/app/dwellings3d.ts` |
| Minikaart en wereldkaart in het dorp | `components/patient/VillageMap.tsx` |
| Wereldkaart met eiland (low-poly) | `components/patient/Village3D.tsx`, `pages/patient/WorldMapPage.tsx` |
| De held in 3D | `components/hero/Hero3D.tsx`, `hero3d.ts`, `fabric3d.ts`; modellen in `web/public/hero3d/` |
| Hoe de held gebouwd wordt (Blender, MakeHuman) | `tools/blender/mh_hero.py` |
| Aangeleverde modellen en texturen | `web/public/village/` (grond, oppervlakken, wezens, wapens, dojo, huizen) |
| Therapeutendorp | `components/app/PracticeVillage3D.tsx`, `PracticeWalk.tsx` |

three.js laadt nu al alleen op de 3D-pagina's (`lazy()`), dus de rest van de app blijft er vrij van.
Frames per seconde op een echte telefoon zijn **nooit gemeten**; alles is getest met een softwarerenderer.

## 5. Per fase: wat ik doe en welke bestanden ik raak

Elke fase op een eigen branch (`fase-1-snoeien`, `fase-2-designsysteem`, ...), afgesloten met samenvatting,
testlijst en open vragen. Zie vraag 7.1 over hoe dat met live zetten samengaat.

### Fase 1: snoeien

| Punt | Aanpak | Bestanden |
| --- | --- | --- |
| 1. Vandaag met één hoofdtaak | Nieuwe volgorde: begroeting, één regel level + XP-balk, revalidatiekaart, krachtkaart, twee tegels. "Start training" boven de vouw op 390×844. | `PatientHome.tsx`, `HomeLobby.tsx` |
| 2. Illustratie en dubbele avatar weg | Verhuist naar de bovenkant van Wereld (zie 6.1). | `HomeLobby.tsx`, `WorldMapPage.tsx` |
| 3. XP, level, dorp en muntjes zichtbaar | Eén bestand met flags; gearscore, bazen, erfstuk en metgezellen naar één verzamelscherm onder Wereld. **Muntjes blijven in beeld** (besluit eigenaar, 14 november). Geen data weg. | nieuw `shared/flags.ts`, `HeroPages.tsx`, `VillageWalkPage.tsx`, `PatientHome.tsx` |
| 4. Uitleg: één zin + info-knop | Nieuw onderdeel `Uitleg`; veiligheidszinnen blijven zichtbaar (zie 6.6). | nieuw `components/ui/Uitleg.tsx`, alle patiëntpagina's |
| 5. Plusknop weg, tab Wereld | Tabs: Vandaag, Revalidatie, Kracht, Mobiliteit, Wereld. Snel loggen krijgt een andere ingang (zie 6.2). | `PatientLayout.tsx`, `QuickLog.tsx`, `router.tsx` |
| 6. Drie fouten | Lege klachtuitleg krijgt tekst en terugknop; ondermarge + safe areas; praktijknaam op één regel. | `ComplaintExplanationPage.tsx`, `PatientLayout.tsx`, `index.css` |
| 7. Delen als schakelaars | Zelfde aanroepen en toestemmingslogica, andere vorm. | `Modules.tsx` (`ConsentToggle`), `SettingsPage.tsx` |

Tests: bestaande specs aanpassen (`hero`, `quicklog`, `first-steps`, `home-mobile`, `a11y-sweep`), nieuwe spec
"Start training zichtbaar zonder scrollen", unit-test voor de flags. Geen databasewijziging.

### Fase 2: designsysteem

| Punt | Aanpak | Bestanden |
| --- | --- | --- |
| Tokens op één plek | De kleuren staan al als CSS-variabelen; ik vervang de waarden en voeg schaal, radius en schaduw toe. | `web/tailwind.config.cjs`, `web/src/index.css` |
| Losse waarden vervangen | Er staan nu **476 losse hex-kleuren** en **298 tekstgroottes onder 13 px** in `.tsx`-bestanden. | vrijwel alle bestanden onder `web/src` |
| Lettertype | Manrope → Proza Libre 600 voor koppen (nieuw pakket, zie 7.5). | `package.json`, `main.tsx`, `tailwind.config.cjs` |
| Componenten | Kaart, PrimaireKnop, SecundaireKnop, Label, Voortgangsbalk, LegeStaat, Lijstrij, Schakelaar, op basis van wat er al is (`Button`, `Card`, `EmptyState`). | `web/src/components/ui/*` |
| Contrast en labels | axe draait al in de e2e-tests; ik breid de sweep uit en loop icoonknoppen na. | `e2e/a11y-sweep.spec.ts`, `web/src/lib/accent.test.ts` |

Dit is de grootste fase in aantal regels. Ik doe hem scherm voor scherm, met schermafbeeldingen voor en na.
De 3D-HUD heeft een eigen donkere stijl; die laat ik tot fase 3.

### Fase 3: spel en beeldtaal

| Deel | Aanpak | Bestanden | Database |
| --- | --- | --- | --- |
| 3a Eén stijl | Eerst een stijlvoorstel met voorbeelden; pas na akkoord assets. Zie 6.3: er staan nu drie stijlen door elkaar. | `Hero3D.tsx`, `WalkVillage3D.tsx`, `Village3D.tsx`, `tools/blender/` | nee |
| 3b Solo-gevoel | HUD terug naar drie iconen, joystick links, één actieknop rechts, camera gladder. Meetpunt voor fps inbouwen. | `VillageWalkPage.tsx`, `WalkVillage3D.tsx` | nee |
| 3c Spellus | Energie en bouwmateriaal uit trainingen; zones volgen de fases. | nieuw `shared/spel.ts` (config), `routes/hero.ts`, `worldMap.ts` | **ja, ik vraag het eerst** |
| 3d Smederij | IJzer per gelogde set binnen het vrijgegeven schema, onderdeel per afgerond schema, trofee per eigen record. Alle aantallen in één configbestand. | `shared/spel.ts`, `gymLog.ts`, `GymLogPage.tsx`, `PatientHome.tsx` | **ja** |
| 3e Sociaal zonder live | Gedeeld praktijkdorp met wie delen aan heeft, zwaaien, cadeautje, weekdoel in de gildehal. | `FriendsPage.tsx`, `routes/hero.ts`, `WalkVillage3D.tsx` | **ja** |
| 3f Live | Alleen een technisch voorstel (netwerk, hosting, kosten, moderatie). Niets bouwen zonder akkoord. | document | later |

### Fase 4: gevoel

| Punt | Bestanden |
| --- | --- |
| Animatie en trilling bij afgeronde set en training; XP-balk vult zichtbaar | `SessionPlayer.tsx`, `components/hero/GameFx.tsx` |
| Schermovergangen, skeletons in plaats van spinners | `router.tsx`, `components/ui/Misc.tsx`, pagina's met `Spinner` |
| Lege staten met illustratie, één zin, één actie | `LegeStaat` uit fase 2, alle lege staten |
| Foto of video per oefening, met nette placeholder | `components/app/ExerciseThumb.tsx`, `SessionPlayer.tsx` |
| Onboarding van drie schermen | de bestaande `WelcomeTour` en `HeroPages.tsx` (`/held/nieuw`) |
| Verminderde beweging | er zijn nu 16 plekken die dit al doen; ik maak er één hulpfunctie van |

Let op: trillen (`navigator.vibrate`) werkt op Android, **niet op iPhone** in de browser.

### Fase 5: meten

| Punt | Aanpak | Database |
| --- | --- | --- |
| Meting zonder medische inhoud | Vier tellers: tijd tot "Start training", afgeronde trainingen per week, wereld geopend, terugkeer na 7 en 30 dagen. Geen oefening, klacht of score erin. | **ja**, één tabel; ik vraag het eerst |
| Overzicht voor jou | Een pagina onder het beheer (`/app`, alleen eigenaar). | nee |
| Lijst weinig gebruikte onderdelen | Uit dezelfde tellers, als snoeivoorstel. | nee |

## 6. Botsingen met wat er al staat

Dit zijn dingen die deze week zijn gebouwd of live gezet en die tegen het nieuwe plan in gaan. Ik verwijder
niets zonder jouw keuze.

1. **Het plaatje met huisjes op Vandaag** (met jouw geschilderde huizen, vandaag live gezet) moet volgens
   fase 1.2 van Vandaag af. Rustigste keuze: het verhuist ongewijzigd naar de bovenkant van het tabblad
   Wereld, en Vandaag krijgt alleen de tegel "voortgang van het dorp".
2. **De plusknop** is de enige snelle ingang naar eiwit, water, gewicht, stappen en slaap. Rustigste keuze:
   die vijf blijven in het logboek, bereikbaar via een rij op Vandaag onder de twee tegels. Zeg het als je
   liever hebt dat ze helemaal uit beeld gaan.
3. **Stijl (3a).** De wereldkaart is low-poly. Het loopbare dorp gebruikt daarnaast een realistische held
   (MakeHuman), jouw geboetseerde modellen (wezens, wapens, dojo) en geschilderde texturen en huizen. "Eén
   stijl" betekent kiezen. Dit bepaalt of de aangeleverde modellen blijven.
4. **HUD (3b).** Het dorp heeft nu meer dan drie iconen: taken, meters, kaart, rugzak, zwaarden, joystick,
   zoom, draaien, volledig scherm. Dat wordt flink minder; wat weggaat komt achter één menuknop.
5. **Grens 3 (regelmaat, nooit volume).** Vier dingen wil ik in fase 1 nalopen en zo nodig begrenzen:
   - `GYM_SET_XP = 5` per gelogde set in het eigen krachtlog: meer sets geeft meer skill-XP.
   - De **Smederij uit 3d** (ijzer per gelogde set) heeft hetzelfde risico. Voorstel: een dagplafond en
     alleen sets binnen het schema tellen.
   - **Karate**: de exameneisen bevatten aantallen (tot 75 push-ups en 20 gevechten) die de patiënt zelf
     afvinkt, los van wat de fysiotherapeut heeft vrijgegeven. Voorstel: achter een flag, standaard uit, of
     alleen als de fysiotherapeut het voor die patiënt aanzet.
   - **Avontuur** (wezentjes verslaan, boksen) geeft eigen XP zonder dat er getraind is. Het raakt het echte
     level niet, maar past niet bij "trainingen leveren energie" uit 3c. Voorstel: gevechten kosten energie
     die alleen uit trainingen komt.
6. **Uitleg inkorten (1.4).** Een deel van de lange teksten is een veiligheidsboodschap ("een hoge pijnscore
   levert niet méér op", "meer herhalingen doen er niets bij"). Die zin houd ik zichtbaar als de ene zin.
7. **Eenvoudige weergave** (vandaag live gezet). Die blijft; in die weergave is er geen tab Wereld. Fase 1
   maakt het verschil tussen beide weergaven wel kleiner, omdat Vandaag in beide rustig wordt.
8. **Gesprekken in het dorp** linken vanuit de wereld naar zorgschermen (pijn doorgeven, programma). Er gaat
   geen medische gegeven de spelkant in, het zijn alleen links. Toch noem ik het, omdat fase 3 de wereld een
   "aparte spelmodus" maakt: wil je die links houden?
9. **De therapeut kijkt binnen in het huis van een patiënt** (meubels). Dat is spelinformatie naar de
   zorgkant, niet andersom, en de patiënt wordt erover ingelicht. Het blijft zo tenzij je het anders wilt.

## 7. Open vragen

1. **Branches en live.** Mijn sessie mag alleen naar `ccr-2bd8f689-b5ylsf` schrijven tenzij jij anders zegt.
   Mag ik per fase een eigen branch maken en pushen? En geldt per fase: pas samenvoegen met de live-branch
   na jouw akkoord, zodat je vóór akkoord test op mijn schermafbeeldingen en niet op de live site? Of wil je
   elke fase eerst live achter een flag, zodat je op je telefoon test?
2. **Wereld-tab.** Wordt het startscherm van Wereld het verzamelscherm (held, dorp, kaart, vrienden) met een
   knop naar het loopbare dorp, of opent de tab direct het 3D-dorp?
3. **Snel loggen** na het weghalen van de plusknop: zie 6.2.
4. **Stijl** voor 3a: zie 6.3. Low-poly voor alles, of de huidige mix in één palet en belichting trekken?
5. **Lettertype.** Proza Libre is een nieuw pakket (`@fontsource/proza-libre`, zelf gehost, geen verzoek
   naar Google). Akkoord?
6. **Praktijkkleur.** Het accent is nu per praktijk instelbaar (white label). Wordt #1E3A30 de vaste
   kleur, of de standaard die een praktijk kan vervangen?
7. **Donkere modus** bestaat. Jouw tokens zijn alleen licht. Houd ik donker (ik leid de tinten af) of gaat
   hij achter een flag?
8. **Karate, avontuur en de Smederij** tegen grens 3: zie 6.5.
9. **Linter.** Mag ik in fase 2 ESLint werkend maken en in de CI zetten?
10. **De andere sessie** die aan het poppetje werkt: loopt die door? Dan stem ik 3a daarop af.

## 8. Vastgelegde keuzes

Hier noteer ik per fase de ontwerpkeuzes en besluiten.

- **14 november, eigenaar:** muntjes blijven voorlopig in beeld. Fase 1 punt 3 stopt alleen gearscore, bazen,
  erfstuk en metgezellen weg. De winkels in het dorp (wapensmid, meubels) blijven dus bruikbaar.
