# 3D hero models

`mh_hero.py` builds eight animated, turnable MakeHuman characters via MPFB: male/female × slim,
average, athletic and full. Each model contains all equipment and hair nodes. The viewer selects
one model and switches nodes/tints (`web/src/components/hero/hero3d.ts`); it does not stretch bodies.
These exports retain the existing rig and idle/walk/run/cheer animations.

## Setup

Blender 5.2.3's `bpy` wheel requires **Python 3.13**.

```sh
python3.13 -m venv .bpy
.bpy/bin/pip install bpy==5.2.3 Pillow==12.3.0
git clone https://github.com/makehumancommunity/mpfb2
(cd mpfb2 && git checkout 6ff1eb358f6c1959ced77e79e6dd2406d9a71f49)
(cd mpfb2/src/mpfb && zip -qr ../../../mpfb.zip . -x '*__pycache__*')
.bpy/bin/python -c "import bpy; bpy.ops.extensions.package_install_files(filepath='mpfb.zip', repo='user_default', enable_on_install=True); bpy.ops.wm.save_userpref()"
git clone --depth 1 --filter=blob:none --sparse https://github.com/makehumancommunity/makehuman mh
(cd mh && git sparse-checkout set makehuman/data/eyes)
```

In a sandbox, point `BLENDER_USER_RESOURCES` and `BLENDER_USER_CONFIG` at writable directories,
using the same values for extension installation and model builds. No system-level install is needed.

The selected CC0 hair, eyebrow and eyelash source assets are checked into `assets/` with provenance.
They are fitted through `HumanService.add_mhclo_asset` before applying the pose or deleting helpers.

## Build

```sh
for frame in m f; do
  for build in slim average athletic full; do
    .bpy/bin/python tools/blender/mh_hero.py --portrait-finish --tailored --frame "$frame" --build "$build" \
      --eyes mh/makehuman/data/eyes --glb "web/public/hero3d/hero_${frame}_${build}.glb"
  done
done
```

Macro presets `(muscle, weight)`: slim `(0.30, 0.25)`, average `(0.50, 0.50)`, athletic `(0.80, 0.45)`,
full `(0.40, 0.85)`. Proportions use the neutral macro value; no enlarged head, hand, foot or shoulder
targets. Clothes and equipment are recalculated from each resulting body. Measured body categories
select the nearest supported build; these are four representative shapes, not individual body scans.

Then bump `HERO3D_VERSION` in `hero3d.ts` so phones fetch the new files.

## Skeleton and motions

The model keeps the MakeHuman game rig (53 bones); the hero stance is its rest pose. Clothes, shoes and
braces are shells of the body and move with the same weights. Other gear takes its weights from the
nearest skin; hard things (helmet, glasses, buckles, crutches) follow one bone.

Four motions are exported as glTF animations: `idle`, `walk`, `run`, `cheer`. Walking and running use
joint angles from normal gait analysis (hip, knee, ankle and toe curves over one gait cycle; pelvis
rotation and list, trunk counter-rotation, arm swing opposite to the legs). The height of the body is
computed per frame so that a sole rests on the ground. The build prints the ground speed that fits each
gait (`MOTION speeds ...`); `GAIT_SPEED` in `hero3d.ts` holds them per body height.

Judge a gait from the side: `--render out.png --pose walk:8 --side` (motion:frame, 30 frames per second). A preview render:
`--render out.png --show hair_short,gear_crown,outfit_champion` (add `--face` for a close-up).

Skin retains the tintable material name `skin`, roughness 0.5 and mild subsurface weight 0.06 in
Blender. Standard glTF does not preserve Blender's subsurface shader; the web viewer uses the
exported PBR surface. Hair retains strand alpha and a neutral texture multiplied by the user's tint.
`compact_glb.py` preserves the 0.1 mm source positions and uses standard glTF packed geometry
with less than 0.031 mm additional position error for these models. Unit tests enforce a maximum
of 2,500,000 gzip bytes per complete model.

Bump `HERO3D_VERSION` when regenerating models. The old two files are retained for cached older
clients. For a Blender preview add `--render out.png --show hair_short,gear_crown,outfit_champion`
(and `--face` for a close-up).

## Verification

```sh
npx vitest run hero3d -c vitest.rpg.config.ts
npx playwright test e2e/hero-3d.spec.ts e2e/premium-rpg.spec.ts -c playwright.hero3d.config.ts
npm run typecheck
npm run build
```

These isolated configurations use synthetic API fixtures, real local GLBs and software WebGL.
They do not require a patient database. Inspect the generated `hero-3d.png` and model review images
before publishing. Restore unrelated generated RPG screenshots after the run.

Licences: MPFB code GPL-3 (build tool only); MakeHuman base mesh, targets, eyes and selected source
assets CC0. See `assets/README.md` for sources and authors.

## Single character art study

`--study --frame f --build average` opts into `hero_study.py` and produces the separate file
`web/public/hero3d/study/hero_f_average.glb`. See `docs/hero3d-study/README.md`.
The public `/hero3d-study.html` page compares it with the existing character under the same light.
This file intentionally includes only the bun hairstyle; it is not selected by `hero3dUrl` or the village.

## Approved finish for the eight production models

Build each frame/build with `--polished` to apply the approved study's face, hand posture, skin
shading and clothing details while retaining every hairstyle, gear node and animation. Unlike
`--study`, this never removes other hairstyles. The male/female CC0 skin shading is neutralised
for the selected tint. `pack_core_attributes` uses core glTF normalised UVs and 8-bit weights
whose components sum to 255; no decoding extension is needed. Position precision is unchanged;
normal components round to 0.01 for the mobile size budget. The export closes the small shirt
side openings on full builds without changing their skin weights, neck or sleeve openings. Browser renders verify the resulting
surface and animations. The comparison page preserves its original 'before' model separately.

Further visual work and acceptance criteria: `docs/HERO-ART-DIRECTION.md`.

## Face and hair reference study 02

`--portrait-study --frame f --build average` builds the separate reference in
`web/public/hero3d/study/hero_f_portrait.glb`. It includes original fitted iris domes, procedural
iris art, restrained expression targets and temple baby hairs. Review at `/hero3d-face-study.html`.
Run `npx playwright test e2e/hero-portrait.spec.ts -c playwright.hero3d.config.ts` and inspect all
angles. This does not regenerate or select a new model for the eight normal avatars.

## Approved face/hair finish for all variants (version 8)

Use `--portrait-finish` for every m/f × build combination. It keeps every hair and gear choice,
adds the approved fitted irises and expression, and refines the bun. The isolated study pages
keep their frozen reference files. Pillow 12.3.0 is a build-time dependency only.

Maps use lossless `EXT_texture_webp` when smaller; the builder verifies exact decoded RGBA
equality before replacing each PNG. `KHR_mesh_quantization` stores positions and normals as
normalised shorts. A uniform position scale is applied through inverse bind matrices (not
avatar width/height scaling), preserving physical sizes and animation. The step at scale 2 m
is 0.061 mm, maximum additional position error 0.031 mm; normal error is below 0.000016 per
component relative to the existing rounded normals. Both extensions are handled by the existing
Three.js loader and browser without an extra decoder library. WebP is already used by the app.
Browser tests verify actual decoded skin/iris/hair maps and physical body heights for all eight
models, in addition to animations, gear, screenshots and accessibility.

## Fitted clothing (version 9)

Add `--tailored` to `--portrait-finish` for all eight production models. The source CC0 shirt,
shorts and long kit are fitted via MHCLO before pose baking. Their imported bone weights survive
that bake; they are not reprojected from skin shells. Own weave/normal maps, folded bindings,
collar, zipper, pockets and small FP mark are generated by `hero_clothing.py`.
`hero_equipment.py` adds original closed trainer lasts, shaped soles, crossed laces, heel counters
and piping; five material/accessory variants retain the existing footwear keys. Headphones
fit over the ears and above the cap. Bands, guards, a continuous belt and heart-rate strap
fit outside the clothing envelope, preserving their existing rig weights. Long outfits replace
the entire base kit in both the 3D viewer and village. Removing an outfit restores the base kit.
Shared cloth mesh data keeps the complete models inside the existing mobile budget.

The optional inventory 3D view uses the existing equip/buy/preview actions. Its PNG thumbnails
are rendered from the actual wearable GLB meshes through the development-only
`/hero3d-items.html` page. Regenerate after changes with:

```sh
npx playwright test e2e/hero-clothing.spec.ts -c playwright.hero3d.config.ts
```

This also checks all eight fitted kits, worn items, mobile preview, persistence and keyboard/axe.
Inspect `docs/hero3d-clothing/` screenshots before publishing; a passing test is not an artistic
quality verdict. Existing photo and SVG modes keep their own artwork and behaviour.

The dev review page also accepts `pose=walk&time=0.2` (idle/walk/run/cheer). It freezes the real
viewer at that animation sample, including under reduced motion, for attachment review.
This is an art tool, not a new patient action or reward condition.

Create the visual review sheets from those actual screenshots with
`python tools/blender/review_sheet.py` (Pillow). This only arranges/resizes the renders, without
retouching the characters or masking fitting problems.
