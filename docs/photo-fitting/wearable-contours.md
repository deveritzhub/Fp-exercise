# Wearable fit and master cape review — 8 November 2026

This follow-up to PR #28 improves the existing collection rather than adding more shop items. Wristbands, watches, captain armbands, gloves and shin guards follow the photographed limb angle. Wrist and upper-arm widths use isolated silhouette spans, with bounded fallbacks when an arm touches the torso. Wristbands and captain armbands are clipped to the body silhouette.

The existing future master cape now has original SVG fabric artwork behind catalog photographic avatars. Its preview follows the inventory display preference; personal photos use the illustrated preview. The existing unavailable reward status stays intact. Opening and closing the preview does not purchase, equip or save anything.

## Visual evidence

The six refreshed wardrobe sheets each show all 26 existing items and three combinations (174 rendered views). All six were opened and visually reviewed after the final width correction. These samples cover lean, fuller and muscular bodies, different skin tones and hairstyles. They are representative checks, not a claim of pixel-perfect fitting across every catalog image.

- [Fuller female](catalog/wardrobe-f_s5_full_h2.png)
- [Fuller female, curly hair](catalog/wardrobe-f_s7_full_h4.png)
- [Lean female](catalog/wardrobe-f_s1_lean.png)
- [Fuller male](catalog/wardrobe-m_s5_full.png)
- [Lean male](catalog/wardrobe-m_s1_lean_h4.png)
- [Muscular male](catalog/wardrobe-m_s9_muscular_h3.png)
- [Master cape on four bodies](catalog/master-cape-photo.png)

The cape screenshot was also opened and reviewed: the source body and legs occlude the cape; gold edging remains visible around the hem. It is stylized 2D artwork.

## Validation

- `npm run build`: passed, including TypeScript checking. Existing large-chunk warning remains.
- `npx vitest run -c vitest.rpg.config.ts`: 55 passed, including all 420 fit profiles and bounded limb angles/widths.
- `npx playwright test -c playwright.photo.config.ts`: 3 passed; all 26 items equip, persist after reload and unequip; mobile layout; cape preview performs no writes.
- `npx playwright test -c playwright.rpg.config.ts`: 1 passed; inventory, character variants, keyboard, reduced motion and accessibility checks.
- Wardrobe browser review: 1 passed, six sheets refreshed.
- `npx playwright test -c playwright.cape.config.ts`: 1 passed; four cape previews render behind their bodies.

Only synthetic fixtures and fixed catalog assets were used. Existing tiers, itemlevels, purchases, coins and unlock rules remain unchanged.
