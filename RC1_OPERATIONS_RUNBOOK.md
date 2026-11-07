# LicensePulse RC1 operations runbook

This runbook describes the deployment and recovery work required for staging and RC1. The local PostgreSQL backup/restore rehearsal passed, but this file does not mean a production backup destination or schedule is configured.

## Deployment configuration

Keep all values in the server's deployment secret store. Do not put them in Vite-prefixed variables, client bundles, command history, or logs.

- `NODE_ENV=production`
- `APP_ORIGIN=https://<canonical-host>` with no path or trailing slash
- `SESSION_SECRET` with at least 32 random characters; rotate by expiring all active sessions
- `DATABASE_URL` for the least-privilege runtime role
- `DATABASE_MIGRATION_URL` and `DATABASE_RUNTIME_ROLE` for migrations only
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, optional SMTP auth, and `SMTP_FROM_EMAIL`
- `EMAIL_OUTBOX_ENCRYPTION_KEY`, generated once with `openssl rand -hex 32`; preserve it across restart and restore

The app binds to `127.0.0.1`. Express trusts forwarded headers from loopback only. Keep the reverse proxy on the same host and ensure it overwrites incoming `X-Forwarded-*` headers. Admin mutations require the exact configured origin. Production cookies are `Secure`, `HttpOnly`, and `SameSite=Strict`. Production startup/readiness also requires a reachable migrated database, a configured SMTP transport/sender, and a valid outbox encryption key.

## Migrations and health

Run `npm run db:migrate` as the deployment migration step with the migration credential available only to that process. The runtime credential must not own the schema and must have only the grants applied by the migration runner. The app refuses production startup until migration `004_admin_sessions.sql` is present.

- Liveness: `GET /api/health/live`
- Readiness: `GET /api/health/ready` (database and required migration)
- Admin session: 8-hour signed cookie backed by a database session digest; logout revokes the session at the server
- OTP challenges: single-use, 10-minute expiry, held in process memory; an app restart invalidates pending challenges

Use the health endpoints from the host monitor. Do not put credentials or license keys in health checks. Alert on repeated readiness failure, application restart loops, elevated HTTP 5xx/429 rates, and accumulated failed email deliveries.

## Data and privacy inventory

- PostgreSQL stores customer name/email, product, license status/expiry/entitlements, administrator notes, device name/platform/client version, a SHA-256 device fingerprint, and last heartbeat.
- The app does not collect client IP address or geolocation in its license/audit schema. Review Nginx and host access-log configuration separately; those layers may see source IPs.
- License keys are stored as SHA-256 hashes. The email outbox stores a retry payload containing the key under AES-256-GCM encryption. Keep the encryption key separate from database backups.
- Audit history stores event type/outcome, reason, request ID, and limited metadata. Server logs use request IDs and sanitized error codes and must not contain OTPs, SMTP credentials, request bodies, full license keys, or device fingerprints.
- The admin login address is an access identity, not a customer support channel. Confirm a monitored customer support address before public issuance.

## Backup and restore

The local disposable PostgreSQL 17 encrypted custom-format backup/restore rehearsal passed. Staging and production still need an off-host encrypted destination and an actual scheduled restore rehearsal.

Proposed initial service targets, **awaiting owner approval**:

- Recovery point objective: at most 24 hours of database changes.
- Recovery time objective: restore issuance and validation service within 4 hours.
- Backup schedule: daily encrypted backups; retain at least 30 days, subject to customer-data retention approval.
- Restore exercise: before first production issuance and at least quarterly thereafter.

For each backup, record timestamp, database/schema version, encrypted object size, checksum, destination, and expiry. Do not log backup passphrases or customer/license data. Restore into a separately named database, apply no production traffic until readiness and lifecycle smoke checks pass, and preserve the prior production database until the rollback window closes. Document the exact command/tool versions chosen for the host.

`EMAIL_OUTBOX_ENCRYPTION_KEY` must be available during restore if pending or resent messages are expected to remain decryptable. Do not rotate it without a separately rehearsed re-encryption procedure. The current application has no outbox/key payload retention purge; choose and document a retention window before production.

## Rollback and incident response

1. Stop the new app process or switch the reverse proxy to the previous reviewed app artifact.
2. Keep the database and encrypted backups intact. Migration 004 is additive; do not run ad hoc downgrade SQL.
3. If a session secret is exposed, rotate `SESSION_SECRET` and restart the app; existing cookies will stop verifying. If an SMTP credential is exposed, rotate it at the mail provider and in the server secret store.
4. If the outbox encryption key is exposed or lost, suspend resend/retry until a key rotation/restore procedure is approved; preserve encrypted backups.
5. For suspected license key disclosure, revoke the affected license and issue a replacement. Use audit request IDs to correlate activity; never paste full keys into incident tickets.
6. Record incident time, affected service, request IDs, actions, and recovery result without recording credentials or full keys.

## Release gates still requiring owner or staging action

- Approve recovery targets and retention windows; choose an off-host backup destination and monitored customer support contact.
- Verify DNS SPF/DKIM/DMARC, sender authorization, inbox delivery, and bounce/DSN handling with a real staging sender.
- Verify TLS, reverse proxy headers, source-IP rate limiting, firewall/service user permissions, SELinux policy, and restore through the exact deployment host path.
- Configure and exercise alerts, session/database credential rotation, and the complete staging issue → email → activate/seat-limit → deactivate → revoke → backup/restore rehearsal.
