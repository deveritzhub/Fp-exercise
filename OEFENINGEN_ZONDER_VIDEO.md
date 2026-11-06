# Oefeningen zonder video

_Stand: 6 november 2026, branch `claude/fp-exercise-platform-bcak8k`. Bronnen: `server/db/seed-data/exercises.ts` (centrale bibliotheek), de FP-bundels in `server/src/lib/fpLibrary.ts` (praktijkbibliotheek), `server/db/seed-data/videos.ts` en `SAME_AS_LIBRARY` / `MOBILITY_SAME_AS` in `server/src/lib/libraryImport.ts` (gekoppelde en samengevoegde oefeningen)._

**Totaal 164 oefeningen: 29 met video, 135 zonder.**

- Centrale bibliotheek: 36 van 50 zonder video
- Praktijkbibliotheek (FP-bundels): 99 van 114 zonder video

Al gekoppeld via `SAME_AS_LIBRARY` (de praktijkversie gebruikt de video van de centrale oefening): Bilbrug, Clamshell, Kuitheffen op twee benen, Eenbenige balans, Step-up, Dead bug, Kin intrekken, Kat-koe. Vier mobiliteitsoefeningen (`mb_kniebuiging_muur`, `mb_hip_flexor_stretch`, `mb_thoracic_rotatie`, `mb_cat_camel`) worden niet apart aangemaakt maar samengevoegd met de basisversie; die tellen hier niet mee.

## 1. Snelle winst: de video bestaat al, maar is nog niet gekoppeld

Deze praktijkoefeningen staan **niet** in `SAME_AS_LIBRARY`, terwijl er wel een goedgekeurde video van (bijna) dezelfde beweging is. Na een klinische check: toevoegen aan `SAME_AS_LIBRARY`, dan krijgen ze bij de volgende start automatisch die video.

| Oefening | Key | Bestaande video |
|---|---|---|
| Isometrische bilbrug | `ex_iso_bilbrug` | Bekkenbrug (als vasthouden) |
| Staande kuitheffen | `kr_standing_calf_raise` | Hielheffen staand |
| Zijlig heupabductie met de hiel voorop | `kt_zijlig_abductie` | Heupabductie in zijlig (cue hiel voorop checken) |
| Eenbenige bilbrug | `kt_eenbenige_bilbrug` | Eenbenige bekkenbrug |
| Bird dog | `kt_bird_dog` | Viervoetsstand diagonaal (bird dog) |
| Muurzit (isometrisch, knie) | `kt_muurzit` | Muurzit |

## 2. Centrale bibliotheek zonder video

| # | Oefening | Key | Tijdelijke foto |
|---|---|---|---|
| 1 | Diepe nekflexoren — hoofd optillen in ruglig | `dnf_lift` | Liever echte foto/still |
| 2 | Actieve nekrotatie | `neck_rotation` | AI-foto geschikt |
| 3 | Isometrische lateroflexie van de nek | `neck_iso_sideflex` | Liever echte foto/still |
| 4 | Thoracale extensie op stoel | `thoracic_ext_chair` | AI-foto geschikt |
| 5 | Open boek | `open_book` | AI-foto geschikt |
| 6 | Extensie in buiklig | `prone_press_up` | AI-foto geschikt |
| 7 | Heupscharnier met stok | `hip_hinge_dowel` | AI-foto geschikt |
| 8 | Farmer carry | `farmer_carry` | AI-foto geschikt |
| 9 | Slingeroefening | `pendulum` | AI-foto geschikt |
| 10 | Exorotatie met weerstandsband | `er_band` | AI-foto geschikt |
| 11 | Endorotatie met weerstandsband | `ir_band` | AI-foto geschikt |
| 12 | Isometrische exorotatie tegen de muur | `er_iso_wall` | AI-foto geschikt |
| 13 | Roeien met weerstandsband | `band_row` | AI-foto geschikt |
| 14 | Muurglijder | `wall_slide` | AI-foto geschikt |
| 15 | Exorotatie in zijlig met dumbbell | `sidelying_er_db` | AI-foto geschikt |
| 16 | Excentrische polsextensie | `ecc_wrist_ext` | Liever echte foto/still |
| 17 | Isometrische polsextensie | `iso_wrist_ext` | Liever echte foto/still |
| 18 | Peesglijoefeningen hand | `tendon_glide` | Liever echte foto/still |
| 19 | Heupbuigerrek in halfknielstand | `hip_flexor_stretch` | AI-foto geschikt |
| 20 | Eenbenige Roemeense deadlift | `sl_rdl` | AI-foto geschikt |
| 21 | Zijwaarts lopen met band | `lateral_band_walk` | AI-foto geschikt |
| 22 | Quadricepsaanspanning | `quad_set` | AI-foto geschikt |
| 23 | Gestrekt been heffen | `slr` | AI-foto geschikt |
| 24 | Hielglijden | `heel_slide` | AI-foto geschikt |
| 25 | Terminale knie-extensie met band | `tke_band` | AI-foto geschikt |
| 26 | Spaanse squat | `spanish_squat` | AI-foto geschikt |
| 27 | Split squat | `split_squat` | AI-foto geschikt |
| 28 | Excentrische eenbenige squat op decline | `decline_squat_ecc` | AI-foto geschikt |
| 29 | Eenbenig hielheffen | `sl_calf_raise` | AI-foto geschikt |
| 30 | Excentrisch hielzakken (gestrekte en gebogen knie) | `ecc_heel_drop` | Liever echte foto/still |
| 31 | Zittend hielheffen (soleus) | `seated_soleus` | AI-foto geschikt |
| 32 | Eenbenig reiken op balanskussen | `balance_pad_reach` | AI-foto geschikt |
| 33 | Eversie met weerstandsband | `ankle_eversion_band` | AI-foto geschikt |
| 34 | Actieve enkelmobiliteit (alfabet) | `ankle_arom` | Liever echte foto/still |
| 35 | Pogo-sprongen | `pogo_hops` | Liever echte foto/still |
| 36 | Eenbenige sprong met stabiele landing | `hop_and_stick` | Liever echte foto/still |

## 3. Praktijkbibliotheek zonder video

| # | Oefening | Key | Bundel | Tijdelijke foto |
|---|---|---|---|---|
| 1 | Quadriceps isometrisch | `ex_quad_set` | Basisbibliotheek | AI-foto geschikt |
| 2 | Hielglijden | `ex_heel_slide` | Basisbibliotheek | AI-foto geschikt |
| 3 | Terminale knie-extensie met band | `ex_terminal_knee_extension` | Basisbibliotheek | AI-foto geschikt |
| 4 | Isometrische knie-extensie onder 90 graden | `ex_iso_knie_extensie_90` | Basisbibliotheek | AI-foto geschikt |
| 5 | Isometrische heupabductie tegen muur | `ex_iso_heup_abductie` | Basisbibliotheek | AI-foto geschikt |
| 6 | Isometrisch kuitheffen staand | `ex_iso_kuit_staand` | Basisbibliotheek | AI-foto geschikt |
| 7 | Kuitheffen op één been | `ex_heel_raise_eenbenig` | Basisbibliotheek | AI-foto geschikt |
| 8 | Tibialis raise | `ex_tibialis_raise` | Basisbibliotheek | AI-foto geschikt |
| 9 | Teen-yoga | `ex_toe_yoga` | Basisbibliotheek | Liever echte foto/still |
| 10 | Leg press | `ex_leg_press` | Basisbibliotheek | AI-foto geschikt |
| 11 | Eenbenige romp-heup | `ex_single_leg_rdl` | Basisbibliotheek | AI-foto geschikt |
| 12 | Nordic hamstring | `ex_nordic_hamstring` | Basisbibliotheek | AI-foto geschikt |
| 13 | Isometrische hamstring tegen muur | `ex_iso_hamstring_muur` | Basisbibliotheek | AI-foto geschikt |
| 14 | Zijplank | `ex_side_plank` | Basisbibliotheek | AI-foto geschikt |
| 15 | Isometrische externe rotatie tegen deurpost | `ex_iso_schouder_extern` | Basisbibliotheek | AI-foto geschikt |
| 16 | Externe rotatie met band | `ex_band_external_rotation` | Basisbibliotheek | AI-foto geschikt |
| 17 | Schouderbladen samentrekken | `ex_scapular_retraction` | Basisbibliotheek | AI-foto geschikt |
| 18 | Isometrische nek in vier richtingen | `ex_iso_nek` | Basisbibliotheek | Liever echte foto/still |
| 19 | Thoracale rotatie in zijligging | `ex_thoracic_rotatie` | Basisbibliotheek | AI-foto geschikt |
| 20 | Heupflexor-rek in kniestand | `ex_hip_flexor_stretch` | Basisbibliotheek | AI-foto geschikt |
| 21 | Kniebuiging tegen muur (dorsaalflexie) | `ex_kniebuiging_muur` | Basisbibliotheek | AI-foto geschikt |
| 22 | Medianus slider | `nd_median_slider` | Basisbibliotheek | Liever echte foto/still |
| 23 | Medianus tensioner | `nd_median_tensioner` | Basisbibliotheek | Liever echte foto/still |
| 24 | Ulnaris slider | `nd_ulnar_slider` | Basisbibliotheek | Liever echte foto/still |
| 25 | Nervus ischiadicus slider zittend | `nd_sciatic_slider` | Basisbibliotheek | Liever echte foto/still |
| 26 | Gestrekt been heffen met dorsaalflexie (tensioner) | `nd_slr_dorsiflexie` | Basisbibliotheek | Liever echte foto/still |
| 27 | Slump slider | `nd_slump_slider` | Basisbibliotheek | Liever echte foto/still |
| 28 | Stijve sprongen op de plaats | `ex_pogo_hopping` | Basisbibliotheek | Liever echte foto/still |
| 29 | Laterale sprong met gecontroleerde landing | `ex_lateral_bound` | Basisbibliotheek | Liever echte foto/still |
| 30 | Back squat | `kr_back_squat` | Kracht & mobiliteit | AI-foto geschikt |
| 31 | Leg press | `kr_leg_press` | Kracht & mobiliteit | AI-foto geschikt |
| 32 | Liggende leg curl | `kr_leg_curl` | Kracht & mobiliteit | AI-foto geschikt |
| 33 | Leg extension | `kr_leg_extension` | Kracht & mobiliteit | AI-foto geschikt |
| 34 | Barbell bench press | `kr_bench_press` | Kracht & mobiliteit | AI-foto geschikt |
| 35 | Incline dumbbell press | `kr_incline_db_press` | Kracht & mobiliteit | AI-foto geschikt |
| 36 | Overhead press | `kr_overhead_press` | Kracht & mobiliteit | AI-foto geschikt |
| 37 | Zijwaartse dumbbell raise | `kr_lateral_raise` | Kracht & mobiliteit | AI-foto geschikt |
| 38 | Triceps pushdown | `kr_triceps_pushdown` | Kracht & mobiliteit | AI-foto geschikt |
| 39 | Lat pulldown | `kr_lat_pulldown` | Kracht & mobiliteit | AI-foto geschikt |
| 40 | Chest-supported row | `kr_chest_supported_row` | Kracht & mobiliteit | AI-foto geschikt |
| 41 | Barbell row | `kr_barbell_row` | Kracht & mobiliteit | AI-foto geschikt |
| 42 | Pull-up | `kr_pull_up` | Kracht & mobiliteit | AI-foto geschikt |
| 43 | Face pull | `kr_face_pull` | Kracht & mobiliteit | AI-foto geschikt |
| 44 | Dumbbell curl | `kr_db_curl` | Kracht & mobiliteit | AI-foto geschikt |
| 45 | Plank | `kr_core_plank` | Kracht & mobiliteit | AI-foto geschikt |
| 46 | Hamstring rek op rug met band | `mb_hamstring_stretch` | Kracht & mobiliteit | AI-foto geschikt |
| 47 | 90/90 heupmobiliteit | `mb_90_90` | Kracht & mobiliteit | AI-foto geschikt |
| 48 | Kinderhouding | `mb_child_pose` | Kracht & mobiliteit | AI-foto geschikt |
| 49 | Borstspier rek in deuropening | `mb_doorway_pec` | Kracht & mobiliteit | AI-foto geschikt |
| 50 | Slaapstretch schouder | `mb_sleeper_stretch` | Kracht & mobiliteit | AI-foto geschikt |
| 51 | Wall slide | `mb_wall_slide` | Kracht & mobiliteit | AI-foto geschikt |
| 52 | Diepe squat hold | `mb_deep_squat_hold` | Kracht & mobiliteit | AI-foto geschikt |
| 53 | World's greatest stretch | `mb_world_greatest` | Kracht & mobiliteit | AI-foto geschikt |
| 54 | Nek en zenuwglijding, sliders | `mb_nerve_glide_neck` | Kracht & mobiliteit | Liever echte foto/still |
| 55 | Voorwaartse uitvalspas | `kr_forward_lunge` | Video-uitbreiding | AI-foto geschikt |
| 56 | Goblet squat | `kr_goblet_squat` | Kracht v3 | AI-foto geschikt |
| 57 | Step-up met dumbbells | `kr_step_up` | Kracht v3 | AI-foto geschikt |
| 58 | Walking lunge | `kr_walking_lunge` | Kracht v3 | AI-foto geschikt |
| 59 | Hack squat | `kr_hack_squat` | Kracht v3 | AI-foto geschikt |
| 60 | Heupabductie machine | `kr_hip_abduction` | Kracht v3 | AI-foto geschikt |
| 61 | Rugstrekken op bank | `kr_back_extension` | Kracht v3 | AI-foto geschikt |
| 62 | Dumbbell bench press | `kr_db_bench_press` | Kracht v3 | AI-foto geschikt |
| 63 | Dumbbell schouderdrukken | `kr_db_shoulder_press` | Kracht v3 | AI-foto geschikt |
| 64 | Dips | `kr_dips` | Kracht v3 | AI-foto geschikt |
| 65 | Cable fly | `kr_cable_fly` | Kracht v3 | AI-foto geschikt |
| 66 | Triceps extension boven het hoofd | `kr_overhead_triceps` | Kracht v3 | AI-foto geschikt |
| 67 | Eenarmige dumbbell row | `kr_db_row` | Kracht v3 | AI-foto geschikt |
| 68 | Seated cable row | `kr_seated_cable_row` | Kracht v3 | AI-foto geschikt |
| 69 | Chin-up | `kr_chin_up` | Kracht v3 | AI-foto geschikt |
| 70 | Inverted row | `kr_inverted_row` | Kracht v3 | AI-foto geschikt |
| 71 | Reverse fly | `kr_reverse_fly` | Kracht v3 | AI-foto geschikt |
| 72 | Hammer curl | `kr_hammer_curl` | Kracht v3 | AI-foto geschikt |
| 73 | Pallof press | `kr_pallof_press` | Kracht v3 | AI-foto geschikt |
| 74 | Farmer carry | `kr_farmer_carry` | Kracht v3 | AI-foto geschikt |
| 75 | Kettlebell swing | `kr_kettlebell_swing` | Kracht v3 | Liever echte foto/still |
| 76 | Radialis slider | `nd_radial_slider` | Neurodynamica | Liever echte foto/still |
| 77 | Femoralis slider in zijlig | `nd_femoral_slider` | Neurodynamica | Liever echte foto/still |
| 78 | Tibialis slider | `nd_tibial_slider` | Neurodynamica | Liever echte foto/still |
| 79 | Fibularis slider | `nd_fibular_slider` | Neurodynamica | Liever echte foto/still |
| 80 | Musculocutaneus slider | `nd_musculocutaneous_slider` | Neurodynamica | Liever echte foto/still |
| 81 | Obturatorius slider | `nd_obturator_slider` | Neurodynamica | Liever echte foto/still |
| 82 | Step-down van een traptree | `kt_step_down` | Ketens | AI-foto geschikt |
| 83 | Copenhagen adductie, korte hefboom | `kt_copenhagen_kort` | Ketens | AI-foto geschikt |
| 84 | Short foot (voetboog actief) | `kt_short_foot` | Ketens | Liever echte foto/still |
| 85 | Buiklig Y en T (onderste en middelste trapezius) | `kt_buiklig_y_t` | Ketens | AI-foto geschikt |
| 86 | Push-up plus tegen de muur (serratus) | `kt_push_up_plus` | Ketens | AI-foto geschikt |
| 87 | Open book (bovenrug draaien) | `kt_open_book` | Ketens | AI-foto geschikt |
| 88 | Excentrisch polsstrekken (tennisarm) | `kt_pols_excentrisch_strek` | Ketens | Liever echte foto/still |
| 89 | Excentrisch polsbuigen (golfersarm) | `kt_pols_excentrisch_buig` | Ketens | Liever echte foto/still |
| 90 | Peesglijden van de vingers | `kt_peesglijden_hand` | Ketens | Liever echte foto/still |
| 91 | Heup-hinge met stok langs de rug | `kt_heup_hinge` | Ketens | AI-foto geschikt |
| 92 | TFL en buitenkant heup rekken in stand | `kt_tfl_rek` | Ketens | AI-foto geschikt |
| 93 | Bovenste trapezius rekken | `kt_bovenste_trapezius_rek` | Ketens | AI-foto geschikt |

## 4. Tijdelijk een AI-foto (Gemini) tot de video er is?

**Ja, voor een deel van de lijst, en met voorwaarden.** De app heeft al een plek voor een afbeelding per oefening (`thumbnail_media_id`, ook als praktijkoverride). Een foto is dus in te voeren zonder codewijziging.

**Waarom het helpt**
- Een patiënt ziet direct de houding, in plaats van alleen tekst.
- Een foto is gratis of goedkoop en snel te maken. Een video kost tijd en credits.
- Een foto toont één moment. Daardoor zijn houdingsfouten makkelijker te zien en te keuren dan in een AI-video.

**Waar je op moet letten**
- **Klinische juistheid.** De tekst-naar-video batches van oktober zijn grotendeels afgekeurd omdat de uitvoering niet klopte. AI-foto's hebben hetzelfde risico, zoals de verkeerde kant, een verkeerde kniehoek, een holle rug of zes vingers. Laat elke foto keuren met dezelfde review-stap als de video's.
- **Eén foto toont geen beweging.** Maak liever twee beelden: de **start- en eindpositie**, eventueel naast elkaar in één afbeelding.
- **Fijne motoriek gaat vaak mis.** Bij hand- en vingerwerk, zenuwglijders (sliders of tensioners met precieze hoofd-, pols- en enkelstand), voetboog, teen-yoga en sprongen is AI onbetrouwbaar. Daar is een eigen foto of een still uit een eigen opname beter. Die oefeningen staan hierboven als "Liever echte foto/still".
- **Consistentie.** Geef Gemini een referentiebeeld mee, bijvoorbeeld een frame uit een goedgekeurde video. Dan lijkt het steeds op hetzelfde model in dezelfde olijfkleurige sportkleding op dezelfde mat. Zo oogt de bibliotheek als één geheel.
- **Labelen.** Zet bij de foto "Illustratie, video volgt". Zo weet de patiënt dat het geen instructievideo is.
- **Voorwaarden en watermerk.** De gratis versie van Gemini zet een (onzichtbaar) SynthID-watermerk en soms een zichtbaar logo. Controleer de gebruiksvoorwaarden voor gebruik in een betaalde zorgapp. Zet er geen echte patiënten of herkenbare personen in.

**Advies voor de volgorde**
1. Doe eerst blok 1: de 6 bestaande video's koppelen. Dat kost geen nieuw beeld.
2. Maak dan AI-foto's (start en eind) voor de oefeningen met "AI-foto geschikt", te beginnen met de oefeningen die het vaakst in programma's worden voorgeschreven.
3. Voor de oefeningen met "Liever echte foto/still": maak een telefoonfoto in de praktijk of wacht op de video.
4. Vervang de foto door de video zodra die is goedgekeurd. Laat de foto staan als thumbnail.

## 5. Werkwijze met Gemini Pro (betaald abonnement)

Met Gemini Pro heb je het betere beeldmodel (Nano Banana Pro) en hogere dagelijkse limieten, dus de hele lijst is in een paar sessies te doen. Je hebt ook beperkt toegang tot Veo voor korte video's. Het onzichtbare SynthID-watermerk blijft altijd aanwezig. Of er ook een zichtbaar logo op komt, hangt af van je abonnement: controleer dat bij je eerste beeld.

**Werkwijze per oefening**
1. Upload een referentiebeeld: een frame uit een goedgekeurde video, zodat steeds hetzelfde model in dezelfde kleding wordt gebruikt.
2. Vraag om één afbeelding met de start- en eindpositie naast elkaar, gebruik de prompt hieronder.
3. Laat de afbeelding klinisch keuren. Bij een fout: benoem precies wat er mis is ("linkerknie moet 90 graden zijn") en laat Gemini alleen dat aanpassen.
4. Upload de afbeelding als foto bij de oefening ("Media beheren") met de tekst "Illustratie, video volgt".

**Prompt-sjabloon**

> Gebruik de persoon, kleding en mat uit de referentiefoto. Maak één fotorealistische afbeelding, zijaanzicht, rustige lichte achtergrond, hele lichaam in beeld. Links de startpositie, rechts de eindpositie van de oefening **[naam]**.
> Startpositie: **[startpositie uit de oefentekst]**.
> Eindpositie: **[beweging uit de oefentekst]**.
> Let op: **[2 à 3 belangrijkste aandachtspunten, bv. rug neutraal, knie boven de voet]**. Geen tekst, geen pijlen, geen extra personen.

De start-, bewegings- en cuetekst staan per oefening al in de app. Kopieer die, dan klopt het beeld met de instructie die de patiënt leest.

**Video met Veo?** Tekst-naar-video werd eerder afgekeurd. Beeld-naar-video vanaf een *goedgekeurde* startfoto heeft meer kans, omdat de houding dan al vastligt. Probeer het eerst met één eenvoudige oefening en laat die net zo streng keuren als de eerdere video's.
