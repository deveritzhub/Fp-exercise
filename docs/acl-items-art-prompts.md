# ACL journey items — art prompts

Cosmetic only. A piece unlocks when that phase’s boss is defeated, or when the named measurement milestone is met. Extra reps, sets or sessions do not unlock anything, and a worse day does not take a piece away.

Until a PNG exists, the inventory draws the SVG placeholder in `web/src/components/hero/RpgGear.tsx`. Do not register a key in `server/db/seed-data/hero-assets.ts` before the file exists: start-up tries to download every listed URL and logs a failure.

## How a finished PNG must be built

The current photographic gear is a **product cut-out**, not a photo of a person wearing it. One PNG is reused for every body. The app places it.

| | |
|---|---|
| Canvas | **1024 × 1024 px**, PNG |
| Background | Fully transparent. No floor, no shadow baked into the pixels, no coloured backdrop |
| Subject | One object, front view, centred, occupying roughly the middle 70% of the square |
| Alpha | Clean edge. The wearer code treats very low alpha as invisible (`feFuncA` table in `PhotoEquipment.tsx`) and adds its own soft shadow |
| Colour | Photographic, soft daylight, the same warm-neutral light as the 2026-11-01 Higgsfield set. No text, no logo, no watermark |
| File name | `{key}.png` using the key in the table below |
| Where it goes | `hero-assets/wear/{key}.png` in private storage, and the same bytes as `hero-assets/item/{key}.png` for the small chip |
| Register | Add the key to `HERO_WEAR_FILES` and `HERO_ITEM_FILES` in `server/db/seed-data/hero-assets.ts` only after the PNG is real |
| Crop | Add `photoGearBounds.json`: `"size": [1024, 1024]` and `"box": [x, y, w, h]` of the opaque pixels |
| On-body slot | Add a `FIT` entry in `web/src/components/hero/PhotoEquipment.tsx`: `[centreX, topY, width, height]` as fractions of a **1000 × 1333.33** (3:4) full-body frame |

Bodies the **same** cut-out must survive, because the app scales one image:

- Figure `f` and `m` (masculine frame is placed about 8–10% wider).
- Builds `lean`, `athletic`, `average`, `muscular`, `soft`, `full`.
- Skin groups `s1`, `s3`, `s5`, `s7`, `s9` do not change the cut-out; they only change the avatar under it.

Personal uploaded photos do **not** receive these overlays (`PhotoEquipment` returns nothing when `look.photo` is set).

Outfits are the exception: they replace the whole body photo, one file per avatar, named `outfit/{figure}_{skin}_{build}__{outfitKey}.png` (3:4, 1000 × 1333, opaque, standing front, feet at the bottom, same framing as the base avatars). Six sport kits × 2 figures × 5 skin groups × 6 builds is 360 photos. Until those exist, the SVG block is the outfit.

**Owner decision already in the repo** (`web/src/components/hero/wear.ts`): pasted accessories on the live photo looked fake, so `WEAR_SLOTS` is empty and the hero photo on the map does not wear items. Items show in the character screen and the inventory. Generate the cut-out anyway; fitting it onto the photo is a later switch (`fittedGear`), not a reason to draw the item on a body in the PNG.

## Shared prompt tail

Paste this after every item prompt:

```
Photographed product, single object, front view, centred. Square 1024 by 1024. Fully transparent background, no floor, no cast shadow, no text, no logo. Soft daylight, realistic materials, sharp but not plastic, same look as a studio cut-out of sports kit. Leave empty margin around the object. No person, no mannequin, no hands, unless the prompt explicitly asks for a full-body outfit.
```

## Phase 1 — boss De Zwelling

| Key | Name | Slot | Unlock |
|---|---|---|---|
| `ice_pack` | IJszak-amulet / Ice-pack amulet | neck (amulet) | Phase 1 boss defeated |
| `deswell_mantle` | Kalme mantel / Calm mantle | back (cape) | Phase 1 boss defeated |
| `iron_brace` | IJzeren kniebrace / Iron knee brace | legs | Phase 1 boss defeated. The patient can take it off. After phase 2 it also sits in the trophy hall |

**ice_pack**

```
A small round sports ice pack worn as an amulet, cool blue gel glowing softly inside a clear disc, thin sand-coloured cord, no text. [shared tail]
```

Suggested FIT: centre 0.50, top 0.17, width 0.12, height 0.12 (same neighbourhood as the medal).

**deswell_mantle**

```
A short calm mantle, slate blue and mist blue, soft fabric, closed in front, no hood, no pattern, no text, laid flat as if for a product photo. [shared tail]
```

Suggested FIT: centre 0.50, top 0.15, width 0.34, height 0.42, drawn behind the body the way the yoga mat is.

**iron_brace**

```
A hinged knee brace in brushed steel and soft grey strap, open so the kneecap would show, no logos, no text, front three-quarter view. [shared tail]
```

Suggested FIT: centre 0.42 and a mirrored pair, top 0.68, width 0.10, height 0.14 (knee line on the 3:4 frame is about 0.71).

## Phase 2 — boss De Stramme Reus

| Key | Name | Slot | Unlock |
|---|---|---|---|
| `crutch_staff` | Wandelstaf / Walking staff | held (hand) | Therapist recorded walking without crutches, or phase 2 boss. The crutch aid then appears in the trophy hall as memorabilia |
| `pilgrim_boots` | Pelgrimslaarzen / Pilgrim boots | feet | Phase 2 boss |
| `golden_hinge` | Gouden scharnier / Golden hinge | chest (emblem) | Knee-flexion milestone (default 120°), or phase 2 boss |

**crutch_staff**

```
A wooden walking staff, shoulder height when held, simple rounded grip, warm oak, no metal medical hardware, no text. [shared tail]
```

Suggested FIT: centre 0.68, top 0.42, width 0.06, height 0.45.

**pilgrim_boots**

```
A pair of plain leather walking boots, tan, low heel, side by side, toes pointing right, no logos. [shared tail]
```

Suggested FIT: same foot anchors as `gold_shoes` (centre about 0.37, top 0.86, width 0.11, height 0.10) plus the mirrored pair.

**golden_hinge**

```
A small gold emblem of a door hinge opened to a right angle, polished, no letters, no numbers. [shared tail]
```

Suggested FIT: centre 0.56, top 0.24, width 0.05, height 0.04 (chest pin size).

## Phase 3 — boss De Weegschaal

| Key | Name | Slot | Unlock |
|---|---|---|---|
| `smith_hammer` | Smedenhamer / Smith’s hammer | held | Phase 3 boss |
| `rune_guard` | Runen-knieplaat / Rune knee guard | legs | Phase 3 boss. The app lights 1–5 rune pips from the best quadriceps limb-symmetry so far; the PNG itself stays one image |
| heirloom form 2 | existing kracht-erfstuk | amulet / weapon / shield the patient already chose | Phase 3 boss raises the stored heirloom to at least form 2. Not a new file |

**smith_hammer**

```
A compact blacksmith hammer, short handle, steel head, no engravings, lying diagonally. [shared tail]
```

**rune_guard**

```
A smooth brass knee guard, five shallow rune-like grooves that are unlit metal, not glowing yet, no letters from a real alphabet, no text. [shared tail]
```

The glow is drawn by the app from `runeTier`, not painted into five separate files.

## Phase 4 — boss De Landing

| Key | Name | Slot | Unlock |
|---|---|---|---|
| `wing_shoes` | Gevleugelde loopschoenen / Winged running shoes | feet | Phase 4 boss |
| `spring_belt` | Veergordel / Spring belt | waist | Phase 4 boss |
| `frog_badge` | Kikkerbadge / Frog badge | chest | Phase 4 boss. Marks that hop tests were started, not a hop score |
| `wind_cape` | Windcape / Wind cape | back (cape) | Phase 4 boss |

**wing_shoes**

```
A pair of light running shoes, off-white, a small feathered wing on each heel, no brand mark, side by side. [shared tail]
```

**spring_belt**

```
A narrow training belt in forest green with one small gold coil like a spring at the buckle, no text. [shared tail]
```

Suggested FIT: centre 0.50, top 0.44, width 0.26, height 0.04, and let the app widen it with the body (`spread`).

**frog_badge**

```
A round enamel badge of a simple sitting frog, moss green and gold rim, no letters. [shared tail]
```

**wind_cape**

```
A short cape in pale wind grey, hem lifting to one side, lightweight cloth, no pattern, no text. [shared tail]
```

## Phase 5 — boss De Terugkeer

| Key | Name | Slot | Unlock |
|---|---|---|---|
| `sport_football` `sport_basketball` `sport_hockey` `sport_ski` `sport_running` `sport_padel` | Tenue naar keuze | outfit | Phase 5 boss. The patient picks the sport; they can change it. Full-body outfit photos, not a cut-out |
| `champion_helm` | Kampioenshelm / Champion helm | head | Phase 5 boss |
| `vkb_banner` | VKB-veteraan / ACL veteran | banner, trophy hall only | Phase 5 boss |
| heirloom form 5 | existing kracht-erfstuk, gold | the kind they already chose | Phase 5 boss raises the stored heirloom to form 5 |

**Outfit prompt** (swap the sport sentence):

```
Full-body photograph of one athlete standing straight, facing the camera, arms relaxed, feet together, entire body in frame from head to shoes, centred, 3:4 crop. Plain warm off-white studio background. Wearing a plain football kit in forest green and sand, no numbers, no names, no club badge, no logos. Neutral expression. Same camera height and distance as a character reference sheet.
```

Repeat for basketball, hockey, ski, running and padel, and for each figure, skin group and build you actually need. File: `outfit/{figure}_{skin}_{build}__sport_football.png` (and the other sport keys).

**champion_helm**

```
An open-faced champion helm in polished gold, simple crown-like rim, no visor text, no crest letters. [shared tail]
```

Suggested FIT: same head box as `crown` (centre 0.50, top 0.005, width 0.17, height 0.06).

**vkb_banner**

```
A vertical cloth banner, deep brick red, a single gold horizontal stripe, no letters, no numbers, hanging from a short wooden bar, transparent around it. [shared tail]
```

This file is only for the trophy hall. It is not fitted on the body.

## Extras

| Key | Name | Slot | Unlock |
|---|---|---|---|
| `guild_banner` | Gildebanier / Guild banner | banner | The practice raid is defeated (the shared weekly total). Not a prize for one person’s extra sessions |
| `pet_wolf` | Wolvenwelp / Wolf cub | pet, beside the hero | Four different weeks with at least one completed prescribed workout. A second workout in the same week does not count |
| `pet_horse` | Paard / Horse | pet | Phase 5 boss (return to sport) |
| knee mark | Littekentje / small knee mark | skin toggle | The patient turns it on. Off by default. Not a measurement and not stored in the browser |

**guild_banner**

```
A vertical forest-green guild banner with a sand-coloured stripe, no letters, hanging from a wooden bar, transparent background. [shared tail]
```

**pet_wolf**

```
A small wolf cub sitting, side view facing right, soft fur, no collar text, no harness logos, transparent background. [shared tail]
```

**pet_horse**

```
A calm horse standing, side view facing right, no saddle logos, no text, transparent background. [shared tail]
```

**Knee mark** is a few SVG strokes on the knee in the app (`knee_scar` on the hero, default false). It does not need a generated skin. Do not generate a medical scar photograph.

## Memorabilia

When a later phase boss has fallen, the ice pack, the calm mantle and the iron brace stay wearable and also show under **Van de reis** in the trophy hall. The crutches the therapist had switched on show there once the walking staff is unlocked. No new art: the hall reuses these same PNGs.
