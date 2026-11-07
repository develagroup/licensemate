# LicensePulse 1.0.0-rc.1

**Candidate status:** Prepared for review; **not approved for production**  
**Release date:** Not set  
**Candidate source revision:** To be recorded after the release candidate commit is reviewed. The initial project baseline is `17739344a8d903fddf1c8ce5830f6f40a1e3902c`; it is not the RC1 candidate revision.

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

- **Staging deployment and end-to-end acceptance:** deploy the exact reviewed candidate artifact to isolated staging; verify TLS, proxy/header behavior, real client access from another machine, database persistence/restart, and the full issue → email → validate → seat limit → deactivate → revoke → reject flow.
- **Mail operations:** authorize the sender, verify SPF/DKIM/DMARC and inbox placement, exercise failure/retry, and decide how bounces/DSNs are monitored.
- **Recovery:** choose and configure an off-host encrypted backup target, retention, and schedule; approve RPO/RTO; restore staging data using the host's real deployment tooling and verify readiness and lifecycle behavior.
- **Security/host review:** confirm firewall exposure, service account/filesystem permissions, SELinux policy, PostgreSQL network isolation and runtime grants, secure cookies and forwarded headers, and effective source-IP rate limiting behind the real proxy. Exercise credential rotation and rollback.
- **Monitoring/support/privacy owner decisions:** configure and trigger actionable database/API/email/abuse alerts; choose a monitored support contact; approve retention, deletion/export, privacy notice, and recovery targets.
- **Data review:** inspect the four changed trial-policy rows in the protected Phase 0 export. The agreed no-import decision for sample licenses/orders/audit data remains; do not commit or attach the protected export.
- **Release evidence:** review the candidate commit, rerun hosted CI and full-history secret scanning on that commit, record its artifact digest, staging smoke results, rollback trigger/procedure, and explicit release approval.

## Candidate acceptance record

- [ ] Reviewed source commit and passing hosted CI run recorded.
- [ ] Versioned production build generated from that commit; artifact digest recorded.
- [ ] Exact artifact deployed to staging and full acceptance checklist passed.
- [ ] Off-host encrypted backup and restore rehearsal passed; retention/RPO/RTO approved.
- [ ] Sender, alerts, proxy, firewall, service permissions, and credential rotation verified.
- [ ] Support, privacy, retention, and recovery ownership documented.
- [ ] Rollback trigger and procedure rehearsed.
- [ ] Product owner explicitly approves a limited RC1 release.

Until every applicable box is checked, treat `1.0.0-rc.1` as a source-level candidate label only, not as a deployable production release.
