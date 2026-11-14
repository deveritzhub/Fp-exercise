# Face and hair study 02 — 14 November 2026

Public review page: `/hero3d-face-study.html`. It compares the new study with the approved study 01
under identical camera, lighting and palette. The page preserves this synthetic female/average reference;
the approved face/hair finish is now applied to all eight normal models at version 8. The study is a reviewable step, not finished premium art.

The new eyes use original radial iris artwork with fibres, a pupil and a limbal edge, curved surfaces
fitted by ray casts to the actual eyeballs, and a glTF clearcoat reflection. MakeHuman expression
units add a restrained closed-mouth smile and relaxed eyelids. The fitted CC0 bun uses higher
resolution neutral shading and strand relief, with sparse original, tapered baby hairs on the temples.
Skin, hair and eye colours retain their normal tint controls.

Actual software-WebGL screenshots: `before.png`, `front.png`, `three-quarter.png`, `profile.png`,
`mobile.png` and `colour-variant.png`. The first review exposed protruding irises and overly long
face strands; these were corrected before publication. The final front, three-quarter, profile and colour-variant screenshots were visually reviewed.
The regression test also delays the fabric image: the viewer remains loading until the real cloth
image is available, preventing a premature black-shirt preview.

Build with the existing Blender/MPFB environment:

```sh
python tools/blender/mh_hero.py --portrait-study --frame f --build average \
  --eyes mh/makehuman/data/eyes --glb web/public/hero3d/study/hero_f_portrait.glb
```

The prototype has a separate 3 MB gzip budget to allow high-detail face/hair review. The eight
production models keep their 2.5 MB budget. The production rollout uses lossless textures and standard packed geometry to keep all eight
models below 2.5 MB gzip while preserving their choices and physical sizes. Realistic hair silhouettes, fine facial anatomy, clothing and
animation still need further art work; see `../HERO-ART-DIRECTION.md`.

Original iris texture, hair wisps and shader work are authored in `tools/blender/hero_portrait.py`.
The base mesh, expression units, fitted bun and skin shading retain their documented MakeHuman CC0
provenance. No patient data or patient database is used in this page or its fixture tests.

Final verification: 71 unit tests and all 7 browser scenarios passed, including the eight normal
models, village, inventory/shop, both comparison pages, colour variation, keyboard/axe accessibility
and the delayed clothing-image regression. Typecheck and production build passed. All six final
portrait captures were visually reviewed. `model.json` records the tested asset hash and size.
