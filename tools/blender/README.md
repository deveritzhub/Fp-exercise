# 3D hero models

`mh_hero.py` builds eight static, turnable MakeHuman characters via MPFB: male/female × slim,
average, athletic and full. Each model contains all equipment and hair nodes. The viewer selects
one model and switches nodes/tints (`web/src/components/hero/hero3d.ts`); it does not stretch bodies.
These exports retain the existing static-pose architecture, not an animation rig.

## Setup

Blender 5.2.3's `bpy` wheel requires **Python 3.13**.

```sh
python3.13 -m venv .bpy
.bpy/bin/pip install bpy==5.2.3
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
    .bpy/bin/python tools/blender/mh_hero.py --frame "$frame" --build "$build" \
      --eyes mh/makehuman/data/eyes --glb "web/public/hero3d/hero_${frame}_${build}.glb"
  done
done
```

Macro presets `(muscle, weight)`: slim `(0.30, 0.25)`, average `(0.50, 0.50)`, athletic `(0.80, 0.45)`,
full `(0.40, 0.85)`. Proportions use the neutral macro value; no enlarged head, hand, foot or shoulder
targets. Clothes and equipment are recalculated from each resulting body. Measured body categories
select the nearest supported build; these are four representative shapes, not individual body scans.

Skin retains the tintable material name `skin`, roughness 0.5 and mild subsurface weight 0.06 in
Blender. Standard glTF does not preserve Blender's subsurface shader; the web viewer uses the
exported PBR surface. Hair retains strand alpha and a neutral texture multiplied by the user's tint.
`compact_glb.py` rounds exported float attributes to 0.0001 units to improve gzip without a decoder
extension. Unit tests enforce a maximum of 2,500,000 gzip bytes per complete model.

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
