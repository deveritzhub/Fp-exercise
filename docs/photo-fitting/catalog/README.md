# Generated-avatar fitting review

The fixed catalog contains **240 standard avatars** (2 frames × 5 skin groups × 6 builds × 4 hairstyles) and **180 outfit photos** (2 × 5 × 6 × 3 outfits). All 420 now have measured geometry. No patient photos or records were processed.

## Changes

- Head, shoulder, wrist, hip, knee and ankle anchors come from the actual source image, including the actual outfit pose.
- Crowns use the visible head silhouette; shoes use the actual foot outline.
- The rear mat is occluded by the source silhouette instead of a generic body polygon.
- Outfit photos retain the selected original face and hair using an aligned 2D mask. Long hair extends in front of the outfit.
- The fitted view reserves 4% of its frame above/below the image to avoid cropping crowns.
- Personal/guest photos remain excluded. Geometry loads with photographic equipment.

These are image-space 2D fittings, not anatomical measurements or clinical data. Models run offline; no ML library, remote inference or camera access was added to the app.

## Evidence and limits

The 20 pose sheets show all 240 avatars with the same equipped set. All sheets were opened and inspected. Corrections included crown clearance, bald-head placement and shoe outlines. This establishes standard-catalog coverage, not pixel-perfect fitting of every possible overlapping equipment combination.

The browser check also checks the original head source in all **720 hairstyle/outfit combinations**. That source check is automated; the identity screenshots are a representative visual sample. The separate inventory fixture equips, reloads and removes all 26 items using synthetic API state. These do not test real patient storage.

Fine hair edges are polygonal; existing photographs can have slightly different lighting or face/body skin tones. Unknown future asset keys use generic placement until measured. The 720 outfit combinations are not all individually visually certified.

## Validation on the current app branch

Production build/typecheck, 47 focused unit tests, the full catalog browser check and both synthetic photographic inventory checks pass. The geometry is a separate equipment chunk (about 445 kB gzip); this increases the first photographic equipment load. No geometry inference runs in the browser.

## Reproduce

```sh
python3 scripts/download-photo-review.py --all
npx playwright test -c playwright.catalog.config.ts
npx playwright test -c playwright.photo.config.ts
npx vitest run -c vitest.rpg.config.ts
npm run build
```

Geometry regeneration uses `scripts/measure-photo-fit.py`, Python MediaPipe, OpenCV and NumPy, and official models:

- [Pose Landmarker Full](https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task)
- [Selfie multiclass segmentation](https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite)

Pass local paths with `--pose-model` and `--hair-model`. Committed geometry means app builds need no models. Existing profiles are cached; remove the generated JSON only when intentionally rebuilding every profile.

## Pose sheets

- [Poses 1–12](poses-0.png)
- [Poses 13–24](poses-1.png)
- [Poses 25–36](poses-2.png)
- [Poses 37–48](poses-3.png)
- [Poses 49–60](poses-4.png)
- [Poses 61–72](poses-5.png)
- [Poses 73–84](poses-6.png)
- [Poses 85–96](poses-7.png)
- [Poses 97–108](poses-8.png)
- [Poses 109–120](poses-9.png)
- [Poses 121–132](poses-10.png)
- [Poses 133–144](poses-11.png)
- [Poses 145–156](poses-12.png)
- [Poses 157–168](poses-13.png)
- [Poses 169–180](poses-14.png)
- [Poses 181–192](poses-15.png)
- [Poses 193–204](poses-16.png)
- [Poses 205–216](poses-17.png)
- [Poses 217–228](poses-18.png)
- [Poses 229–240](poses-19.png)

## Original avatar and three outfits

![Identity comparison 1](identity-0.png)

![Identity comparison 2](identity-1.png)

![Identity comparison 3](identity-2.png)

![Identity comparison 4](identity-3.png)


## Headwear

- [Headwear sheet 1](headwear-0.png)
- [Headwear sheet 2](headwear-1.png)
- [Headwear sheet 3](headwear-2.png)
- [Headwear sheet 4](headwear-3.png)

## Inventory and before/after

![Unequipped, equipped and champion outfit](comparison.png)

![Mobile inventory](mobile.png)

![Shop tiers](shop-tiers.png)
