# 3D hero — proof of concept

The photo stays the default. **Bekijk in 3D** on `/p/held` lazy-loads a separate JavaScript chunk (Three.js, React Three Fiber, drei — all MIT). The production chunk `Hero3DView` is about **842 kB** minified and **227 kB** gzip. It is not in the first page load. If WebGL is missing, or the page is opened with `?webgl=0`, the button explains that 3D is unavailable and the photo remains.

The figure is a procedural mannequin built in the app. No downloaded model, no account, no API key. Idle is a small arm swing and bob. When a measurement boss is fully defeated, the arms lift once, then idle returns. Drag or touch turns the figure. Arrow keys do the same when the stage is focused. Reduced motion keeps a still pose.

Attached to the bones:

- Knee brace on the operated side from the ACL route, otherwise the right knee.
- Crutches under the arms, only while `crutches` or `crutch_staff` is equipped.
- The chosen heirloom (weapon in the right hand, shield on the left forearm, amulet on the chest). Tier changes the metal colour and glow. A worse day does not lower the tier.

Build keys scale the shoulders, hips and height. Skin uses the same five colour groups as the drawn figure.

## What a full rollout needs

1. **glTF items**, one file per piece, authored on the same skeleton (hips, spine, shoulders, arms, thighs, shins). The proof parents simple meshes to those bones. A real brace, staff and heirloom should be skinned or parented to the same bone names so they move with the idle and victory clips.
2. **One humanoid**, CC0 or MIT, with a walk and a short celebration clip. Quaternius and Kenney publish CC0 characters that can replace the procedural body. Keep the photo as the default until the 3D figure is reviewed on every build.
3. **Art pipeline.** Product cut-outs from the photo gear do not become 3D by themselves. Options that turn an image into a mesh, mentioned only — not used here:
   - Meshy: image-to-3D, roughly a paid credit pack (on the order of tens of dollars for a batch of items; check their current pricing).
   - Tripo: similar image-to-3D credits, free tier is small, paid plans are monthly.
   - Rodin (Hyper3D): image-to-3D, paid per generation.
   A free path is to model the few ACL pieces in Blender and export glTF. That needs no account at runtime.
4. **Performance.** The proof turns shadows and antialiasing off and caps the pixel ratio at 1.25. A full set of glTF files should stay in the lazy chunk, with Draco or Meshopt if the files grow. Test on a mid-range phone at 360 px before the toggle becomes the default.
5. **Licenses.** Every new file needs a note in this document: author, license (CC0 or MIT), and that we may redistribute it. Mixamo and Adobe downloads are account-gated; do not add them unless the license text explicitly allows redistribution inside this app.

## Licenses in this proof

| Piece | License |
|---|---|
| `three` 0.169.0 | MIT |
| `@react-three/fiber` 8.17.14 | MIT |
| `@react-three/drei` 9.117.3 | MIT |
| Mannequin, brace, crutches, heirloom meshes | Original geometry in this repository. No third-party model file. |
