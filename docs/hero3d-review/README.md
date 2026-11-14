# Approved character finish — 14 November 2026

Model version 8 applies the approved face study to all eight frame/build combinations: fitted
detailed irises, a gentle expression, higher-detail skin shading and a refined bun, alongside the
previous relaxed hands, cloth bindings, FP mark and trainer details. All hairstyles,
beards, glasses, gear nodes, outfit colours and idle/walk/run/cheer animations remain available.
The studio presentation is the default for the standalone viewer; the village keeps its own lighting.
The comparison page preserves an independent original model for the 'before' button.

Every image is an actual local Playwright render of the exported GLB with synthetic avatars,
software WebGL and reduced motion. Files identify frame/build; `-side` uses the keyboard turning
controls. All supported hairstyles are represented, with varied skin and hair colours. `mobile.png`
and `village.png` exercise both viewports/renderers. `models.json` records final hashes and gzip sizes.

Source positions retain their 0.1 mm grid, with at most 0.031 mm additional position error from
standard KHR_mesh_quantization. Inverse bind matrices restore world units; the browser verifies
physical body heights. Core normalised UVs/weights and lossless EXT_texture_webp maps reduce the
download through the existing Three.js loader and browser, without an extra decoding library.
The builder verifies identical decoded RGBA pixels before each image conversion. Every vertex's packed skin weights sum to one; the browser exercises all four
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

Version 8 validation: 71 unit tests, all 7 browser scenarios, typecheck and build passed. Browser
checks verify actual decoded skin/iris/hair maps for every model, physical sizes, four animations
and gear. All eight front views, representative side views, the equipped champion and village
were visually reviewed. Production files remain below 2.5 MB gzip.
