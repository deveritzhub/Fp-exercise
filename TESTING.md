# Testing

| Layer | Tool | Location | Database |
|---|---|---|---|
| Unit | Vitest | `shared/*.test.ts`, `server/test/search.test.ts` | — |
| API integration | Vitest + `app.request()` (no network) | `server/test/*.test.ts` | `fp_exercise_test` (recreated per run) |
| Tenant isolation (API + direct SQL) | Vitest + `pg` as `fp_app` | `server/test/isolation.test.ts` | `fp_exercise_test` |
| End-to-end + accessibility | Playwright (Chromium desktop + Pixel 7 emulation) + axe-core | `e2e/*.spec.ts` | `fp_exercise_e2e` (recreated per run) |

All test data is synthetic (seed accounts on `.test` domains).

## Running

```bash
npm test              # ~6 s
npm run test:e2e      # ~60 s; starts its own API (:8788) and Vite (:5174)
npm run typecheck
```

`npm run test:e2e` uses the pre-installed Chromium at `/opt/pw-browsers` (override with
`PW_CHROMIUM_PATH`). Firefox/WebKit are not available in this environment.

## Coverage of the required scenarios

| # | Requirement | Covered by |
|---|---|---|
| 1 | Therapist creates a programme | `workflow.test.ts` › builds and assigns; `workflow.spec.ts` › creates a patient and programme (UI, drag/keyboard reorder, steppers) |
| 2 | Assign to an authorised patient | same; plus `isolation.test.ts` › cannot create programme for other practice's patient |
| 3 | Patient views their programme | `workflow.test.ts` › patient home/notifications; `mobile.spec.ts` |
| 4 | Patient completes a session | `workflow.test.ts` › completes session; `workflow.spec.ts` › phone flow incl. invite activation |
| 5 | Therapist views progress | `workflow.test.ts` › progress/attention/notifications; `workflow.spec.ts` › sessions tab, mark as seen |
| 6 | Therapist modifies a programme | `workflow.test.ts` › version 2, item ids preserved, patient notified; `workflow.spec.ts` › change note + history |
| 7 | Unauthorised users cannot access patient info | `isolation.test.ts` › unauthenticated 401s, assignment-only access within a practice, patient-to-patient |
| 8 | Practice A ≠ Practice B, incl. direct API/DB requests | `isolation.test.ts` (API by id, header spoofing, custom exercises, templates, members, audit; **direct SQL** SELECT/INSERT/UPDATE/DELETE as `fp_app`); `workflow.spec.ts` › direct URL |
| 9 | Private media not accessible without authorisation | `media.test.ts` (other practice, other patient, anonymous, magic-byte validation, Range) |
| 10 | Modern desktop and mobile browsers | Playwright desktop + mobile emulation, no horizontal overflow checks. Real-device/WebKit testing pending. |

Also covered: CSRF header/Origin, httpOnly cookie, logout revocation, password reset single-use +
session revocation, lockout, rate limiting, security headers, JSON 404 for unknown API paths,
feedback/offline sync/push reminders (`engagement.test.ts`: feedback visibility per practice, offline session ids + clamped client times + idempotent replays, push endpoint allow-list (SSRF), once-per-day reminders only on training days, generic payloads, expired subscriptions; `engagement.spec.ts`: feedback dialog, a full workout with the browser offline and automatic sync), two-factor authentication (`mfa.test.ts`: RFC vectors, setup, login second step, replay, recovery codes, lockout, practice enforcement, reset rules, secrets unreadable by `fp_app`; `mfa.spec.ts`: setup with QR, enforcement redirect, code at login, axe scans), invite/activation semantics, adherence maths, search query building, file sniffing, contact form
consent + anti-spam, platform admin has no patient access, WCAG 2.x A/AA automated scans on
marketing pages, therapist workspace pages, builder, patient home/programme/progress and player.

## Latest results (2026-10-22)

- `npm test`: **8 files, 78 tests passed**
- `npm run test:e2e`: **25 tests passed** (22 desktop, 3 mobile)
- `npm run typecheck`: clean; `npm run build`: success (main chunk 113 kB gzip)

Issues found and fixed by the tests during development: runtime role could read password hashes
(column grants added); invited-but-not-activated patients shown as active; lock wait when withdrawing an
invite inside the request transaction; colour-contrast failures (muted/status tokens darkened);
accessible-name mismatches; unknown `/api/*` paths falling through to the SPA in production.

## Not yet covered

Load/performance tests, real iOS Safari/Android devices, screen-reader manual audit, visual
regression, backup/restore drills, penetration test.
