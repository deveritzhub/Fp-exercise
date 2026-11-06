# Architecture

## Overview

```
 Browser (React SPA, PWA manifest)
   │  same-origin fetch /api/*  (session cookie, X-Requested-With: fp)
   ▼
 Hono API (Node 22)  ──────────────► private media storage (STORAGE_DIR, outside web root)
   │  fp_auth pool  → users, sessions, one-time tokens, mail outbox   (server/src/auth only)
   │  fp_app pool   → everything else, one transaction per request with app.user_id set
   ▼
 PostgreSQL 16 — row-level security on every tenant table
```

One deployable unit: in production the API also serves the built SPA (`dist/web`) with long-lived
caching for hashed assets and `no-store` for API responses.

## Key decisions

| Decision | Rationale |
|---|---|
| **Code-first repo, not Lovable** | The Lovable integration is connected, but every Lovable generation spends workspace credits (approval boundary) and its cloud backend's data residency/processor terms were not verified. A code-first repo keeps full control of security, tests and git history, and can still be imported into Lovable later. |
| **Plain PostgreSQL + RLS instead of a hosted BaaS** | Supabase local requires Docker (unavailable here). The RLS design is Supabase-compatible: `app.uid()` is the single place to swap for `auth.uid()`. Avoids vendor lock-in; runs on any EU Postgres (e.g. Scaleway, OVHcloud, Azure NL, AWS eu-central-1, or Supabase EU). |
| **Authorisation enforced in the database** | Every request runs as role `fp_app` (not table owner, `NOBYPASSRLS`) inside a transaction with `set_config('app.user_id', …, true)`. Even a buggy or missing `WHERE` clause cannot leak another practice's rows. API checks are a second layer. |
| **Separate auth role** | `fp_auth` is the only role that can read password hashes, sessions and tokens. `fp_app` has column-level grants that exclude secrets. |
| **Opaque server-side sessions** | httpOnly, SameSite=Lax cookie with a random token; only its SHA-256 is stored. Instant revocation (logout, password reset) — preferable to long-lived JWTs for healthcare. |
| **Hono** | Small, typed, standards-based (Fetch API) — portable to other runtimes; fast tests via `app.request()` without a network. |
| **React + Vite + Tailwind, own design system** | Fast, maintainable; small set of primitives in `web/src/components/ui`. No heavy component framework. Practice branding through CSS variables (`--accent`). |
| **TanStack Query** | Server-state caching, loading/error states, retries (not on 4xx). |
| **Bilingual co-located copy `t('nl','en')`** | Dutch is the source language; strings are greppable for extraction into catalogs when a third language is added. Controlled vocabularies (regions, categories, equipment) live in `shared/taxonomy.ts` as stable keys with NL/EN labels. |
| **Adherence in shared code** | `shared/adherence.ts` is pure and unit-tested; used by the API for dashboards and the patient app. It is a descriptive engagement metric, not a clinical score. |
| **Templates are copies** | Applying a template copies its items into a new draft programme (`source_template_id` kept); later template edits never silently change a patient's programme. |
| **Program versioning** | Every save increments `programs.version` and stores a JSON snapshot in `program_versions`. Item IDs are preserved across edits so exercise logs stay linked. |
| **Code splitting** | Marketing pages are in the main chunk; authenticated areas are lazy-loaded. |

## Request lifecycle

1. `csrfMiddleware`: non-GET requests must carry `X-Requested-With: fp` and, if present, a matching `Origin`.
2. `sessionMiddleware`: resolves the cookie via `fp_auth` → `SessionUser` (memberships, patient link).
3. Route guard: `requireStaff` (resolves active practice from `X-Practice-Id`, must be a membership),
   `requirePatient`, `requirePlatformAdmin`.
4. `withUser(userId, tx => …)`: transaction on `fp_app` with RLS identity; parameterised SQL only.
5. Errors are mapped to stable error codes (`{ error: 'code' }`); RLS violations become 403/404.
   Logs never contain request bodies.

## API boundaries (summary)

| Prefix | Purpose | Guard |
|---|---|---|
| `/api/auth/*` | login, logout, me, password reset/change, email verification, invites | public / session |
| `/api/public/*` | taxonomy, plans, contact form | public, rate-limited |
| `/api/exercises/*` | library search/filter, detail, custom CRUD, favourites | staff (read: any user) |
| `/api/media/*` | upload (staff), streaming with Range (RLS-checked) | session |
| `/api/patients/*` | patient CRUD, invite, assignment, progress, GDPR export, session review | staff |
| `/api/programs/*` | templates, programmes, versions, duplicate, status, favourites | staff |
| `/api/patient/*` | patient app: home, programme, sessions, logs, history | patient |
| `/api/dashboard` | therapist dashboard aggregates | staff |
| `/api/practice/*` | practice settings, members, audit log | staff (admin for writes) |
| `/api/admin/*` | practice (tenant) management, aggregate counts only | platform admin |
| `/api/me/*` | profile, notifications | session |

## Frontend structure

- `layouts/` — `TherapistLayout` (sidebar, practice switcher, notifications), `PatientLayout`
  (bottom tab bar, large type), `MarketingLayout`, `AuthLayout`, route guards.
- `pages/therapist/ProgramBuilderPage.tsx` — the core prescribing UI: library panel, sortable items
  (dnd-kit with pointer + keyboard sensors, plus explicit up/down buttons), inline steppers,
  schedule, alternatives from exercise relations, template picker, patient preview, version history.
- `pages/patient/SessionPlayer.tsx` — one exercise per screen, set tracker, rest timer, 0–10 scales.

## Future SaaS architecture (prepared, not active)

- `plans` table with limits/features; `practices.plan_code`, `subscription_status`, `trial_ends_at`,
  `billing_customer_ref` (Stripe customer id). Seat limit already enforced on member invites.
- Self-service registration would create a practice + owner through the same code path as
  `POST /api/admin/practices`. Stripe Checkout/Billing webhooks would update `subscription_status`.
- Usage analytics must be derived from aggregate, non-clinical counts (as in
  `app.platform_practice_overview()`).
