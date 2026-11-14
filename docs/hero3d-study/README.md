# Character style study 01 — 13 November 2026

Open `/hero3d-study.html` to compare one female/average character with the existing model.
Both are rendered with the same studio lighting, camera, olive kit palette and synthetic avatar.
The default eight models and the village still use their existing art. This is one reviewable
style study, not a rollout of all builds and hairstyles.

The study includes a separately modelled shirt with regular topology, rounded neckline and sleeve
bindings, eased shorts, drawstrings, side seams and laced trainers. Arms and hands rest more naturally.
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
The visible shirt is regular geometry rather than anatomical skin topology; the covered inner skin
is removed to avoid body/cloth intersections. This method must be reviewed in motion before rollout.

Build with the existing Blender/MPFB setup:

```sh
python tools/blender/mh_hero.py --study --frame f --build average \
  --eyes mh/makehuman/data/eyes --glb web/public/hero3d/study/hero_f_average.glb
```

Validation uses synthetic fixtures only. Run the commands in `tools/blender/README.md`, plus
`npx playwright test e2e/hero-study.spec.ts -c playwright.hero3d.config.ts`.
