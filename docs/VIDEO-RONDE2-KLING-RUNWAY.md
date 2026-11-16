# Oefenvideo's ronde 2: eerste 5 (Kling en Runway)

Doel: testen welke app goed genoeg is voor klinisch juiste oefenvideo's, voordat we de rest maken.
Alle teksten volgen de beschrijving in de bibliotheek. Zelfde stijl als de goedgekeurde video's:
dezelfde vrouw in donker olijfgroene sportkleding, beige mat, rustige zandkleurige studio, zijaanzicht.

## Werkwijze (2 stappen, werkt beter dan alleen tekst)

1. **Startbeeld maken** (ChatGPT of een andere beeld-app): plak de *startbeeld-prompt*. Kies het beeld
   waarop de houding exact klopt. Gebruik voor alle 5 oefeningen dezelfde vrouw (upload het eerste goede
   beeld als referentie bij de volgende).
2. **Video maken** in Kling (*Image to Video*) of Runway (*Gen-4*, image to video):
   upload het startbeeld en plak de *bewegings-prompt*.
   - Kling: 10 s, 16:9, Professional/High quality. Plak de negatieve prompt hieronder in *Negative prompt*.
   - Runway: 10 s, 16:9. Runway heeft geen negatieve prompt; de laatste zin van elke prompt dekt dat af.
3. **Keuren** met de controlepunten. Pas bij "alles klopt" sturen.
4. **Sturen** naar Claude met de bestandsnaam erbij (bijv. `gestrekt-been-heffen.mp4`) en welke app.
   Claude zet hem in de bibliotheek, maakt de miniatuur uit de video en zet hem live.

Maak per oefening liefst één versie in Kling én één in Runway: dan zien we welke app wint.

### Negatieve prompt (Kling, bij elke video)

```
camera movement, zoom, pan, cuts, cropped body, head out of frame, feet out of frame, close-up, multiple people, mirror, text, subtitles, logo, watermark, extra limbs, extra fingers, distorted hands, morphing body, sliding feet, wrong exercise, fast movement, jerky motion, blurry
```

---

## 1. Gestrekt been heffen (straight leg raise) · `gestrekt-been-heffen.mp4`

**Startbeeld-prompt**
```
Photo, 16:9, exact side view, static camera at mat height, full body in frame with space around it. An athletic woman in plain dark olive sportswear lies on her back on a beige exercise mat in a calm warm sand-coloured physiotherapy studio, soft daylight. Her left knee is bent with the left foot flat on the mat; her right leg (closest to the camera) lies fully straight on the mat, toes pointing up. Arms relaxed beside the body, head resting on the mat.
```
**Bewegings-prompt**
```
Static camera, side view, full body always in frame. She tightens the front of the straight right thigh, then slowly lifts the straight right leg until it is level with the bent left knee, holds for 2 seconds, and lowers it slowly back to the mat. The right knee stays completely straight the whole time, the bent left leg and the pelvis stay still. Exactly 2 slow, controlled repetitions, then she rests. Realistic anatomy and joint angles, no other movements, no text.
```
**Controlepunten**
- [ ] knie van het oefenbeen blijft volledig gestrekt (geen buiging bij het heffen)
- [ ] been gaat tot de hoogte van de andere knie, niet hoger
- [ ] bekken en onderrug blijven stil, ander been blijft gebogen staan

## 2. Hielglijden (heel slides) · `hielglijden.mp4`

**Startbeeld-prompt**
```
Photo, 16:9, exact side view, static camera at mat height, full body in frame with space around it. An athletic woman in plain dark olive sportswear lies on her back on a smooth light floor next to a beige exercise mat in a calm warm sand-coloured physiotherapy studio, soft daylight. Both legs are straight. A small folded white towel lies under the right heel (the leg closest to the camera). Arms relaxed beside the body, head resting on the floor.
```
**Bewegings-prompt**
```
Static camera, side view, full body always in frame. She slowly slides her right heel on the towel along the floor towards her buttock so the right knee bends, the heel stays in contact with the towel and the floor, holds for 2 seconds at a comfortable bend, then slides the heel slowly back until the leg is straight again. The left leg stays straight and still, the pelvis stays flat. Exactly 2 slow, controlled repetitions. Realistic anatomy and joint angles, no other movements, no text.
```
**Controlepunten**
- [ ] hiel blijft op de grond/handdoek, voet wordt niet opgetild
- [ ] knie buigt in één vloeiende lijn, geen draai van het been naar buiten
- [ ] andere been en bekken blijven stil

## 3. Split squat · `split-squat.mp4`

**Startbeeld-prompt**
```
Photo, 16:9, exact side view, static camera at hip height, full body in frame from head to feet with space around it. An athletic woman in plain dark olive sportswear stands on a beige exercise mat in a calm warm sand-coloured physiotherapy studio, soft daylight, in a long split stance facing the right of the frame: front foot flat, back foot on the ball of the foot with the heel raised, feet hip-width apart, torso upright, hands on the hips.
```
**Bewegings-prompt**
```
Static camera, side view, full body always in frame. Without moving her feet, she lowers straight down until the back knee almost touches the mat, the front shin stays nearly vertical and the front knee stays above the front foot, then she pushes back up to the start. Torso stays upright, hands stay on the hips, the feet never move or slide. Exactly 2 slow, controlled repetitions. Realistic anatomy and joint angles, no other movements, no text.
```
**Controlepunten**
- [ ] beweging recht omlaag/omhoog, voeten blijven staan
- [ ] voorste knie stabiel boven de voet, achterste knie raakt de grond bijna (niet hard)
- [ ] romp rechtop

## 4. Roeien met weerstandsband (resistance band row) · `roeien-band.mp4`

**Startbeeld-prompt**
```
Photo, 16:9, exact side view, static camera at chest height, full body in frame from head to feet with space around it. An athletic woman in plain dark olive sportswear stands upright in a calm warm sand-coloured physiotherapy studio, soft daylight, facing a wooden wall bar on the right of the frame. A green resistance band is anchored to the wall bar at her chest height; she holds one end in each hand with both arms straight in front of her at chest height, the band slightly taut. Feet hip-width apart, knees soft, shoulders low.
```
**Bewegings-prompt**
```
Static camera, side view, full body always in frame. She pulls the band towards her lower ribs, elbows staying close along the body and moving backwards, and gently squeezes the shoulder blades together, holds for 1 second, then lets the arms return slowly and controlled until straight. Shoulders stay low and do not shrug, the torso stays upright and does not lean back, the feet stay still. Exactly 2 slow, controlled repetitions. Realistic anatomy, the band stays attached to the wall bar, no other movements, no text.
```
**Controlepunten**
- [ ] ellebogen langs het lichaam naar achteren, schouderbladen licht samen
- [ ] schouders niet opgetrokken, romp leunt niet achterover
- [ ] band blijft vast aan het wandrek en in beide handen

## 5. Exorotatie met weerstandsband (band external rotation) · `exorotatie-band.mp4`

**Startbeeld-prompt**
```
Photo, 16:9, front view, static camera at chest height, full body in frame from head to feet with space around it. An athletic woman in plain dark olive sportswear stands upright in a calm warm sand-coloured physiotherapy studio, soft daylight, with a wooden wall bar to her left at the left edge of the frame. A green resistance band is anchored to the wall bar at elbow height; she holds the other end in her right hand. Her right elbow is bent 90 degrees and pressed against her side with a small rolled white towel between elbow and waist; the right forearm points across her stomach towards the left. Shoulders low, feet hip-width apart.
```
**Bewegings-prompt**
```
Static camera, front view, full body always in frame. Keeping the right elbow pressed against the towel at her side and bent at 90 degrees, she slowly rotates the right forearm outwards against the band until it points forward and slightly out to the right, holds for 1 second, then returns slowly to the start. Only the forearm swings like a door around the elbow; the elbow does not leave the side, the shoulder stays low, the torso does not twist. Exactly 2 slow, controlled repetitions. Realistic anatomy and joint angles, the band stays attached to the wall bar, no other movements, no text.
```
**Controlepunten**
- [ ] elleboog blijft tegen de zij/handdoek, 90 graden
- [ ] alleen de onderarm draait naar buiten, romp draait niet mee
- [ ] schouder blijft laag

---

## Uitslag test (invullen na het maken)

| Oefening | Kling | Runway | Goedgekeurd |
|---|---|---|---|
| Gestrekt been heffen | | | |
| Hielglijden | | | |
| Split squat | | | |
| Roeien met band | | | |
| Exorotatie met band | | | |
