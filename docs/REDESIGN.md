# Redesign "Deep Olive & Clinical Sage" (oktober 2026)

Visuele herziening van de bestaande app; geen rebuild. API, databaseschema's, tenant-isolatie (RLS),
programmahistorie, patiëntsessies, revalidatielogica, doseringen en beveiliging zijn ongewijzigd.
Alleen synthetische testdata gebruikt; niets gedeployed.

## Designsysteem

### Kleuren (centraal in `web/tailwind.config.cjs` en `web/src/index.css`)

| Token | Waarde | Gebruik |
|---|---|---|
| `accent` (`--accent`) | `#29483C` Deep Forest Green | primaire knoppen, actieve navigatie, links |
| `accent-strong` | `#1D362D` Dark Forest | hover / nadruk |
| `accent-soft` | `#E6EEE8` Clinical Sage | zachte accentachtergrond, geselecteerde chips |
| `canvas` | `#F7F9F7` | paginaachtergrond |
| `white` | `#FFFFFF` | kaarten |
| `line` | `#E1E8E2` Soft Sage | randen |
| `mist` | `#EEF3EF` | zijbalk |
| `sage` | `#E6EEE8` | icoontegels, lege staten |
| `sand` / `sand-soft` / `sand-ink` | `#D8CCB6` / `#F3EFE7` / `#5B4A2E` | subtiele merkaccent (bijv. reeks-chip), nooit status |
| `ink-900` | `#202B26` Dark Slate Green | tekst; schaal 50–950 in groengrijs |
| `ok` / `warn` / `bad` / `info` | `#1B6E45` / `#8A5A00` / `#B42318` / `#1D5F99` + `soft` | medische/statuskleuren, los van het merk |

- Alle teksttokens (ink-400 t/m 900, statuskleuren) halen WCAG 2.2 AA (≥ 4,5:1) op wit, canvas,
  sage en mist; vastgelegd in `web/src/lib/accent.test.ts`.
- Status nooit alleen met kleur: meldingen (`Notice`) hebben altijd een statusicoon, actieve
  navigatie heeft ook een vette tekst, een balkje/pil, niveau toont ook "n/5", fasen tonen "nu",
  "(afgerond)" en "(later)".
- **Praktijkkleur**: `practices.branding.accent` (Praktijk → Instellingen) wordt nu echt toegepast
  in de therapeuten- en patiëntapp (`lib/accent.ts`). Een te lichte kleur wordt automatisch donkerder
  gemaakt tot wit erop AA haalt. De oude standaard `#413d28` geldt als "geen eigen kleur".

### Typografie (zelf gehost via `@fontsource-variable`, geen Google Fonts-verzoeken)

- Manrope (koppen, cijfers in stat-tegels), Inter (tekst, labels, tabellen, getallen; tabulaire cijfers).
- Schaal: `.t-page` 24/28 px · `.t-section` 18 px · `.t-card` 15,5 px · `.t-body` 14,5 px ·
  `.t-label` 12,5 px hoofdletters · `.t-help` 13 px. Minimale tekstgrootte in de app 12 px
  (uitgezonderd de miniatuur-illustratie op de marketingpagina).

### Vorm en beweging

Radius 10 / 12 / 14 px (`lg`/`xl`/`2xl`), zachte randen, schaduwen `xs`/`card`/`lift`/`pop`.
Rustige hover (rand + schaduw, geen verschuiving), duidelijke focusring, geen verlopen behalve de
rustige thumbnail-tinten. `prefers-reduced-motion` zet alle animaties uit.

## Per scherm

- **Zijbalk/header**: lichte salie, logo-ruimte, actieve stand (wit, balkje, vet, groen icoon),
  witte header, 44 px tikdoelen; zoekveld krimpt mee (geen overflow op 768 px).
- **Dashboard**: stat-tegels met icoontegel, recente activiteit eerst 6 met "Alle tonen".
- **Bibliotheek**: filterpaneel (desktop), grotere zoekbalk, actieve filters als salie-chips,
  rustiger kaarten; alle functies (favorieten, toevoegen, varianten, preview) ongewijzigd.
- **Oefening**: dosering-tegels groeien mee (“3x per week” niet meer afgekapt).
- **Programma-editor / fasen**: fasetijdlijn (afgerond · nu · later), doel, "nog X te beoordelen".
- **Patiëntdossier**: nieuwe tokens/typografie; geen structuurwijzigingen.
- **Patiëntapp**: zelfde identiteit; tabbalk 60 px hoog met salie-pil; op smalle telefoons alleen
  het logo-icoon zodat de praktijknaam volledig past.

## Tests

- `npm run typecheck`, `npm run build`, `npm test` (140), `npm run test:e2e` (alle groen, 4 overgeslagen
  = de visuele tour zonder `SHOT_DIR`).
- Nieuw: `web/src/lib/accent.test.ts` (contrast van tokens, praktijkkleur),
  `e2e/design-system.spec.ts` (berekende stijlen, zelf gehoste fonts, focus, praktijkkleur met
  axe-check, patiënt-tabbalk); pixel-snapshots van zijbalk en tabbalk met `VISUAL=1`.
- `e2e/visual-tour.spec.ts`: `SHOT_DIR=… npx playwright test e2e/visual-tour.spec.ts`.
- Breedtes 360/390/430/768/1440: bestaande `ux-audit`-test (geen horizontale overflow, 44 px).

## Screenshots

`screenshots/redesign/before`, `…/after` (1440 en 390 px) en `…/compare` (voor | na naast elkaar).

## Resterende visuele inconsistenties

1. ~~Android-schil en PNG-iconen in de oude kleur~~: opgelost. Alle iconen, het opstartscherm en de
   Play Store-afbeeldingen komen nu uit `scripts/make-icons.mjs` (bosgroen/salie); de Android-kleuren
   staan in `android/gradle.properties`. De app staat nog niet in Google Play, dus dit kost geen extra versie.
2. Oefeningen zonder eigen media tonen een monogram op een salie-tint; echte opnames ontbreken nog.
3. Grafiekbalken gebruiken het accent op 70 %; bij een eigen praktijkkleur verandert die mee.
4. In de screenshots over de hele pagina staan de vaste zijbalk en de opslaanbalk halverwege en
   zijn kaarten verderop soms leeg (`content-visibility`). Dat zit alleen in de screenshot; in de
   browser klopt het.
5. Marketingpagina's zijn alleen via tokens/fonts meegegaan, niet apart herontworpen.
