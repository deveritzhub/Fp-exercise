# Progress log

_Resume point for any new working session. Last updated: 2026-10-22._

## Current status

A working development build covering the full Definition of Done with synthetic data:
therapist login → library search/filter → build programme → assign to synthetic patient → patient
activates on phone, follows exercises, records completion/difficulty/pain/feedback → therapist reviews
progress and edits the programme (versioned) → practices isolated (verified at API and SQL level) →
marketing website. All automated tests pass (56 Vitest, 16 Playwright).

Branch: `claude/fp-exercise-platform-bcak8k`.

## Environment findings (session 1)

- Node 22, npm, PostgreSQL 16 binaries (started with `service postgresql start`), Chromium for Playwright
  at `/opt/pw-browsers/chromium-1194`. No Docker daemon → no local Supabase.
- Lovable MCP integration **is connected** but was deliberately not used: each generation spends the
  user's Lovable credits (requires approval) and data residency of its backend was not verified.
  The code-first repo can be imported into Lovable later if desired.
- Local DB superuser password set to `postgres` for `npm run db:setup` (dev container only).

## Completed

- Schema + RLS + roles (`fp_app`, `fp_auth`, `fp_owner`), column-level grants, audit log
- Auth: sessions, CSRF, lockout, rate limits, reset, invites, email verification, password change
- API: exercises, media (private, Range), patients (CRUD, invite, assignment, progress, export),
  programmes (templates, versions, duplicate, status, favourites), patient app, dashboard, practice,
  admin, public (plans, contact), notifications
- Original demo library: 50 global exercises (+ 1 practice-specific per demo practice), 29 relations,
  9 global templates (incl. ACL phases 1–2, patellar & Achilles tendon, rotator cuff, neck, ankle,
  hip, low back) + 1 practice template — all flagged `needs_clinical_review`, no media
- Web: design system; therapist workspace; programme builder; patient PWA; admin; marketing site;
  NL/EN switch; WCAG-oriented components (axe-clean on tested pages)
- Docs: README, ARCHITECTURE, DATABASE, SECURITY (incl. NEN 7510/DPIA/MDR assessment), TESTING,
  ROADMAP, RELEASE_CHECKLIST

## Known issues / limitations

- MFA not implemented (release blocker).
- Patient app has no offline queue; a failed save shows an error and can be retried.
- Practice branding colour is stored but not yet applied in the UI.
- Marketing pages are client-rendered (SEO meta set at runtime; pre-rendering planned).
- Only Chromium tested; mobile is emulated.
- Exercise videos/thumbnails: none seeded (by design). Practices can upload their own.
- Adherence counts a planned day as done when *any* completed session exists that day for the
  programme (partial sessions count as completed if finished).

## Decisions awaiting the product owner

1. Hosting provider (EU) and budget for staging — needed before any deployment.
2. Whether to use Lovable for further UI iteration (credit spend).
3. Pricing (seeded as indicative: Solo €39/m, Praktijk €29/therapist/m, Organisatie custom).
4. Retention period for exercise data after treatment ends.
5. Who performs clinical review of the exercise library and records original videos.

## Deployment status (hand-over)

- Neon: project `fp-exercise` (Frankfurt) created by the owner; direct (non-pooled) connection string goes
  into Render as `DATABASE_ADMIN_URL` (never commit or paste it in chat).
- Render: service `fp-exercise` (srv-dbd4kgl9fdbs73af63b0), Frankfurt, **free plan**, auto-deploys from
  branch `claude/fp-exercise-platform-bcak8k`. **LIVE at https://fp-exercise.onrender.com** (2026-10-22):
  migrations 001–003 applied, synthetic demo data seeded. `DATABASE_ADMIN_URL` set via the Render connector.
  The Neon owner password was shared in chat once: rotate it in Neon before any real data is used.
- Videos: 13 Kling clips generated in Higgsfield (see docs/VIDEOS.md); owner approved the Kling style.
  This environment cannot download from Higgsfield's CDN or reach *.onrender.com (network policy).

## Next actions

See ROADMAP.md › Next priorities. Immediate next step: CI pipeline, then MFA.

## How to resume

```bash
service postgresql start        # if the container restarted
npm install && npm run db:reset && npm run dev
npm test && npm run test:e2e
```
