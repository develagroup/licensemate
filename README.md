<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# LicensePulse

LicensePulse is a React/Vite administrator console with a small Express authentication host. Firebase has been removed. Admin sign-in is checked by the server and uses an HTTP-only, signed session cookie.

## Run locally

1. Copy `.env.example` to `.env`.
2. Configure SMTP. When hosted on the existing DeVela mail server, use local Postfix at `127.0.0.1:25` and a sender address at `develadigital.com`; external SMTP providers require host, port, username, password/app password, and sender settings. Set `EMAIL_OUTBOX_ENCRYPTION_KEY` to a private 32-byte hex value and preserve it across restarts so failed license emails can be retried.
3. Set `SESSION_SECRET` to a random value of at least 32 characters (for example, generate one with `openssl rand -hex 32`). Keep it stable across restarts and private.
4. Install dependencies with `bun install` (the committed `bun.lock` is the release lockfile).
5. Start the app with `npm run dev`.

Sign in with **mistervela@gmail.com**. The email is prefilled on the login form. LicensePulse emails a six-digit, single-use code that expires after 10 minutes. Codes and session signing keys remain on the server.

## Production

Set `NODE_ENV=production`, set `APP_ORIGIN` to the canonical HTTPS origin (scheme and host, no path), configure SMTP and a stable `EMAIL_OUTBOX_ENCRYPTION_KEY`, provide the other server environment settings through your deployment secret manager, build with `npm run build`, then start with `npm start`. Production startup and readiness fail when the database, SMTP transport, or email-payload encryption key is missing. HTTPS is required in production because the session cookie uses the `Secure` attribute. Browser authentication and admin mutations reject missing or cross-origin `Origin` headers; the server trusts forwarded headers only from loopback proxies.

This is an administrator-only email OTP login. It does not provide customer accounts or a persistent user directory. OTP challenges are held in server memory, so a server restart invalidates pending codes. RC1 is still not production-ready: remote staging acceptance, real sender deliverability/bounce verification, proxy/rate-limit verification, and operational recovery gates remain open.

## Local checks and CI

Install dependencies with Bun using the committed `bun.lock`, then run `bun run lint`, `bun run test`, and `bun run build`. CI also runs `bun audit` and Gitleaks over source and repository history. The local security smoke tests do not replace the database lifecycle/concurrency and real staging acceptance rehearsal.

## Database foundation (Phase 1)

The server-side license lifecycle uses PostgreSQL. Set `DATABASE_URL` for the runtime account and `DATABASE_MIGRATION_URL` for the DDL-capable migration account, then run `npm run db:migrate`. Production startup requires a reachable, migrated database. `/api/health/live` reports process liveness and `/api/health/ready` reports database readiness. See [DATABASE_OPERATIONS.md](DATABASE_OPERATIONS.md) for schema, access, backup, restore, and deployment prerequisites.

The schema migrations do not import browser data or seed sample licenses. License issuance, lifecycle actions, client validation, device activation, and seat monitoring use the PostgreSQL APIs. Some ancillary prototype settings remain in browser `localStorage` and are outside the RC1 licensing path.

## Client licensing API (Phase 3)

The online validate, activate, heartbeat, and deactivate endpoints are documented in [CLIENT_API.md](CLIENT_API.md). The admin Cloud API Simulator exercises these endpoints against the current host. Local PostgreSQL smoke checks pass; separate-machine staging verification is still required before release.

## Email delivery (Phase 4)

Newly issued license keys are emailed by the server. PostgreSQL stores delivery status and an AES-256-GCM encrypted retry payload; the unencrypted key is returned to the admin once in the issue response. The admin Email Delivery page can retry failed sends and resend accepted messages. “Accepted” means the SMTP relay accepted the message, not that it reached the recipient's inbox. Configure migrations with `npm run db:migrate`; keep the outbox encryption key private and stable. See [DATABASE_OPERATIONS.md](DATABASE_OPERATIONS.md) and the [RC1_OPERATIONS_RUNBOOK.md](RC1_OPERATIONS_RUNBOOK.md).

Administrator sessions use a signed `HttpOnly` cookie and a hashed session ID in PostgreSQL. Sessions expire after eight hours, and logout revokes the server-side record. Pending OTP codes remain process-local and expire after ten minutes.
