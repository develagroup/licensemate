# LicensePulse PostgreSQL RC1 database plan

## Decision and current state

- **RC1 target:** PostgreSQL, selected by the user on 2026-11-07.
- MariaDB is installed on the production host, but no LicensePulse database/schema has been created there. Do not modify or migrate MariaDB services belonging to other applications.
- The local application now uses PostgreSQL through `pg`. PostgreSQL-native migrations are in `database/migrations/`; superseded MariaDB SQL is preserved under `database/mariadb-prototype/` and must never be applied to PostgreSQL.
- Local migrations and lifecycle API were exercised against a disposable PostgreSQL 17 container. That container is for verification only; no staging or production PostgreSQL instance, schema, or credential has been provisioned. The host was previously observed to have no scheduled database backup and about 1.3 GB free on root. Recheck capacity and choose an off-host encrypted backup destination before any production work.
- Keep the existing Express server and administrator OTP cookie/session. Use a dedicated PostgreSQL database with separate migration-owner and runtime roles. PostgreSQL is the only LicensePulse source of truth for RC1.

## Implementation plan

1. **Choose deployment target:** identify a PostgreSQL version/package supported by the host OS, confirm memory/disk headroom and service isolation, and decide whether PostgreSQL runs locally on the host or on a managed/private database service. Keep it off the public interface; allow only the app host or private network.
2. **Runtime:** `pg` pool, connection timeout, connection limit, and server-only URL configuration are implemented. Configure TLS to match the staging/production provider; do not expose connection strings through Vite variables or client bundles.
3. **Schema/migrations:** PostgreSQL-native migrations use UUID, `BYTEA`, `JSONB`, `TIMESTAMPTZ`, check constraints, foreign keys, `ON CONFLICT`, `$1` parameters, and transactional migration history. The runtime grants are applied by the migration role. Never apply the archived MariaDB SQL files to PostgreSQL.
4. **Create roles:** use a schema/database owner or migration role for DDL and a separate runtime role. The runtime role should receive only required table/sequence privileges; it should not own schema objects. Prevent runtime audit-event update/delete. Explicitly provision/resolve the admin actor `mistervela@gmail.com` without granting the runtime user broad identity-management powers.
5. **Stage and verify:** run all migrations twice against remote staging PostgreSQL, restart the app/database, verify readiness, and exercise admin authorization and lifecycle endpoints. Verify runtime grants using the runtime credential rather than the migration owner. The local disposable database passed migrations, restart/readiness, least-privilege grant inspection, and the issue/list/update/renew/revoke/archive API smoke flow.
6. **Back up and restore:** local encrypted rehearsal passed using a PostgreSQL 17 custom-format dump and GPG AES-256 encryption. It restored to a separate database; migration rows, admin actor, runtime readiness, and audit write restrictions were verified. The 4,134-byte encrypted temporary archive (SHA-256 `f7711403691d47d8028cafbd18521231c4d41ea9726a9c9862eafa85bc78859a`) and its temporary passphrase were removed after the rehearsal. The host's `pg_dump` 14 cannot dump a PostgreSQL 17 server, so the rehearsal used the matching PostgreSQL 17 tools inside the container. Remote staging and production still need an encrypted off-host destination, retention policy, and restore rehearsal with the selected production tooling.
7. **Production gate:** only after Phase 0 browser data is reviewed, PostgreSQL staging acceptance passes, capacity is addressed, and backup/restore succeeds should a production database be created or the app switched to PostgreSQL. Keep a documented rollback to the prior app artifact; no LicensePulse production database currently exists to cut back to.

## Schema and lifecycle requirements

- Tables: admin actors, products, licenses, activated devices, append-only audit events, and email outbox/delivery attempts.
- Migration `004_admin_sessions.sql` adds server-revocable eight-hour admin sessions. The cookie contains a signed random session ID; PostgreSQL stores only its SHA-256 digest and expiry/revocation timestamps. Pending OTP challenges remain in memory and are invalidated by restart.
- Store license keys as a SHA-256 digest in `BYTEA` with a unique constraint and a short non-secret prefix. Generate keys with Node cryptographic randomness, show the full key once, and never log it.
- Store device fingerprint hashes, not raw fingerprint material. Do not fabricate IP or location values.
- Use transactional lifecycle + audit writes. Runtime audit permissions should allow insert/read and deny update/delete. Denied-action auditing and reason requirements must be reviewed in RC hardening.
- Expiry is derived from `expires_at`; revocation is terminal; suspension is reversible; renewal restores an eligible license with an audit event. Expired keys require renewal before reactivation.
- Do not seed sample license/customer records in production.

## Encrypted email outbox

Migration `003_email_outbox_payload.sql` adds an encrypted retry payload to `email_outbox`. Set `EMAIL_OUTBOX_ENCRYPTION_KEY` to exactly 64 hexadecimal characters generated from 32 random bytes (for example, `openssl rand -hex 32`). Keep it in the deployment secret store and preserve the same value during restarts and restores. Rotating it without re-encrypting retained outbox rows makes those emails unretryable. Do not put it in Vite-prefixed variables or commit it.

License-key message content is stored only as AES-256-GCM ciphertext. The issue response reveals the full key once; outbox listings and audit events never include it. `accepted` means the SMTP relay accepted the message, not that it reached the recipient's inbox. Bounce/DSN processing is not implemented. Failed encrypted messages can be retried by an administrator up to ten attempts. Queued messages left by an interrupted request can be sent from the Email Delivery page.

Phase 4 has passed a disposable local smoke rehearsal: issue, SMTP rejection, encrypted payload check, retry acceptance, resend, validation, and real delivery/audit listings were exercised. This does not verify the production sender, DNS authentication, inbox placement, bounce processing, proxy behavior, or remote staging. RC1 remains gated on those checks.

## Browser data reconciliation

- Phase 0 created a protected local export at `/Users/juanvela/Downloads/licensepulse-phase0-backup-2026-11-07.json`. It contains sensitive customer/license material and must not be committed or shared.
- All seven license rows and all four order rows match bundled demo fixtures. Products and audit events also match bundled fixtures. Four trial policy rows differ from defaults; keep them in the protected export pending user review. Full sanitized results and the explicit no-import decision are in [PHASE0_DATA_RECONCILIATION.md](PHASE0_DATA_RECONCILIATION.md).
- No MariaDB LicensePulse data exists to migrate. Do not migrate disposable data created during local verification. Any import from browser storage is a separate, reviewed PostgreSQL import with idempotency, source-to-target reconciliation, and a protected pre-import backup.

## Backup and restore outline

Use a protected temporary credentials file (mode `600`) or a managed secret mechanism; avoid passwords in command lines, logs, or shell history. Use PostgreSQL-native tooling such as `pg_dump --format=custom --no-owner --no-acl` to the selected encrypted off-host destination. Verify the checksum and restore readability by using `pg_restore` into a separately named verification database. Record backup success, byte size, checksum, schema migration version, and retention expiry without license keys or customer payloads in logs.

## Current verification status

- Local PostgreSQL 17 migrations apply and rerun cleanly; the migration runner and license lifecycle API passed a disposable database smoke flow using the runtime role. Runtime can read/insert audit records but cannot update them.
- Local PostgreSQL restart, production-mode startup, readiness, and static shell checks passed. The encrypted dump/restore rehearsal passed; restored app readiness and static shell returned HTTP 200.
- Browser-data comparison and the no-import decision are documented in [PHASE0_DATA_RECONCILIATION.md](PHASE0_DATA_RECONCILIATION.md). Four modified trial policies remain preserved in the original export pending user review.
- `npm run lint` and `npm run build` pass without Vite config-loader or chunk-size warnings.
- Remote staging verification, off-host backup/restore, production capacity review, and production provisioning remain open. Production has not been modified.
- Phase 5 local hardening now requires a configured canonical HTTPS `APP_ORIGIN` in production and rejects missing/cross-origin browser mutations to auth/admin endpoints. Express trusts forwarded headers only from loopback, matching its loopback listener. These settings still require staging verification through the deployed proxy.
