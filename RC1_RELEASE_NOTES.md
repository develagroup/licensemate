# LicensePulse 1.0.0-rc.1

**Candidate status:** Prepared for review; **not approved for production**  
**Release date:** Not set  
**Candidate source revision:** Use the current head of [PR #1](https://github.com/develagroup/licensemate/pull/1) only after its hosted checks pass and owner review is complete. CI builds and uploads the versioned source-plus-assets archive with a portable SHA-256 checksum; use the artifact attached to that exact reviewed commit, not an earlier run.

## Candidate scope

This candidate is for an administrator-operated, online license service. It is not a general customer portal or billing release.

### Included

- Email one-time-code administrator sign-in for the configured administrator identity.
- PostgreSQL-backed license issuance, search, entitlement updates, renewal, suspension, revocation, archive, and append-only audit events.
- Online client validation, device activation, heartbeat, and deactivation with server-enforced expiry, status, product, and seat limits.
- SMTP license delivery with encrypted retry payloads, visible accepted/failed status, and administrator retry/resend controls.
- Server-backed operational metrics, health/readiness endpoints, database migrations, and revocable administrator sessions.

### Excluded

- Automated payment fulfillment, customer accounts/portal, offline license certificates, and customer-facing SDK/code generation.
- Offline validation grace. Client validation requires a network connection; revocation is enforced on the next successful online check.
- Guaranteed inbox delivery or bounce processing. “Accepted” records that the configured SMTP relay accepted the message.
- Import of browser prototype data. The current RC1 decision is to start with an empty license database; review the four preserved trial-policy differences separately.

## Required configuration and operations

Deploy only with the settings and separation described in [RC1_OPERATIONS_RUNBOOK.md](RC1_OPERATIONS_RUNBOOK.md) and [DATABASE_OPERATIONS.md](DATABASE_OPERATIONS.md). In particular, production needs HTTPS and a canonical `APP_ORIGIN`, separate migration/runtime PostgreSQL credentials, SMTP sender configuration, stable session and email-outbox encryption keys, an off-host encrypted backup destination, and monitoring. Do not place server secrets in browser/Vite variables or this repository.

## Known limitations and open release blockers

The local implementation and disposable-service checks do not demonstrate that the real deployment is safe. The candidate must remain a **no-go** until all applicable items below are closed and evidence is recorded in [RC1_PLAN.md](RC1_PLAN.md).

- **Staging deployment and end-to-end acceptance:** no separate staging host or GitHub environment is configured. Provide isolated staging with PostgreSQL and adequate disk; the known production host is unsuitable as-is (MariaDB already runs there, PostgreSQL is absent, only 1.3 GB is free). Then verify TLS, proxy/header behavior, real client access from another machine, database persistence/restart, and the full issue → email → validate → seat limit → deactivate → revoke → reject flow.
- **Mail operations:** authorize the sender, verify SPF/DKIM/DMARC and inbox placement, exercise failure/retry, and decide how bounces/DSNs are monitored.
- **Recovery:** choose and configure an off-host encrypted backup target, retention, and schedule; approve RPO/RTO; restore staging data using the host's real deployment tooling and verify readiness and lifecycle behavior.
- **Security/host review:** confirm firewall exposure, service account/filesystem permissions, SELinux policy, PostgreSQL network isolation and runtime grants, secure cookies and forwarded headers, and effective source-IP rate limiting behind the real proxy. Exercise credential rotation and rollback.
- **Monitoring/support/privacy owner decisions:** configure and trigger actionable database/API/email/abuse alerts; choose a monitored support contact; approve retention, deletion/export, privacy notice, and recovery targets.
- **Data review:** completed. The four custom trial-policy rows are documented by changed field names only and excluded from RC1; the mode-`0600` export remains local and is not committed or attached. The sample licenses/orders/audit records are also excluded.
- **Release evidence:** review the candidate commit, rerun hosted CI and full-history secret scanning on that commit, record its artifact digest, staging smoke results, rollback trigger/procedure, and explicit release approval.

## Candidate acceptance record

- [ ] Independent source review and passing hosted CI run for the final candidate-bundle commit recorded.
- [x] Versioned candidate build generated, uploaded, and checksum verified for the current application candidate; regenerate on the final reviewed commit.
- [ ] Exact artifact deployed to staging and full acceptance checklist passed.
- [ ] Off-host encrypted backup and restore rehearsal passed; retention/RPO/RTO approved.
- [ ] Sender, alerts, proxy, firewall, service permissions, and credential rotation verified.
- [ ] Support, privacy, retention, and recovery ownership documented.
- [ ] Rollback trigger and procedure rehearsed.
- [ ] Product owner explicitly approves a limited RC1 release.

Until every applicable box is checked, treat `1.0.0-rc.1` as a source-level candidate label only, not as a deployable production release.
