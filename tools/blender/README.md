# 3D hero models

`mh_hero.py` builds `web/public/hero3d/hero_m.glb` and `hero_f.glb`: a MakeHuman body (via MPFB,
CC0 assets) in a relaxed hero stance, with clothes, shoes, braces and hair made as shells of the
body itself, and every piece of hero gear as its own node. The app switches nodes on and off and
tints a few materials (see `web/src/components/hero/hero3d.ts`).

## Setup (once)

Needs Blender 4.2 or newer for MPFB; the `bpy` wheel from PyPI is enough (no Blender install).

```sh
python3 -m venv .bpy && .bpy/bin/pip install bpy==5.2.3
git clone --depth 1 https://github.com/makehumancommunity/mpfb2
(cd mpfb2/src/mpfb && zip -qr ../../../mpfb.zip . -x '*__pycache__*')
.bpy/bin/python -c "import bpy; bpy.ops.extensions.package_install_files(filepath='mpfb.zip', repo='user_default', enable_on_install=True); bpy.ops.wm.save_userpref()"
git clone --depth 1 --filter=blob:none --sparse https://github.com/makehumancommunity/makehuman mh
(cd mh && git sparse-checkout set makehuman/data/eyes)
```

## Build

```sh
for f in m f; do .bpy/bin/python tools/blender/mh_hero.py --frame $f --eyes mh/makehuman/data/eyes --glb web/public/hero3d/hero_$f.glb; done
```

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

Licences: MPFB code GPL-3 (only used as a build tool, not shipped); MakeHuman base mesh, targets and
eyes CC0.
