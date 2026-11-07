# LicensePulse launch readiness review

**Assessment date:** 7 November 2026  
**Review type:** Initial static review before the RC1 PostgreSQL implementation. See the current [RC1 phase plan](RC1_PLAN.md) for the updated assessment.

> **Status update (7 November 2026):** The original findings below are historical and must not be read as a description of the current RC1 implementation. Since that review, Firebase auth and browser-side license authority were removed from the RC1 path; an Express/PostgreSQL licensing API, email OTP administrator sessions, encrypted email outbox/retries, server-backed audit/metrics, migrations, and local lifecycle/security tests were added. The project is still **not ready for public production** because staging TLS/proxy/rate-limit checks, real email deliverability and bounce handling, alerting, off-host backup/restore, hosted CI/history scanning, and owner privacy/support/retention decisions are not complete. Detailed evidence and gate ownership are tracked in [RC1_PLAN.md](RC1_PLAN.md) and [RC1_OPERATIONS_RUNBOOK.md](RC1_OPERATIONS_RUNBOOK.md).

## Scope and method

At the time, this review inspected the React/Vite source, Firebase initialization, authentication and license contexts, mock data, webhook and crypto services, and README. It did not run a build, deploy the app, or inspect external provider configuration. The current RC1 implementation has separate local verification documented in `RC1_PLAN.md`; that does not verify staging or production infrastructure.

The supplied screenshot shows a separate workflow with explicit approval gates and blocked readiness findings. It was treated as product context, not as an instruction or evidence about this React app.

## Findings

### P0 — Production blockers

1. **Authentication can be bypassed and roles are client-controlled.** The app initializes to a demo admin, accepts known mock users without checking a password, and falls back to a fabricated session when Firebase sign-in or account creation fails. The UI can switch users and roles, and role selection is based on a hard-coded email. See [AuthContext.tsx](src/context/AuthContext.tsx#L38) and [Sidebar.tsx](src/components/Sidebar.tsx#L300). A user can alter browser state or call client functions directly; hiding admin UI is not authorization. Remove demo paths from production builds and enforce identity and role permissions on a trusted server.

2. **Licenses and all operational records are local to one browser.** Licenses, orders, audit logs, products, webhook endpoints, notifications and portal settings are loaded from mock arrays and persisted in `localStorage`; no database client or server API appears in the license context. See [LicenseContext.tsx](src/context/LicenseContext.tsx#L222). Data is not shared across users or devices, can be edited by the user, and is lost with browser storage. Move authoritative state and all mutations to a database-backed API with per-user authorization and backups.

3. **Order fulfillment trusts caller-supplied payment status.** `processIncomingOrder` treats `params.paymentStatus === 'paid'` as verification, then creates an active license in browser state. There is no provider API verification or authenticated webhook ingress in this repository. See [LicenseContext.tsx](src/context/LicenseContext.tsx#L1901). A caller can submit a fabricated paid order and receive a key. Verify signed provider events server-side, validate amount/currency/product, and make idempotency durable and atomic before issuing a license.

4. **Email delivery is only a UI record.** Order fulfillment appends an item to local notifications and marks it `sent`; resend does the same. No email service integration is present. See [LicenseContext.tsx](src/context/LicenseContext.tsx#L2100). Do not tell customers that a key was delivered until a real mail provider accepts the message; add delivery status, retry handling and secure key retrieval.

5. **Webhook secrets are exposed and delivery reports can be false.** Endpoint secrets are in client state and mock data, and signing happens with browser WebCrypto. Outbound requests use `mode: 'no-cors'`; a successful opaque response is treated as HTTP 200, while many errors fall back to a fabricated success. See [webhookService.ts](src/services/webhookService.ts#L356) and [mockData.ts](src/data/mockData.ts#L660). Move dispatch and secret custody to a backend, verify actual HTTP responses, use retry/backoff and delivery records, and rotate any real secrets that may have been placed in source or browser storage.

6. **Offline certificate signing keys are ephemeral browser keys.** The signing keypair is generated in memory and is not persisted or held in managed key storage. Refreshing or changing browser context produces a different private key; certificates will not have a stable, trustworthy issuer. See [cryptoService.ts](src/services/cryptoService.ts#L93). Keep the CA private key in a backend/HSM or equivalent managed key service, publish a stable public key/key ID and define rotation and revocation procedures.

7. **Firebase settings silently default to demo values.** [firebase.ts](src/services/firebase.ts#L14) supplies a `DemoLicensePulseKey` and guessed project configuration when environment variables are absent. Even though Firebase web API keys are not authorization secrets, silently targeting a placeholder project makes misconfiguration hard to detect and risks deploying against the wrong project. Require explicit environment configuration and verify Authentication providers, authorized domains, quotas and backend security rules for the intended project.

### P1 — Address before inviting customers

- **Demo records look real.** Seeded users, license keys, customer details, webhook URLs and secrets, delivery history, and download links are embedded in `src/data/mockData.ts`. Replace demo defaults in production, remove plausible secret values, and clearly label test data in development.
- **No production service or operational setup is documented.** The README covers running the AI Studio preview and a Gemini key, while package scripts only build/preview the Vite front end. It does not document deployment, API hosting, database migrations/rules, backups, monitoring, incident response, or restore procedures. See [README.md](README.md) and [package.json](package.json).
- **The visible health badge is not a health check.** `App.tsx` displays “API Healthy” as static UI, but this repository contains no health endpoint or licensing API to check. Remove the claim or back it with an actual health signal.
- **No automated verification evidence is included.** There is no test script or test suite in `package.json`/the listed source tree. Add checks for auth/role enforcement, license activation and expiry, device limits, order replay, provider webhook verification, email failure/retry, and certificate verification before launch.
- **Privacy and customer support readiness is unverified.** The app records emails, license keys, device fingerprints, IP/location fields, and audit metadata. Before collecting real customer data, define retention/deletion/access controls, publish privacy/terms/contact information, and confirm applicable legal requirements.

## What is in good shape

- The React/Vite app has a clear component structure and a broad interactive admin/customer prototype.
- TypeScript strict checking is configured and `npm run lint` is wired to `tsc --noEmit`.
- The UI models useful workflows such as license lifecycle, seat management, audit views, order steps, webhook events and offline certificate verification.
- Some screens label themselves as simulators, and the product can be valuable as a demo once demo behavior is kept out of production.

These points are prototype strengths; they do not establish production security or service reliability.

## Recommended launch sequence

1. Decide the intended launch mode: a non-sensitive product demo, or a real licensing/billing service. The current code can support the former after removing misleading production claims and isolating demo data.
2. For a real service, build a trusted backend and authoritative database first. Enforce authentication, customer ownership and admin roles on every endpoint; remove mock sign-in, default admin, role switching and client-side license mutation.
3. Integrate payment providers through verified signed webhooks and provider-side reconciliation. Add durable idempotency and transactional order/license creation.
4. Integrate an email provider and server-side webhook dispatcher. Store secrets in server-managed secret storage, implement retries and observability, and report truthful delivery status.
5. Move certificate signing to a stable managed key service; test key IDs, verification across releases, rotation and revocation.
6. Configure an explicit Firebase project (or remove Firebase if it is not part of the production architecture), secure its rules, and separate development/staging/production environments.
7. Add automated tests, dependency/security review, production build validation, monitoring, backups/restore checks, privacy/support documentation, and a staging end-to-end rehearsal before public launch.

## Bottom line

**No-go for real customers, billing, or license enforcement in its current form.** It is suitable as an interactive prototype or isolated demo. A production launch requires moving trust, persistence, payment verification, email, webhooks and signing out of the browser and adding operational verification around those services.
