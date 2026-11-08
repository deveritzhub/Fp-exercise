# Video shot list

Report only. No clips were generated for this list.

Inspected on the live branch: the seeded exercise libraries (`server/db/seed-data/exercises.ts` and the FP bundles), the 13 clinically approved library videos in `docs/VIDEOS.md` / `LIBRARY_VIDEOS`, the Seedance and Kling clips linked by source key, and `docs/VIDEO-MASTERPROMPTS.md` (3 November).

**Already linked:** 30 exercise rows have a clip (the 13 approved remakes, plus Seedance and Kling files, including aliases such as clamshell → schelp and glute bridge → bekkenbrug). They are listed at the bottom and are not shot again.

**Still needed:** 142 exercise rows have no linked video, plus one combined drill that is not its own library row yet: sideplank clamshell. Ordered by how often the id appears in programme templates, then the original demo templates, then a mention in the complaint guide. A higher count means "film this first". One clip can be linked to a rehab id and a mobility id when the movement is the same.

Nine movements already have a master prompt from 3 November (leg press, plank, hip-flexor stretch, lat pulldown, overhead press, incline dumbbell press, face pull, chest-supported row, standing calf raise). Those prompts are copied here because the clips are still not in the library. Standing calf raise in the approved set is the bilateral heel raise; the machine/step version in the master prompt is a separate shot.

Duration for every new shot: **5 seconds**, one slow repetition, so it can loop in the app. No medical claims in the prompts: no pain scores, no diagnosis, no promise of recovery.

For the hop and bound clips only (lateral bound, on-the-spot stiff jumps, single-leg hop and stick, pogo hops), delete the words `jumping` and `running` from the negative prompt so the jump itself is allowed. Every other clip keeps them.

## Negative prompt (paste with every clip)

```
cropped head, head out of frame, feet out of frame, cut-off limbs, close-up, medium shot, camera movement, zoom, pan, tilt, handheld, shaky camera, cuts, multiple people, mirror, reflection, text, subtitles, logo, watermark, music, walking away, stepping off, jumping, running, extra limbs, extra fingers, distorted hands, morphing body, wrong exercise, fast movement, blurry
```

## 1. Sideplank clamshell

- **Dutch:** Zijplank-schelp (sideplank clamshell)
- **English:** Side-plank clamshell
- **Library:** not a separate row. The knee side plank (`side_plank_knees` / Zijplank op knieën) and the banded clamshell (`ex_clamshell`) each already have a clip. This shot is the two together.
- **Why first:** the complaint guide pairs a side plank with a clamshell for the hip, and the combined shape is easy for a generator to get wrong.
- **Movement:** from a forearm side plank with the knees bent about 90 degrees and the hips lifted, the top knee opens and then closes. The feet stay together. The hips stay up.
- **Start:** on the side, elbow under the shoulder, forearm on the mat, both knees bent about 90 degrees, feet together, hips already lifted in a straight line from shoulder to knees.
- **Camera:** exact side view, whole body, locked tripod at hip height, about 3.5 m. Duration 5 s.

```
Static locked-off camera on a tripod at hip height, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the knees and feet, with clear empty space above the head and beyond the feet; the person fills about 65 percent of the frame width and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat. Realistic, natural human motion.

Start position: side plank on the forearm. The person lies on the right side, facing the right of the frame. The right elbow is directly under the right shoulder, forearm flat on the mat pointing forward. Both knees are bent about 90 degrees, feet stacked and touching, toes pointing toward the right. The hips are already lifted so the body is a straight line from the shoulder through the hip to the knees. The top (left) hand rests on the left hip. The hips stay up for the whole clip.
Movement, one slow repetition:
0 to 1 seconds: hold the lifted side plank completely still, knees bent about 90 degrees, feet together, hips up.
1 to 2.5 seconds: the top knee opens upward, rotating only at the hip, like a clamshell, until the knees are apart. The feet stay pressed together and do not slide. The hips stay lifted at the same height. The pelvis does not roll backward. The supporting elbow stays under the shoulder.
2.5 to 3.5 seconds: hold the open knee, hips still up, feet still together.
3.5 to 5 seconds: the top knee closes slowly back onto the bottom knee. The feet never separate. The hips never drop to the mat.
No sagging hips, no straight legs, no rolling onto the back, no lifting the feet apart.
```

## 2. Externe rotatie met band

- **Dutch:** Externe rotatie met band
- **English:** External rotation with band
- **Id:** `ex_band_external_rotation`
- **Why here:** 6× in programme templates.
- **Movement:** Elbow against your side, rotate the forearm outwards against the band.
- **Start:** Standing, elbows bent 90 degrees against your sides, a resistance band in both hands or fixed to a door handle.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing, elbows bent 90 degrees against your sides, a resistance band in both hands or fixed to a door handle.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Elbow against your side, rotate the forearm outwards against the band.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 3. Heupflexor-rek kniestand

- **Dutch:** Heupflexor-rek kniestand
- **English:** Half-kneeling hip-flexor stretch
- **Id:** `mb_hip_flexor_stretch`
- **Why here:** 6× in programme templates. Prompt copied from the 3 November masterprompt.
- **Movement:** Shift the pelvis slightly forward, the trunk stays upright, and the lower back stays neutral.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod at hip height, 3.5 metres away, wide shot, exact side view. The ENTIRE body is always fully in frame from the top of the head to the feet, with clear empty space above the head and below; the person fills about 55 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat. Realistic, natural human motion.

Start position: half-kneeling lunge on the mat, facing right: the left knee rests on the mat directly under the hip, the right foot is flat on the mat in front with the right knee bent 90 degrees above the ankle. Upper body tall and upright, hands on the hips.
Movement:
0 to 2 seconds: the person tucks the pelvis slightly under and shifts the hips gently forward a few centimetres, the upper body stays upright, a stretch at the front of the left hip.
2 to 4 seconds: holds the stretch calmly, breathing.
4 to 5 seconds: shifts slowly back to the start position.
The back knee stays on the mat, the front knee does not move past the toes.
```

## 4. Leg press

- **Dutch:** Leg press
- **English:** Leg press
- **Id:** `kr_leg_press`
- **Why here:** 6× in programme templates. Prompt copied from the 3 November masterprompt.
- **Movement:** Voeten op schouderbreedte, knieën niet volledig op slot.
- **Start:** In the leg press machine, back and pelvis against the backrest, feet at shoulder width on the platform.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 5 metres away, wide shot, three-quarter front view from the side of the machine. The ENTIRE person and the ENTIRE leg press machine are always fully in frame, with empty space around them; the machine fills about 70 percent of the frame width. No camera movement, no zoom, no cuts. Bright modern gym area of a physiotherapy practice, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers. Realistic, natural human motion.

Equipment: a 45-degree plate-loaded leg press machine with a large flat foot platform and a reclined padded seat.
Start position: the person sits with back and head against the backrest, hands on the side handles, both feet flat on the middle of the platform at hip width, legs almost straight but knees not locked.
Movement, one slow repetition:
0 to 2 seconds: the platform slides slowly down towards the person as the knees bend, until the knees are bent about 90 degrees.
2 to 2.5 seconds: short pause at the bottom, lower back stays against the seat.
2.5 to 4.5 seconds: the person presses the platform back up until the legs are almost straight, knees not locked.
4.5 to 5 seconds: rest in the start position.
Knees stay in line with the feet, heels stay on the platform.
```

## 5. Eenbenige romp-heup

- **Dutch:** Eenbenige romp-heup
- **English:** Single-leg Romanian deadlift
- **Id:** `ex_single_leg_rdl`
- **Why here:** 5× in programme templates.
- **Movement:** Stand on one leg and hinge the upper body forward from the hip with a straight back, letting the other leg move back.
- **Start:** Standing on one leg, knee slightly bent, optionally a weight in the opposite hand.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing on one leg, knee slightly bent, optionally a weight in the opposite hand.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Stand on one leg and hinge the upper body forward from the hip with a straight back, letting the other leg move back.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 6. Face pull

- **Dutch:** Face pull
- **English:** Face pull
- **Id:** `kr_face_pull`
- **Why here:** 5× in programme templates. Prompt copied from the 3 November masterprompt.
- **Movement:** Trek het touw naar het gezicht, ellebogen hoog.
- **Start:** Standing facing a cable or band at eye level, rope or band in both hands, arms straight.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod at chest height, 4 metres away, wide shot, exact side view. The ENTIRE body from the top of the head to the feet and the cable machine pulley are always fully in frame, with empty space above the head; the person fills about 55 percent of the frame height. No camera movement, no zoom, no cuts. Bright modern gym area of a physiotherapy practice, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers. Realistic, natural human motion.

Equipment: a cable machine with the pulley set at face height and a rope attachment.
Start position: standing tall facing the cable machine, one step back, feet hip-width, holding both ends of the rope with thumbs pointing back, arms straight in front at face height.
Movement, one slow repetition:
0 to 2 seconds: pulls the rope towards the forehead, elbows go out wide and stay high at shoulder height, the two rope ends separate beside the ears, shoulder blades squeeze together, hands end beside the head.
2 to 2.5 seconds: holds.
2.5 to 5 seconds: lets the arms go slowly back to straight.
The body stays upright, no leaning back.
```

## 7. Incline dumbbell press

- **Dutch:** Incline dumbbell press
- **English:** Incline dumbbell press
- **Id:** `kr_incline_db_press`
- **Why here:** 5× in programme templates. Prompt copied from the 3 November masterprompt.
- **Movement:** Bank op 30 tot 45 graden, elleboog onder de schouder.
- **Start:** On your back on an incline bench, a dumbbell in each hand at shoulder level.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod at bench height, 3.5 metres away, wide shot, exact side view. The ENTIRE person, the bench and both dumbbells are always fully in frame including the dumbbells at their highest point, with empty space around them. No camera movement, no zoom, no cuts. Bright modern gym area of a physiotherapy practice, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers. Realistic, natural human motion.

Equipment: an adjustable bench with the backrest at 30 degrees.
Start position: lying back on the incline bench, feet flat on the floor, holding one dumbbell in each hand at the sides of the upper chest, palms facing forward, elbows about 45 degrees from the body.
Movement, one slow repetition:
0 to 2 seconds: presses both dumbbells up until the arms are straight above the upper chest, dumbbells close but not touching.
2 to 2.5 seconds: holds at the top.
2.5 to 5 seconds: lowers both dumbbells slowly back to the sides of the upper chest.
Wrists straight, back and head stay on the bench, feet stay on the floor.
```

## 8. Kniebuiging tegen muur

- **Dutch:** Kniebuiging tegen muur
- **English:** Knee-to-wall bend
- **Id:** `mb_kniebuiging_muur`
- **Why here:** 5× in programme templates.
- **Movement:** Voet op vaste lijn, knie naar de muur, hiel blijft op de grond
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Voet op vaste lijn, knie naar de muur, hiel blijft op de grond
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 9. Lat pulldown

- **Dutch:** Lat pulldown
- **English:** Lat pulldown
- **Id:** `kr_lat_pulldown`
- **Why here:** 5× in programme templates. Prompt copied from the 3 November masterprompt.
- **Movement:** Borst naar de stang, schouderbladen naar beneden.
- **Start:** Sitting in the machine, thighs under the pad, bar held wide with straight arms.
- **Camera:** Three-quarter view, person and any cable or bench fully in frame, camera locked. Duration 5 s.

```
Static locked-off camera on a tripod at chest height, 4.5 metres away, wide shot, three-quarter back view. The ENTIRE person and the ENTIRE lat pulldown machine including the top pulley and the bar are always fully in frame, with empty space around them. No camera movement, no zoom, no cuts. Bright modern gym area of a physiotherapy practice, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers. Realistic, natural human motion.

Start position: seated at the lat pulldown machine, thighs under the pads, feet flat, both arms straight up holding a long wide bar with an overhand grip wider than the shoulders, chest up.
Movement, one slow repetition:
0 to 2 seconds: pulls the bar down in front of the face to the upper chest, elbows drive down and back, shoulder blades squeeze together, chest stays up, torso leans back only slightly.
2 to 2.5 seconds: short pause with the bar at the upper chest.
2.5 to 5 seconds: lets the bar rise slowly back up until the arms are straight.
The bar never goes behind the neck.
```

## 10. Overhead press

- **Dutch:** Overhead press
- **English:** Overhead press
- **Id:** `kr_overhead_press`
- **Why here:** 5× in programme templates. Prompt copied from the 3 November masterprompt.
- **Movement:** Bil en buik aan, stang langs het gezicht, hoofd naar voren bij het passeren.
- **Start:** Standing, bar on the front of the shoulders, hands just outside shoulder width, abdomen and glutes engaged.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod at hip height, 4 metres away, wide shot, exact side view. The ENTIRE body and the barbell are always fully in frame from above the raised hands to the feet, with clear empty space above the bar at its highest point and below the feet; the person fills about 55 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers. Realistic, natural human motion.

Start position: standing tall, feet hip-width, holding a barbell with light plates at the front of the shoulders, hands just wider than the shoulders, elbows slightly in front of the bar.
Movement, one slow repetition:
0 to 2 seconds: presses the bar straight up; the head moves slightly back to let the bar pass, then forward under the bar; arms end fully straight overhead with the bar above the middle of the feet.
2 to 2.5 seconds: holds at the top.
2.5 to 5 seconds: lowers the bar slowly back to the front of the shoulders.
Glutes and core tight, no backward lean, legs stay straight, no knee bend.
```

## 11. Staande kuitheffen

- **Dutch:** Staande kuitheffen
- **English:** Standing calf raise
- **Id:** `kr_standing_calf_raise`
- **Why here:** 5× in programme templates. Prompt copied from the 3 November masterprompt.
- **Movement:** Volledige rek onderin, volledige contractie bovenin.
- **Start:** Standing with the forefeet on a raised edge, heels free, optionally with weight or in a machine.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers. Realistic, natural human motion.

Equipment: a low black aerobic step stands in the centre of the frame, parallel to the camera.
Start position: the person stands upright on the step, facing to the right of the frame. Only the balls of both feet are on the front edge of the step; both heels hang clearly in the air beyond the edge. One hand rests lightly on the wall for balance. Knees straight, body tall.
Movement, one slow repetition:
0 to 1 seconds: heels drop slowly below the level of the step, a visible stretch in the calves.
1 to 2.5 seconds: the person rises straight up onto the tips of the toes as high as possible, the whole body moves up in one straight line, knees stay straight.
2.5 to 3.5 seconds: holds at the top on the toes.
3.5 to 5 seconds: lowers the heels slowly back down below the step.
The feet never move position, the person does not step off, the body stays vertical.
```

## 12. 90/90 heupmobiliteit

- **Dutch:** 90/90 heupmobiliteit
- **English:** 90/90 hip mobility
- **Id:** `mb_90_90`
- **Why here:** 4× in programme templates.
- **Movement:** Zit op de grond, beide knieën op 90 graden, draai het bekken van de ene naar de andere zijde
- **Start:** Sitting on the floor, both knees bent 90 degrees: one leg in front of you, the other to the side.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sitting on the floor, both knees bent 90 degrees: one leg in front of you, the other to the side.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Zit op de grond, beide knieën op 90 graden, draai het bekken van de ene naar de andere zijde
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 13. Barbell bench press

- **Dutch:** Barbell bench press
- **English:** Barbell bench press
- **Id:** `kr_bench_press`
- **Why here:** 4× in programme templates.
- **Movement:** Schouderbladen samen, stang naar onderste borst, voeten stevig op de grond.
- **Start:** On your back on a bench, eyes under the bar, feet flat on the floor, shoulder blades together.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: On your back on a bench, eyes under the bar, feet flat on the floor, shoulder blades together.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Schouderbladen samen, stang naar onderste borst, voeten stevig op de grond. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 14. Borstspier rek in deuropening

- **Dutch:** Borstspier rek in deuropening
- **English:** Doorway chest stretch
- **Id:** `mb_doorway_pec`
- **Why here:** 4× in programme templates.
- **Movement:** Onderarm tegen de deurpost, licht naar voren
- **Start:** Standing in a doorway, forearm vertical against the frame with the elbow at shoulder height.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing in a doorway, forearm vertical against the frame with the elbow at shoulder height.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Onderarm tegen de deurpost, licht naar voren
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 15. Chest-supported row

- **Dutch:** Chest-supported row
- **English:** Chest-supported row
- **Id:** `kr_chest_supported_row`
- **Why here:** 4× in programme templates. Prompt copied from the 3 November masterprompt.
- **Movement:** Borst op de steun, trek de ellebogen naar achteren.
- **Start:** Chest against an inclined bench or support, arms hanging with a weight in each hand.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod at bench height, 3.5 metres away, wide shot, exact side view. The ENTIRE person, the bench and both dumbbells are always fully in frame from head to feet, with empty space around them. No camera movement, no zoom, no cuts. Bright modern gym area of a physiotherapy practice, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers. Realistic, natural human motion.

Equipment: an adjustable bench with the backrest at about 30 degrees.
Start position: lying face down with the chest on the incline backrest, chin just over the top of the bench, feet on the floor behind, arms hanging straight down towards the floor, one dumbbell in each hand, palms facing each other.
Movement, one slow repetition:
0 to 2 seconds: rows both dumbbells up towards the lower ribs, elbows close to the body and moving back past the torso, shoulder blades squeeze together.
2 to 2.5 seconds: holds at the top.
2.5 to 5 seconds: lowers the dumbbells slowly until the arms are straight again.
The chest stays on the bench the whole time.
```

## 16. Diepe squat hold

- **Dutch:** Diepe squat hold
- **English:** Deep squat hold
- **Id:** `mb_deep_squat_hold`
- **Why here:** 4× in programme templates.
- **Movement:** Hielen op de grond, romp rechtop, gebruik een steun als dat nodig is
- **Start:** Standing, feet slightly wider than hip width, toes slightly out; optionally a support in front of you.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing, feet slightly wider than hip width, toes slightly out; optionally a support in front of you.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Hielen op de grond, romp rechtop, gebruik een steun als dat nodig is The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 17. Hamstring rek op rug met band

- **Dutch:** Hamstring rek op rug met band
- **English:** Supine hamstring stretch with a band
- **Id:** `mb_hamstring_stretch`
- **Why here:** 4× in programme templates.
- **Movement:** Knie licht gebogen mag, rek tot licht ongemak
- **Start:** On your back, a band around the foot of the exercising leg, the other leg bent or straight on the floor.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: On your back, a band around the foot of the exercising leg, the other leg bent or straight on the floor.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Knie licht gebogen mag, rek tot licht ongemak
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 18. Laterale sprong met gecontroleerde landing

- **Dutch:** Laterale sprong met gecontroleerde landing
- **English:** Lateral bound with controlled landing
- **Id:** `ex_lateral_bound`
- **Why here:** 4× in programme templates.
- **Movement:** Jump sideways onto one leg and land stable. Hold the landing for 2 seconds.
- **Start:** Standing on one leg, knee and hip slightly bent, arms ready to swing.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing on one leg, knee and hip slightly bent, arms ready to swing.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Jump sideways onto one leg and land stable. Hold the landing for 2 seconds. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 19. Liggende leg curl

- **Dutch:** Liggende leg curl
- **English:** Lying leg curl
- **Id:** `kr_leg_curl`
- **Why here:** 4× in programme templates.
- **Movement:** Heupen plat op de bank, langzame excentrische fase.
- **Start:** Face down in the machine, the pad just above the heels, knees just over the edge of the bench.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Face down in the machine, the pad just above the heels, knees just over the edge of the bench.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Heupen plat op de bank, langzame excentrische fase.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 20. Medianus slider

- **Dutch:** Medianus slider
- **English:** Median nerve slider
- **Id:** `nd_median_slider`
- **Why here:** 4× in programme templates.
- **Movement:** Sit upright, arm out to the side with the elbow bent and the wrist extended. Move the hand and head away from the body at the same time and back again, calmly.
- **Start:** Standing or sitting, arm out to the side at shoulder height, elbow bent, palm up.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing or sitting, arm out to the side at shoulder height, elbow bent, palm up.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Sit upright, arm out to the side with the elbow bent and the wrist extended. Move the hand and head away from the body at the same time and back again, calmly.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 21. Nordic hamstring

- **Dutch:** Nordic hamstring
- **English:** Nordic hamstring curl
- **Id:** `ex_nordic_hamstring`
- **Why here:** 4× in programme templates.
- **Movement:** Ankles secured, knees on the floor. Lower forward slowly as far as you can control and catch yourself with your hands.
- **Start:** Kneeling on a soft surface, ankles held by a partner or under a fixed support, trunk upright.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Kneeling on a soft surface, ankles held by a partner or under a fixed support, trunk upright.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Ankles secured, knees on the floor. Lower forward slowly as far as you can control and catch yourself with your hands.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 22. Plank

- **Dutch:** Plank
- **English:** Forearm plank
- **Id:** `kr_core_plank`
- **Why here:** 4× in programme templates. Prompt copied from the 3 November masterprompt.
- **Movement:** Rechte lijn van hoofd tot hielen, buik aan.
- **Start:** Supported on forearms and toes, elbows under the shoulders.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod at floor height plus 50 centimetres, 3 metres away, wide shot, exact side view. The ENTIRE body is always fully in frame from the head to the toes, with clear empty space on both ends and above the body; the body fills about 70 percent of the frame width and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat. Realistic, natural human motion.

0 to 1 seconds: the person is on the knees and forearms on the mat, elbows directly under the shoulders, forearms parallel.
1 to 2 seconds: lifts the knees off the mat into a forearm plank on the toes.
2 to 5 seconds: holds completely still: body in one perfectly straight line from head through hips to heels, hips not sagging and not raised, neck neutral looking at the floor, calm breathing visible in the chest.
```

## 23. Schouderbladen samentrekken

- **Dutch:** Schouderbladen samentrekken
- **English:** Scapular retraction
- **Id:** `ex_scapular_retraction`
- **Why here:** 4× in programme templates.
- **Movement:** Gently draw the shoulder blades together and down without shrugging the shoulders.
- **Start:** Sitting or standing upright, arms relaxed by your sides.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sitting or standing upright, arms relaxed by your sides.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Gently draw the shoulder blades together and down without shrugging the shoulders. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 24. Thoracale rotatie

- **Dutch:** Thoracale rotatie
- **English:** Thoracic rotation
- **Id:** `mb_thoracic_rotatie`
- **Why here:** 4× in programme templates.
- **Movement:** Hand achter het hoofd, draai de borst open naar het plafond
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Hand achter het hoofd, draai de borst open naar het plafond
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 25. Thoracale rotatie in zijligging

- **Dutch:** Thoracale rotatie in zijligging
- **English:** Side-lying thoracic rotation
- **Id:** `ex_thoracic_rotatie`
- **Why here:** 4× in programme templates.
- **Movement:** Lie on your side, knees bent. Rotate the upper body open to the other side while keeping the knees together.
- **Start:** On your side, hips and knees bent 90 degrees, knees together, arms straight in front of you.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: On your side, hips and knees bent 90 degrees, knees together, arms straight in front of you.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Lie on your side, knees bent. Rotate the upper body open to the other side while keeping the knees together. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 26. Wall slide

- **Dutch:** Wall slide
- **English:** Wall slide
- **Id:** `mb_wall_slide`
- **Why here:** 4× in programme templates.
- **Movement:** Onderarmen tegen de muur, schuif omhoog zonder de onderrug te laten holtrekken
- **Start:** Back or face to a wall, forearms against the wall, elbows at shoulder height.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Back or face to a wall, forearms against the wall, elbows at shoulder height.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Onderarmen tegen de muur, schuif omhoog zonder de onderrug te laten holtrekken
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 27. Back squat

- **Dutch:** Back squat
- **English:** Back squat
- **Id:** `kr_back_squat`
- **Why here:** 3× in programme templates.
- **Movement:** Brace voor het afzetten, knie in lijn met de voet, diepte tot parallel of dieper zonder dat het bekken kantelt.
- **Start:** Standing under the barbell in the rack, bar on the upper back, feet at shoulder width, toes slightly out.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing under the barbell in the rack, bar on the upper back, feet at shoulder width, toes slightly out.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Brace voor het afzetten, knie in lijn met de voet, diepte tot parallel of dieper zonder dat het bekken kantelt.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 28. Dumbbell curl

- **Dutch:** Dumbbell curl
- **English:** Dumbbell curl
- **Id:** `kr_db_curl`
- **Why here:** 3× in programme templates.
- **Movement:** Ellebogen vast, gecontroleerd zakken.
- **Start:** Standing, a dumbbell in each hand, arms straight by your sides, palms forward.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing, a dumbbell in each hand, arms straight by your sides, palms forward.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Ellebogen vast, gecontroleerd zakken.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 29. Kinderhouding

- **Dutch:** Kinderhouding
- **English:** Child's pose
- **Id:** `mb_child_pose`
- **Why here:** 3× in programme templates.
- **Movement:** Heupen naar de hielen, armen voor je uit
- **Start:** On hands and knees, knees slightly apart.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: On hands and knees, knees slightly apart.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Heupen naar de hielen, armen voor je uit The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 30. Triceps pushdown

- **Dutch:** Triceps pushdown
- **English:** Triceps pushdown
- **Id:** `kr_triceps_pushdown`
- **Why here:** 3× in programme templates.
- **Movement:** Ellebogen vast tegen de zij, volledig strekken.
- **Start:** Standing facing a cable, bar or rope in your hands with the elbows bent against your sides.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing facing a cable, bar or rope in your hands with the elbows bent against your sides.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Ellebogen vast tegen de zij, volledig strekken.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 31. Zijplank

- **Dutch:** Zijplank
- **English:** Side plank
- **Id:** `ex_side_plank`
- **Why here:** 3× in programme templates.
- **Movement:** Support yourself on the forearm and the side of the foot, and lift the hip into a straight line.
- **Start:** On your side, supported on the forearm with the elbow under the shoulder, knees or feet stacked.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: On your side, supported on the forearm with the elbow under the shoulder, knees or feet stacked.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Support yourself on the forearm and the side of the foot, and lift the hip into a straight line. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 32. Zijwaartse dumbbell raise

- **Dutch:** Zijwaartse dumbbell raise
- **English:** Dumbbell lateral raise
- **Id:** `kr_lateral_raise`
- **Why here:** 3× in programme templates.
- **Movement:** Lichte elleboogbuiging, tot schouderhoogte, geen zwaaien.
- **Start:** Standing, a dumbbell in each hand by your sides, elbows slightly bent.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing, a dumbbell in each hand by your sides, elbows slightly bent.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Lichte elleboogbuiging, tot schouderhoogte, geen zwaaien. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 33. Barbell row

- **Dutch:** Barbell row
- **English:** Barbell row
- **Id:** `kr_barbell_row`
- **Why here:** 2× in programme templates.
- **Movement:** Rug rechte hoek met de grond, trek naar de navel.
- **Start:** Standing with the bar in your hands, knees slightly bent, trunk tilted forward with a straight back.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing with the bar in your hands, knees slightly bent, trunk tilted forward with a straight back.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Rug rechte hoek met de grond, trek naar de navel.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 34. Gestrekt been heffen met dorsaalflexie (tensioner)

- **Dutch:** Gestrekt been heffen met dorsaalflexie (tensioner)
- **English:** Straight leg raise with dorsiflexion (tensioner)
- **Id:** `nd_slr_dorsiflexie`
- **Why here:** 2× in programme templates.
- **Movement:** Lie on your back and lift the straight leg until you feel the first tension, then pull the foot towards you. Hold, or lower calmly.
- **Start:** On your back, the other leg bent with the foot flat, the exercising leg straight.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: On your back, the other leg bent with the foot flat, the exercising leg straight.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Lie on your back and lift the straight leg until you feel the first tension, then pull the foot towards you. Hold, or lower calmly. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 35. Hielglijden

- **Dutch:** Hielglijden
- **English:** Heel slides
- **Id:** `ex_heel_slide`
- **Why here:** 2× in programme templates.
- **Movement:** Lie on your back and slide the heel towards your buttocks until the knee bends, then back again.
- **Start:** On your back, legs straight, optionally a towel or sock under the heel so it slides easily.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: On your back, legs straight, optionally a towel or sock under the heel so it slides easily.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Lie on your back and slide the heel towards your buttocks until the knee bends, then back again.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 36. Isometrisch kuitheffen staand

- **Dutch:** Isometrisch kuitheffen staand
- **English:** Standing isometric calf raise
- **Id:** `ex_iso_kuit_staand`
- **Why here:** 2× in programme templates.
- **Movement:** Stand on the balls of your feet with the knee straight and keep the heel raised without moving.
- **Start:** Standing, light support with the hands, heels a few centimetres off the floor.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing, light support with the hands, heels a few centimetres off the floor.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Stand on the balls of your feet with the knee straight and keep the heel raised without moving. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 37. Isometrische bilbrug

- **Dutch:** Isometrische bilbrug
- **English:** Isometric glute bridge
- **Id:** `ex_iso_bilbrug`
- **Why here:** 2× in programme templates.
- **Movement:** From the bridge position, keep the hips lifted without moving.
- **Start:** On your back, knees bent, feet flat at hip width, arms by your sides.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: On your back, knees bent, feet flat at hip width, arms by your sides.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: From the bridge position, keep the hips lifted without moving. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 38. Isometrische externe rotatie tegen deurpost

- **Dutch:** Isometrische externe rotatie tegen deurpost
- **English:** Isometric external rotation against a door frame
- **Id:** `ex_iso_schouder_extern`
- **Why here:** 2× in programme templates.
- **Movement:** Elbow at 90 degrees against your side, forearm against a door frame or band. Push outwards without moving.
- **Start:** Standing next to a door frame, elbow bent 90 degrees against your side, outside of the wrist against the frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing next to a door frame, elbow bent 90 degrees against your side, outside of the wrist against the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Elbow at 90 degrees against your side, forearm against a door frame or band. Push outwards without moving. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 39. Isometrische knie-extensie onder 90 graden

- **Dutch:** Isometrische knie-extensie onder 90 graden
- **English:** Isometric knee extension at 90 degrees
- **Id:** `ex_iso_knie_extensie_90`
- **Why here:** 2× in programme templates.
- **Movement:** Sit with the knee bent at 90 degrees against a fixed resistance. Push forward without moving.
- **Start:** Sitting on a chair or bench, knee bent about 90 degrees, ankle against a fixed point or band.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sitting on a chair or bench, knee bent about 90 degrees, ankle against a fixed point or band.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Sit with the knee bent at 90 degrees against a fixed resistance. Push forward without moving. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 40. Isometrische nek in vier richtingen

- **Dutch:** Isometrische nek in vier richtingen
- **English:** Isometric neck in four directions
- **Id:** `ex_iso_nek`
- **Why here:** 2× in programme templates.
- **Movement:** Hand against the forehead, back of the head or side of the head. Push against the hand without moving the head.
- **Start:** Sitting upright, head in neutral, one hand against the forehead, side or back of the head.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sitting upright, head in neutral, one hand against the forehead, side or back of the head.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Hand against the forehead, back of the head or side of the head. Push against the hand without moving the head. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 41. Kuitheffen op één been

- **Dutch:** Kuitheffen op één been
- **English:** Single-leg calf raise
- **Id:** `ex_heel_raise_eenbenig`
- **Why here:** 2× in programme templates.
- **Movement:** On one leg, knee straight. Rise slowly and lower in a controlled way with the heel below the step.
- **Start:** Standing on one leg, knee straight but not locked, light support with one hand against the wall.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing on one leg, knee straight but not locked, light support with one hand against the wall.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: On one leg, knee straight. Rise slowly and lower in a controlled way with the heel below the step.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 42. Leg press

- **Dutch:** Leg press
- **English:** Leg press
- **Id:** `ex_leg_press`
- **Why here:** 2× in programme templates.
- **Movement:** Push the platform away with both feet and let it return in a controlled way until the knee is at 90 degrees.
- **Start:** In the leg press machine, back and pelvis against the backrest, feet at hip width on the footplate.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: In the leg press machine, back and pelvis against the backrest, feet at hip width on the footplate.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Push the platform away with both feet and let it return in a controlled way until the knee is at 90 degrees.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 43. Medianus tensioner

- **Dutch:** Medianus tensioner
- **English:** Median nerve tensioner
- **Id:** `nd_median_tensioner`
- **Why here:** 2× in programme templates.
- **Movement:** Arm out to the side, elbow, wrist and fingers straight. Tilt the head away from the arm and hold one of the positions.
- **Start:** Standing or sitting, arm out to the side at shoulder height, elbow bent, palm up.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing or sitting, arm out to the side at shoulder height, elbow bent, palm up.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Arm out to the side, elbow, wrist and fingers straight. Tilt the head away from the arm and hold one of the positions. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 44. Nervus ischiadicus slider zittend

- **Dutch:** Nervus ischiadicus slider zittend
- **English:** Seated sciatic nerve slider
- **Id:** `nd_sciatic_slider`
- **Why here:** 2× in programme templates.
- **Movement:** Sit on the edge of a chair. Straighten the leg and neck at the same time, then bend back in the opposite movement.
- **Start:** Sitting upright on the edge of a chair, hands on the thighs.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sitting upright on the edge of a chair, hands on the thighs.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Sit on the edge of a chair. Straighten the leg and neck at the same time, then bend back in the opposite movement.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 45. Quadriceps isometrisch

- **Dutch:** Quadriceps isometrisch
- **English:** Isometric quadriceps (quad set)
- **Id:** `ex_quad_set`
- **Why here:** 2× in programme templates.
- **Movement:** Lie on your back with the leg straight. Tighten the thigh muscle and press the back of the knee towards the floor.
- **Start:** Lying on your back or sitting with the leg straight, optionally a rolled towel under the knee.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Lying on your back or sitting with the leg straight, optionally a rolled towel under the knee.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Lie on your back with the leg straight. Tighten the thigh muscle and press the back of the knee towards the floor. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 46. Slaapstretch schouder

- **Dutch:** Slaapstretch schouder
- **English:** Slaapstretch schouder
- **Id:** `mb_sleeper_stretch`
- **Why here:** 2× in programme templates.
- **Movement:** Lig op de zij, duw de onderarm zacht naar de vloer
- **Start:** On your side on the shoulder you are training, arm in front of you with the elbow bent 90 degrees.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: On your side on the shoulder you are training, arm in front of you with the elbow bent 90 degrees.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Lig op de zij, duw de onderarm zacht naar de vloer The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 47. Stijve sprongen op de plaats

- **Dutch:** Stijve sprongen op de plaats
- **English:** Pogo hops
- **Id:** `ex_pogo_hopping`
- **Why here:** 2× in programme templates.
- **Movement:** Short, stiff hops on the spot, springing mainly from the ankle with the knee slightly bent.
- **Start:** Standing on both feet at hip width, knees slightly bent, weight on the forefeet.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing on both feet at hip width, knees slightly bent, weight on the forefeet.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Short, stiff hops on the spot, springing mainly from the ankle with the knee slightly bent.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 48. Teen-yoga

- **Dutch:** Teen-yoga
- **English:** Toe yoga
- **Id:** `ex_toe_yoga`
- **Why here:** 2× in programme templates.
- **Movement:** Lift the big toe while the other toes stay on the floor, then switch.
- **Start:** Sitting on a chair, feet flat on the floor.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sitting on a chair, feet flat on the floor.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Lift the big toe while the other toes stay on the floor, then switch.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 49. Terminale knie-extensie met band

- **Dutch:** Terminale knie-extensie met band
- **English:** Terminal knee extension with band
- **Id:** `ex_terminal_knee_extension`
- **Why here:** 2× in programme templates.
- **Movement:** Band fixed behind the knee, knee slightly bent. Straighten the knee fully and hold.
- **Start:** Standing, a band behind the knee anchored to a fixed point in front of you, knee slightly bent.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing, a band behind the knee anchored to a fixed point in front of you, knee slightly bent.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Band fixed behind the knee, knee slightly bent. Straighten the knee fully and hold. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 50. Tibialis raise

- **Dutch:** Tibialis raise
- **English:** Tibialis raise
- **Id:** `ex_tibialis_raise`
- **Why here:** 2× in programme templates.
- **Movement:** Heels on the floor, lift the toes towards the shin.
- **Start:** Back and buttocks against a wall, feet one step forward, legs straight.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Back and buttocks against a wall, feet one step forward, legs straight.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Heels on the floor, lift the toes towards the shin.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 51. World's greatest stretch

- **Dutch:** World's greatest stretch
- **English:** World's greatest stretch
- **Id:** `mb_world_greatest`
- **Why here:** 2× in programme templates.
- **Movement:** Diepe lunge, draai open naar het plafond, dan het been naar voren
- **Start:** In a deep lunge, back knee straight or on the floor, hands beside the front foot.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: In a deep lunge, back knee straight or on the floor, hands beside the front foot.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Diepe lunge, draai open naar het plafond, dan het been naar voren
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 52. Roeien met weerstandsband

- **Dutch:** Roeien met weerstandsband
- **English:** Resistance band row
- **Id:** `band_row`
- **Why here:** 0× in programme templates; 2× in the original demo templates.
- **Movement:** Pull the band towards you, elbows close to your body, gently squeezing the shoulder blades. Return under control.
- **Start:** Stand or sit with the band anchored at chest height in front of you, arms straight.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand or sit with the band anchored at chest height in front of you, arms straight.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Pull the band towards you, elbows close to your body, gently squeezing the shoulder blades. Return under control. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 53. Zijwaarts lopen met band

- **Dutch:** Zijwaarts lopen met band
- **English:** Lateral band walk
- **Id:** `lateral_band_walk`
- **Why here:** 0× in programme templates; 2× in the original demo templates.
- **Movement:** Step sideways with small steps, keeping tension on the band. Then return.
- **Start:** Stand in a shallow squat with a band around the ankles or above the knees.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand in a shallow squat with a band around the ankles or above the knees.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Step sideways with small steps, keeping tension on the band. Then return.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 54. Actieve enkelmobiliteit (alfabet)

- **Dutch:** Actieve enkelmobiliteit (alfabet)
- **English:** Active ankle mobility (alphabet)
- **Id:** `ankle_arom`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Trace the alphabet in the air with your big toe.
- **Start:** Sit or lie with the lower leg free or supported on a cushion.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sit or lie with the lower leg free or supported on a cushion.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Trace the alphabet in the air with your big toe.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 55. Actieve nekrotatie

- **Dutch:** Actieve nekrotatie
- **English:** Active neck rotation
- **Id:** `neck_rotation`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Slowly turn your head to the left to a comfortable end position, back to centre and then to the right.
- **Start:** Sit upright with relaxed shoulders.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sit upright with relaxed shoulders.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Slowly turn your head to the left to a comfortable end position, back to centre and then to the right.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 56. Eenbenig hielheffen

- **Dutch:** Eenbenig hielheffen
- **English:** Single-leg calf raise
- **Id:** `sl_calf_raise`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Rise fully onto your toes and lower under control to just below the step edge.
- **Start:** Stand on one leg on the edge of a step, heel free, light support for balance.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand on one leg on the edge of a step, heel free, light support for balance.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Rise fully onto your toes and lower under control to just below the step edge.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 57. Eenbenig reiken op balanskussen

- **Dutch:** Eenbenig reiken op balanskussen
- **English:** Single-leg reach on balance pad
- **Id:** `balance_pad_reach`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Reach with the free leg forward, to the side and backward (star pattern), returning each time.
- **Start:** Stand on one leg on a balance pad.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand on one leg on a balance pad.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Reach with the free leg forward, to the side and backward (star pattern), returning each time.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 58. Endorotatie met weerstandsband

- **Dutch:** Endorotatie met weerstandsband
- **English:** Resistance band internal rotation
- **Id:** `ir_band`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Rotate your forearm towards your stomach and return under control.
- **Start:** Stand side-on with the band anchored on the side of the exercising arm. Elbow at 90 degrees by your side.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand side-on with the band anchored on the side of the exercising arm. Elbow at 90 degrees by your side.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Rotate your forearm towards your stomach and return under control.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 59. Eversie met weerstandsband

- **Dutch:** Eversie met weerstandsband
- **English:** Banded ankle eversion
- **Id:** `ankle_eversion_band`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Turn your foot outward against the band and return slowly.
- **Start:** Sit with your leg straight, band around the forefoot and held on the inside.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sit with your leg straight, band around the forefoot and held on the inside.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Turn your foot outward against the band and return slowly.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 60. Excentrisch hielzakken (gestrekte en gebogen knie)

- **Dutch:** Excentrisch hielzakken (gestrekte en gebogen knie)
- **English:** Eccentric heel drop (straight and bent knee)
- **Id:** `ecc_heel_drop`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Lift the unaffected leg and slowly lower the heel of the exercising leg below the step. Rise using both legs. Repeat with the knee slightly bent.
- **Start:** Stand with the balls of your feet on the edge of a step. Rise onto both toes.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand with the balls of your feet on the edge of a step. Rise onto both toes.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Lift the unaffected leg and slowly lower the heel of the exercising leg below the step. Rise using both legs. Repeat with the knee slightly bent.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 61. Excentrische eenbenige squat op decline

- **Dutch:** Excentrische eenbenige squat op decline
- **English:** Eccentric single-leg decline squat
- **Id:** `decline_squat_ecc`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Lower slowly on one leg to about 60 degrees of knee bend. Return to standing using both legs.
- **Start:** Stand on one leg on a decline board (about 25 degrees) with heels raised.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand on one leg on a decline board (about 25 degrees) with heels raised.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Lower slowly on one leg to about 60 degrees of knee bend. Return to standing using both legs.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 62. Exorotatie met weerstandsband

- **Dutch:** Exorotatie met weerstandsband
- **English:** Resistance band external rotation
- **Id:** `er_band`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Rotate your forearm outward against the band and return in a controlled manner.
- **Start:** Stand side-on to a door with the band anchored at elbow height. Elbow at 90 degrees, by your side (optionally with a towel roll).
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand side-on to a door with the band anchored at elbow height. Elbow at 90 degrees, by your side (optionally with a towel roll).
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Rotate your forearm outward against the band and return in a controlled manner.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 63. Gestrekt been heffen

- **Dutch:** Gestrekt been heffen
- **English:** Straight leg raise
- **Id:** `slr`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Tighten your thigh and lift the straight leg to the height of the other knee. Lower slowly.
- **Start:** Lie on your back, one knee bent, the exercising leg straight.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Lie on your back, one knee bent, the exercising leg straight.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Tighten your thigh and lift the straight leg to the height of the other knee. Lower slowly.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 64. Heupbuigerrek in halfknielstand

- **Dutch:** Heupbuigerrek in halfknielstand
- **English:** Half-kneeling hip flexor stretch
- **Id:** `hip_flexor_stretch`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Tuck your pelvis slightly and shift your weight forward until you feel a stretch at the front of the hip.
- **Start:** Kneel on one knee (cushion underneath), other foot in front, both knees at 90 degrees.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Kneel on one knee (cushion underneath), other foot in front, both knees at 90 degrees.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Tuck your pelvis slightly and shift your weight forward until you feel a stretch at the front of the hip.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 65. Heupscharnier met stok

- **Dutch:** Heupscharnier met stok
- **English:** Hip hinge with dowel
- **Id:** `hip_hinge_dowel`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Hinge forward at the hips with soft knees while the dowel keeps all three contact points. Return.
- **Start:** Stand tall holding a dowel along your back: touching head, upper back and tailbone.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand tall holding a dowel along your back: touching head, upper back and tailbone.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Hinge forward at the hips with soft knees while the dowel keeps all three contact points. Return. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 66. Hielglijden

- **Dutch:** Hielglijden
- **English:** Heel slides
- **Id:** `heel_slide`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Slide your heel towards your buttock to bend the knee, hold briefly and slide back.
- **Start:** Lie on your back with straight legs, towel under the heel on a smooth surface.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Lie on your back with straight legs, towel under the heel on a smooth surface.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Slide your heel towards your buttock to bend the knee, hold briefly and slide back. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 67. Isometrische exorotatie tegen de muur

- **Dutch:** Isometrische exorotatie tegen de muur
- **English:** Isometric external rotation against wall
- **Id:** `er_iso_wall`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Press your wrist outward into the wall without moving. Hold and relax.
- **Start:** Stand next to a wall, elbow bent to 90 degrees, back of the wrist against a folded towel on the wall.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand next to a wall, elbow bent to 90 degrees, back of the wrist against a folded towel on the wall.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Press your wrist outward into the wall without moving. Hold and relax. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 68. Isometrische lateroflexie van de nek

- **Dutch:** Isometrische lateroflexie van de nek
- **English:** Isometric neck side bend
- **Id:** `neck_iso_sideflex`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Gently push your head into your hand without letting the head move. Hold, relax and switch sides.
- **Start:** Sit upright and place your hand on the side of your head.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sit upright and place your hand on the side of your head.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Gently push your head into your hand without letting the head move. Hold, relax and switch sides. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 69. Leg extension

- **Dutch:** Leg extension
- **English:** Leg extension
- **Id:** `kr_leg_extension`
- **Why here:** 1× in programme templates.
- **Movement:** Gecontroleerd strekken en langzaam terug.
- **Start:** Sitting in the machine, back against the backrest, the pad in front of the lower legs just above the ankles.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sitting in the machine, back against the backrest, the pad in front of the lower legs just above the ankles.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Gecontroleerd strekken en langzaam terug.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 70. Muurglijder

- **Dutch:** Muurglijder
- **English:** Wall slide
- **Id:** `wall_slide`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Slide your forearms up the wall as far as comfortable and return slowly.
- **Start:** Stand facing a wall with forearms on the wall at shoulder height.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand facing a wall with forearms on the wall at shoulder height.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Slide your forearms up the wall as far as comfortable and return slowly.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 71. Pull-up

- **Dutch:** Pull-up
- **English:** Pull-up
- **Id:** `kr_pull_up`
- **Why here:** 1× in programme templates.
- **Movement:** Kin over de stang, gecontroleerd zakken.
- **Start:** Hanging from a pull-up bar, hands at shoulder width, arms straight.
- **Camera:** Three-quarter view, person and any cable or bench fully in frame, camera locked. Duration 5 s.

```
Static locked-off camera on a tripod, 4.5 metres away, wide shot, three-quarter view. The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Hanging from a pull-up bar, hands at shoulder width, arms straight.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Kin over de stang, gecontroleerd zakken.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 72. Quadricepsaanspanning

- **Dutch:** Quadricepsaanspanning
- **English:** Quadriceps setting
- **Id:** `quad_set`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Press the back of the knee into the towel by tightening your thigh muscle. Hold and relax.
- **Start:** Sit or lie with your leg straight and a rolled towel under the knee.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sit or lie with your leg straight and a rolled towel under the knee.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Press the back of the knee into the towel by tightening your thigh muscle. Hold and relax. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 73. Spaanse squat

- **Dutch:** Spaanse squat
- **English:** Spanish squat
- **Id:** `spanish_squat`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Sit back into a squat with vertical shins; the band supports your knees. Hold.
- **Start:** Loop a strong band around a fixed point and place it behind both knees. Step back until the band is taut.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Loop a strong band around a fixed point and place it behind both knees. Step back until the band is taut.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Sit back into a squat with vertical shins; the band supports your knees. Hold. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 74. Split squat

- **Dutch:** Split squat
- **English:** Split squat
- **Id:** `split_squat`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Lower straight down until the back knee nearly touches the floor and rise back up.
- **Start:** Stand in a long stride, front foot flat, back heel lifted.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand in a long stride, front foot flat, back heel lifted.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Lower straight down until the back knee nearly touches the floor and rise back up.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 75. Terminale knie-extensie met band

- **Dutch:** Terminale knie-extensie met band
- **English:** Banded terminal knee extension
- **Id:** `tke_band`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Fully straighten the knee against the band and return under control.
- **Start:** Stand with a band behind your knee, anchored in front at knee height. Knee slightly bent.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand with a band behind your knee, anchored in front at knee height. Knee slightly bent.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Fully straighten the knee against the band and return under control.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 76. Thoracale extensie op stoel

- **Dutch:** Thoracale extensie op stoel
- **English:** Seated thoracic extension
- **Id:** `thoracic_ext_chair`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Gently extend your upper back over the backrest, elbows pointing up. Return to upright.
- **Start:** Sit on a chair whose backrest reaches just below the shoulder blades. Hands behind your head.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sit on a chair whose backrest reaches just below the shoulder blades. Hands behind your head.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Gently extend your upper back over the backrest, elbows pointing up. Return to upright.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 77. Voorwaartse uitvalspas

- **Dutch:** Voorwaartse uitvalspas
- **English:** Voorwaartse uitvalspas
- **Id:** `kr_forward_lunge`
- **Why here:** 1× in programme templates.
- **Movement:** Romp rechtop, handen in de zij. Stap naar voren en zak tot de voorste knie ongeveer 90 graden boven de enkel staat en de achterste knie net boven de grond. Duw terug naar de start.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Romp rechtop, handen in de zij. Stap naar voren en zak tot de voorste knie ongeveer 90 graden boven de enkel staat en de achterste knie net boven de grond. Duw terug naar de start.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 78. Zittend hielheffen (soleus)

- **Dutch:** Zittend hielheffen (soleus)
- **English:** Seated soleus raise
- **Id:** `seated_soleus`
- **Why here:** 0× in programme templates; 1× in the original demo templates.
- **Movement:** Raise your heels as high as possible and lower slowly.
- **Start:** Sit with knees at 90 degrees, weight resting on your thighs, feet flat.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sit with knees at 90 degrees, weight resting on your thighs, feet flat.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Raise your heels as high as possible and lower slowly.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 79. Diepe nekflexoren — hoofd optillen in ruglig

- **Dutch:** Diepe nekflexoren — hoofd optillen in ruglig
- **English:** Supine deep neck flexor head lift
- **Id:** `dnf_lift`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** First perform a chin tuck, then lift your head a few centimetres. Hold and lower slowly.
- **Start:** Lie on your back with knees bent, head on the floor.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Lie on your back with knees bent, head on the floor.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: First perform a chin tuck, then lift your head a few centimetres. Hold and lower slowly. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 80. Eenbenige Roemeense deadlift

- **Dutch:** Eenbenige Roemeense deadlift
- **English:** Single-leg Romanian deadlift
- **Id:** `sl_rdl`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Hinge forward at the hip while the free leg extends behind you. Return to standing.
- **Start:** Stand on one leg with a soft knee, weight in the opposite hand.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand on one leg with a soft knee, weight in the opposite hand.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Hinge forward at the hip while the free leg extends behind you. Return to standing.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 81. Eenbenige sprong met stabiele landing

- **Dutch:** Eenbenige sprong met stabiele landing
- **English:** Single-leg hop and stick
- **Id:** `hop_and_stick`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Hop a short distance forward and land on the same leg. Hold the landing still for 2 seconds.
- **Start:** Stand on one leg.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand on one leg.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Hop a short distance forward and land on the same leg. Hold the landing still for 2 seconds. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 82. Excentrische polsextensie

- **Dutch:** Excentrische polsextensie
- **English:** Eccentric wrist extension
- **Id:** `ecc_wrist_ext`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Use your other hand to lift the wrist up. Then lower the wrist slowly using only the exercising hand.
- **Start:** Sit with your forearm on a table, hand over the edge, palm down, holding a light weight.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sit with your forearm on a table, hand over the edge, palm down, holding a light weight.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Use your other hand to lift the wrist up. Then lower the wrist slowly using only the exercising hand.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 83. Exorotatie in zijlig met dumbbell

- **Dutch:** Exorotatie in zijlig met dumbbell
- **English:** Side-lying external rotation with dumbbell
- **Id:** `sidelying_er_db`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Rotate the forearm up and lower slowly.
- **Start:** Lie on your side, exercising arm on top, elbow bent to 90 degrees against your side with a towel roll, light weight in hand.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Lie on your side, exercising arm on top, elbow bent to 90 degrees against your side with a towel roll, light weight in hand.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Rotate the forearm up and lower slowly.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 84. Extensie in buiklig

- **Dutch:** Extensie in buiklig
- **English:** Prone press-up
- **Id:** `prone_press_up`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Press your upper body up with your arms; keep the pelvis and legs relaxed on the floor. Lower again.
- **Start:** Lie on your stomach, hands next to your shoulders.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Lie on your stomach, hands next to your shoulders.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Press your upper body up with your arms; keep the pelvis and legs relaxed on the floor. Lower again.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 85. Farmer carry

- **Dutch:** Farmer carry
- **English:** Farmer carry
- **Id:** `farmer_carry`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Walk a set distance with short, controlled steps, standing tall with a firm grip.
- **Start:** Stand tall holding a weight in each hand.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand tall holding a weight in each hand.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Walk a set distance with short, controlled steps, standing tall with a firm grip.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 86. Isometrische polsextensie

- **Dutch:** Isometrische polsextensie
- **English:** Isometric wrist extension
- **Id:** `iso_wrist_ext`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Push your hand up against the other hand without moving. Hold.
- **Start:** Forearm on a table, palm down. Place your other hand on the back of your hand.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Forearm on a table, palm down. Place your other hand on the back of your hand.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Push your hand up against the other hand without moving. Hold. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 87. Open boek

- **Dutch:** Open boek
- **English:** Open book rotation
- **Id:** `open_book`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Rotate your top arm in an arc to the other side, following your hand with your eyes. Keep knees together.
- **Start:** Lie on your side, hips and knees bent to 90 degrees, arms straight out in front.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Lie on your side, hips and knees bent to 90 degrees, arms straight out in front.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Rotate your top arm in an arc to the other side, following your hand with your eyes. Keep knees together.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 88. Peesglijoefeningen hand

- **Dutch:** Peesglijoefeningen hand
- **English:** Tendon gliding exercises
- **Id:** `tendon_glide`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Move through: hook fist, full fist, tabletop, straight fist; return to straight fingers.
- **Start:** Sit with your elbow on a table, hand upright, fingers straight.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sit with your elbow on a table, hand upright, fingers straight.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Move through: hook fist, full fist, tabletop, straight fist; return to straight fingers.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 89. Pogo-sprongen

- **Dutch:** Pogo-sprongen
- **English:** Pogo hops
- **Id:** `pogo_hops`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Hop lightly and quickly from your ankles with minimal knee bend.
- **Start:** Stand upright on both feet, hip-width apart.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Stand upright on both feet, hip-width apart.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Hop lightly and quickly from your ankles with minimal knee bend.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 90. Slingeroefening

- **Dutch:** Slingeroefening
- **English:** Pendulum exercise
- **Id:** `pendulum`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Gently sway your body so the arm makes small circles and swings.
- **Start:** Support yourself with your unaffected hand on a table and lean forward. Let the working arm hang relaxed.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Support yourself with your unaffected hand on a table and lean forward. Let the working arm hang relaxed.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Gently sway your body so the arm makes small circles and swings.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 91. Bird dog

- **Dutch:** Bird dog
- **English:** Bird dog
- **Id:** `kt_bird_dog`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** On hands and knees, back neutral. Extend one arm forward and the opposite leg back at the same time, without arching the back or rotating the pelvis. Hold two counts, keep breathing and switch.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: On hands and knees, back neutral. Extend one arm forward and the opposite leg back at the same time, without arching the back or rotating the pelvis. Hold two counts, keep breathing and switch. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 92. Bovenste trapezius rekken

- **Dutch:** Bovenste trapezius rekken
- **English:** Upper trapezius stretch
- **Id:** `kt_bovenste_trapezius_rek`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Sit upright and hold the seat of the chair with the hand on the side to stretch. Tilt the head gently to the other side, ear towards shoulder, until you feel a stretch at the top of the shoulder and side of the neck. Hold and breathe out calmly.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Sit upright and hold the seat of the chair with the hand on the side to stretch. Tilt the head gently to the other side, ear towards shoulder, until you feel a stretch at the top of the shoulder and side of the neck. Hold and breathe out calmly. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 93. Buiklig Y en T (onderste en middelste trapezius)

- **Dutch:** Buiklig Y en T (onderste en middelste trapezius)
- **English:** Prone Y and T (lower and middle trapezius)
- **Id:** `kt_buiklig_y_t`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Lie on your stomach with your forehead on a towel. Lift the arms in a Y shape (diagonally forward) with thumbs up, shoulders low and away from the ears. Then in a T shape (to the side). Slowly up and down.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Lie on your stomach with your forehead on a towel. Lift the arms in a Y shape (diagonally forward) with thumbs up, shoulders low and away from the ears. Then in a T shape (to the side). Slowly up and down. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 94. Cable fly

- **Dutch:** Cable fly
- **English:** Cable fly
- **Id:** `kr_cable_fly`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Lichte buiging in de ellebogen, breng je handen voor je borst samen in een boog.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Lichte buiging in de ellebogen, breng je handen voor je borst samen in een boog.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 95. Chin-up

- **Dutch:** Chin-up
- **English:** Chin-up
- **Id:** `kr_chin_up`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Handpalmen naar je toe, trek je op tot je kin boven de stang is. Te zwaar: met elastiek of machine.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Handpalmen naar je toe, trek je op tot je kin boven de stang is. Te zwaar: met elastiek of machine.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 96. Copenhagen adductie, korte hefboom

- **Dutch:** Copenhagen adductie, korte hefboom
- **English:** Copenhagen adduction, short lever
- **Id:** `kt_copenhagen_kort`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Lie on your side on your forearm. Rest the inside of the top knee on a bench or chair. Lift your hips until your body is a straight line and hold; the bottom leg hangs free. Progress to a straight leg (long lever) when this goes well.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Lie on your side on your forearm. Rest the inside of the top knee on a bench or chair. Lift your hips until your body is a straight line and hold; the bottom leg hangs free. Progress to a straight leg (long lever) when this goes well. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 97. Dips

- **Dutch:** Dips
- **English:** Dips
- **Id:** `kr_dips`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Schouders laag, zak tot je bovenarm ongeveer horizontaal is. Te zwaar: met ondersteuning of op een bank.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Schouders laag, zak tot je bovenarm ongeveer horizontaal is. Te zwaar: met ondersteuning of op een bank. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 98. Duimoppositie met elastiekje

- **Dutch:** Duimoppositie met elastiekje
- **English:** Thumb opposition with a rubber band
- **Id:** `kt_duimoppositie`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Put a rubber band around thumb and index finger. Bring the thumb slowly towards the little finger against the resistance and back. Then around thumb and middle finger. Wrist straight, slow pace.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Put a rubber band around thumb and index finger. Bring the thumb slowly towards the little finger against the resistance and back. Then around thumb and middle finger. Wrist straight, slow pace.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 99. Dumbbell bench press

- **Dutch:** Dumbbell bench press
- **English:** Dumbbell bench press
- **Id:** `kr_db_bench_press`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Schouderbladen samen, dumbbells boven je borst. Zak gecontroleerd tot je ellebogen net onder de bank zijn.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Schouderbladen samen, dumbbells boven je borst. Zak gecontroleerd tot je ellebogen net onder de bank zijn. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 100. Dumbbell schouderdrukken

- **Dutch:** Dumbbell schouderdrukken
- **English:** Dumbbell schouderdrukken
- **Id:** `kr_db_shoulder_press`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Zit rechtop, druk de dumbbells boven je hoofd zonder je rug hol te maken.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Zit rechtop, druk de dumbbells boven je hoofd zonder je rug hol te maken. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 101. Eenarmige dumbbell row

- **Dutch:** Eenarmige dumbbell row
- **English:** Eenarmige dumbbell row
- **Id:** `kr_db_row`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Steun met hand en knie op de bank, rug plat. Trek de dumbbell naar je heup.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Steun met hand en knie op de bank, rug plat. Trek de dumbbell naar je heup.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 102. Eenbenige bilbrug

- **Dutch:** Eenbenige bilbrug
- **English:** Single-leg glute bridge
- **Id:** `kt_eenbenige_bilbrug`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Lie on your back with one knee bent and the foot close to your buttock; the other leg straight in the air. Squeeze your buttock and lift the pelvis to a straight line from knee to shoulder. Keep the pelvis level. Lower slowly.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Lie on your back with one knee bent and the foot close to your buttock; the other leg straight in the air. Squeeze your buttock and lift the pelvis to a straight line from knee to shoulder. Keep the pelvis level. Lower slowly. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 103. Excentrisch polsbuigen (golfersarm)

- **Dutch:** Excentrisch polsbuigen (golfersarm)
- **English:** Eccentric wrist flexion (golfer's elbow)
- **Id:** `kt_pols_excentrisch_buig`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Sit with the forearm on a table, palm up and the wrist over the edge. Lift the weight with the other hand and lower it with the affected hand over three counts.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Sit with the forearm on a table, palm up and the wrist over the edge. Lift the weight with the other hand and lower it with the affected hand over three counts.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 104. Excentrisch polsstrekken (tennisarm)

- **Dutch:** Excentrisch polsstrekken (tennisarm)
- **English:** Eccentric wrist extension (tennis elbow)
- **Id:** `kt_pols_excentrisch_strek`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Sit with the forearm on a table, palm down and the wrist over the edge. Lift the weight with the other hand and lower it with the affected hand over three counts. Elbow slightly bent.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Sit with the forearm on a table, palm down and the wrist over the edge. Lift the weight with the other hand and lower it with the affected hand over three counts. Elbow slightly bent.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 105. Farmer carry

- **Dutch:** Farmer carry
- **English:** Farmer carry
- **Id:** `kr_farmer_carry`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Loop rechtop met in elke hand een zwaar gewicht, schouders laag, kleine stappen.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Loop rechtop met in elke hand een zwaar gewicht, schouders laag, kleine stappen. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 106. Femoralis slider in zijlig

- **Dutch:** Femoralis slider in zijlig
- **English:** Femoralis slider in zijlig
- **Id:** `nd_femoral_slider`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Lig op je zij met de onderste knie naar je borst getrokken. Pak de enkel van het bovenste been en breng de knie rustig naar achteren terwijl je de kin naar de borst buigt. Ga terug terwijl je het hoofd optilt. Rustig heen en weer, zonder door te drukken.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Lig op je zij met de onderste knie naar je borst getrokken. Pak de enkel van het bovenste been en breng de knie rustig naar achteren terwijl je de kin naar de borst buigt. Ga terug terwijl je het hoofd optilt. Rustig heen en weer, zonder door te drukken.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 107. Fibularis slider

- **Dutch:** Fibularis slider
- **English:** Fibularis slider
- **Id:** `nd_fibular_slider`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Zit op de rand van een stoel. Buig de knie iets en strek tegelijk de voet, met de voetzool naar binnen gedraaid. Strek daarna de knie terwijl je de voet ontspant en rustig naar je toe laat komen. Rustig heen en weer, zonder door te drukken.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Zit op de rand van een stoel. Buig de knie iets en strek tegelijk de voet, met de voetzool naar binnen gedraaid. Strek daarna de knie terwijl je de voet ontspant en rustig naar je toe laat komen. Rustig heen en weer, zonder door te drukken.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 108. Goblet squat

- **Dutch:** Goblet squat
- **English:** Goblet squat
- **Id:** `kr_goblet_squat`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Houd het gewicht voor je borst, ellebogen omlaag. Zak tussen je knieën, borst omhoog, hielen op de grond.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Houd het gewicht voor je borst, ellebogen omlaag. Zak tussen je knieën, borst omhoog, hielen op de grond. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 109. Hack squat

- **Dutch:** Hack squat
- **English:** Hack squat
- **Id:** `kr_hack_squat`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Rug tegen het kussen, voeten op schouderbreedte. Zak tot minstens 90 graden in de knie.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Rug tegen het kussen, voeten op schouderbreedte. Zak tot minstens 90 graden in de knie. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 110. Hammer curl

- **Dutch:** Hammer curl
- **English:** Hammer curl
- **Id:** `kr_hammer_curl`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Duimen omhoog, ellebogen langs je lichaam, buig je armen zonder te zwaaien.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Duimen omhoog, ellebogen langs je lichaam, buig je armen zonder te zwaaien.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 111. Heup-hinge met stok langs de rug

- **Dutch:** Heup-hinge met stok langs de rug
- **English:** Hip hinge with a stick along the back
- **Id:** `kt_heup_hinge`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Stand with a stick along your back touching the back of the head, upper back and tailbone. Bend forward from the hips with slightly bent knees; the stick keeps touching all three points. Come back up by squeezing the buttocks.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Stand with a stick along your back touching the back of the head, upper back and tailbone. Bend forward from the hips with slightly bent knees; the stick keeps touching all three points. Come back up by squeezing the buttocks.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 112. Heupabductie machine

- **Dutch:** Heupabductie machine
- **English:** Heupabductie machine
- **Id:** `kr_hip_abduction`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Zit rechtop, duw je knieën naar buiten tegen de kussens en kom gecontroleerd terug.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Zit rechtop, duw je knieën naar buiten tegen de kussens en kom gecontroleerd terug.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 113. Heupflexor-rek in kniestand

- **Dutch:** Heupflexor-rek in kniestand
- **English:** Half-kneeling hip flexor stretch
- **Id:** `ex_hip_flexor_stretch`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme. Prompt copied from the 3 November masterprompt.
- **Movement:** Knee on the floor, front foot flat. Shift the pelvis slightly forward until you feel a stretch at the front of the hip.
- **Start:** Half-kneeling: one knee on a soft surface, the other foot flat in front of you, trunk upright.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod at hip height, 3.5 metres away, wide shot, exact side view. The ENTIRE body is always fully in frame from the top of the head to the feet, with clear empty space above the head and below; the person fills about 55 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat. Realistic, natural human motion.

Start position: half-kneeling lunge on the mat, facing right: the left knee rests on the mat directly under the hip, the right foot is flat on the mat in front with the right knee bent 90 degrees above the ankle. Upper body tall and upright, hands on the hips.
Movement:
0 to 2 seconds: the person tucks the pelvis slightly under and shifts the hips gently forward a few centimetres, the upper body stays upright, a stretch at the front of the left hip.
2 to 4 seconds: holds the stretch calmly, breathing.
4 to 5 seconds: shifts slowly back to the start position.
The back knee stays on the mat, the front knee does not move past the toes.
```

## 114. Inverted row

- **Dutch:** Inverted row
- **English:** Inverted row
- **Id:** `kr_inverted_row`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Lichaam in één lijn, trek je borst naar de stang. Lichter: voeten dichterbij, lichaam rechter.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Lichaam in één lijn, trek je borst naar de stang. Lichter: voeten dichterbij, lichaam rechter.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 115. Isometrische hamstring tegen muur

- **Dutch:** Isometrische hamstring tegen muur
- **English:** Isometric hamstring against a wall
- **Id:** `ex_iso_hamstring_muur`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Sit or lie with the heel against a firm surface. Push the heel down without moving.
- **Start:** On your back in front of a wall, heel of the exercising leg on the wall with the knee slightly bent.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: On your back in front of a wall, heel of the exercising leg on the wall with the knee slightly bent.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Sit or lie with the heel against a firm surface. Push the heel down without moving. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 116. Isometrische heupabductie tegen muur

- **Dutch:** Isometrische heupabductie tegen muur
- **English:** Isometric hip abduction against a wall
- **Id:** `ex_iso_heup_abductie`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Stand sideways to a wall with a band or cushion between the ankle and the wall. Push outwards without moving.
- **Start:** Standing next to a wall, the outside of the knee or ankle of the exercising leg against the wall.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing next to a wall, the outside of the knee or ankle of the exercising leg against the wall.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Stand sideways to a wall with a band or cushion between the ankle and the wall. Push outwards without moving. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 117. Kettlebell swing

- **Dutch:** Kettlebell swing
- **English:** Kettlebell swing
- **Id:** `kr_kettlebell_swing`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Beweging komt uit de heup: kantel voorover met platte rug, duw je heupen krachtig naar voren. Armen sturen alleen.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Beweging komt uit de heup: kantel voorover met platte rug, duw je heupen krachtig naar voren. Armen sturen alleen.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 118. Kleine voorwerpen oppakken met duim en vingertoppen

- **Dutch:** Kleine voorwerpen oppakken met duim en vingertoppen
- **English:** Picking up small objects with thumb and fingertips
- **Id:** `kt_oppakken_knijpgreep`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Put coins, buttons or marbles on the table. Pick them up one by one between thumb and fingertips and put them in a bowl. Wrist straight. Alternate the thumb with the index, middle and ring finger.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Put coins, buttons or marbles on the table. Pick them up one by one between thumb and fingertips and put them in a bowl. Wrist straight. Alternate the thumb with the index, middle and ring finger.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 119. Kniebuiging tegen muur (dorsaalflexie)

- **Dutch:** Kniebuiging tegen muur (dorsaalflexie)
- **English:** Knee-to-wall (ankle dorsiflexion)
- **Id:** `ex_kniebuiging_muur`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Foot on a fixed line, move the knee towards the wall. Keep the heel on the floor.
- **Start:** Standing facing a wall, the exercising leg forward, foot a hand’s width from the wall, hands on the wall.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing facing a wall, the exercising leg forward, foot a hand’s width from the wall, hands on the wall.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Foot on a fixed line, move the knee towards the wall. Keep the heel on the floor. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 120. Knijpen in een zacht balletje

- **Dutch:** Knijpen in een zacht balletje
- **English:** Squeezing a soft ball
- **Id:** `kt_knijpbal`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Hold a soft ball or therapy putty in the hand. Squeeze gently to about half your strength, hold 3 counts and let go. Wrist in a straight position.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Hold a soft ball or therapy putty in the hand. Squeeze gently to about half your strength, hold 3 counts and let go. Wrist in a straight position. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 121. Musculocutaneus slider

- **Dutch:** Musculocutaneus slider
- **English:** Musculocutaneus slider
- **Id:** `nd_musculocutaneous_slider`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Sta met de arm langs het lichaam en iets naar achteren, schouder rustig omlaag, elleboog gestrekt en de handpalm naar achteren gedraaid. Buig de pols naar de pinkkant en kantel tegelijk het hoofd naar dezelfde kant. Laat de pols ontspannen terwijl het hoofd naar de andere kant gaat. Rustig heen en weer.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Sta met de arm langs het lichaam en iets naar achteren, schouder rustig omlaag, elleboog gestrekt en de handpalm naar achteren gedraaid. Buig de pols naar de pinkkant en kantel tegelijk het hoofd naar dezelfde kant. Laat de pols ontspannen terwijl het hoofd naar de andere kant gaat. Rustig heen en weer. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 122. Muurzit (isometrisch, knie)

- **Dutch:** Muurzit (isometrisch, knie)
- **English:** Wall sit (isometric, knee)
- **Id:** `kt_muurzit`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Lean with the back against a wall and lower until both knees are bent about 90 degrees. Weight over both feet, knees over the feet. Hold.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Lean with the back against a wall and lower until both knees are bent about 90 degrees. Weight over both feet, knees over the feet. Hold. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 123. Nek en zenuwglijding, sliders

- **Dutch:** Nek en zenuwglijding, sliders
- **English:** Nek en zenuwglijding, sliders
- **Id:** `mb_nerve_glide_neck`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Sitting tall, one arm out to the side with the palm up. Tip the head away from that arm as the wrist bends back, then return the head and the wrist together.
- **Start:** Sitting upright, shoulders relaxed, arm out to the side with the palm up.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sitting upright, shoulders relaxed, arm out to the side with the palm up.
Movement, one slow repetition:
0 to 2 seconds: the person tips the head away from the outstretched arm while the wrist bends back, the shoulder stays down.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 124. Obturatorius slider

- **Dutch:** Obturatorius slider
- **English:** Obturatorius slider
- **Id:** `nd_obturator_slider`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Zit rechtop op een stoel met de voeten plat. Laat één knie rustig naar buiten zakken terwijl je de kin iets optilt. Breng de knie terug terwijl je de kin naar de borst buigt. Rustig heen en weer, alleen tot een lichte rek aan de binnenkant van het bovenbeen.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Zit rechtop op een stoel met de voeten plat. Laat één knie rustig naar buiten zakken terwijl je de kin iets optilt. Breng de knie terug terwijl je de kin naar de borst buigt. Rustig heen en weer, alleen tot een lichte rek aan de binnenkant van het bovenbeen.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 125. Open book (bovenrug draaien)

- **Dutch:** Open book (bovenrug draaien)
- **English:** Open book (upper back rotation)
- **Id:** `kt_open_book`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Lie on your side with knees bent at hip height and arms straight in front of you. Open the top arm like a book to the other side and follow it with your eyes, while the knees stay down. Breathe out in the end position and return.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Lie on your side with knees bent at hip height and arms straight in front of you. Open the top arm like a book to the other side and follow it with your eyes, while the knees stay down. Breathe out in the end position and return.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 126. Pallof press

- **Dutch:** Pallof press
- **English:** Pallof press
- **Id:** `kr_pallof_press`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Sta zijwaarts naar de kabel, duw je handen recht naar voren en weersta het draaien.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Sta zijwaarts naar de kabel, duw je handen recht naar voren en weersta het draaien.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 127. Peesglijden van de vingers

- **Dutch:** Peesglijden van de vingers
- **English:** Finger tendon glides
- **Id:** `kt_peesglijden_hand`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Start with straight fingers. Make in turn a hook (bend the fingertips), a fist, a flat fist (straight fingers onto the palm) and straighten again. Slowly through all positions, wrist straight.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Start with straight fingers. Make in turn a hook (bend the fingertips), a fist, a flat fist (straight fingers onto the palm) and straighten again. Slowly through all positions, wrist straight.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 128. Push-up plus tegen de muur (serratus)

- **Dutch:** Push-up plus tegen de muur (serratus)
- **English:** Wall push-up plus (serratus)
- **Id:** `kt_push_up_plus`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Stand with your hands against the wall at shoulder height, arms straight. Push the wall further away so the shoulder blades slide forward around the ribs, then let them come back slowly. Elbows stay straight. Later on the knees or the floor.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Stand with your hands against the wall at shoulder height, arms straight. Push the wall further away so the shoulder blades slide forward around the ribs, then let them come back slowly. Elbows stay straight. Later on the knees or the floor. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 129. Radialis slider

- **Dutch:** Radialis slider
- **English:** Radialis slider
- **Id:** `nd_radial_slider`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Sta of zit rechtop met de arm langs het lichaam, schouder iets omlaag, elleboog gestrekt en de handpalm naar achteren gedraaid. Buig de pols en vingers rustig en kantel tegelijk het hoofd naar dezelfde kant. Laat daarna de pols ontspannen terwijl het hoofd naar de andere kant gaat. Rustig heen en weer.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Sta of zit rechtop met de arm langs het lichaam, schouder iets omlaag, elleboog gestrekt en de handpalm naar achteren gedraaid. Buig de pols en vingers rustig en kantel tegelijk het hoofd naar dezelfde kant. Laat daarna de pols ontspannen terwijl het hoofd naar de andere kant gaat. Rustig heen en weer. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 130. Reverse fly

- **Dutch:** Reverse fly
- **English:** Reverse fly
- **Id:** `kr_reverse_fly`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Voorovergebogen met platte rug, armen zijwaarts omhoog tot schouderhoogte, licht gewicht.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Voorovergebogen met platte rug, armen zijwaarts omhoog tot schouderhoogte, licht gewicht. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 131. Rugstrekken op bank

- **Dutch:** Rugstrekken op bank
- **English:** Rugstrekken op bank
- **Id:** `kr_back_extension`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Heupen op het kussen, buig voorover vanuit de heup en kom terug tot een rechte lijn. Niet overstrekken.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Heupen op het kussen, buig voorover vanuit de heup en kom terug tot een rechte lijn. Niet overstrekken.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 132. Seated cable row

- **Dutch:** Seated cable row
- **English:** Seated cable row
- **Id:** `kr_seated_cable_row`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Borst omhoog, trek het handvat naar je buik en knijp je schouderbladen samen.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Borst omhoog, trek het handvat naar je buik en knijp je schouderbladen samen. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 133. Short foot (voetboog actief)

- **Dutch:** Short foot (voetboog actief)
- **English:** Short foot (active arch)
- **Id:** `kt_short_foot`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Sit or stand with the foot flat. Shorten the foot by drawing the ball of the foot towards the heel, without curling the toes. The arch rises a little. Hold five counts and relax.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Sit or stand with the foot flat. Shorten the foot by drawing the ball of the foot towards the heel, without curling the toes. The arch rises a little. Hold five counts and relax. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 134. Slump slider

- **Dutch:** Slump slider
- **English:** Slump slider
- **Id:** `nd_slump_slider`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Sit slumped with the back slightly rounded. Straighten the knee and bend the neck forward, then return in reverse order.
- **Start:** Sitting on the edge of a table or chair, trunk slightly slumped, hands behind the back or on the thighs.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Sitting on the edge of a table or chair, trunk slightly slumped, hands behind the back or on the thighs.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Sit slumped with the back slightly rounded. Straighten the knee and bend the neck forward, then return in reverse order.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 135. Step-down van een traptree

- **Dutch:** Step-down van een traptree
- **English:** Step-down from a step
- **Id:** `kt_step_down`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Stand on one leg on a step. Slowly lower the other leg until the heel just touches the floor and come back up. The knee stays over the second toe, the pelvis stays level. Use a hand on the rail if needed.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Stand on one leg on a step. Slowly lower the other leg until the heel just touches the floor and come back up. The knee stays over the second toe, the pelvis stays level. Use a hand on the rail if needed.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 136. Step-up met dumbbells

- **Dutch:** Step-up met dumbbells
- **English:** Step-up met dumbbells
- **Id:** `kr_step_up`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Hele voet op de bank, duw je omhoog via de hiel van het voorste been. Rustig weer omlaag.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Hele voet op de bank, duw je omhoog via de hiel van het voorste been. Rustig weer omlaag.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 137. Tas dragen met de handrug naar boven

- **Dutch:** Tas dragen met de handrug naar boven
- **English:** Carrying a bag with the back of the hand up
- **Id:** `kt_dragen_handrug`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Lift a light bag or a bottle of water with the palm facing down, the way you lift a bag by its handle. Wrist straight, elbow slightly bent. Lift, hold 5 counts and put it down slowly. Make it heavier when it gets easy.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body in frame, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Lift a light bag or a bottle of water with the palm facing down, the way you lift a bag by its handle. Wrist straight, elbow slightly bent. Lift, hold 5 counts and put it down slowly. Make it heavier when it gets easy. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 138. TFL en buitenkant heup rekken in stand

- **Dutch:** TFL en buitenkant heup rekken in stand
- **English:** TFL and outer hip stretch in standing
- **Id:** `kt_tfl_rek`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Stand next to a wall with the side to stretch towards the wall. Cross that leg behind the other. Push the hip gently sideways towards the wall until you feel a stretch on the outside of hip and thigh. Keep the trunk upright. Hold and breathe calmly.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Stand next to a wall with the side to stretch towards the wall. Cross that leg behind the other. Push the hip gently sideways towards the wall until you feel a stretch on the outside of hip and thigh. Keep the trunk upright. Hold and breathe calmly. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## 139. Tibialis slider

- **Dutch:** Tibialis slider
- **English:** Tibialis slider
- **Id:** `nd_tibial_slider`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Zit op de rand van een stoel. Buig de knie iets en trek tegelijk de voet naar je toe, met de voetzool licht naar buiten gedraaid. Strek daarna de knie terwijl je de voet ontspant en de tenen wegwijst. Rustig heen en weer: als de ene kant spanning krijgt, laat de andere kant los.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Zit op de rand van een stoel. Buig de knie iets en trek tegelijk de voet naar je toe, met de voetzool licht naar buiten gedraaid. Strek daarna de knie terwijl je de voet ontspant en de tenen wegwijst. Rustig heen en weer: als de ene kant spanning krijgt, laat de andere kant los.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 140. Triceps extension boven het hoofd

- **Dutch:** Triceps extension boven het hoofd
- **English:** Triceps extension boven het hoofd
- **Id:** `kr_overhead_triceps`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Ellebogen naar voren gericht en dicht bij je hoofd, strek je armen volledig.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Ellebogen naar voren gericht en dicht bij je hoofd, strek je armen volledig.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 141. Ulnaris slider

- **Dutch:** Ulnaris slider
- **English:** Ulnar nerve slider
- **Id:** `nd_ulnar_slider`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Elbow bent, wrist flexed and fingers straight. Straighten the elbow and wrist, then bend them back again.
- **Start:** Standing or sitting, arm out to the side, elbow bent, hand with the fingers toward the ear.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: Standing or sitting, arm out to the side, elbow bent, hand with the fingers toward the ear.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Elbow bent, wrist flexed and fingers straight. Straighten the elbow and wrist, then bend them back again.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 142. Walking lunge

- **Dutch:** Walking lunge
- **English:** Walking lunge
- **Id:** `kr_walking_lunge`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Grote stap, achterste knie zakt richting de grond, voorste knie boven de voet. Wissel elke stap.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body from head to feet, camera locked on a tripod. Duration 5 s.

```
Static locked-off camera on a tripod, 4 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 2 seconds: moves slowly into the effort: Grote stap, achterste knie zakt richting de grond, voorste knie boven de voet. Wissel elke stap.
2 to 2.5 seconds: short pause in that position, joints stay aligned, no bounce.
2.5 to 5 seconds: returns slowly to the start position along the same path.
The feet or supporting hands stay where they started. One person only.
```

## 143. Zijlig heupabductie met de hiel voorop

- **Dutch:** Zijlig heupabductie met de hiel voorop
- **English:** Side-lying hip abduction leading with the heel
- **Id:** `kt_zijlig_abductie`
- **Why here:** 0× in programme templates; in the library, not yet placed in a shipped programme.
- **Movement:** Lie on your side with the bottom leg slightly bent. Move the top leg slightly back so the hip is slightly extended, and turn the toes a little towards the floor. Lift the leg slowly leading with the heel and lower it slowly. The pelvis stays still and does not roll back.
- **Start:** See the prompt. The whole body stays in frame.
- **Camera:** Exact side view, whole body, camera at hip height, locked off. Duration 5 s.

```
Static locked-off camera on a tripod, 3.5 metres away, wide shot, exact side view (90 degrees). The ENTIRE body is always fully in frame from the top of the head to the soles of the feet, with clear empty space above the head and below the feet; the person fills about 60 percent of the frame height and stays centred. No camera movement, no zoom, no cuts. Bright modern physiotherapy studio, light wooden floor, plain warm-beige wall, soft even daylight. One athletic adult in a forest green t-shirt, black shorts and black trainers, on a dark grey exercise mat when the exercise is on the floor. Realistic, natural human motion, one slow controlled repetition.

Start position: The person is in the start position described below, centred in the frame.
Movement, one slow repetition:
0 to 1 seconds: the person settles into the start position and gets ready.
1 to 4.5 seconds: holds still: Lie on your side with the bottom leg slightly bent. Move the top leg slightly back so the hip is slightly extended, and turn the toes a little towards the floor. Lift the leg slowly leading with the heel and lower it slowly. The pelvis stays still and does not roll back. The body does not bounce.
4.5 to 5 seconds: releases slowly back to an easy rest without standing up out of frame.
The feet or supporting hands stay where they started. One person only.
```

## Already on file (do not reshoot)

| Id | Name |
|---|---|
| `kr_reverse_lunge` | Achterwaartse uitvalspas |
| `glute_bridge` | Bekkenbrug |
| `ex_glute_bridge` | Bilbrug |
| `ex_split_squat_bulgarian` | Bulgarian split squat |
| `ex_clamshell` | Clamshell |
| `kr_conventional_deadlift` | Conventional deadlift |
| `ex_dead_bug` | Dead bug |
| `dead_bug` | Dead bug |
| `sl_stance` | Eenbeensstand |
| `ex_single_leg_balance` | Eenbenige balans |
| `single_leg_bridge` | Eenbenige bekkenbrug |
| `side_lying_abd` | Heupabductie in zijlig |
| `calf_raise` | Hielheffen staand |
| `kr_hip_thrust` | Hip thrust |
| `ex_cat_camel` | Kat-koe |
| `mb_cat_camel` | Kat-koe |
| `cat_camel` | Kat-koe |
| `ex_chin_tuck` | Kin intrekken |
| `chin_tuck` | Kinintrekking |
| `ex_heel_raise_bilateraal` | Kuitheffen op twee benen |
| `wall_sit` | Muurzit |
| `kr_push_up` | Opdrukken |
| `step_up` | Opstappen |
| `kr_rdl` | Romanian deadlift |
| `clamshell` | Schelp met weerstandsband |
| `kr_bodyweight_squat` | Squat met lichaamsgewicht |
| `box_squat` | Squat naar stoel |
| `ex_step_up` | Step-up |
| `bird_dog` | Viervoetsstand diagonaal (bird dog) |
| `side_plank_knees` | Zijplank op knieën |

The 13 approved files are: bekkenbrug, kinintrekking, kat-koe, bird-dog, deadbug, zijplank (knees), schelp, heupabductie, squat naar stoel, muurzit, hielheffen, eenbeensstand, opstappen. Seedance adds bodyweight squat, reverse lunge, conventional deadlift, hip thrust, Bulgarian split squat, Romanian deadlift and single-leg bridge. Kling adds the push-up and the glute bridge.
