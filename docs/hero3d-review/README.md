# 3D model review — 8 November 2026

Eight separately generated MakeHuman bodies, with real body geometry changes rather than viewer
scaling. Each screenshot is a local Playwright render using synthetic API fixtures, real GLBs,
software WebGL and reduced motion. The image filenames identify frame and build; `-side` is a
90-degree rotation using the app's controls. All supported hairstyles are represented across the
set; skin and hair colours also vary.

The first review exposed toe-shaped shoes and jagged shin-guard edges. The final generator uses
smooth shoe forms fitted to the foot bounds and trimmed, smoothed guard edges. The eight models
were regenerated after correcting these defects. See `../rpg-screenshots/hero-3d.png` for a champion
outfit with crown and gold shoes in the actual inventory layout.

This is a technical and fitting improvement, not a claim of finished photorealism. Faces and skin
still have limited surface detail; clothing is fitted geometry without simulated fabric folds;
CC0 hair has low-poly silhouettes. Four representative body builds cannot reproduce every person's
exact anatomy. Blender's mild subsurface shading is not preserved by standard glTF; the browser
uses the exported roughness-0.5 PBR skin surface.

Validation commands are in `tools/blender/README.md`. All gear keys, all hair/beard/glasses options,
size limits, distinct body geometry and body-selection logic are covered by the hero3d unit tests.
The browser suites also cover inventory persistence, keyboard controls, reduced motion,
accessibility and the existing RPG view. No patient database is used by these fixture suites.
