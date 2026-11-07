# License lifecycle readiness audit

**Reviewed:** 2026-11-07  
**Scope:** Issue, monitor, validate, activate, suspend, revoke, renew, and deliver software license keys.

## Verdict

**Plan update (2026-11-07):** The audit's database recommendation below remains in effect; the user selected PostgreSQL for RC1. The local mysql2 prototype has since been replaced with a PostgreSQL `pg` adapter, native migrations, and lifecycle API, verified against a disposable PostgreSQL 17 database. Staging, data reconciliation, backups, and production checks remain open. The RC1 plan and [DATABASE_OPERATIONS.md](DATABASE_OPERATIONS.md) are the current implementation/operations status.

**Not ready to operate as a real license service.** The web app has a broad administrator UI and a useful lifecycle prototype, but license records and lifecycle actions run in the browser. The production Express server currently implements administrator email OTP authentication only; it has no license database or customer licensing API. As a result, the current app can demonstrate issuing and revoking keys in one browser but cannot reliably enforce those actions in customer software.

The OTP login and HTTPS deployment are working. They protect access to the console; they do not make license data persistent or make license checks authoritative.

## What the UI already covers

- Create a license with a product, plan, customer, seat limit, features, billing cycle, and duration.
- View, search, and filter license records; inspect key, status, devices, and expiry.
- Suspend, revoke, reinstate, renew, or delete a record.
- Simulate key validation, device activation, heartbeat, and seat release.
- Show audit history and summary metrics.
- Generate an offline certificate file.

These are **prototype capabilities**, not yet production-backed controls.

## Release blockers

### 1. No shared, durable license registry

`LicenseContext` loads licenses, audit logs, orders, products, and settings from browser `localStorage`, and falls back to `INITIAL_*` sample data (`src/context/LicenseContext.tsx:180-244`, `src/context/LicenseContext.tsx:336-379`). Each browser profile gets its own copy; clearing browser data can erase it, and another browser or customer device cannot see admin changes.

The Express app currently exposes only `/api/auth/*` OTP/session routes (`server.ts:97-172`). It has no persistence layer, license-management routes, migrations, or backup process.

### 2. License checks are frontend simulations

`validateKey`, `activateDevice`, `deactivateDevice`, and `sendHeartbeat` read and mutate the React context (`src/context/LicenseContext.tsx:391-547`, `src/context/LicenseContext.tsx:549-812`). There is no server endpoint a desktop/mobile client can call to check the live license status. The API simulator invokes these same browser functions, so a successful simulation is not evidence that an external client can be validated.

The returned `jwtToken` is assembled in the browser with a literal `.sig` suffix (`src/context/LicenseContext.tsx:527-545`). It is not a signed token and must not be used to authorize software.

### 3. Key generation is not secure or collision-checked

Keys are generated in the browser using `Math.random()` (`src/context/LicenseContext.tsx:194-199`). There is no database uniqueness constraint or retry on collision. Production key creation must use a cryptographically secure random generator on the server and enforce uniqueness in the database.

### 4. Revoke and suspend do not reach customer software

The UI writes the status into local state and creates a local audit entry (`src/context/LicenseContext.tsx:1002-1035`). A customer app has no authoritative server to query, so there is no reliable immediate revocation. Offline licenses can continue working until their local expiry/grace policy ends. The UI also offers reinstatement for a revoked record, so the “permanent” revoke description is not enforced as an irreversible state transition.

### 5. Monitoring values are not trustworthy telemetry

The prototype supplies default IPs, locations, and device fingerprints in the browser and uses randomized latency values (`src/context/LicenseContext.tsx:391-406`). Audit logs and metrics are also browser data. The `failedAttempts24h`/`successAttempts24h` metrics count the entire stored audit array rather than filtering to the last 24 hours (`src/context/LicenseContext.tsx:2477-2480`). These figures should not be used for operational decisions.

### 6. License email delivery is simulated

Issuance and resend add a notification object with `status: 'sent'` to local state; they do not send email (`src/context/LicenseContext.tsx:967-981`, `src/context/LicenseContext.tsx:1105-1125`). The configured SMTP transport is used only by the OTP routes in `server.ts`. Customers therefore will not receive a real key email from these actions.

### 7. Expiration and device history need server-side rules

Validation checks the expiry date and rejects expired licenses, but does not transition the stored status to `expired` (`src/context/LicenseContext.tsx:480-505`). Dashboard status counts classify by the stored status, so an elapsed license can remain counted as active (`src/context/LicenseContext.tsx:2455-2471`). Device deactivation removes the device record from the license array (`src/context/LicenseContext.tsx:813-845`), which loses the current device history even though an audit event is written.

### 8. Offline signing keys are not production authority

The offline certificate signer runs in the browser and caches a generated signing keypair only in module memory (`src/services/cryptoService.ts:93-125`). It changes on page reload and is not a server-controlled, backed-up signing key. The bundled default public-key constant also needs cryptographic validation before any certificate is trusted (`src/services/cryptoService.ts:53-63`).

## Required before issuing real customer keys

1. **Choose the source of truth:** add a server-side database, preferably PostgreSQL, with migrations and automated backups. Store licenses, products, customers, devices, billing references, and audit events there. Do not seed production with `INITIAL_LICENSES` mock records.
2. **Move lifecycle operations to authenticated server APIs:** create, list/detail, update, renew, revoke, validate, activate, heartbeat, and deactivate. Admin endpoints must require the admin session; customer/client endpoints need scoped credentials and rate limits.
3. **Harden key issuance:** generate keys with Node `crypto`, enforce a unique database index, handle collisions, and define how keys are safely revealed or recovered. Never trust a key or status supplied by the browser.
4. **Make activation atomic:** enforce seat limits in a database transaction, bind to a stable client-generated hardware fingerprint, and retain deactivated device records with timestamps and reasons.
5. **Enforce lifecycle rules centrally:** check status and expiry on every validation/activation request; define suspended/revoked/expired semantics, offline grace, and revocation behavior. Expiration should be derived consistently or transitioned by a scheduled server job.
6. **Record real monitoring and audit data:** write immutable server events with request IDs and server timestamps; use trusted proxy configuration for client IP; calculate rolling-window metrics from real events.
7. **Send actual customer email:** connect issuance, resend, renewal, and revocation notices to a queued server-side mailer. Record accepted/failed delivery states from SMTP responses; never mark a message sent merely because a local object was created.
8. **Protect admin operations:** add CSRF/origin protections where needed, validate all request payloads, rate-limit public endpoints, and audit every status change. Prefer revocation/tombstones over deleting a used key.
9. **Add integration coverage:** verify duplicate issuance, concurrency at the final seat, expiry, suspension, revoke, reactivation, SMTP failure/retry, and restart/backup recovery against the real server and database.

## Suggested RC1 acceptance criteria

- A license created in one admin session is visible after restart and from a second browser.
- A client on a separate machine can validate and activate through the server API.
- A license at its seat limit cannot accept two concurrent new activations.
- Revoke/suspend changes are enforced by the next online validation request.
- Expired licenses are reported consistently in the list, filters, and dashboard.
- The customer receives the issued key only after actual mail delivery is accepted, or the UI clearly reports a delivery failure while keeping the license record.
- Audit events and metrics come from server data and survive browser clearing and service restart.
- Production starts with no sample licenses or demo telemetry.

## Recommendation

Treat the current deployment as an **admin UI/demo**, and do not use it as the authoritative source for paid licenses yet. The next implementation phase should build the server-side registry and client validation API first; the existing UI can then be connected to those endpoints.
