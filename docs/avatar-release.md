# Avatar/inventory release on the current hosted branch

This release ports the tested inventory work from PR #25 onto the current hosting branch, retaining its skill updates, trophy wall, clinical screens and other features.

- Existing photographic avatars and front-facing item layers; optional RPG view.
- Alledaags, Premium, Designer, Legendarisch and Goddelijk tiers, cosmetic itemlevels and shared glow colors.
- Warm beige inventory, previews for every item and responsive cards.
- Accessible slot labels include their visible IL value; decorative vector lettering uses paths.
- Existing purchase/equip rules and prices remain unchanged. No server or database migration changes.

The newer 420-photo fitting profiles and hairstyle-preserving outfit composition are intentionally separate from this release.

Validation: production build/typecheck and 44 focused unit tests; synthetic photographic inventory and RPG browser checks. Browser checks cover all 26 items, reload/equip/unequip, 64 SVG combinations, keyboard use, reduced motion and WCAG 2.2 labels.
