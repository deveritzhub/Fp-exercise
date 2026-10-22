# Roadmap

Legend: ✅ done · 🟡 partial · ⬜ planned

## Phase 1 — Foundation ✅
✅ Environment inspection & stack decision · ✅ repo & scripts · ✅ architecture · ✅ schema, roles, RLS ·
✅ design system · ✅ local dev + tests · ✅ navigation · ✅ authentication (login, logout, reset, invite,
email verification, lockout, rate limiting)

## Phase 2 — Core physiotherapy features ✅
✅ Exercise library (50 original demo exercises, marked for clinical review) · ✅ search & filters ·
✅ detail views with regressions/progressions · ✅ custom exercises · ✅ private video/thumbnail upload ·
✅ programme builder · ✅ 9 global + practice templates · ✅ assignment, duplication, versions, favourites

## Phase 3 — Patient application ✅ / 🟡
✅ Patient login via invite · ✅ today dashboard · ✅ programmes · ✅ exercise player (video, set tracker,
rest timer) · ✅ completion + difficulty/pain/feedback · ✅ history · ✅ mobile layout ·
✅ PWA: manifest, app icons, service worker (offline shell + patient data), offline outbox for workouts, push reminders

## Phase 4 — Progress monitoring ✅
✅ Dashboard with attention signals · ✅ adherence (weekly, 7/28 d) · ✅ session history with logs ·
✅ pain/difficulty trends · ✅ programme adjustments with versioning · ✅ per-exercise stats ·
✅ mark feedback as seen · ✅ in-app notifications

## Phase 5 — Commercial website ✅
✅ Home · ✅ features · ✅ how it works · ✅ pricing (configurable plans, no payments) · ✅ interactive demo ·
✅ contact (consent, honeypot, timing, rate limit) · ✅ legal drafts · ✅ SEO basics (titles, descriptions,
JSON-LD, robots, sitemap) · ⬜ pre-rendering/SSG for marketing pages · ⬜ final copy & real imagery

## Phase 6 — Multi-practice readiness ✅ / 🟡
✅ Practice accounts · ✅ member invites/roles/deactivation · ✅ isolation verified (API + SQL) ·
✅ practice-specific exercises/templates · ✅ platform admin (aggregate only) · ✅ plan limits (seats) ·
🟡 branding: accent stored, ⬜ applied in patient app; ⬜ self-service registration; ⬜ Stripe (needs approval)

## Phase 7 — Quality & release readiness 🟡
✅ Automated unit/integration/isolation/e2e tests · ✅ axe a11y scans · ✅ security review (internal) ·
✅ documentation · ⬜ manual WCAG audit · ⬜ performance budget/load test · ⬜ real-device testing ·
⬜ deployment (EU hosting, staging) · ⬜ CI pipeline · ✅ MFA (TOTP) · ⬜ external pen test · ⬜ DPIA/DPA

## Next priorities (proposed order)
1. CI (GitHub Actions: typecheck, vitest with Postgres service, Playwright) — prerequisite for team work.
2. ~~MFA (TOTP) for staff~~ ✅ · session management screen; passkeys (WebAuthn).
3. Staging deployment in EU (needs hosting choice + approval of costs).
4. ~~Offline-tolerant patient app and reminders~~ ✅ (push; e-mail reminders once a mail provider is chosen)
   (in-app → opt-in e-mail/push with consent).
5. Apply practice branding in patient app; practice logo upload.
6. ✅ Clinical review per practice (approve/withdraw, reviewer + date, "Te controleren" tab). Next: recording/uploading videos.
7. Patient hard-delete/retention jobs; data processing agreement + DPIA template.
8. Self-service practice onboarding + Stripe billing (after authorisation).
