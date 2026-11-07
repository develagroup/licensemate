# LicensePulse RC1 phase plan

**Status:** PostgreSQL selected for RC1. Phases 1–4 local implementation and disposable-service smoke checks pass. Phase 5 local security, lifecycle, build, and backup/restore checks pass. Candidate workflow run [42415824229](https://github.com/develagroup/licensemate/actions/runs/42415824229) passed on commit `a1bf9ad65e7677a8720c34921791d4b6126d4f02`, including artifact upload and full-history secret scanning; the downloaded archive checksum verified. [PR #1](https://github.com/develagroup/licensemate/pull/1) holds the reviewable candidate and its checks rerun on the latest head. RC1 is **not ready for release**: independent review, staging acceptance, owner privacy/support decisions, and off-host recovery remain open. No production changes have been made.
**Target:** A small production release that can issue, monitor, validate, and revoke real online licenses safely.  
**Current baseline:** Admin OTP login and hosted UI work. The local server uses PostgreSQL via `pg`; MySQL/MariaDB is no longer an application dependency. No production database or service has been changed. See [LICENSE_LIFECYCLE_AUDIT.md](LICENSE_LIFECYCLE_AUDIT.md) and [DATABASE_OPERATIONS.md](DATABASE_OPERATIONS.md).

## RC1 scope assumption

This plan assumes RC1 will support:

- Admin-only manual license issuance and management.
- Online customer software validation, device activation, heartbeat, and seat release.
- Central status/expiry enforcement, immediate online revocation, and trustworthy audit history.
- Real customer license email delivery through the existing mail server, with truthful delivery status.

To keep RC1 focused, this plan excludes automated payment fulfillment, customer accounts, multi-provider billing, and offline certificates unless selected in Phase 0. If offline issuance stays out, hide or disable certificate creation and never represent the current browser signer as production trusted. Existing customer/order/webhook demos should be disabled or labeled demo-only where they do not meet the RC1 scope.

Before any migration or production reset, export and reconcile license/order data from the admin browser’s `localStorage`. Do not assume it contains only sample data.

## Phase overview

| Phase | Outcome | Exit gate |
|---|---|---|
| 0. Scope and data safety | RC1 promise, data choices, and migration plan are approved | Scope decisions recorded; current browser data backed up |
| 1. PostgreSQL backend foundation | PostgreSQL schema, migration runner, connection pool, and protected API infrastructure are ready | Migrations repeat; least-privilege service starts/restarts; unauthorized operations fail closed |
| 2. Authoritative admin lifecycle | PostgreSQL-backed issue, view, update, renew, suspend, revoke, and archive work | Operations and audit events persist across browsers and restarts |
| 3. Client licensing API | Validate, activate, heartbeat, and release seats are authoritative | Expiry/status and concurrent seat limits are enforced on server |
| 4. Delivery and monitoring | Real key email and server-backed operational history work | Email status and audit/metrics match real outcomes |
| 5. RC hardening | Recovery, security, tests, and operational readiness are demonstrated | Staging acceptance checklist passes; no open critical/high blockers |
| 6. RC1 candidate | Versioned release candidate is deployed and reviewed | Smoke check, rollback plan, and release approval complete |

## Phase 0 — Scope and data safety

### Discovery results (2026-11-07)

- The application is deployed at `licensemate.develadigital.com` from `/var/www/node/licensepulse` on `74.208.225.17`.
- The running server uses Express and currently exposes OTP authentication endpoints only; license lifecycle operations are not yet backed by server APIs.
- MariaDB 10.5 is running on the host; PostgreSQL was not installed/running at Phase 0 discovery. The user has now selected PostgreSQL for RC1. No LicensePulse database or schema was created on the host. Before provisioning PostgreSQL, confirm a supported package/service version, host capacity, service isolation, backup destination, and restore approach.
- The app's customer/license data currently lives in browser `localStorage`. A private local backup was created at `/Users/juanvela/Downloads/licensepulse-phase0-backup-2026-11-07.json` with permissions `600`. It contains 13 storage groups. Seven stored license records were compared with bundled sample keys; all seven match and no additional license records were found. The four trial-policy customizations have now been reviewed, excluded from RC1, and retained in the protected export. The backup contains sensitive customer/license data and must not be committed or shared.
- Detailed, sanitized comparison of all 13 storage groups is recorded in [PHASE0_DATA_RECONCILIATION.md](PHASE0_DATA_RECONCILIATION.md). License, order, product, and audit samples match bundled fixtures; four trial policy rows differ from defaults and remain preserved only in the local protected export. Decision: import no browser records into the RC1 license database.
- The administrator OTP flow uses the existing local Postfix SMTP setup. Customer license key email delivery is still simulated in the React app; sender authentication and delivery behavior for that flow have not been verified.
- Read-only host inspection on 2026-11-07 found only the production `licensepulse.service`, no PostgreSQL service or separate staging directory, MariaDB 10.5 for other applications, and 1.3 GB free on `/`. GitHub has no configured deployment environments. Do not deploy or install PostgreSQL on this production host as a substitute for staging.
- No production data, schema, credentials, or services were changed during Phase 0.

### Working decisions for Phases 1–2

The user asked to begin Phase 1, so these defaults guide the foundation work. Confirm any exception before expanding into payments, customer accounts, offline licensing, or production data import:

**Database decision revision (2026-11-07):** The user selected PostgreSQL for RC1. This supersedes the initial MariaDB candidate in earlier Phase 0/1 notes. The PostgreSQL port and disposable local verification are complete; the overall plan remains seven phases, numbered 0–6.

1. **RC1 scope:** Manually issued, online-only licenses. Include API validation, activation/seat tracking, heartbeat, deactivation, suspension, revocation, renewal, and an auditable history.
2. **Deferred scope:** Payment fulfillment, customer accounts/portals, offline certificates, and automated webhook issuance. Prototype UI for these features should be hidden, disabled, or clearly marked demo-only in RC1.
3. **Runtime and persistence:** Keep the existing Express app and OTP administrator sign-in. Use a dedicated PostgreSQL database for RC1 with separate migration and runtime principals. Provision only after checking host capacity and rehearsing encrypted backup/restore. Do not move or modify MariaDB services belonging to other applications as part of this change.
4. **License state semantics:** Suspension is reversible; revocation is terminal for that key (issue a replacement if needed); expiration is time-derived; renewal restores service with an audit event.
5. **Client behavior:** Client apps require connectivity for validation and activation. Define what the client does when the license API is unavailable before promising RC1 behavior.

Production PostgreSQL provisioning and data writes remain gated on a supported PostgreSQL installation decision, capacity review, an off-host encrypted backup destination, and a restore rehearsal. The superseded local MariaDB prototype contains no production LicensePulse records; do not migrate its disposable/dev records. Review the protected Phase 0 browser export before deciding whether any records belong in PostgreSQL.

### Work

- Keep the Phase 1/RC1 working scope as manual issuance, online validation and revocation, and real email delivery.
- Keep offline certificate issuance, payments, and customer accounts outside the RC1 path unless the product owner expands scope.
- Provision a dedicated PostgreSQL database only after version/package, disk/RAM, network exposure, service account, backup, and restore requirements are confirmed. Use separate least-privilege migration and runtime roles.
- Confirm whether current Postfix may send license/customer messages from an approved sender, and verify SPF/DKIM/DMARC and bounce handling before customer delivery.
- Export current browser data (licenses, orders, audit logs, products) to a protected backup and review records for real keys and customer data. Define how reviewed records will be imported.
- Define statuses and transitions: active, suspended, revoked, expired, renewal/reactivation, and whether revoke can ever be reversed.

### Deliverables

- RC1 scope and exclusions recorded in this plan.
- Database/API schema outline and initial migration approach.
- Protected backup/export of current browser data, with a reviewed migration decision.
- Decision on offline certificates and payment/customer-account scope.

**Exit gate:** Do not reset browser state, seed a production database, or start paid customer issuance until data is reviewed and decisions are recorded.

## Phase 1 — PostgreSQL backend foundation

### Progress (2026-11-07)

- Replaced mysql2 with `pg` and PostgreSQL connection pools; production migration runs require a separate migration URL.
- Added PostgreSQL schema migrations for admin actors, products, licenses, devices, audit events, and email outbox. MariaDB prototype SQL is archived under `database/mariadb-prototype/` and is not used by the migration runner.
- Migrations apply transactionally and record exact versions. The runtime role receives only required table permissions and cannot update/delete audit events.
- Applied migrations to disposable local PostgreSQL 17 and ran them again; the second run was a no-op.
- No production database, credentials, data, or service configuration has been changed.
- Host inspection found no scheduled database backup and approximately 1.3 GB free on the root filesystem. Production provisioning remains on hold until an off-host encrypted backup destination, capacity review, and restore rehearsal are in place.
- Encrypted backup/restore rehearsal completed on disposable PostgreSQL 17. The 4,134-byte AES-256 encrypted custom-format dump restored into a separate database; both migrations, admin actor, runtime readiness privilege, and audit write restriction were verified. Production-mode readiness and static shell returned HTTP 200 against the restored database. The temporary archive and passphrase were removed after verification.
- `npm run lint` and `npm run build` pass. The Vite config-loader warning was fixed with `import.meta.dirname`; dashboard charts are split into a lazy-loaded chunk, removing the large-chunk warning.
- Production remains gated on remote staging verification/restart, host capacity review, and off-host encrypted backup/restore. No production database, credentials, data, or service configuration has been changed.

### Work

- Provision staging PostgreSQL and separate migration/runtime roles using [DATABASE_OPERATIONS.md](DATABASE_OPERATIONS.md). Runtime must not own schema objects.
- Build a versioned Express API alongside the existing OTP routes. Add shared request validation, structured errors, request IDs, safe logging, rate limits, and health/readiness checks.
- Protect admin APIs by verifying the existing signed OTP session on every request. Keep browser role/UI state out of authorization decisions.
- Configure separate local, staging, and production environments, PostgreSQL credentials, SMTP settings, and encrypted backups. Fail startup if required production settings are missing.
- Remove demo record seeding from production startup. Keep sample data behind an explicit development-only mode.
- Define migration/import rules for any real license data recovered from browser storage. Never import mock data as real customers.

### Exit gate

- Database migrations run repeatably and survive service restart.
- Unauthenticated requests cannot read or change admin license data.
- Health checks report database dependency state accurately.
- Production starts without mock licenses or fabricated audit history.

### Phase 1 implementation status

**Local code and disposable-database gates passed:** PostgreSQL pool/driver, schema/migrations, repeatable migration run, runtime grants, database restart/readiness, encrypted dump/restore, TypeScript check, and production build. A PostgreSQL API lifecycle smoke flow passed with the runtime role. **Phase 1 is not release-ready:** remote staging provisioning/acceptance, production capacity review, off-host production backup/restore, and production environment/credential setup remain open. See [DATABASE_OPERATIONS.md](DATABASE_OPERATIONS.md).

## Phase 2 — PostgreSQL-backed admin license lifecycle

### Progress (2026-11-07)

- **Reusable UI work:** admin screens already call an API for issue/list/filter/status/renew/entitlement/archive operations; pagination, masked keys, and explicit Phase 3/4 feature boundaries are implemented locally.
- Admin issue/list/search/pagination, feature change, suspend, renew, revoke, archive, and audit endpoints now use PostgreSQL-native queries and transactions.
- Disposable PostgreSQL API smoke flow verified readiness, unauthenticated denial, one-time key reveal, issue/search, entitlement update, suspend/renew/revoke, terminal revocation, archive, and audit listing.
- Runtime DB role was used for API operations; its audit privileges allow insert/read and deny update. No production data or server configuration has been changed.

### Remaining Phase 2 work / exit gate

- Run the lifecycle flow in staging and verify persistence across an application/database restart.
- Verify duplicate key collision retry (savepoint path), pagination/filter edges, and audit durability under the staging runtime role.
- Apply the reconciliation decision: import no licenses, orders, demo audit events, or trial policy configuration. Trial policy and prototype webhook settings were reviewed and remain outside RC1; preserve the protected export locally.
- Repeat least-privilege and encrypted backup/restore checks in remote staging and select an off-host production backup destination before production.
- Confirm Phase 2 UI behavior using the real database. Product presets remain UI-driven; persistent catalog administration is out of this phase.
- Decide how support will handle a lost customer key. The current secure model stores only a hash and reveals the full key once; resend requires key reissue/replacement or a separately reviewed encrypted recovery design.

**Status:** PostgreSQL port, disposable-database lifecycle verification, and browser-data reconciliation are complete locally. Phase 2 remains open pending remote staging persistence/restart and the production backup/restore gate above.

### Implemented in the local PostgreSQL adapter

- Admin API issues licenses with cryptographic keys, stores only SHA-256 hashes, and reveals the full key in the create response once.
- The API lists, searches, filters, and paginates licenses; changes feature entitlements and status; renews; archives; and lists audit events.
- License lifecycle changes and their success audit records share a PostgreSQL transaction. Runtime grants deny audit updates and deletes.
- The existing admin UI uses the API for these operations and keeps license keys masked after initial issue.

### Still needed for the Phase 2 exit gate

- Verify persistence in staging across browsers and app/database restart.
- Decide and implement any customer/license edits or detail retrieval not covered by the current screens.
- Build and review the one-time import/reconciliation path for approved browser-stored records.
- Decide support handling for lost customer keys. Current storage keeps only a hash and reveals the key once; recovery needs reissue/replacement or a separately reviewed encrypted design.

### Exit gate

- A license issued in one browser appears in a second browser and after service restart.
- Duplicate key attempts cannot create duplicate records.
- Status changes and renewals are durable and create an audit event.
- Revoke/suspend/reactivate controls follow the agreed transition rules.

## Phase 3 — Client validation and device-seat enforcement

### Progress (2026-11-07)

- Added public `/api/v1/license` endpoints for `validate`, `activate-device`, `heartbeat`, and `deactivate`, with product binding, license-state and expiry checks, and server-resolved entitlements. Error responses include stable `error_code` values.
- Device fingerprints are SHA-256 hashed before persistence; raw fingerprints and license keys are not echoed or included in server logs. Customer email is not returned by the client API. Device names, platform, client version, status, activation, and last heartbeat are visible through the authenticated admin license list/details.
- Activation locks the license row before counting seats. A simultaneous two-client activation against a one-seat disposable PostgreSQL 17 license returned one success and one `DEVICE_LIMIT_REACHED`; exactly one active device remained.
- Disposable database smoke checks passed for validation, activation, heartbeat, deactivation with preserved history, seat reuse, product mismatch, expiry, suspension, and revocation.
- Replaced the simulator's local stub methods and fake online badge with actual API calls. The UI now requires the product slug and a full key (masked list keys cannot be used as client credentials).
- Added process-local per-IP and per-key-hash limits (60 requests per minute for each bucket). Express proxy trust remains disabled by default; remote staging must confirm the reverse-proxy topology and effective client IP behavior before production. The limiter is per application process and resets on restart, so it is a baseline abuse control, not a distributed quota system.
- The authenticated admin license list now includes real device-seat state and last heartbeat data, while displaying only that the fingerprint is SHA-256 protected and that IP/location are not collected.
- `npm run lint` and `npm run build` pass locally without warnings. Production and SSH remain untouched.

**Status:** Local implementation and disposable database gates pass. The exit gate remains open until a native client runs from a separate machine through the staging HTTPS/reverse-proxy path, and the rate-limit/proxy behavior is verified there. Browser clients on a separate origin are not enabled (no permissive CORS policy was added).

### Work

- Implement online client endpoints for validate, activate, heartbeat, and deactivate/release-seat. Define request/response versions and stable error codes for SDK clients.
- Check key, product, status, entitlement, and expiry on the server for every validation/activation request.
- Enforce device limits transactionally so concurrent requests cannot exceed the seat quota. Use a stable client-provided fingerprint with documented privacy limits; do not trust client-provided license status or seat counts.
- Retain deactivated device records with deactivation time/reason instead of deleting their history.
- Add per-key/IP rate limits and abuse controls. Configure trusted proxy handling before reading client IPs.
- Decide online-only grace behavior. For RC1 online licensing, make revocation take effect on the next server check and document limits for clients currently offline.
- Replace the simulator’s local context calls with real calls to staging APIs; mark simulated/network-mocked data clearly.

### Exit gate

- Clients on a separate machine can validate and activate against the server.
- Suspended, revoked, and expired keys fail with documented responses.
- Concurrent activation at the last available seat never exceeds the configured limit.
- Deactivation releases a seat and preserves the device/audit trail.

## Phase 4 — Real delivery, monitoring, and support controls

### Progress (2026-11-07)

- License issuance queues an encrypted email payload in the same PostgreSQL transaction as the license. SMTP is attempted after commit; mail failure leaves the license durable and the one-time key visible to the admin in the issue response.
- Added an AES-256-GCM encrypted outbox payload protected by `EMAIL_OUTBOX_ENCRYPTION_KEY`. Outbox list and audit responses never expose ciphertext or full keys. Failed sends are retryable up to ten attempts; resend of an accepted message creates a new delivery record.
- Added admin delivery history/retry/resend UI, server-backed rolling 24-hour license, device, validation, and email metrics, plus durable validation and email audit events. Email “accepted” means the configured SMTP relay accepted the message; inbox delivery and bounces are not known.
- A disposable local PostgreSQL 17 + fake SMTP rehearsal passed: issue, intentional SMTP rejection, ciphertext-at-rest verification, retry acceptance, resend, client validation/rejection, delivery listing, metrics, and audit filtering. No real SMTP provider, remote staging, or production service was contacted.
- Read-only DNS precheck on 2026-11-07 found an SPF record authorizing `74.208.225.17` and an MX record for `mail.develadigital.com`; no `_dmarc.develadigital.com` TXT record was returned. DKIM selector/signature, inbox placement, and bounce handling remain unverified.
- `npm run lint` and `npm run build` are being rerun for this Phase 4 wrap-up.

### Remaining delivery and monitoring gates

- Verify an approved sender with SPF/DKIM/DMARC and inbox placement on staging; configure/verify bounce or DSN processing before treating customer delivery as complete.
- Reconcile dashboard queries against staging data and verify metrics/alerts, log redaction, and SMTP failure behavior through the deployed reverse proxy.
- OTP challenges remain in server memory and are invalidated by restart; assess durable/session behavior and abuse controls in Phase 5.

### Work

- [x] Connect issue/resend actions to server-side SMTP using the configured sender.
- [x] Add encrypted durable outbox/retry records and real SMTP accepted/failed outcomes.
- [x] Keep the key one-time visible in the issue response; omit full keys from ordinary logs, audit, and outbox listings.
- [x] Move delivery history, audit events, and operational metrics to server-backed queries with rolling 24-hour windows.
- [ ] Add/verify staging alerts for database/API errors, delivery failures, and unusual activation attempts; webhook/payment alerts stay out of scope.
- [x] Remove or label demo health badges, sample device/IP/location values, fake latency, and fabricated telemetry on in-scope RC1 screens. Legacy customer, billing, webhook, offline-certificate, and code-generation prototypes are hidden or replaced by explicit out-of-scope notices; their demo fixtures remain in source for future prototype work.

### Exit gate

- [x] SMTP acceptance and failure are recorded truthfully; failed delivery is visible and retryable.
- [x] Issued keys remain durable when mail fails.
- [x] Dashboard metrics are computed from server records; local smoke data matched expected lifecycle, validation, email, and audit outcomes.
- [ ] Staging sender deliverability/bounces and monitoring/alerts verified. Local RC1 surfaces no longer present demo telemetry as production activity.

## Phase 5 — RC hardening and operations

### Progress (2026-11-07)

- Added a canonical `APP_ORIGIN` setting and fail-closed same-origin checks for authentication and administrator mutation endpoints. Production requires an HTTPS origin; read-only and native client licensing endpoints are not subject to browser-origin checks.
- Restricted Express forwarded-header trust to loopback proxies, matching the current loopback-only listener, and added baseline security headers, including no-store for API responses.
- Added local configuration documentation. This does not verify the real Nginx/HTTPS path, so staging proxy validation remains open.
- Added a first-party server security smoke suite covering security/no-cache headers, missing and cross-origin rejection, same-origin handling, OTP enumeration-resistant throttling, and native-client Origin handling.
- Added database-backed admin sessions: the cookie session ID is signed, only its SHA-256 digest is stored, eight-hour expiry is enforced, and logout revokes the session server-side. Raw server exceptions are no longer logged; diagnostics contain request IDs and sanitized error codes.
- Production startup/readiness now fails closed if the database migration, configured SMTP transport/sender, or stable encrypted-outbox key is missing.
- Added CI checks for frozen Bun dependencies, the Bun advisory audit, TypeScript, server security smoke tests, production build, and Gitleaks source/history scanning.
- Removed out-of-scope customer, billing, and offline demo destinations from the legacy Navbar. Audit history now labels IP/geolocation as not collected and no longer presents fabricated zero-millisecond request latency. Dashboard validation charts use real rolling 24-hour server aggregates.
- Rechecked locally on 2026-11-07: `npm run lint`, production build, and all seven server security/session integration tests pass against a disposable PostgreSQL 17 instance and local fake SMTP sink. Integration coverage includes expiry discovery and rejection, renewal, and validation after renewal.
- A full source-tree Gitleaks scan returned zero findings after replacing plausible-looking demo license keys and the empty encryption-key example. Hosted full-history scan now passes for the baseline and RC1 candidate commits; the current artifact-packaging follow-up also runs the history scan in CI.
- Bun 1.4.4 `bun install --frozen-lockfile`, `bun audit` (317 packages, no vulnerabilities), `bun run lint`, and `bun run build` passed in an isolated Linux container. API tests passed locally under Node; candidate GitHub run 42415096677 passed the hosted security/API suite.
- A local encrypted PostgreSQL custom-format backup/restore rehearsal passed. This is not an off-host backup or a staging restore.

### Remaining Phase 5 work

- [x] Add local server coverage for origin policy, OTP throttling, security headers, admin authorization, client API routing, and database-backed session creation/revocation using disposable PostgreSQL and fake SMTP.
- [x] Add CI dependency and secret scanning, typecheck, security smoke, and production build. Candidate GitHub run 42415096677 passed; a follow-up adds artifact packaging and reruns the complete workflow.
- [x] Hide remaining customer, billing, webhook, and offline demo destinations from both current navigation systems; preserve existing browser data for owner review.
- [ ] Approve retention and recovery targets, choose a customer support contact, and define deletion/export handling. Proposed targets and data inventory are in [RC1_OPERATIONS_RUNBOOK.md](RC1_OPERATIONS_RUNBOOK.md).
- [ ] Configure staging/production alerts and verify credential rotation, log redaction, and off-host backup/restore policy.
- [ ] Verify HTTPS, origin and client-IP rate limits, firewall/service permissions, least-privilege DB access, rollback, and the full issue-to-revoke scenario on staging.

### Work

- [x] Add automated API integration coverage for issue, encrypted key payload, SMTP rejection/retry, license validation, concurrent seat cap, seat release, expiry, renewal, revocation, OTP login, and copied-session revocation. Browser-data import is outside the approved RC1 scope.
- [x] Add dependency/security checks, secret scanning, typecheck, production build, and security/session smoke checks to CI. The workflow itself still needs to run on the project's Git host.
- [ ] Configure off-host backups and perform a restore rehearsal; approve retention and recovery targets; document credential rotation and rollback.
- [ ] Add staging error reporting, service/database monitoring, and actionable alerts; verify logs never include OTPs, SMTP credentials, or full keys.
- [x] Implement server-side origin checks, OTP throttling, DB-revocable admin sessions, safe error logging, and an initial data/privacy inventory.
- [ ] Approve the privacy notice, data retention/deletion/export policy, and monitored customer support route.
- [ ] Verify HTTPS, secure cookies, Nginx proxy headers, firewall exposure, service user permissions, SELinux policy, and least-privilege database access.
- [ ] Run an end-to-end staging rehearsal: admin login → issue → deliver → client validate → activate → reach seat limit → deactivate → revoke → validate rejection → backup/restore.

### Gate status at local Phase 5 close

| Gate | Status | Evidence / required action |
| --- | --- | --- |
| TypeScript, production build, API security and license lifecycle | **Passed locally** | `npm run lint`, `npm run build`, and `DATABASE_URL=… npm run test`; disposable PostgreSQL 17 and local fake SMTP. |
| Dependency audit and frozen lockfile install | **Passed locally and in hosted CI** | Candidate workspace passed Bun 1.4.4 frozen install and `bun audit` (317 packages, no vulnerabilities); latest artifact workflow run 42415824229 passed. |
| Secret scan | **Passed locally and in hosted CI** | Gitleaks v8.30.1 found no workspace/history findings; latest artifact workflow run 42415824229 passed full-history scanning. |
| Real SMTP delivery and bounce handling | **Staging required** | SPF and MX DNS records exist; no DMARC TXT record was observed. Verify DKIM, establish DMARC, test inbox placement, and exercise bounce/DSN handling with the real sender. |
| HTTPS/reverse proxy, rate limits, firewall and service permissions | **Staging required** | Verify the deployed host path and actual forwarded headers/source-IP behavior. |
| Monitoring and alerts | **Staging required** | Configure and trigger alerts for DB/API health, 5xx/429 trends, failed email deliveries, and unusual activation attempts. |
| Off-host backup and restore | **Staging/owner decision required** | Proposed daily encrypted backups, 30-day retention, RPO ≤24 hours, and RTO ≤4 hours are documented. Confirm targets, select a protected destination, configure it, and perform a staging restore using the target deployment tooling. |
| Retention, recovery targets, privacy and support | **Owner decision required** | Approve retention/deletion/export policy and RPO/RTO; provide a monitored support contact and privacy notice. |

### Exit gate

- All lifecycle and authorization checks pass against staging services and database.
- Backup restore and rollback are demonstrated.
- No open critical/high security issues remain; remaining limitations are listed.

## Phase 6 — RC1 candidate and release decision

### Candidate preparation status (2026-11-07)

- GitHub Actions run [42415824229](https://github.com/develagroup/licensemate/actions/runs/42415824229) passed on candidate commit `a1bf9ad65e7677a8720c34921791d4b6126d4f02`, including dependency audit, TypeScript, PostgreSQL-backed API/session tests, production build, versioned artifact packaging/upload, and Gitleaks source/history scan.
- Candidate Bun 1.4.4 frozen install, `bun audit` (317 packages, zero vulnerabilities), TypeScript check, production build, and Gitleaks v8.30.1 passed locally; the current candidate revision passed the hosted workflow. CI reruns on each pull request head.
- The package is versioned as `1.0.0-rc.1`; this identifies a candidate only. It is not a production release or proof of staging acceptance.
- [RC1_RELEASE_NOTES.md](RC1_RELEASE_NOTES.md) captures scope, operator-visible capabilities, and limitations for candidate review.
- The CI workflow assembles a versioned source-plus-built-assets archive and checksum for a 30-day CI artifact. Downloaded archive SHA-256 `c1535f17722583bfb908e3090f4f65f86d9cc5fbfcf167db0658eb4595ce8304` verified successfully; contents include source and `dist`, and exclude `.env`, `node_modules`, and `.git`. This packages but does not deploy the bundle.
- Draft review request [PR #1](https://github.com/develagroup/licensemate/pull/1) contains the candidate diff. Independent owner review remains outstanding.
- No staging deployment or production action has been performed. Review and passing CI on the latest artifact-packaging commit are required before staging promotion.
- Phase 6 and the overall launch remain **blocked on external/owner gates**, enumerated in [RC1_RELEASE_NOTES.md](RC1_RELEASE_NOTES.md).

### Work

- Create a versioned RC1 build from a reviewed commit and deploy that exact artifact to production-like staging.
- Run migrations and candidate smoke checks; verify the database, mail path, monitoring, and API health.
- Confirm production contains only reviewed/imported real records and no sample/demo data.
- Publish known limitations, support/operations owner, rollback trigger/steps, and RC1 release notes.
- Approve limited release only after the exit gates above are met.

### RC1 acceptance checklist

- Admin can issue, search, inspect, renew, suspend, and revoke licenses using server-backed records.
- A client can validate and activate from a separate machine; status and expiry are enforced centrally.
- Seat limits remain correct under concurrent activation requests.
- Revocation blocks the next online validation; documented offline behavior matches the RC1 promise.
- Customer key email reports actual accepted/failed state and is retryable.
- Audit history and monitoring survive browser clearing, service restart, and database restore.
- Production has no sample customers, fake telemetry, browser-generated signing authority, or client-side licensing authority.

## Explicitly out of scope unless selected in Phase 0

- Automated payment processing and provider webhook fulfillment. If required, add a separate phase after Phase 2 for signed webhook verification, payment reconciliation, durable idempotency, and duplicate/replay handling.
- Customer accounts and self-service portal authorization. Admin OTP is not customer identity; add customer auth/ownership before exposing account data.
- Offline certificates. If required, use stable server-managed private-key custody and test verification across releases; otherwise hide production certificate issuance in RC1.
- Additional payment providers, advanced automation, multi-tenant roles, and nonessential analytics.

## Dependency order

```text
Phase 0: scope + export/reconcile local data
  └─ Phase 1: database + protected API foundation
       └─ Phase 2: admin lifecycle API + UI migration
            └─ Phase 3: online client validation + device limits
                 └─ Phase 4: actual delivery + real monitoring
                      └─ Phase 5: staging, restore, security and operational checks
                           └─ Phase 6: RC1 candidate
```

Payments/customer accounts and offline certificates are conditional branches, not hidden prerequisites for the narrow online-license RC1 described here.
