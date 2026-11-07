import { createHash, randomUUID } from 'node:crypto';
import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { PoolClient, QueryResultRow } from 'pg';
import { getPool } from './database.ts';

const router = Router();
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 60;

interface ClientLicense extends QueryResultRow {
  id: string;
  product_name: string;
  product_slug: string;
  plan: string;
  license_type: string;
  status: string;
  expires_at: Date | string | null;
  max_devices: number;
  features_json: unknown;
  archived_at: Date | string | null;
  product_active: boolean;
}

function bodyObject(req: Request) {
  return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body as Record<string, unknown> : {};
}

function requiredText(value: unknown, max: number) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : null;
}

function apiError(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({ valid: false, status: 'invalid', code: status, error_code: code, reason: message, message, timestamp: new Date().toISOString(), requestId: res.getHeader('X-Request-Id') });
}

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (req, res, next) => { void Promise.resolve(handler(req, res, next)).catch(next); };
}

function sha256(value: string) { return createHash('sha256').update(value).digest(); }

function clientRateLimit(req: Request, res: Response, next: () => void) {
  const key = typeof req.body?.key === 'string' ? sha256(req.body.key.trim().toUpperCase()).toString('hex') : 'invalid';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const bucketKeys = [`ip:${ip}`, `key:${key}`];
  const now = Date.now();
  const activeBuckets = bucketKeys.map(bucketKey => [bucketKey, rateBuckets.get(bucketKey)] as const);
  const exceeded = activeBuckets.find(([, bucket]) => bucket && bucket.resetAt > now && bucket.count >= RATE_LIMIT);
  if (exceeded?.[1]) {
    res.setHeader('Retry-After', String(Math.max(1, Math.ceil((exceeded[1].resetAt - now) / 1000))));
    return void apiError(res, 429, 'RATE_LIMITED', 'Too many license requests. Retry shortly.');
  }
  for (const [bucketKey, bucket] of activeBuckets) {
    if (!bucket || bucket.resetAt <= now) rateBuckets.set(bucketKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
    else rateBuckets.set(bucketKey, { count: bucket.count + 1, resetAt: bucket.resetAt });
  }
  if (rateBuckets.size > 10_000) for (const [bucket, value] of rateBuckets) if (value.resetAt <= now) rateBuckets.delete(bucket);
  return next();
}

router.use(clientRateLimit);

async function readLicense(connection: PoolClient, key: string, lock = false) {
  const result = await connection.query<ClientLicense>(
    `SELECT l.id, p.name AS product_name, p.slug AS product_slug, l.plan, l.license_type, l.status,
      l.expires_at, l.max_devices, l.features_json, l.archived_at, p.active AS product_active
     FROM licenses l JOIN products p ON p.id = l.product_id
     WHERE l.key_hash = $1 ${lock ? 'FOR UPDATE OF l' : ''}`,
    [sha256(key.trim().toUpperCase())],
  );
  return result.rows[0] || null;
}

function licenseFailure(license: ClientLicense | null) {
  if (!license || license.archived_at) return { status: 404, code: 'LICENSE_NOT_FOUND', reason: 'License key was not recognized.' };
  if (license.status === 'revoked') return { status: 403, code: 'LICENSE_REVOKED', reason: 'License has been revoked.' };
  if (license.status === 'suspended') return { status: 403, code: 'LICENSE_SUSPENDED', reason: 'License is suspended.' };
  if (license.status !== 'active') return { status: 403, code: 'LICENSE_INACTIVE', reason: 'License is not active.' };
  if (license.expires_at && new Date(license.expires_at).getTime() <= Date.now()) return { status: 403, code: 'LICENSE_EXPIRED', reason: 'License has expired.' };
  return null;
}

async function activeDeviceCount(connection: PoolClient, licenseId: string) {
  const result = await connection.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM license_devices WHERE license_id = $1 AND status = 'active'", [licenseId]);
  return Number(result.rows[0]?.count || 0);
}

function publicLicense(row: ClientLicense, count: number) {
  let features: string[] = [];
  try {
    const parsed = typeof row.features_json === 'string' ? JSON.parse(row.features_json) : row.features_json;
    if (Array.isArray(parsed)) features = parsed.filter((feature): feature is string => typeof feature === 'string');
  } catch { /* Ignore malformed legacy entitlements in the public response. */ }
  return {
    key: '', productName: row.product_name, productSlug: row.product_slug,
    plan: row.plan, type: row.license_type, status: row.status,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    boundDevices: count, maxDevices: Number(row.max_devices), features,
  };
}

function parseClientRequest(req: Request) {
  const body = bodyObject(req);
  const key = requiredText(body.key, 100);
  const fingerprint = requiredText(body.fingerprint, 256);
  const deviceName = requiredText(body.deviceName, 160);
  const platform = requiredText(body.platform, 40);
  const clientVersion = requiredText(body.clientVersion, 80);
  const productSlug = requiredText(body.productSlug, 100)?.toLowerCase();
  if (!key || !/^[A-Za-z0-9]{1,10}(?:-[A-Za-z0-9]{4}){4}$/.test(key) || !fingerprint || !deviceName || !platform || !clientVersion || !productSlug || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(productSlug)) return null;
  return { key, fingerprint, deviceName, platform, clientVersion, productSlug };
}

function productFailure(license: ClientLicense, productSlug: string) {
  if (!license.product_active) return { status: 403, code: 'PRODUCT_INACTIVE', reason: 'The licensed product is inactive.' };
  if (license.product_slug !== productSlug) return { status: 403, code: 'PRODUCT_MISMATCH', reason: 'This key is not valid for the requested product.' };
  return null;
}

async function recordClientAudit(connection: PoolClient, licenseId: string, event: string, req: Request, metadata: Record<string, unknown> = {}) {
  await connection.query(
    `INSERT INTO audit_events (id, license_id, event_type, outcome, reason, request_id, metadata_json)
     VALUES ($1, $2, $3, 'success', $4, $5, $6::jsonb)`,
    [randomUUID(), licenseId, event, 'Client license API request.', String(req.res?.getHeader('X-Request-Id') || ''), JSON.stringify(metadata)],
  );
}

async function recordClientFailure(req: Request, licenseId: string | null, code: string) {
  try {
    await getPool().query(
      `INSERT INTO audit_events (id, license_id, event_type, outcome, reason, request_id, metadata_json)
       VALUES ($1, $2, 'CLIENT_LICENSE_REJECTED', 'failure', $3, $4, $5::jsonb)`,
      [randomUUID(), licenseId, code, String(req.res?.getHeader('X-Request-Id') || ''), JSON.stringify({ errorCode: code })],
    );
  } catch {
    console.warn('Could not persist client rejection event.', { code });
  }
}

router.post('/validate', asyncRoute(async (req, res) => {
  const input = parseClientRequest(req);
  if (!input) return apiError(res, 400, 'INVALID_REQUEST', 'A valid license key, fingerprint, device name, platform, and client version are required.');
  const connection = await getPool().connect();
  try {
    await connection.query('BEGIN');
    const license = await readLicense(connection, input.key);
    const failure = licenseFailure(license);
    if (failure) { await connection.query('ROLLBACK'); await recordClientFailure(req, license?.id || null, failure.code); return apiError(res, failure.status, failure.code, failure.reason); }
    const wrongProduct = productFailure(license!, input.productSlug);
    if (wrongProduct) { await connection.query('ROLLBACK'); await recordClientFailure(req, license!.id, wrongProduct.code); return apiError(res, wrongProduct.status, wrongProduct.code, wrongProduct.reason); }
    const activeDevices = await activeDeviceCount(connection, license!.id);
    await connection.query('UPDATE licenses SET last_validated_at = CURRENT_TIMESTAMP WHERE id = $1', [license!.id]);
    await recordClientAudit(connection, license!.id, 'CLIENT_LICENSE_VALIDATED', req, { activeDevices });
    await connection.query('COMMIT');
    return res.json({ valid: true, status: 'active', code: 200, message: 'License is valid.', license: publicLicense(license!, activeDevices), activeDevices, maxDevices: Number(license!.max_devices), entitlements: publicLicense(license!, activeDevices).features, timestamp: new Date().toISOString() });
  } catch (error) {
    await connection.query('ROLLBACK'); throw error;
  } finally { connection.release(); }
}));

router.post('/activate-device', asyncRoute(async (req, res) => {
  const input = parseClientRequest(req);
  if (!input) return apiError(res, 400, 'INVALID_REQUEST', 'A valid license key, fingerprint, device name, platform, and client version are required.');
  const connection = await getPool().connect();
  try {
    await connection.query('BEGIN');
    const license = await readLicense(connection, input.key, true);
    const failure = licenseFailure(license);
    if (failure) { await connection.query('ROLLBACK'); await recordClientFailure(req, license?.id || null, failure.code); return apiError(res, failure.status, failure.code, failure.reason); }
    const wrongProduct = productFailure(license!, input.productSlug);
    if (wrongProduct) { await connection.query('ROLLBACK'); await recordClientFailure(req, license!.id, wrongProduct.code); return apiError(res, wrongProduct.status, wrongProduct.code, wrongProduct.reason); }
    const fingerprintHash = sha256(input.fingerprint);
    const existing = await connection.query<{ id: string; status: string }>(
      'SELECT id, status FROM license_devices WHERE license_id = $1 AND fingerprint_hash = $2 FOR UPDATE', [license!.id, fingerprintHash],
    );
    if (!existing.rows[0] || existing.rows[0].status !== 'active') {
      const seats = await activeDeviceCount(connection, license!.id);
      if (seats >= Number(license!.max_devices)) {
        await connection.query('ROLLBACK');
        await recordClientFailure(req, license!.id, 'DEVICE_LIMIT_REACHED');
        return apiError(res, 409, 'DEVICE_LIMIT_REACHED', 'All device seats are in use. Deactivate a device before activating another.');
      }
    }
    let deviceId: string;
    if (existing.rows[0]) {
      deviceId = existing.rows[0].id;
      await connection.query(
        `UPDATE license_devices SET device_name = $1, platform = $2, client_version = $3, status = 'active',
         activated_at = CASE WHEN status = 'deactivated' THEN CURRENT_TIMESTAMP ELSE activated_at END,
         last_heartbeat_at = CURRENT_TIMESTAMP, deactivated_at = NULL, deactivation_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
        [input.deviceName, input.platform, input.clientVersion, deviceId],
      );
    } else {
      deviceId = randomUUID();
      await connection.query(
        `INSERT INTO license_devices (id, license_id, fingerprint_hash, device_name, platform, client_version, status, last_heartbeat_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', CURRENT_TIMESTAMP)`,
        [deviceId, license!.id, fingerprintHash, input.deviceName, input.platform, input.clientVersion],
      );
    }
    const count = await activeDeviceCount(connection, license!.id);
    await connection.query('UPDATE licenses SET last_validated_at = CURRENT_TIMESTAMP WHERE id = $1', [license!.id]);
    await recordClientAudit(connection, license!.id, 'CLIENT_DEVICE_ACTIVATED', req, { deviceId, activeDevices: count });
    await connection.query('COMMIT');
    const payload = publicLicense(license!, count);
    return res.json({ valid: true, status: 'active', code: 200, message: 'Device activated.', license: payload, activeDevices: count, maxDevices: Number(license!.max_devices), entitlements: payload.features, device: { id: deviceId, status: 'active', deviceName: input.deviceName }, timestamp: new Date().toISOString() });
  } catch (error) {
    await connection.query('ROLLBACK'); throw error;
  } finally { connection.release(); }
}));

async function updateBoundDevice(req: Request, res: Response, action: 'heartbeat' | 'deactivate') {
  const input = parseClientRequest(req);
  if (!input) return apiError(res, 400, 'INVALID_REQUEST', 'A valid license key, fingerprint, device name, platform, and client version are required.');
  const connection = await getPool().connect();
  try {
    await connection.query('BEGIN');
    const license = await readLicense(connection, input.key, true);
    const failure = licenseFailure(license);
    if (failure) { await connection.query('ROLLBACK'); await recordClientFailure(req, license?.id || null, failure.code); return apiError(res, failure.status, failure.code, failure.reason); }
    const wrongProduct = productFailure(license!, input.productSlug);
    if (wrongProduct) { await connection.query('ROLLBACK'); await recordClientFailure(req, license!.id, wrongProduct.code); return apiError(res, wrongProduct.status, wrongProduct.code, wrongProduct.reason); }
    const device = await connection.query<{ id: string; status: string }>(
      'SELECT id, status FROM license_devices WHERE license_id = $1 AND fingerprint_hash = $2 FOR UPDATE', [license!.id, sha256(input.fingerprint)],
    );
    if (!device.rows[0]) { await connection.query('ROLLBACK'); await recordClientFailure(req, license!.id, 'DEVICE_NOT_ACTIVATED'); return apiError(res, 404, 'DEVICE_NOT_ACTIVATED', 'This device is not registered to the license.'); }
    if (action === 'heartbeat') {
      if (device.rows[0].status !== 'active') { await connection.query('ROLLBACK'); await recordClientFailure(req, license!.id, 'DEVICE_DEACTIVATED'); return apiError(res, 409, 'DEVICE_DEACTIVATED', 'This device has been deactivated. Activate it again to continue.'); }
      await connection.query('UPDATE license_devices SET device_name = $1, platform = $2, client_version = $3, last_heartbeat_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $4', [input.deviceName, input.platform, input.clientVersion, device.rows[0].id]);
      await connection.query('UPDATE licenses SET last_validated_at = CURRENT_TIMESTAMP WHERE id = $1', [license!.id]);
      const count = await activeDeviceCount(connection, license!.id);
      const payload = publicLicense(license!, count);
      await connection.query('COMMIT');
      return res.json({ valid: true, status: 'active', code: 200, message: 'Heartbeat acknowledged.', license: payload, activeDevices: count, maxDevices: Number(license!.max_devices), entitlements: payload.features, timestamp: new Date().toISOString() });
    }
    if (device.rows[0].status === 'active') {
      const reason = requiredText(bodyObject(req).reason, 255) || 'Released by client.';
      await connection.query("UPDATE license_devices SET status = 'deactivated', deactivated_at = CURRENT_TIMESTAMP, deactivation_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [reason, device.rows[0].id]);
    }
    const count = await activeDeviceCount(connection, license!.id);
    await recordClientAudit(connection, license!.id, 'CLIENT_DEVICE_DEACTIVATED', req, { deviceId: device.rows[0].id });
    await connection.query('COMMIT');
    return res.json({ valid: true, status: 'active', code: 200, message: 'Device seat released.', license: publicLicense(license!, count), activeDevices: count, maxDevices: Number(license!.max_devices), timestamp: new Date().toISOString() });
  } catch (error) {
    await connection.query('ROLLBACK'); throw error;
  } finally { connection.release(); }
}

router.post('/heartbeat', asyncRoute((req, res) => updateBoundDevice(req, res, 'heartbeat')));
router.post('/deactivate', asyncRoute((req, res) => updateBoundDevice(req, res, 'deactivate')));

export default router;
