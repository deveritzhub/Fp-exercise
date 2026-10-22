# Security, privacy and compliance

> FP Exercise is **not** certified or assessed against NEN 7510, ISO 27001, GDPR/AVG or the EU MDR.
> This document records the controls implemented so far, known gaps, and what is required before
> real patient data may be processed. Development uses synthetic data only.

## Implemented controls

**Tenant isolation & authorisation**
- PostgreSQL row-level security on every tenant table; API runs as `fp_app` (no owner rights, no
  `BYPASSRLS`). Identity set per transaction (`set_config(..., true)` → never leaks across pooled
  connections). See [DATABASE.md](DATABASE.md) for the access matrix.
- Assignment-based access: therapists only see patients assigned to them; practice owners/admins see
  their practice; platform admins have **no** clinical access (aggregate counts via a definer function).
- Column-level grants: runtime role cannot read password hashes/lockout state, cannot relink patient
  logins, cannot modify/delete audit entries. Sessions/tokens only reachable by `fp_auth`.
- Practice header spoofing is rejected (must match a membership); the database re-checks regardless.
- Tested by API-level and **direct-SQL** isolation tests (see [TESTING.md](TESTING.md)).

**Authentication**
- bcrypt (cost 12) password hashing; minimum 10 characters with letters + digits/symbols.
- Opaque session token (256-bit), stored as SHA-256; httpOnly, SameSite=Lax, Secure in production;
  12h TTL; server-side revocation; all sessions revoked on password reset.
- Lockout after 8 failed logins (15 min); per-IP rate limits on login, reset, invite, contact.
- Generic errors and equal timing for unknown accounts (no account enumeration) on login and reset.
- One-time tokens (invite 7 days, reset 1 hour, verify 48 h), hashed, single use. Invite acceptance
  verifies the e-mail address.

**Web security**
- CSRF: custom header requirement on all state-changing requests + Origin check + SameSite cookie.
- Security headers: strict CSP (`default-src 'self'`, no inline scripts, `frame-ancestors 'none'`),
  HSTS (prod), `nosniff`, referrer policy, permissions policy.
- Input validation with zod on every endpoint; parameterised SQL only; enumerated taxonomy keys.
- Uploads: type detected by magic bytes (MP4/WebM/JPEG/PNG/WebP only — no SVG/HTML), size limits,
  random storage keys, files outside the web root, served only after an RLS check with
  `Cache-Control: private`.
- API responses `Cache-Control: no-store`. Unknown `/api` paths return JSON 404.

**Privacy by design**
- Data minimisation: no date of birth, BSN, address or diagnosis fields. UI warns not to enter them.
- Clinical notes on exercises are hidden from patients at database level.
- No health data in URLs (UUIDs only), notifications links, e-mails (invites contain no programme
  content) or logs (error log has method/route/error type only; audit `meta` has ids/field names only).
- No analytics/tracking cookies; fonts self-hosted (no Google Fonts requests).
- Audit log of sensitive actions: logins (incl. failures), patient view/create/update/archive/export,
  invites, assignments, programme create/update/status, uploads, session completion/review.
- GDPR export endpoint per patient (JSON).

## Known limitations / required before production

| # | Gap | Notes |
|---|---|---|
| 1 | **MFA for professional accounts** not implemented | `users.mfa_enabled` placeholder. Implement TOTP/WebAuthn and enforce for staff. |
| 2 | Rate limiter is in-memory | Use a shared store (Redis/Postgres) when running >1 instance. |
| 3 | Uploads buffered in memory | Move to streaming / presigned direct-to-object-storage uploads (EU bucket, SSE). Add virus scanning. |
| 4 | No real mail provider | Configure EU-hosted provider with DPA; SPF/DKIM/DMARC. |
| 5 | Encryption at rest | Depends on hosting (managed Postgres + volume encryption). Not applicable locally. |
| 6 | Backups & restore | Define RPO/RTO, PITR, encrypted off-site backups, restore drills. |
| 7 | Retention & hard deletion | Workflow and periods to be agreed (see DATABASE.md). |
| 8 | Session listing / device management, password breach check (HIBP k-anonymity) | Nice to have. |
| 9 | Security monitoring | Privacy-conscious error monitoring (EU, scrubbing), alerting on auth anomalies. |
| 10 | Pen test & dependency scanning in CI | Before go-live. |
| 11 | Trust in `app.user_id` | RLS identity is set by the API; an SQL-injection in the API could set it. Mitigated by parameterised queries + zod; consider signed claims (e.g. Postgres JWT verification / Supabase `auth.uid()`). |

## Dutch healthcare requirements — initial assessment (to be validated by specialists)

**NEN 7510 (information security in healthcare).** Practices processing patient data must comply;
as a processor FP Exercise must support this. Relevant controls already addressed: access control
(A.5.15–5.18), logging (A.8.15), secure development (A.8.25–8.29), cryptography in transit.
Still needed: ISMS/risk assessment, supplier management, incident response, continuity, logging review
(NEN 7513 for access logging of patient records — our audit log is a starting point), MFA, hosting with
NEN 7510/ISO 27001 certification. Certification of FP Exercise itself is a business decision.

**GDPR/AVG.** Pain scores and exercise adherence linked to an identifiable patient are health data
(Art. 9). Practice = controller, FP Exercise = processor → **verwerkersovereenkomst** required.
**DPIA: required** in our assessment (large-scale processing of health data via a new technology,
systematic monitoring of adherence) — at minimum per practice; FP Exercise should provide a template.
Sub-processors (hosting, e-mail) must be EU/EEA with DPAs.

**EU MDR (2017/745).** Intended purpose as built: *a tool for healthcare professionals to compose,
share and record exercise programmes; it does not diagnose, predict, monitor physiological
parameters or generate patient-specific treatment recommendations.* On that basis it is likely **not**
a medical device (cf. MDCG 2019-11), comparable to a digital exercise sheet. Features that could change
this and must be assessed before adding: automated programme adjustment/progression based on pain or
adherence, risk scores, triage, or any claim of clinical benefit. Marketing copy must stay consistent
with this intended purpose (current copy explicitly disclaims diagnosis/automated advice). The
"needs attention" list uses simple, transparent rules and is labelled as non-diagnostic.

**Other:** Wgbo (medical-record retention lies with the practice's EHR), KNGF guidance on
e-health, accessibility (WCAG 2.2 AA targeted; automated axe checks pass on key screens, manual
audit pending).
