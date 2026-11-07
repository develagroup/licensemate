import 'dotenv/config';
import { Buffer } from 'node:buffer';
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { checkDatabase, closeDatabase, getPool } from './server/database.ts';
import licenseRoutes from './server/licenseRoutes.ts';
import clientLicenseRoutes from './server/clientLicenseRoutes.ts';
import { mailer, smtpFromEmail } from './server/emailService.ts';
import { safeErrorCode } from './server/logging.ts';

const ADMIN_EMAIL = 'mistervela@gmail.com';
const SESSION_COOKIE = 'licensepulse_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;
const configuredAppOrigin = process.env.APP_ORIGIN;

if (!sessionSecret || sessionSecret.length < 32 || sessionSecret.startsWith('replace-with-')) {
  throw new Error('Set SESSION_SECRET to a random value at least 32 characters long.');
}
if (isProduction && !configuredAppOrigin) {
  throw new Error('Set APP_ORIGIN to the canonical HTTPS origin used by the production admin UI.');
}
if (configuredAppOrigin) {
  try {
    const parsedOrigin = new URL(configuredAppOrigin);
    if (parsedOrigin.origin !== configuredAppOrigin || (isProduction && parsedOrigin.protocol !== 'https:')) throw new Error();
  } catch {
    throw new Error('APP_ORIGIN must be a canonical origin (scheme and host only); production requires HTTPS.');
  }
}
if (isProduction && (!mailer || !smtpFromEmail)) {
  throw new Error('Configure an approved SMTP transport and SMTP_FROM_EMAIL before production startup.');
}
if (isProduction && !/^[a-fA-F0-9]{64}$/.test(process.env.EMAIL_OUTBOX_ENCRYPTION_KEY || '')) {
  throw new Error('Set EMAIL_OUTBOX_ENCRYPTION_KEY to a stable 32-byte hexadecimal value before production startup.');
}
const signingSecret = sessionSecret as string;
const app = express();
app.disable('x-powered-by');
// The service binds to loopback behind the local reverse proxy. Do not trust forwarded
// headers from remote clients if the binding or proxy topology changes.
app.set('trust proxy', 'loopback');
app.use(express.json({ limit: '16kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Request-Id', randomUUID());
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});

function requireSameOriginForMutations(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const origin = req.get('Origin');
  const expectedOrigin = configuredAppOrigin || `${req.protocol}://${req.get('host')}`;
  let valid = false;
  try {
    valid = Boolean(origin) && new URL(origin!).origin === expectedOrigin;
  } catch { /* Missing and malformed origins fail closed. */ }
  if (!valid) return res.status(403).json({ error: 'Request origin is not allowed.', code: 'ORIGIN_NOT_ALLOWED', requestId: res.getHeader('X-Request-Id') });
  return next();
}

function sign(value: string) {
  return createHmac('sha256', signingSecret).update(value).digest('base64url');
}

function sessionIdHash(sessionId: string) {
  return createHash('sha256').update(sessionId, 'utf8').digest();
}

function parseSignedSession(req: express.Request) {
  const cookie = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return null;
  let token: string;
  try {
    token = decodeURIComponent(cookie.slice(SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }
  const separator = token.lastIndexOf('.');
  if (separator < 1) return null;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expectedSignature = sign(payload);
  const supplied = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email: string; exp: number; sid: string };
    if (session.email !== ADMIN_EMAIL || session.exp <= Date.now() / 1000 || !/^[A-Za-z0-9_-]{40,60}$/.test(session.sid)) return null;
    return session;
  } catch {
    return null;
  }
}

async function readSession(req: express.Request) {
  const session = parseSignedSession(req);
  if (!session) return null;
  const result = await getPool().query(
    `SELECT 1 FROM admin_sessions WHERE session_id_hash = $1 AND expires_at > CURRENT_TIMESTAMP AND revoked_at IS NULL LIMIT 1`,
    [sessionIdHash(session.sid)],
  );
  return result.rows.length ? session : null;
}

export function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  void readSession(req).then(session => {
    if (!session) return res.status(401).json({ error: 'Authentication required.' });
    return next();
  }).catch(error => {
    console.error('Admin session validation failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
    return res.status(503).json({ error: 'Authentication is temporarily unavailable.' });
  });
}

function setSessionCookie(res: express.Response, value = '') {
  const attributes = [`${SESSION_COOKIE}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Strict'];
  if (isProduction) attributes.push('Secure');
  if (!value) attributes.push('Max-Age=0');
  else attributes.push(`Max-Age=${SESSION_TTL_SECONDS}`);
  res.setHeader('Set-Cookie', attributes.join('; '));
}

const codeRequests = new Map<string, { count: number; resetAt: number; lastSentAt: number }>();
const codeVerifications = new Map<string, { digest: string; expiresAt: number; attempts: number }>();
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_REQUEST_LIMIT = 5;
const OTP_VERIFY_LIMIT = 5;
const OTP_WINDOW_MS = 15 * 60 * 1000;
const GENERIC_CODE_MESSAGE = 'If this address is authorized, a sign-in code has been sent.';

function codeDigest(email: string, code: string) {
  return sign(`email-otp|${email}|${code}`);
}

app.use(['/api/auth', '/api/v1/admin'], requireSameOriginForMutations);

app.post('/api/auth/request-code', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const ip = req.ip || 'unknown';
  const now = Date.now();
  for (const [key, value] of codeRequests) {
    if (value.resetAt <= now) codeRequests.delete(key);
  }
  const rateKey = email === ADMIN_EMAIL ? ADMIN_EMAIL : ip;
  const rate = codeRequests.get(rateKey);
  if (rate && rate.resetAt > now && (rate.count >= OTP_REQUEST_LIMIT || now - rate.lastSentAt < 60_000)) {
    return res.status(429).json({ error: 'Please wait before requesting another code.' });
  }
  const nextRate = rate && rate.resetAt > now
    ? { count: rate.count + 1, resetAt: rate.resetAt, lastSentAt: now }
    : { count: 1, resetAt: now + OTP_WINDOW_MS, lastSentAt: now };
  codeRequests.set(rateKey, nextRate);

  if (email === ADMIN_EMAIL) {
    if (!mailer || !smtpFromEmail) {
      console.error('Email OTP is unavailable: configure authenticated SMTP or local Postfix on 127.0.0.1:25, plus SMTP_FROM_EMAIL.');
      return res.status(503).json({ error: 'Email sign-in is not configured yet. Set up SMTP and try again.' });
    }

    const code = String(randomInt(100000, 1000000));
    codeVerifications.set(email, { digest: codeDigest(email, code), expiresAt: now + OTP_TTL_MS, attempts: 0 });
    try {
      await mailer.sendMail({
        from: smtpFromEmail,
        to: ADMIN_EMAIL,
        subject: 'Your LicensePulse sign-in code',
        text: `Your LicensePulse sign-in code is ${code}. It expires in 10 minutes. If you did not request it, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;background:#101315;color:#eef3f2;padding:32px;border-radius:12px"><p style="color:#54c7b4;font-weight:700;letter-spacing:2px">LICENSEPULSE</p><h1 style="font-size:22px">Your sign-in code</h1><p>Enter this one-time code to sign in:</p><p style="font-family:monospace;font-size:32px;letter-spacing:8px;font-weight:700">${code}</p><p style="color:#9ca8a7">This code expires in 10 minutes. If you did not request it, ignore this email.</p></div>`,
      });
    } catch (error) {
      codeVerifications.delete(email);
      console.error('Email OTP delivery failed.', { code: safeErrorCode(error) });
      return res.status(502).json({ error: 'Could not deliver the sign-in code. Try again shortly.' });
    }
  }

  return res.json({ message: GENERIC_CODE_MESSAGE });
});

app.post('/api/auth/verify-code', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  const challenge = codeVerifications.get(email);
  if (!challenge || challenge.expiresAt <= Date.now() || challenge.attempts >= OTP_VERIFY_LIMIT) {
    codeVerifications.delete(email);
    return res.status(401).json({ error: 'That code is invalid or expired. Request a new code.' });
  }

  challenge.attempts += 1;
  const suppliedDigest = Buffer.from(codeDigest(email, code));
  const expectedDigest = Buffer.from(challenge.digest);
  const valid = email === ADMIN_EMAIL && /^\d{6}$/.test(code) && suppliedDigest.length === expectedDigest.length && timingSafeEqual(suppliedDigest, expectedDigest);
  if (!valid) {
    if (challenge.attempts >= OTP_VERIFY_LIMIT) codeVerifications.delete(email);
    return res.status(401).json({ error: 'That code is invalid or expired. Request a new code.' });
  }

  codeVerifications.delete(email);
  const sessionId = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  try {
    const created = await getPool().query(
      `INSERT INTO admin_sessions (session_id_hash, admin_user_id, expires_at)
       SELECT $1, id, $2 FROM admin_users WHERE email = $3 AND role = 'admin' AND active = TRUE
       RETURNING session_id_hash`,
      [sessionIdHash(sessionId), expiresAt, ADMIN_EMAIL],
    );
    if (!created.rows.length) return res.status(503).json({ error: 'Administrator access is not configured.' });
  } catch (error) {
    console.error('Admin session creation failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
    return res.status(503).json({ error: 'Could not create an administrator session.' });
  }
  const payload = Buffer.from(JSON.stringify({ email: ADMIN_EMAIL, exp: Math.floor(expiresAt.getTime() / 1000), sid: sessionId })).toString('base64url');
  setSessionCookie(res, `${payload}.${sign(payload)}`);
  return res.json({ user: { id: 'admin', email: ADMIN_EMAIL, name: 'Mister Vela', role: 'admin', createdAt: new Date().toISOString() } });
});

app.get('/api/auth/session', async (req, res) => {
  let session: Awaited<ReturnType<typeof readSession>>;
  try {
    session = await readSession(req);
  } catch (error) {
    console.error('Admin session lookup failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
    return res.status(503).json({ user: null, error: 'Authentication is temporarily unavailable.' });
  }
  if (!session) return res.status(401).json({ user: null });
  return res.json({ user: { id: 'admin', email: ADMIN_EMAIL, name: 'Mister Vela', role: 'admin', createdAt: new Date().toISOString() } });
});

app.post('/api/auth/logout', async (req, res) => {
  const session = parseSignedSession(req);
  if (session) {
    try {
      await getPool().query('UPDATE admin_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE session_id_hash = $1 AND revoked_at IS NULL', [sessionIdHash(session.sid)]);
    } catch (error) {
      setSessionCookie(res);
      console.error('Admin session revocation failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
      return res.status(503).json({ error: 'Session could not be revoked from the server.' });
    }
  }
  setSessionCookie(res);
  return res.status(204).end();
});

app.use('/api/v1/admin', requireAdmin, licenseRoutes);
app.use('/api/v1/license', clientLicenseRoutes);
app.use('/api/v1', (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Versioned API request failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
  if (res.headersSent) return;
  return res.status(503).json({
    error: 'The requested service is temporarily unavailable.',
    code: 'SERVICE_UNAVAILABLE',
    error_code: 'SERVICE_UNAVAILABLE',
    requestId: res.getHeader('X-Request-Id'),
  });
});

app.get('/api/health/live', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/health/ready', async (_req, res) => {
  const database = await checkDatabase();
  const smtpReady = Boolean(mailer && smtpFromEmail);
  if (!database.ok || !smtpReady) return res.status(503).json({ status: 'not_ready', dependencies: { database: database.ok ? 'ok' : database.reason, smtp: smtpReady ? 'ok' : 'not_configured' } });
  return res.json({ status: 'ready', dependencies: { database: 'ok', smtp: 'configured' }, migration: database.migration });
});

app.get('/api/v1/admin/session', requireAdmin, (_req, res) => {
  return res.json({ user: { id: 'admin', email: ADMIN_EMAIL, name: 'Mister Vela', role: 'admin' } });
});

async function start() {
  if (!isProduction) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.resolve('dist');
    if (!existsSync(dist)) throw new Error('Production build missing. Run `npm run build` before `npm start`.');
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  const port = Number(process.env.PORT || 3000);
  if (isProduction) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production.');
    const database = await checkDatabase();
    if (!database.ok) throw new Error(`Database is not ready (${database.reason}). Apply migrations before starting production.`);
  }
  const server = app.listen(port, '127.0.0.1', () => console.log(`LicensePulse listening on 127.0.0.1:${port}`));
  const shutdown = () => {
    server.close(() => {
      void closeDatabase().finally(() => process.exit(0));
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

start().catch(error => {
  console.error('Application startup failed.', { code: safeErrorCode(error) });
  process.exitCode = 1;
});
