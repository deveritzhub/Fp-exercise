# FP Exercise

Physiotherapy exercise-prescription platform: a therapist workspace to build and prescribe exercise
programmes, a mobile-first patient app (PWA) to follow them, progress monitoring, and a public
marketing website. Multi-practice (multi-tenant) from day one.

- Initial customer: Functional Performance Physiotherapy, Rotterdam (NL)
- Primary language Dutch, secondary English
- **Status: development build. Synthetic data only. Not approved for real patient data** — see
  [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

| Area | URL (dev) | Who |
|---|---|---|
| Marketing site | `/`, `/functies`, `/hoe-het-werkt`, `/prijzen`, `/demo`, `/contact` | public |
| Therapist workspace | `/app` | practice owners, admins, therapists |
| Patient app (PWA) | `/p` | patients |
| Platform admin | `/admin` | platform administrators (no clinical access) |

## Stack

React 18 + TypeScript + Vite + Tailwind (web) · Hono on Node 22 (API) · PostgreSQL 16 with
row-level security (data) · Vitest (API/integration) · Playwright + axe-core (end-to-end, a11y).
See [ARCHITECTURE.md](ARCHITECTURE.md) for why.

## Quick start

Requirements: Node 22+, a local PostgreSQL 16 superuser (only for creating roles/databases).

```bash
cp .env.example .env            # adjust DATABASE_ADMIN_URL if your local superuser differs
npm install
npm run db:reset                # creates roles + database, runs migrations, seeds synthetic data
npm run dev                     # API on :8787, web on :5173 (proxy /api)
```

Open http://localhost:5173 and use one of the demo accounts (password `Demo-wachtwoord-1`, also
listed as one-click buttons on the login page in development):

| Account | Role |
|---|---|
| `therapeut@praktijk-a.test` | Physiotherapist, practice A |
| `eigenaar@praktijk-a.test` | Practice owner, practice A |
| `patient@praktijk-a.test` | Patient, practice A |
| `eigenaar@praktijk-b.test` / `therapeut@praktijk-b.test` | Owner / therapist, practice B |
| `patient@praktijk-b.test` | Patient, practice B |
| `admin@fp-exercise.test` | Platform administrator |

In development, e-mails (invites, password reset) are written to the `mail_outbox` table and the
API log; `GET /api/dev/outbox` returns them (disabled in production).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | API (tsx watch) + Vite dev server |
| `npm run build` | Typecheck + production web build to `dist/web` |
| `npm start` | Production mode: API also serves `dist/web` |
| `npm run db:setup` / `db:migrate` / `db:seed` / `db:reset` | Database lifecycle (dev only) |
| `npm test` | Vitest: unit + API integration + tenant-isolation tests (own DB `fp_exercise_test`) |
| `npm run test:e2e` | Playwright browser tests incl. axe accessibility scans (own DB `fp_exercise_e2e`) |
| `npm run typecheck` | TypeScript across web, server, shared, tests |

## Repository layout

```
server/
  db/migrations/      SQL schema (001) and authorisation layer / RLS (002)
  db/seed*.ts         synthetic demo data + original demo exercise library
  src/                Hono API: auth/, routes/, lib/ (audit, rate limit, progress)
  test/               Vitest integration tests
shared/               code shared by API and web (taxonomy, adherence calculation)
web/src/              React app: components/ui (design system), layouts, pages/{marketing,auth,therapist,patient,admin}
e2e/                  Playwright specs
```

## Documentation

[ARCHITECTURE.md](ARCHITECTURE.md) · [DATABASE.md](DATABASE.md) · [SECURITY.md](SECURITY.md) ·
[TESTING.md](TESTING.md) · [ROADMAP.md](ROADMAP.md) · [PROGRESS.md](PROGRESS.md) ·
[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)
