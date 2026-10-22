# Database

PostgreSQL 16. Migrations in `server/db/migrations` (plain SQL, applied in order by
`server/db/migrate.ts`, tracked in `schema_migrations`).

## Roles

| Role | Use | Privileges |
|---|---|---|
| `fp_owner` | migrations, seed (dev) | owns all objects; bypasses RLS as owner |
| `fp_app` | API runtime | least-privilege grants per table/column; **RLS enforced**; no access to sessions/tokens/password hashes |
| `fp_auth` | auth service runtime | users, sessions, tokens, mail outbox, `patients.user_id` link |

## Entities

| Table | Tenant key | Notes |
|---|---|---|
| `plans` | — | SaaS plans and limits (public) |
| `practices` | `id` | tenant; branding, settings, plan, subscription status |
| `users` | — | one login per person; `is_platform_admin`; lockout counters |
| `practice_members` | `practice_id` | role `owner` / `admin` / `therapist`, active flag |
| `auth_sessions`, `auth_tokens` | — | hashed tokens only (sessions, verify_email, reset_password, invite) |
| `patients` | `practice_id` | minimal data: name, email, locale, optional external reference. No DOB/BSN/diagnosis. `user_id` = linked login |
| `patient_therapists` | `practice_id` | assignment; drives therapist access |
| `media` | `practice_id` (null = global) | metadata; bytes on private storage |
| `exercises` | `practice_id` (null = global library) | bilingual content, taxonomy keys, defaults, review status, tsvector search |
| `exercise_clinical_notes` | `practice_id` | therapist-only notes (separate table so RLS can hide them from patients) |
| `exercise_relations` | `practice_id` (null = global) | regression / progression / alternative |
| `exercise_favorites`, `template_favorites` | user | per-user |
| `programs` | `practice_id` (null = global template) | patient programme or template; status draft/active/completed/archived; version |
| `program_items` | `practice_id` | ordered items with dosage, days (ISO weekdays), notes, alternative |
| `program_versions` | `practice_id` | JSON snapshot per version + change note |
| `workout_sessions` | `practice_id` | patient session; overall difficulty/pain/feedback; therapist review stamp |
| `exercise_logs` | `practice_id` | per item: completed, sets/reps done, difficulty, pain, feedback |
| `notifications` | user | in-app notifications (no health data in links) |
| `audit_log` | `practice_id` | append-only for runtime roles; readable by practice admins |
| `contact_requests` | — | public form; insert-only for the app |

## Access rules (enforced by RLS)

Helper functions (`SECURITY DEFINER`, schema `app`) answer questions about the *current* user only:
`uid()`, `is_member(p)`, `is_practice_admin(p)`, `is_professional()`, `my_patient_ids()`,
`can_manage_patient(pt)`, `can_access_patient(pt)`, `can_view_program(pr)`, `can_edit_program(pr)`,
`can_see_user(u)`, `user_activated(u)`, `platform_practice_overview()`.

| Data | Platform admin | Practice owner/admin | Therapist | Patient |
|---|---|---|---|---|
| Practice record | read/update (plan, archive) | read/update own | read own | read own practice |
| Members | read (staff only) | manage own practice | read own practice | therapists assigned to them |
| Patients | **none** | all in practice | **assigned only** | own record |
| Global exercises | write | read | read | read |
| Practice exercises | none | read/write | read; edit own | read (own practice) |
| Clinical notes | global only | own practice | own practice + global | **none** |
| Templates | global write | practice templates | practice templates | none |
| Programmes | **none** | all practice patients | assigned patients | own, only `active`/`completed` |
| Sessions & logs | **none** | practice patients | assigned patients | own (create/update) |
| Audit log | none | read own practice | none | none |

Additional constraints:
- New patients must be created with `created_by = uid()` and `user_id NULL`; the creator may claim
  a brand-new unassigned patient (otherwise only admins/assigned therapists can assign).
- Therapists can only be assigned from the same practice (`is_active_member`).
- Program items / versions must carry the programme's `practice_id`.
- Sessions can only be created by the patient, for their own *active* programme.
- `fp_app` cannot change `patients.user_id`, cannot read `users.password_hash`, cannot update or
  delete `audit_log`.

## Search

`exercises.search` is a weighted `tsvector` (name A; alt names/tags/muscles B; taxonomy keys C) built
by trigger with `unaccent`. The API builds prefix queries and expands Dutch/English taxonomy labels
to keys (e.g. "schouder" → `shoulder`). GIN indexes on `search`, `equipment`, `training_categories`.
Designed to scale to thousands of exercises.

## Retention & deletion (to be finalised with the practice/DPO)

- Patients are archived (soft) by default; archiving archives open programmes.
- Hard deletion workflow (planned): delete patient → cascades programmes, sessions, logs; audit entry
  remains with ids only. Requires a documented retention period (Wgbo medical-record retention
  applies to the practice's EHR; FP Exercise data is supplementary — decision pending).
- `GET /api/patients/:id/export` provides a machine-readable export (GDPR access/portability).
