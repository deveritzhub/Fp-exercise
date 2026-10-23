/**
 * Completion of the Functional Performance library exercises: starting position, execution and target
 * muscles where the source files left them empty. General exercise descriptions written for this app
 * (no copied third-party content, no clinical thresholds). They only fill empty fields and never
 * overwrite text a practice wrote; every exercise keeps its "to review" status until a
 * physiotherapist approves it. Keyed by the exercise's source_key.
 */
type T = { start: [string, string]; move?: [string, string]; muscles?: string[] };

export const EXERCISE_TEXTS: Record<string, T> = {
  // --- Revalidatie --------------------------------------------------------------------------
  ex_band_external_rotation: {
    start: ['Staand, ellebogen 90 graden gebogen tegen je zij, een weerstandsband in beide handen of vast aan een deurklink.', 'Standing, elbows bent 90 degrees against your sides, a resistance band in both hands or fixed to a door handle.'],
    muscles: ['m. infraspinatus', 'm. teres minor'],
  },
  ex_cat_camel: {
    start: ['Op handen en knieën, handen onder de schouders en knieën onder de heupen.', 'On hands and knees, hands under the shoulders and knees under the hips.'],
    muscles: ['rugstrekkers', 'buikspieren'],
  },
  ex_chin_tuck: {
    start: ['Rechtop zittend of staand, schouders ontspannen, blik recht vooruit.', 'Sitting or standing upright, shoulders relaxed, looking straight ahead.'],
    muscles: ['diepe nekflexoren'],
  },
  ex_clamshell: {
    start: ['Op je zij, heupen en knieën licht gebogen, voeten op elkaar, eventueel een band om de knieën.', 'On your side, hips and knees slightly bent, feet together, optionally a band around the knees.'],
    muscles: ['m. gluteus medius', 'heupexorotatoren'],
  },
  ex_dead_bug: {
    start: ['Op je rug, armen recht omhoog, heupen en knieën 90 graden gebogen, onderrug rustig tegen de mat.', 'On your back, arms straight up, hips and knees bent 90 degrees, lower back resting on the mat.'],
    muscles: ['m. transversus abdominis', 'm. rectus abdominis', 'schuine buikspieren'],
  },
  ex_glute_bridge: {
    start: ['Op je rug, knieën gebogen, voeten plat op heupbreedte, armen naast je.', 'On your back, knees bent, feet flat at hip width, arms by your sides.'],
    muscles: ['m. gluteus maximus', 'hamstrings'],
  },
  ex_heel_raise_bilateraal: {
    start: ['Staand op beide voeten op heupbreedte, eventueel met de voorvoeten op een trede, licht steun met de handen.', 'Standing on both feet at hip width, optionally with the forefeet on a step, light support with the hands.'],
    muscles: ['m. gastrocnemius', 'm. soleus'],
  },
  ex_heel_raise_eenbenig: {
    start: ['Staand op één been, knie gestrekt maar niet op slot, licht steun met een hand tegen de muur.', 'Standing on one leg, knee straight but not locked, light support with one hand against the wall.'],
    muscles: ['m. gastrocnemius', 'm. soleus'],
  },
  ex_heel_slide: {
    start: ['Op je rug, benen gestrekt, eventueel een handdoek of sok onder de hiel zodat die makkelijk glijdt.', 'On your back, legs straight, optionally a towel or sock under the heel so it slides easily.'],
    muscles: ['hamstrings', 'm. quadriceps femoris'],
  },
  ex_hip_flexor_stretch: {
    start: ['Halfknielend: één knie op een zachte ondergrond, de andere voet plat voor je, romp rechtop.', 'Half-kneeling: one knee on a soft surface, the other foot flat in front of you, trunk upright.'],
    muscles: ['m. iliopsoas', 'm. rectus femoris'],
  },
  ex_iso_bilbrug: {
    start: ['Op je rug, knieën gebogen, voeten plat op heupbreedte, armen naast je.', 'On your back, knees bent, feet flat at hip width, arms by your sides.'],
    muscles: ['m. gluteus maximus', 'hamstrings'],
  },
  ex_iso_hamstring_muur: {
    start: ['Op je rug voor een muur, hiel van het oefenbeen op de muur met de knie licht gebogen.', 'On your back in front of a wall, heel of the exercising leg on the wall with the knee slightly bent.'],
    muscles: ['hamstrings'],
  },
  ex_iso_heup_abductie: {
    start: ['Staand naast een muur, de buitenkant van het knie- of enkelgebied van het oefenbeen tegen de muur.', 'Standing next to a wall, the outside of the knee or ankle of the exercising leg against the wall.'],
    muscles: ['m. gluteus medius', 'm. gluteus minimus'],
  },
  ex_iso_knie_extensie_90: {
    start: ['Zittend op een stoel of bank, knie ongeveer 90 graden gebogen, enkel tegen een vast punt of band.', 'Sitting on a chair or bench, knee bent about 90 degrees, ankle against a fixed point or band.'],
    muscles: ['m. quadriceps femoris'],
  },
  ex_iso_kuit_staand: {
    start: ['Staand, licht steun met de handen, hielen een paar centimeter van de grond.', 'Standing, light support with the hands, heels a few centimetres off the floor.'],
    muscles: ['m. gastrocnemius', 'm. soleus'],
  },
  ex_iso_nek: {
    start: ['Rechtop zittend, hoofd in neutrale stand, een hand tegen voorhoofd, zijkant of achterhoofd.', 'Sitting upright, head in neutral, one hand against the forehead, side or back of the head.'],
    muscles: ['nekflexoren', 'nekextensoren', 'laterale nekspieren'],
  },
  ex_iso_schouder_extern: {
    start: ['Staand naast een deurpost, elleboog 90 graden gebogen tegen je zij, buitenkant van de pols tegen de deurpost.', 'Standing next to a door frame, elbow bent 90 degrees against your side, outside of the wrist against the frame.'],
    muscles: ['m. infraspinatus', 'm. teres minor'],
  },
  ex_kniebuiging_muur: {
    start: ['Staand voor een muur, het oefenbeen voor, voet een handbreedte van de muur, handen tegen de muur.', 'Standing facing a wall, the exercising leg forward, foot a hand’s width from the wall, hands on the wall.'],
    muscles: ['m. soleus', 'enkelgewricht'],
  },
  ex_lateral_bound: {
    start: ['Staand op één been, knie en heup licht gebogen, armen klaar om mee te zwaaien.', 'Standing on one leg, knee and hip slightly bent, arms ready to swing.'],
    muscles: ['m. gluteus medius', 'm. quadriceps femoris', 'kuitspieren'],
  },
  ex_leg_press: {
    start: ['In het leg-press-apparaat, rug en bekken tegen de rugleuning, voeten op heupbreedte op het voetplateau.', 'In the leg press machine, back and pelvis against the backrest, feet at hip width on the footplate.'],
    muscles: ['m. quadriceps femoris', 'm. gluteus maximus'],
  },
  ex_nordic_hamstring: {
    start: ['Knielend op een zachte ondergrond, enkels vastgehouden door een partner of onder een vaste steun, romp rechtop.', 'Kneeling on a soft surface, ankles held by a partner or under a fixed support, trunk upright.'],
    muscles: ['hamstrings'],
  },
  ex_pogo_hopping: {
    start: ['Staand op beide voeten op heupbreedte, knieën licht gebogen, gewicht op de voorvoeten.', 'Standing on both feet at hip width, knees slightly bent, weight on the forefeet.'],
    muscles: ['kuitspieren', 'achillespees'],
  },
  ex_quad_set: {
    start: ['Op je rug of zittend met het been gestrekt, eventueel een opgerolde handdoek onder de knie.', 'Lying on your back or sitting with the leg straight, optionally a rolled towel under the knee.'],
    muscles: ['m. quadriceps femoris'],
  },
  ex_scapular_retraction: {
    start: ['Rechtop zittend of staand, armen ontspannen langs je lichaam.', 'Sitting or standing upright, arms relaxed by your sides.'],
    muscles: ['m. trapezius (middelste deel)', 'mm. rhomboidei'],
  },
  ex_side_plank: {
    start: ['Op je zij, steunend op je onderarm met de elleboog onder de schouder, knieën of voeten op elkaar.', 'On your side, supported on the forearm with the elbow under the shoulder, knees or feet stacked.'],
    muscles: ['schuine buikspieren', 'm. quadratus lumborum', 'm. gluteus medius'],
  },
  ex_single_leg_balance: {
    start: ['Staand op één been naast een stoel of muur, knie licht gebogen.', 'Standing on one leg next to a chair or wall, knee slightly bent.'],
    muscles: ['enkelstabilisatoren', 'm. gluteus medius'],
  },
  ex_single_leg_rdl: {
    start: ['Staand op één been, knie licht gebogen, eventueel een gewicht in de hand aan de andere kant.', 'Standing on one leg, knee slightly bent, optionally a weight in the opposite hand.'],
    muscles: ['hamstrings', 'm. gluteus maximus', 'm. gluteus medius'],
  },
  ex_split_squat_bulgarian: {
    start: ['Staand voor een bank, de wreef van het achterste been op de bank, voorste voet ruim voor je.', 'Standing in front of a bench, the top of the back foot on the bench, front foot well in front of you.'],
    muscles: ['m. quadriceps femoris', 'm. gluteus maximus'],
  },
  ex_step_up: {
    start: ['Staand voor een trede of kist, de hele voet van het oefenbeen op de trede.', 'Standing in front of a step or box, the whole foot of the exercising leg on the step.'],
    muscles: ['m. quadriceps femoris', 'm. gluteus maximus'],
  },
  ex_terminal_knee_extension: {
    start: ['Staand, een band achter de knie die vastzit aan een vast punt voor je, knie licht gebogen.', 'Standing, a band behind the knee anchored to a fixed point in front of you, knee slightly bent.'],
    muscles: ['m. quadriceps femoris (m. vastus medialis)'],
  },
  ex_thoracic_rotatie: {
    start: ['Op je zij, heupen en knieën 90 graden gebogen, knieën op elkaar, armen gestrekt voor je.', 'On your side, hips and knees bent 90 degrees, knees together, arms straight in front of you.'],
    muscles: ['thoracale wervelkolom (mobiliteit)'],
  },
  ex_tibialis_raise: {
    start: ['Met je rug en billen tegen een muur, voeten een stap naar voren, benen gestrekt.', 'Back and buttocks against a wall, feet one step forward, legs straight.'],
    muscles: ['m. tibialis anterior'],
  },
  ex_toe_yoga: {
    start: ['Zittend op een stoel, voeten plat op de grond.', 'Sitting on a chair, feet flat on the floor.'],
    muscles: ['intrinsieke voetspieren'],
  },
  // --- Neurodynamiek ------------------------------------------------------------------------
  nd_median_slider: {
    start: ['Staand of zittend, arm zijwaarts op schouderhoogte, elleboog gebogen, handpalm naar boven.', 'Standing or sitting, arm out to the side at shoulder height, elbow bent, palm up.'],
    muscles: ['n. medianus (zenuwmobiliteit)'],
  },
  nd_median_tensioner: {
    start: ['Staand of zittend, arm zijwaarts op schouderhoogte, elleboog gebogen, handpalm naar boven.', 'Standing or sitting, arm out to the side at shoulder height, elbow bent, palm up.'],
    muscles: ['n. medianus (zenuwmobiliteit)'],
  },
  nd_sciatic_slider: {
    start: ['Rechtop zittend op de rand van een stoel, handen op de bovenbenen.', 'Sitting upright on the edge of a chair, hands on the thighs.'],
    muscles: ['n. ischiadicus (zenuwmobiliteit)'],
  },
  nd_slr_dorsiflexie: {
    start: ['Op je rug, het andere been gebogen met de voet plat, het oefenbeen gestrekt.', 'On your back, the other leg bent with the foot flat, the exercising leg straight.'],
    muscles: ['n. ischiadicus (zenuwmobiliteit)'],
  },
  nd_slump_slider: {
    start: ['Zittend op de rand van een tafel of stoel, romp licht gebogen, handen achter de rug of op de bovenbenen.', 'Sitting on the edge of a table or chair, trunk slightly slumped, hands behind the back or on the thighs.'],
    muscles: ['zenuwmobiliteit romp en been'],
  },
  nd_ulnar_slider: {
    start: ['Staand of zittend, arm zijwaarts, elleboog gebogen, hand met de vingers naar het oor.', 'Standing or sitting, arm out to the side, elbow bent, hand with the fingers toward the ear.'],
    muscles: ['n. ulnaris (zenuwmobiliteit)'],
  },
  // --- Krachttraining -----------------------------------------------------------------------
  kr_back_squat: {
    start: ['Staand onder de halterstang in het rek, stang op de bovenrug, voeten op schouderbreedte, tenen licht naar buiten.', 'Standing under the barbell in the rack, bar on the upper back, feet at shoulder width, toes slightly out.'],
    move: ['Span de buik aan, zak gecontroleerd door heupen en knieën te buigen met de knieën in lijn met de voeten, en duw jezelf weer omhoog tot staan.', 'Brace your trunk, lower under control by bending hips and knees with the knees in line with the feet, then push back up to standing.'],
  },
  kr_barbell_row: {
    start: ['Staand met de stang in de handen, knieën licht gebogen, romp naar voren gekanteld met een rechte rug.', 'Standing with the bar in your hands, knees slightly bent, trunk tilted forward with a straight back.'],
    move: ['Trek de stang naar je navel door de ellebogen langs je lichaam naar achteren te brengen, en laat hem gecontroleerd zakken.', 'Pull the bar toward your navel by driving the elbows back along your body, then lower it under control.'],
  },
  kr_bench_press: {
    start: ['Op je rug op een bank, ogen onder de stang, voeten plat op de grond, schouderbladen samen.', 'On your back on a bench, eyes under the bar, feet flat on the floor, shoulder blades together.'],
    move: ['Laat de stang gecontroleerd zakken naar de onderste borst en duw hem weer omhoog tot gestrekte armen.', 'Lower the bar under control to the lower chest and press it back up to straight arms.'],
  },
  kr_chest_supported_row: {
    start: ['Met de borst tegen een schuine bank of steun, armen hangend met een gewicht in elke hand.', 'Chest against an inclined bench or support, arms hanging with a weight in each hand.'],
    move: ['Trek de ellebogen naar achteren tot de gewichten bij je ribben zijn, en laat ze gecontroleerd zakken.', 'Pull the elbows back until the weights reach your ribs, then lower them under control.'],
  },
  kr_conventional_deadlift: {
    start: ['Staand met de middenvoet onder de stang, voeten op heupbreedte, stang vast met de handen net buiten de knieën.', 'Standing with mid-foot under the bar, feet at hip width, hands on the bar just outside the knees.'],
    move: ['Span de romp aan, duw de vloer weg en kom omhoog met de stang dicht langs je benen tot rechtop staan; zak op dezelfde manier terug.', 'Brace, push the floor away and stand up with the bar close to your legs; lower it the same way.'],
  },
  kr_core_plank: {
    start: ['Steunend op de onderarmen en tenen, ellebogen onder de schouders.', 'Supported on forearms and toes, elbows under the shoulders.'],
    move: ['Houd je lichaam in een rechte lijn van hoofd tot hielen, buik en billen aangespannen, en adem rustig door.', 'Hold your body in a straight line from head to heels, abdomen and glutes engaged, breathing calmly.'],
  },
  kr_db_curl: {
    start: ['Staand, een dumbbell in elke hand, armen gestrekt langs je lichaam, handpalmen naar voren.', 'Standing, a dumbbell in each hand, arms straight by your sides, palms forward.'],
    move: ['Buig de ellebogen en breng de gewichten naar je schouders zonder de ellebogen te verplaatsen, en laat ze gecontroleerd zakken.', 'Bend the elbows and bring the weights to your shoulders without moving the elbows, then lower them under control.'],
  },
  kr_face_pull: {
    start: ['Staand voor een kabel of band op ooghoogte, touw of band vast in beide handen, armen gestrekt.', 'Standing facing a cable or band at eye level, rope or band in both hands, arms straight.'],
    move: ['Trek het touw naar je gezicht met de ellebogen hoog en naar buiten, en laat gecontroleerd terug.', 'Pull the rope toward your face with the elbows high and wide, then return under control.'],
  },
  kr_hip_thrust: {
    start: ['Zittend op de grond met de bovenrug tegen een bank, knieën gebogen, voeten plat, gewicht of stang over de heupen.', 'Sitting on the floor with the upper back against a bench, knees bent, feet flat, weight or bar across the hips.'],
    move: ['Duw de heupen omhoog tot schouders, heupen en knieën in één lijn zijn, en laat ze gecontroleerd zakken.', 'Drive the hips up until shoulders, hips and knees are in line, then lower under control.'],
  },
  kr_incline_db_press: {
    start: ['Op je rug op een schuine bank, een dumbbell in elke hand ter hoogte van de schouders.', 'On your back on an incline bench, a dumbbell in each hand at shoulder level.'],
    move: ['Duw de gewichten omhoog tot gestrekte armen boven je schouders en laat ze gecontroleerd terugzakken.', 'Press the weights up to straight arms above your shoulders and lower them under control.'],
  },
  kr_lat_pulldown: {
    start: ['Zittend in het apparaat, bovenbenen onder de steun, stang breed vast met gestrekte armen.', 'Sitting in the machine, thighs under the pad, bar held wide with straight arms.'],
    move: ['Trek de stang naar je bovenborst door de ellebogen naar beneden te brengen, en laat hem gecontroleerd terug.', 'Pull the bar to your upper chest by driving the elbows down, then let it return under control.'],
  },
  kr_lateral_raise: {
    start: ['Staand, een dumbbell in elke hand langs je lichaam, ellebogen licht gebogen.', 'Standing, a dumbbell in each hand by your sides, elbows slightly bent.'],
    move: ['Til de armen zijwaarts tot schouderhoogte zonder te zwaaien en laat ze gecontroleerd zakken.', 'Raise the arms out to the side to shoulder height without swinging, then lower them under control.'],
  },
  kr_leg_curl: {
    start: ['Op je buik in het apparaat, de steun net boven de hielen, knieën net over de rand van de bank.', 'Face down in the machine, the pad just above the heels, knees just over the edge of the bench.'],
    move: ['Buig de knieën en breng de hielen richting je billen, en strek langzaam terug.', 'Bend the knees and bring the heels toward your buttocks, then straighten slowly.'],
  },
  kr_leg_extension: {
    start: ['Zittend in het apparaat, rug tegen de leuning, de steun voor de onderbenen net boven de enkels.', 'Sitting in the machine, back against the backrest, the pad in front of the lower legs just above the ankles.'],
    move: ['Strek de knieën gecontroleerd en laat ze langzaam terug buigen.', 'Straighten the knees under control and let them bend back slowly.'],
  },
  kr_leg_press: {
    start: ['In het leg-press-apparaat, rug en bekken tegen de leuning, voeten op schouderbreedte op het plateau.', 'In the leg press machine, back and pelvis against the backrest, feet at shoulder width on the platform.'],
    move: ['Buig de knieën tot ongeveer 90 graden en duw het plateau weer weg zonder de knieën op slot te zetten.', 'Bend the knees to about 90 degrees and push the platform away again without locking the knees.'],
  },
  kr_overhead_press: {
    start: ['Staand, stang op de voorkant van de schouders, handen net buiten schouderbreedte, buik en billen aan.', 'Standing, bar on the front of the shoulders, hands just outside shoulder width, abdomen and glutes engaged.'],
    move: ['Duw de stang recht omhoog tot gestrekte armen boven je hoofd en laat hem gecontroleerd terug naar de schouders.', 'Press the bar straight up to straight arms overhead and lower it under control to the shoulders.'],
  },
  kr_pull_up: {
    start: ['Hangend aan een optrekstang, handen op schouderbreedte, armen gestrekt.', 'Hanging from a pull-up bar, hands at shoulder width, arms straight.'],
    move: ['Trek jezelf op tot de kin boven de stang en laat je gecontroleerd zakken tot gestrekte armen.', 'Pull yourself up until the chin is over the bar, then lower under control to straight arms.'],
  },
  kr_rdl: {
    start: ['Staand met de stang in de handen voor de bovenbenen, knieën licht gebogen, voeten op heupbreedte.', 'Standing with the bar in your hands in front of the thighs, knees slightly bent, feet at hip width.'],
    move: ['Breng de heupen naar achteren met een rechte rug terwijl de stang langs je benen zakt, en kom weer omhoog door de heupen naar voren te duwen.', 'Push the hips back with a straight back while the bar slides down your legs, then come up by driving the hips forward.'],
  },
  kr_standing_calf_raise: {
    start: ['Staand met de voorvoeten op een verhoging, hielen vrij, eventueel met gewicht of in een apparaat.', 'Standing with the forefeet on a raised edge, heels free, optionally with weight or in a machine.'],
    move: ['Kom zo hoog mogelijk op de tenen en laat de hielen gecontroleerd onder de rand zakken.', 'Rise as high as possible onto the toes and lower the heels under control below the edge.'],
  },
  kr_triceps_pushdown: {
    start: ['Staand voor een kabel, stang of touw vast met de ellebogen gebogen tegen je zij.', 'Standing facing a cable, bar or rope in your hands with the elbows bent against your sides.'],
    move: ['Strek de ellebogen tot je armen gestrekt zijn, zonder de ellebogen te verplaatsen, en laat gecontroleerd terug.', 'Straighten the elbows until the arms are straight, without moving the elbows, then return under control.'],
  },
  // --- Mobiliteit ---------------------------------------------------------------------------
  mb_90_90: {
    start: ['Zittend op de grond, beide knieën 90 graden gebogen: het ene been voor je, het andere naast je.', 'Sitting on the floor, both knees bent 90 degrees: one leg in front of you, the other to the side.'],
    move: ['Draai rustig met beide knieën naar de andere kant, zodat de benen van positie wisselen, met de romp zo rechtop mogelijk.', 'Slowly rotate both knees to the other side so the legs swap position, keeping the trunk as upright as possible.'],
    muscles: ['heuprotatoren'],
  },
  mb_child_pose: {
    start: ['Op handen en knieën, knieën iets uit elkaar.', 'On hands and knees, knees slightly apart.'],
    move: ['Breng de billen richting de hielen en laat armen en voorhoofd naar de mat zakken. Adem rustig en blijf ontspannen.', 'Bring the buttocks toward the heels and let arms and forehead sink to the mat. Breathe calmly and stay relaxed.'],
    muscles: ['rugstrekkers', 'm. latissimus dorsi'],
  },
  mb_deep_squat_hold: {
    start: ['Staand, voeten iets breder dan heupbreedte, tenen licht naar buiten; eventueel een steun voor je.', 'Standing, feet slightly wider than hip width, toes slightly out; optionally a support in front of you.'],
    move: ['Zak rustig zo diep mogelijk in een squat met de hielen op de grond en de romp rechtop, blijf even zitten en kom weer omhoog.', 'Lower calmly into as deep a squat as possible with heels down and trunk upright, stay there for a moment and stand up again.'],
    muscles: ['heup', 'enkel', 'm. soleus'],
  },
  mb_doorway_pec: {
    start: ['Staand in een deuropening, onderarm verticaal tegen de deurpost met de elleboog op schouderhoogte.', 'Standing in a doorway, forearm vertical against the frame with the elbow at shoulder height.'],
    move: ['Stap met één voet naar voren en laat de borst rustig door de opening bewegen tot je een lichte rek voelt; houd vast en kom terug.', 'Step one foot forward and let the chest move gently through the doorway until you feel a light stretch; hold and come back.'],
    muscles: ['m. pectoralis major', 'm. pectoralis minor'],
  },
  mb_hamstring_stretch: {
    start: ['Op je rug, een band om de voet van het oefenbeen, het andere been gebogen of gestrekt op de grond.', 'On your back, a band around the foot of the exercising leg, the other leg bent or straight on the floor.'],
    move: ['Trek het been met de band omhoog tot je een lichte rek aan de achterkant voelt; houd vast en laat rustig zakken.', 'Pull the leg up with the band until you feel a light stretch at the back; hold and lower calmly.'],
    muscles: ['hamstrings'],
  },
  mb_nerve_glide_neck: {
    start: ['Rechtop zittend, schouders ontspannen, arm zijwaarts met de handpalm naar boven.', 'Sitting upright, shoulders relaxed, arm out to the side with the palm up.'],
    move: ['Kantel het hoofd naar de arm terwijl je de pols naar achteren buigt, en daarna van de arm af terwijl de pols ontspant. Rustig en zonder pijn.', 'Tilt the head toward the arm while bending the wrist back, then away from the arm while the wrist relaxes. Slowly and without pain.'],
    muscles: ['zenuwmobiliteit nek en arm'],
  },
  mb_sleeper_stretch: {
    start: ['Op je zij op de te oefenen schouder, arm voor je met de elleboog 90 graden gebogen.', 'On your side on the shoulder you are training, arm in front of you with the elbow bent 90 degrees.'],
    move: ['Duw met de andere hand de onderarm zacht richting de grond tot je een lichte rek achter in de schouder voelt; houd vast en laat los.', 'With the other hand gently push the forearm toward the floor until you feel a light stretch at the back of the shoulder; hold and release.'],
    muscles: ['achterste schouderkapsel', 'schouderexorotatoren'],
  },
  mb_wall_slide: {
    start: ['Met je rug of gezicht naar een muur, onderarmen tegen de muur, ellebogen op schouderhoogte.', 'Back or face to a wall, forearms against the wall, elbows at shoulder height.'],
    move: ['Schuif de armen langs de muur omhoog zonder de onderrug hol te trekken, en laat ze gecontroleerd terugzakken.', 'Slide the arms up the wall without arching the lower back, then let them slide back down under control.'],
    muscles: ['m. serratus anterior', 'm. trapezius (onderste deel)'],
  },
  mb_world_greatest: {
    start: ['In een diepe uitvalspas, achterste knie gestrekt of op de grond, handen naast de voorste voet.', 'In a deep lunge, back knee straight or on the floor, hands beside the front foot.'],
    move: ['Draai de arm aan de kant van het voorste been naar het plafond en kijk mee, breng hem terug en wissel na de herhalingen van kant.', 'Rotate the arm on the side of the front leg toward the ceiling and follow it with your eyes, bring it back and switch sides after the repetitions.'],
    muscles: ['heupbuigers', 'hamstrings', 'thoracale wervelkolom'],
  },
};
