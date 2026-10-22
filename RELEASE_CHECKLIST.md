# Release checklist

No real patient data may be imported, and nothing may be published to production, until every
**blocking** item below is checked and the product owner has given explicit written approval.

## A. Before processing real patient data (blocking)

- [ ] Hosting selected in EU/EEA with NEN 7510 or ISO 27001 certification; processor agreements signed
- [ ] Encryption at rest confirmed (database, backups, media storage)
- [ ] TLS everywhere; HSTS; secure cookies verified on the production domain
- [ ] MFA enforced for all professional accounts
- [ ] Backups: automated, encrypted, PITR, restore drill performed and documented
- [ ] Verwerkersovereenkomst between FP Exercise and each practice (starting with Functional Performance)
- [ ] DPIA completed (practice as controller, with FP Exercise input) and risks accepted
- [ ] Privacy notice, terms and cookie notice reviewed by a legal/privacy professional and published
- [ ] Retention periods and deletion workflow decided and implemented
- [ ] Incident response & data-breach notification procedure (72 h AP) documented
- [ ] Access logging reviewed against NEN 7513 expectations; log retention defined
- [ ] Production mail provider (EU, DPA) configured with SPF/DKIM/DMARC
- [ ] Rate limiting backed by a shared store; upload pipeline streaming + virus scanning
- [ ] Dependency audit clean; external penetration test passed, findings resolved
- [ ] Intended-use statement confirmed; MDR qualification documented (see SECURITY.md)
- [ ] Exercise library content reviewed by a registered physiotherapist (`review_status = reviewed`)
- [ ] Seed/demo accounts and `/api/dev/*` absent in production (dev route already disabled when `NODE_ENV=production`)
- [ ] Monitoring/alerting with privacy-safe error reporting (no request bodies, EU region)

## B. Before public launch of the website (blocking)

- [ ] Final marketing copy approved; pricing confirmed; "indicative pricing" note removed or kept intentionally
- [ ] Legal pages approved (remove "concept" banners only after review)
- [ ] Contact form submissions routed to a monitored inbox/CRM with retention policy
- [ ] Domain, sitemap/robots with real domain, Open Graph images
- [ ] Manual accessibility audit (WCAG 2.2 AA), incl. keyboard and screen reader
- [ ] Performance budget (LCP < 2.5 s on 4G mid-range phone) verified

## C. Each release

- [ ] `npm run typecheck`, `npm test`, `npm run test:e2e` green in CI
- [ ] Migrations reviewed (RLS on every new table; grants least-privilege; isolation tests extended)
- [ ] Staging deploy + smoke test with synthetic data
- [ ] Changelog and PROGRESS.md updated
