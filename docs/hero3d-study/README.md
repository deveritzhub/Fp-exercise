# Character style study 01 — 14 November 2026

Open `/hero3d-study.html` to compare one female/average character with the existing model.
Both are rendered with the same studio lighting, camera, olive kit palette and synthetic avatar.
The approved finish is now also applied to the eight normal models. This page preserves the
original model independently so comparison remains meaningful. The fixed study itself still uses
one female/average character with a bun.

The study uses the current fitted loose sport kit, preserving its UVs and skin weights, with
neckline/cuff bindings, a small FP mark and laced trainers. Arms and hands rest more naturally.
The fitted CC0 bun uses a smoother silhouette; neutralised CC0 skin shading and original vertex paint
add restrained facial detail while preserving skin tint. Studio rendering adds environment reflections,
a warm key light, contact shadows, filmic tone mapping and a round sand-coloured podium.

These are actual software-WebGL browser captures of the GLB, not generated concept art:

- `before.png`: existing model under the same study lighting and colours.
- `front.png`, `side.png`, `portrait.png`: the new model.
- `equipped-mobile.png`: existing champion/crown/shoe items on the study.
- `page-mobile.png`: the public comparison page, keyboard-accessible on mobile.

Only the bun hairstyle is included in this fixed study. All gear nodes and four animation clips
are retained. Clothing physics, detailed strands, individual facial customisation and adapting the
new garment geometry to every outfit/build remain future work after art direction review.
The study retains the fitted garment topology from the current app. Shoulder fit and clothing in
motion need further art review before applying this direction to all avatars.

Build with the existing Blender/MPFB setup:

```sh
python tools/blender/mh_hero.py --study --frame f --build average \
  --eyes mh/makehuman/data/eyes --glb web/public/hero3d/study/hero_f_average.glb
```

Validation uses synthetic fixtures only. Run the commands in `tools/blender/README.md`, plus
`npx playwright test e2e/hero-study.spec.ts -c playwright.hero3d.config.ts`.

The separate study currently downloads at less than 2.5 MB gzip; the eight
production-model limits remain 2.5 MB. Visual approval and further fitting review are needed before a wider rollout.

Validation on 14 November: 70 unit tests, typecheck and production build passed. The full
five-test browser run passed, followed by a fresh run of both study tests for the final GLB.
Front, portrait, side, equipped and mobile page captures were visually inspected. Skin and hair
remain simplified; this is not a claim of completed premium visual quality.
