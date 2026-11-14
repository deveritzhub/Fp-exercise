# Approved character finish — 14 November 2026

Model version 7 applies the approved study's skin shading, softer expression, relaxed hands,
cloth bindings, FP mark and trainer details to all eight frame/build combinations. All hairstyles,
beards, glasses, gear nodes, outfit colours and idle/walk/run/cheer animations remain available.
The studio presentation is the default for the standalone viewer; the village keeps its own lighting.
The comparison page preserves an independent original model for the 'before' button.

Every image is an actual local Playwright render of the exported GLB with synthetic avatars,
software WebGL and reduced motion. Files identify frame/build; `-side` uses the keyboard turning
controls. All supported hairstyles are represented, with varied skin and hair colours. `mobile.png`
and `village.png` exercise both viewports/renderers. `models.json` records final hashes and gzip sizes.

Positions retain 0.1 mm precision. glTF core normalised UVs and weights reduce the download without
an extra decoder. Every vertex's packed skin weights sum to one; the browser exercises all four
animation clips and verifies finite bone transforms. The complete eight models stay below 2.5 MB gzip. Small unintended shirt side openings on the
full builds are triangulated using their existing vertices/UVs/skin weights. Only neckline, sleeve
cuffs and hem get light bindings; small underarm openings do not get decorative trim.

The approved finish is a step toward premium art quality. Faces and hairstyles still have limited
artistic detail; clothing needs further silhouette/fold work; four builds are representative shapes,
not individual scans. Blender subsurface shading is not retained by standard glTF. See
`../HERO-ART-DIRECTION.md` for the concrete next quality criteria.

Verification commands are in `tools/blender/README.md`. Only synthetic fixtures are used.

Final verification: 70 unit tests, typecheck and production build passed. The inventory/shop
fixture scenario passed; all four 3D/study browser scenarios passed after the rendering update,
and both model/village scenarios were rerun for the final shirt fit. Front images across all builds, representative side views, mobile, the equipped champion
and the village were visually reviewed.
