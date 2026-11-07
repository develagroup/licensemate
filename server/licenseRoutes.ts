import { createHash, randomInt, randomUUID } from 'node:crypto';
import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { PoolClient, QueryResultRow } from 'pg';
import { getPool } from './database.ts';
import { createResendDelivery, deliverOutboxMessage, enqueueLicenseEmail, getOutboxDelivery } from './emailOutbox.ts';
import { safeErrorCode } from './logging.ts';

const router = Router();
const KEY_ALPHABET = "ABCDEFGHJKLM" +
  "NPQRSTUVWXYZ" +
  "23456789";
const PLANS = new Set(['starter', 'pro', 'enterprise', 'lifetime', 'trial']);
const CYCLES = new Set(['monthly', 'annual', 'lifetime']);
const LICENSE_TYPES = new Set(['single_device', 'multi_device']);
const STATUSES = new Set(['active', 'suspended', 'revoked']);
const KEY_MASK = '••••-••••-••••';

interface LicenseRow extends QueryResultRow {
  id: string;
  key_prefix: string;
  product_name: string;
  product_slug: string;
  plan: string;
  license_type: string;
  status: 'pending' | 'active' | 'suspended' | 'revoked';
  customer_email: string;
  customer_name: string;
  max_devices: number;
  features_json: unknown;
  issued_at: Date | string;
  expires_at: Date | string | null;
  renewed_at: Date | string | null;
  last_validated_at: Date | string | null;
  billing_cycle: string;
  price: number;
  auto_renew: boolean;
  notes: string | null;
  devices_json: unknown;
}

function dateIso(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function jsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return null; }
}

function serializeLicense(row: LicenseRow, key?: string) {
  const expiresAt = dateIso(row.expires_at);
  let status: string = row.status;
  if (row.status === 'active' && expiresAt && new Date(expiresAt).getTime() <= Date.now()) status = 'expired';
  const parsed = jsonValue(row.features_json);
  const features = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  const deviceRows = jsonValue(row.devices_json);
  const devices = Array.isArray(deviceRows) ? deviceRows.map((device) => {
    const item = device as Record<string, unknown>;
    const activatedAt = dateIso(item.activatedAt as Date | string | null) || new Date().toISOString();
    return {
      id: String(item.id || ''), deviceFingerprint: 'SHA-256 protected',
      deviceName: String(item.deviceName || 'Workstation'), os: String(item.platform || 'Unknown'),
      ip: 'Not collected', location: 'Not collected', activatedAt,
      lastHeartbeat: dateIso(item.lastHeartbeat as Date | string | null) || activatedAt,
      clientVersion: String(item.clientVersion || ''), status: item.status === 'deactivated' ? 'deactivated' : 'active',
    };
  }) : [];
  return {
    id: row.id,
    key: key || `${row.key_prefix}-${KEY_MASK}`,
    productName: row.product_name,
    productSlug: row.product_slug,
    plan: row.plan,
    type: row.license_type,
    status,
    userId: '',
    userEmail: row.customer_email,
    userName: row.customer_name,
    createdAt: dateIso(row.issued_at) || new Date().toISOString(),
    expiresAt,
    lastValidatedAt: dateIso(row.last_validated_at) || undefined,
    devices,
    maxDevices: Number(row.max_devices),
    features,
    autoRenew: Boolean(row.auto_renew),
    billingCycle: row.billing_cycle,
    price: Number(row.price),
    offlineGraceDays: 0,
    notes: row.notes || undefined,
  };
}

function fail(res: Response, status: number, error: string, code: string) {
  return res.status(status).json({ error, code, requestId: res.getHeader('X-Request-Id') });
}

function bodyObject(req: Request) {
  return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body as Record<string, unknown> : null;
}

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function requiredText(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength ? value.trim() : null;
}

function makeLicenseKey(prefix: string) {
  const segment = () => Array.from({ length: 4 }, () => KEY_ALPHABET[randomInt(KEY_ALPHABET.length)]).join('');
  return `${prefix}-${segment()}-${segment()}-${segment()}-${segment()}`;
}

async function getAdminId(connection: PoolClient, email: string) {
  const result = await connection.query<{ id: string }>(
    'SELECT id FROM admin_users WHERE email = $1 AND role = \'admin\' AND active = TRUE LIMIT 1', [email],
  );
  if (!result.rows[0]) throw new Error('Admin actor could not be resolved.');
  return result.rows[0].id;
}

async function writeAudit(connection: PoolClient, values: {
  actorId: string;
  licenseId: string;
  event: string;
  reason: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  await connection.query(
    `INSERT INTO audit_events (id, actor_admin_id, license_id, event_type, outcome, reason, request_id, metadata_json)
     VALUES ($1, $2, $3, $4, 'success', $5, $6, $7::jsonb)`,
    [randomUUID(), values.actorId, values.licenseId, values.event, values.reason, values.requestId, JSON.stringify(values.metadata || {})],
  );
}

const LICENSE_SELECT = `SELECT l.id, l.key_prefix, p.name AS product_name, p.slug AS product_slug,
  l.plan, l.license_type, l.status, l.customer_email, l.customer_name,
  l.max_devices, l.features_json, l.issued_at, l.expires_at, l.renewed_at,
  l.last_validated_at, l.billing_cycle, l.price, l.auto_renew, l.notes,
  COALESCE((SELECT json_agg(json_build_object(
    'id', d.id, 'deviceName', d.device_name, 'platform', d.platform,
    'clientVersion', d.client_version, 'status', d.status,
    'activatedAt', d.activated_at, 'lastHeartbeat', d.last_heartbeat_at
  ) ORDER BY d.activated_at DESC) FROM license_devices d WHERE d.license_id = l.id), '[]'::json) AS devices_json
  FROM licenses l JOIN products p ON p.id = l.product_id`;

router.get('/licenses', asyncRoute(async (req, res) => {
  const page = Math.max(1, Math.min(100_000, Number.parseInt(String(req.query.page || '1'), 10) || 1));
  const pageSize = Math.max(1, Math.min(1000, Number.parseInt(String(req.query.pageSize || '100'), 10) || 100));
  const offset = (page - 1) * pageSize;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 160) : '';
  const status = typeof req.query.status === 'string' && ['active', 'suspended', 'revoked', 'expired'].includes(req.query.status)
    ? req.query.status : '';
  const plan = typeof req.query.plan === 'string' && PLANS.has(req.query.plan) ? req.query.plan : '';
  const type = typeof req.query.type === 'string' && LICENSE_TYPES.has(req.query.type) ? req.query.type : '';
  const conditions = ['l.archived_at IS NULL'];
  const params: Array<string | number> = [];
  const addParam = (value: string | number) => { params.push(value); return `$${params.length}`; };
  if (search) {
    const like = addParam(`%${search}%`);
    conditions.push(`(l.key_prefix ILIKE ${like} OR l.customer_email ILIKE ${like} OR l.customer_name ILIKE ${like} OR p.name ILIKE ${like})`);
  }
  if (status === 'expired') conditions.push("l.status = 'active' AND l.expires_at IS NOT NULL AND l.expires_at <= CURRENT_TIMESTAMP");
  else if (status) conditions.push(`l.status = ${addParam(status)}`);
  if (plan) conditions.push(`l.plan = ${addParam(plan)}`);
  if (type) conditions.push(`l.license_type = ${addParam(type)}`);
  const where = conditions.join(' AND ');
  try {
    const db = getPool();
    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM licenses l JOIN products p ON p.id = l.product_id WHERE ${where}`, params,
    );
    const limit = addParam(pageSize);
    const pageOffset = addParam(offset);
    const result = await db.query<LicenseRow>(
      `${LICENSE_SELECT} WHERE ${where} ORDER BY l.issued_at DESC, l.id DESC LIMIT ${limit} OFFSET ${pageOffset}`,
      params,
    );
    return res.json({ licenses: result.rows.map(row => serializeLicense(row)), page, pageSize, total: Number(countResult.rows[0]?.total || 0) });
  } catch (error) {
    console.error('Admin license listing failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
    return fail(res, 503, 'License storage is unavailable.', 'LICENSE_STORAGE_UNAVAILABLE');
  }
}));

router.post('/licenses', asyncRoute(async (req, res) => {
  const body = bodyObject(req);
  if (!body) return fail(res, 400, 'Invalid request body.', 'INVALID_BODY');
  const productName = requiredText(body.productName, 160);
  const suppliedSlug = requiredText(body.productSlug, 100);
  const productSlug = (suppliedSlug || productName?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '').toLowerCase();
  const plan = requiredText(body.plan, 48);
  const type = requiredText(body.type, 32);
  const email = requiredText(body.userEmail, 254)?.toLowerCase();
  const name = requiredText(body.userName, 160);
  const features = Array.isArray(body.features) ? body.features : [];
  const maxDevices = Number(body.maxDevices);
  const price = Number(body.price);
  const durationDays = body.durationDays === null ? null : (body.durationDays === undefined ? 365 : Number(body.durationDays));
  const billingCycle = requiredText(body.billingCycle, 24);
  const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 4000) : null;
  const requestedPrefix = typeof body.customKeyPrefix === 'string' ? body.customKeyPrefix : productName?.split(/\s+/)[0] || 'LIC';
  const prefix = requestedPrefix.replace(/[^A-Za-z0-9]/g, '').slice(0, 10).toUpperCase();
  if (!productName || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(productSlug) || !plan || !PLANS.has(plan)
    || !type || !LICENSE_TYPES.has(type) || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !name || !Number.isInteger(maxDevices) || maxDevices < 1 || maxDevices > 1000
    || !Number.isFinite(price) || price < 0 || price > 99_999_999.99
    || !billingCycle || !CYCLES.has(billingCycle)
    || (durationDays !== null && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 36_500))
    || !prefix || features.length > 100 || features.some(feature => typeof feature !== 'string' || feature.length > 80)) {
    return fail(res, 400, 'One or more license fields are invalid.', 'VALIDATION_ERROR');
  }
  if (type === 'single_device' && maxDevices !== 1) return fail(res, 400, 'Single-device licenses must have one seat.', 'VALIDATION_ERROR');
  if ((plan === 'lifetime' || billingCycle === 'lifetime') && durationDays !== null) {
    return fail(res, 400, 'Lifetime licenses must not have an expiry duration.', 'VALIDATION_ERROR');
  }
  if (billingCycle === 'monthly' && durationDays !== null && durationDays > 31) {
    return fail(res, 400, 'Monthly licenses must expire within 31 days.', 'VALIDATION_ERROR');
  }
  if (billingCycle === 'annual' && durationDays !== null && durationDays > 366) {
    return fail(res, 400, 'Annual licenses must expire within 366 days.', 'VALIDATION_ERROR');
  }

  const db = getPool();
  const connection = await db.connect();
  const requestId = String(res.getHeader('X-Request-Id') || '');
  let released = false;
  try {
    await connection.query('BEGIN');
    const actorId = await getAdminId(connection, 'mistervela@gmail.com');
    const productId = randomUUID();
    await connection.query(
      'INSERT INTO products (id, name, slug, active) VALUES ($1, $2, $3, TRUE) ON CONFLICT (slug) DO NOTHING',
      [productId, productName, productSlug],
    );
    const productResult = await connection.query<{ id: string; name: string; active: boolean }>(
      'SELECT id, name, active FROM products WHERE slug = $1 LIMIT 1', [productSlug],
    );
    const product = productResult.rows[0];
    if (!product || !product.active || product.name !== productName) {
      await connection.query('ROLLBACK');
      return fail(res, 409, 'The product slug is already assigned to a different or inactive product.', 'PRODUCT_CONFLICT');
    }

    const expiresAt = plan === 'lifetime' || billingCycle === 'lifetime' || durationDays === null
      ? null
      : new Date(Date.now() + (durationDays ?? 365) * 86_400_000);
    let licenseId = '';
    let key = '';
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const candidateKey = makeLicenseKey(prefix);
      const candidateId = randomUUID();
      const keyHash = createHash('sha256').update(candidateKey, 'utf8').digest();
      await connection.query('SAVEPOINT license_key_attempt');
      try {
        await connection.query(
          `INSERT INTO licenses
           (id, product_id, key_hash, key_prefix, customer_email, customer_name, plan, license_type,
            status, max_devices, features_json, issued_at, expires_at, billing_cycle, price, auto_renew, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10::jsonb, CURRENT_TIMESTAMP, $11, $12, $13, $14, $15, $16)`,
          [candidateId, product.id, keyHash, prefix, email, name, plan, type, maxDevices,
           JSON.stringify(features), expiresAt, billingCycle, price, Boolean(body.autoRenew) && billingCycle !== 'lifetime', notes, actorId],
        );
        licenseId = candidateId;
        key = candidateKey;
        await connection.query('RELEASE SAVEPOINT license_key_attempt');
        break;
      } catch (error) {
        const pgError = error as { code?: string; constraint?: string };
        if (pgError.code !== '23505' || !pgError.constraint?.includes('key_hash')) throw error;
        await connection.query('ROLLBACK TO SAVEPOINT license_key_attempt');
        await connection.query('RELEASE SAVEPOINT license_key_attempt');
      }
    }
    if (!licenseId || !key) {
      await connection.query('ROLLBACK');
      return fail(res, 503, 'Could not generate a unique license key. Retry issuance.', 'LICENSE_KEY_COLLISION');
    }
    await writeAudit(connection, { actorId, licenseId, event: 'LICENSE_CREATED', reason: 'License issued by administrator.', requestId });
    const result = await connection.query<LicenseRow>(`${LICENSE_SELECT} WHERE l.id = $1`, [licenseId]);
    const queuedEmail = await enqueueLicenseEmail(connection, {
      licenseId, recipientEmail: email, recipientName: name, productName, key,
    });
    let emailDelivery: Record<string, unknown> = queuedEmail;
    await connection.query('COMMIT');
    const license = serializeLicense(result.rows[0], key);
    connection.release();
    released = true;
    try {
      emailDelivery = await deliverOutboxMessage(queuedEmail.id, requestId) || emailDelivery;
    } catch (error) {
      console.error('License email status update failed after issuance.', { requestId, deliveryId: queuedEmail.id, code: safeErrorCode(error) });
    }
    return res.status(201).json({ license, keyRevealOnce: true, emailDelivery });
  } catch (error) {
    await connection.query('ROLLBACK');
    const pgError = error as { code?: string; constraint?: string };
    if (pgError.code === '23505' && pgError.constraint?.includes('key_hash')) return fail(res, 409, 'A duplicate license key was generated. Retry the issuance.', 'LICENSE_KEY_COLLISION');
    console.error('Admin license issuance failed.', { requestId, code: safeErrorCode(error) });
    return fail(res, 503, 'License could not be issued because storage is unavailable.', 'LICENSE_STORAGE_UNAVAILABLE');
  } finally {
    if (!released) connection.release();
  }
}));

router.get('/email-deliveries', asyncRoute(async (req, res) => {
  const page = Math.max(1, Math.min(100_000, Number.parseInt(String(req.query.page || '1'), 10) || 1));
  const pageSize = Math.max(1, Math.min(200, Number.parseInt(String(req.query.pageSize || '50'), 10) || 50));
  const status = typeof req.query.status === 'string' && ['queued', 'sending', 'accepted', 'failed'].includes(req.query.status) ? req.query.status : '';
  const offset = (page - 1) * pageSize;
  const params: Array<string | number> = [];
  const where = status ? (params.push(status), 'WHERE e.status = $1') : '';
  try {
    const db = getPool();
    const count = await db.query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM email_outbox e ${where}`, params);
    params.push(pageSize, offset);
    const limit = `$${params.length - 1}`;
    const pageOffset = `$${params.length}`;
    const result = await db.query<{
      id: string; license_id: string | null; recipient_email: string; message_type: string; subject: string;
      status: string; attempts: number; last_attempt_at: Date | string | null; accepted_at: Date | string | null;
      provider_message_id: string | null; last_error_code: string | null; last_error_summary: string | null;
      created_at: Date | string; key_prefix: string | null; product_name: string | null; payload_ciphertext: Buffer | null;
    }>(
      `SELECT e.id, e.license_id, e.recipient_email, e.message_type, e.subject, e.status, e.attempts,
        e.last_attempt_at, e.accepted_at, e.provider_message_id, e.last_error_code, e.last_error_summary,
        e.created_at, e.payload_ciphertext, l.key_prefix, p.name AS product_name
       FROM email_outbox e LEFT JOIN licenses l ON l.id = e.license_id
       LEFT JOIN products p ON p.id = l.product_id ${where}
       ORDER BY e.created_at DESC, e.id DESC LIMIT ${limit} OFFSET ${pageOffset}`, params,
    );
    const deliveries = result.rows.map(row => ({
      id: row.id, licenseId: row.license_id, licenseKeyPrefix: row.key_prefix,
      productName: row.product_name, recipientEmail: row.recipient_email, messageType: row.message_type,
      subject: row.subject, status: row.status, attempts: Number(row.attempts),
      createdAt: dateIso(row.created_at), lastAttemptAt: dateIso(row.last_attempt_at), acceptedAt: dateIso(row.accepted_at),
      providerMessageId: row.provider_message_id, lastErrorCode: row.last_error_code,
      lastErrorSummary: row.last_error_summary,
      retryable: Boolean(row.payload_ciphertext) && row.status !== 'accepted' && Number(row.attempts) < 10,
    }));
    return res.json({ deliveries, total: Number(count.rows[0]?.total || 0), page, pageSize });
  } catch (error) {
    console.error('Admin email delivery listing failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
    return fail(res, 503, 'Email delivery history is unavailable.', 'EMAIL_OUTBOX_UNAVAILABLE');
  }
}));

router.post('/email-deliveries/:id/retry', asyncRoute(async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return fail(res, 400, 'Delivery id is invalid.', 'VALIDATION_ERROR');
  const current = await getOutboxDelivery(req.params.id);
  if (!current) return fail(res, 404, 'Email delivery not found.', 'EMAIL_DELIVERY_NOT_FOUND');
  if (current.status === 'accepted') return fail(res, 409, 'The SMTP server already accepted this message.', 'EMAIL_ALREADY_ACCEPTED');
  if (!current.retryable && current.status !== 'sending') return fail(res, 409, 'This delivery has no retryable encrypted payload or has reached its attempt limit.', 'EMAIL_NOT_RETRYABLE');
  const delivery = await deliverOutboxMessage(req.params.id, String(res.getHeader('X-Request-Id') || ''));
  return res.status(delivery?.status === 'sending' ? 202 : 200).json({ delivery });
}));

router.post('/licenses/:id/email', asyncRoute(async (req, res) => {
  const created = await createResendDelivery(req.params.id);
  if (!created) return fail(res, 409, 'No encrypted key email is available to resend for this active license.', 'KEY_EMAIL_UNAVAILABLE');
  const delivery = await deliverOutboxMessage(created.id, String(res.getHeader('X-Request-Id') || ''));
  return res.status(201).json({ delivery });
}));

router.patch('/licenses/:id/status', asyncRoute(async (req, res) => {
  const target = requiredText(bodyObject(req)?.status, 24);
  const reason = requiredText(bodyObject(req)?.reason, 500) || 'Status changed by administrator.';
  if (!target || !STATUSES.has(target)) return fail(res, 400, 'Status must be active, suspended, or revoked.', 'VALIDATION_ERROR');
  const db = getPool();
  const connection = await db.connect();
  try {
    await connection.query('BEGIN');
    const result = await connection.query<{ status: string; archived_at: Date | null; expires_at: Date | string | null }>(
      'SELECT status, archived_at, expires_at FROM licenses WHERE id = $1 FOR UPDATE', [req.params.id],
    );
    const current = result.rows[0];
    if (!current || current.archived_at) {
      await connection.query('ROLLBACK');
      return fail(res, 404, 'License not found.', 'LICENSE_NOT_FOUND');
    }
    if (current.status === 'revoked' && target !== 'revoked') {
      await connection.query('ROLLBACK');
      return fail(res, 409, 'Revocation is terminal. Issue a replacement license.', 'LICENSE_REVOKED');
    }
    const currentlyExpired = current.status === 'active' && current.expires_at
      && new Date(dateIso(current.expires_at) || 0).getTime() <= Date.now();
    if (currentlyExpired && target === 'active') {
      await connection.query('ROLLBACK');
      return fail(res, 409, 'Expired licenses must be renewed before reactivation.', 'LICENSE_EXPIRED');
    }
    if (currentlyExpired && target === 'suspended') {
      await connection.query('ROLLBACK');
      return fail(res, 409, 'Expired licenses cannot be suspended; renew them first if service should resume.', 'LICENSE_EXPIRED');
    }
    const actorId = await getAdminId(connection, 'mistervela@gmail.com');
    await connection.query('UPDATE licenses SET status = $1, revoked_at = $2, revoked_reason = $3 WHERE id = $4', [
      target, target === 'revoked' ? new Date() : null, target === 'revoked' ? reason : null, req.params.id,
    ]);
    let devicesDeactivated = 0;
    if (target === 'revoked') {
      const deactivated = await connection.query(
        `UPDATE license_devices SET status = 'deactivated', deactivated_at = CURRENT_TIMESTAMP,
         deactivation_reason = 'License revoked by administrator.', updated_at = CURRENT_TIMESTAMP
         WHERE license_id = $1 AND status = 'active'`, [req.params.id],
      );
      devicesDeactivated = deactivated.rowCount || 0;
    }
    await writeAudit(connection, {
      actorId, licenseId: req.params.id, event: target === 'revoked' ? 'LICENSE_REVOKED' : 'LICENSE_STATUS_CHANGED',
      reason, requestId: String(res.getHeader('X-Request-Id') || ''), metadata: { from: current.status, to: target, devicesDeactivated },
    });
    await connection.query('COMMIT');
    return res.json({ id: req.params.id, status: target });
  } catch (error) {
    await connection.query('ROLLBACK');
    console.error('Admin license status update failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
    return fail(res, 503, 'License status could not be updated.', 'LICENSE_STORAGE_UNAVAILABLE');
  } finally {
    connection.release();
  }
}));

router.patch('/licenses/:id/features', asyncRoute(async (req, res) => {
  const body = bodyObject(req);
  const featureKey = requiredText(body?.featureKey, 80);
  if (!featureKey || typeof body?.enabled !== 'boolean') return fail(res, 400, 'Feature key and enabled flag are required.', 'VALIDATION_ERROR');
  const db = getPool();
  const connection = await db.connect();
  try {
    await connection.query('BEGIN');
    const result = await connection.query<{ features_json: unknown; status: string; archived_at: Date | null }>(
      'SELECT features_json, status, archived_at FROM licenses WHERE id = $1 FOR UPDATE', [req.params.id],
    );
    const current = result.rows[0];
    if (!current || current.archived_at) {
      await connection.query('ROLLBACK');
      return fail(res, 404, 'License not found.', 'LICENSE_NOT_FOUND');
    }
    if (current.status === 'revoked') {
      await connection.query('ROLLBACK');
      return fail(res, 409, 'Revoked licenses cannot be changed.', 'LICENSE_REVOKED');
    }
    const parsed = jsonValue(current.features_json);
    const features = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    const nextFeatures = new Set(features);
    if (body.enabled) nextFeatures.add(featureKey); else nextFeatures.delete(featureKey);
    const updatedFeatures = Array.from(nextFeatures);
    const actorId = await getAdminId(connection, 'mistervela@gmail.com');
    await connection.query('UPDATE licenses SET features_json = $1::jsonb WHERE id = $2', [JSON.stringify(updatedFeatures), req.params.id]);
    await writeAudit(connection, {
      actorId, licenseId: req.params.id, event: 'LICENSE_FEATURES_UPDATED',
      reason: `${body.enabled ? 'Enabled' : 'Disabled'} feature entitlement ${featureKey}.`,
      requestId: String(res.getHeader('X-Request-Id') || ''), metadata: { featureKey, enabled: body.enabled },
    });
    await connection.query('COMMIT');
    return res.json({ id: req.params.id, features: updatedFeatures });
  } catch (error) {
    await connection.query('ROLLBACK');
    console.error('Admin license entitlement update failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
    return fail(res, 503, 'License entitlements could not be updated.', 'LICENSE_STORAGE_UNAVAILABLE');
  } finally {
    connection.release();
  }
}));

router.post('/licenses/:id/renew', asyncRoute(async (req, res) => {
  const body = bodyObject(req);
  const months = body?.months === undefined ? 12 : Number(body.months);
  if (!Number.isInteger(months) || months < 1 || months > 120) return fail(res, 400, 'Renewal must be between 1 and 120 months.', 'VALIDATION_ERROR');
  const db = getPool();
  const connection = await db.connect();
  try {
    await connection.query('BEGIN');
    const result = await connection.query<{ status: string; expires_at: Date | string | null; billing_cycle: string; archived_at: Date | null }>(
      'SELECT status, expires_at, billing_cycle, archived_at FROM licenses WHERE id = $1 FOR UPDATE', [req.params.id],
    );
    const current = result.rows[0];
    if (!current || current.archived_at) {
      await connection.query('ROLLBACK');
      return fail(res, 404, 'License not found.', 'LICENSE_NOT_FOUND');
    }
    if (current.status === 'revoked') {
      await connection.query('ROLLBACK');
      return fail(res, 409, 'Revoked licenses cannot be renewed. Issue a replacement license.', 'LICENSE_REVOKED');
    }
    if (current.billing_cycle === 'lifetime') {
      await connection.query('ROLLBACK');
      return fail(res, 409, 'Lifetime licenses do not require renewal.', 'LIFETIME_LICENSE');
    }
    const currentExpiryIso = dateIso(current.expires_at);
    const currentExpiry = currentExpiryIso ? new Date(currentExpiryIso) : null;
    const base = currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
    const dayOfMonth = base.getUTCDate();
    base.setUTCDate(1);
    base.setUTCMonth(base.getUTCMonth() + months);
    const lastDayOfMonth = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
    base.setUTCDate(Math.min(dayOfMonth, lastDayOfMonth));
    const actorId = await getAdminId(connection, 'mistervela@gmail.com');
    await connection.query(
      `UPDATE licenses SET expires_at = $1, renewed_at = CURRENT_TIMESTAMP,
       status = 'active', revoked_at = NULL, revoked_reason = NULL WHERE id = $2`, [base, req.params.id],
    );
    await writeAudit(connection, {
      actorId, licenseId: req.params.id, event: 'LICENSE_RENEWED', reason: `Renewed by ${months} month(s).`,
      requestId: String(res.getHeader('X-Request-Id') || ''), metadata: { months, expiresAt: base.toISOString() },
    });
    await connection.query('COMMIT');
    return res.json({ id: req.params.id, status: 'active', expiresAt: base.toISOString() });
  } catch (error) {
    await connection.query('ROLLBACK');
    console.error('Admin license renewal failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
    return fail(res, 503, 'License could not be renewed.', 'LICENSE_STORAGE_UNAVAILABLE');
  } finally {
    connection.release();
  }
}));

router.delete('/licenses/:id', asyncRoute(async (req, res) => {
  const reason = requiredText(bodyObject(req)?.reason, 500) || 'Archived by administrator.';
  const db = getPool();
  const connection = await db.connect();
  try {
    await connection.query('BEGIN');
    const result = await connection.query<{ archived_at: Date | null; status: string; expires_at: Date | string | null }>(
      'SELECT archived_at, status, expires_at FROM licenses WHERE id = $1 FOR UPDATE', [req.params.id],
    );
    const current = result.rows[0];
    if (!current || current.archived_at) {
      await connection.query('ROLLBACK');
      return fail(res, 404, 'License not found.', 'LICENSE_NOT_FOUND');
    }
    const isUnexpiredActive = current.status === 'active'
      && (!dateIso(current.expires_at) || new Date(dateIso(current.expires_at)!).getTime() > Date.now());
    if (isUnexpiredActive) {
      await connection.query('ROLLBACK');
      return fail(res, 409, 'Suspend or revoke an active license before archiving it.', 'ACTIVE_LICENSE');
    }
    const actorId = await getAdminId(connection, 'mistervela@gmail.com');
    await connection.query('UPDATE licenses SET archived_at = CURRENT_TIMESTAMP WHERE id = $1', [req.params.id]);
    await writeAudit(connection, {
      actorId, licenseId: req.params.id, event: 'LICENSE_ARCHIVED', reason,
      requestId: String(res.getHeader('X-Request-Id') || ''),
    });
    await connection.query('COMMIT');
    return res.status(204).end();
  } catch (error) {
    await connection.query('ROLLBACK');
    console.error('Admin license archive failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
    return fail(res, 503, 'License could not be archived.', 'LICENSE_STORAGE_UNAVAILABLE');
  } finally {
    connection.release();
  }
}));

router.get('/metrics', asyncRoute(async (_req, res) => {
  try {
    const db = getPool();
    const [licenseResult, validationResult, emailResult] = await Promise.all([
      db.query<{ total: string; active: string; active_devices: string }>(
        `SELECT COUNT(*) FILTER (WHERE l.archived_at IS NULL)::text AS total,
          COUNT(*) FILTER (WHERE l.archived_at IS NULL AND l.status = 'active' AND (l.expires_at IS NULL OR l.expires_at > CURRENT_TIMESTAMP))::text AS active,
          (SELECT COUNT(*)::text FROM license_devices d JOIN licenses dl ON dl.id = d.license_id
            WHERE d.status = 'active' AND dl.archived_at IS NULL AND dl.status = 'active'
              AND (dl.expires_at IS NULL OR dl.expires_at > CURRENT_TIMESTAMP)) AS active_devices
         FROM licenses l`,
      ),
      db.query<{ successful: string; failed: string }>(
        `SELECT COUNT(*) FILTER (WHERE event_type = 'CLIENT_LICENSE_VALIDATED' AND outcome = 'success')::text AS successful,
          COUNT(*) FILTER (WHERE event_type = 'CLIENT_LICENSE_REJECTED' AND outcome = 'failure')::text AS failed
         FROM audit_events WHERE occurred_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
      ),
      db.query<{ accepted: string; failed: string }>(
        `SELECT COUNT(*) FILTER (WHERE event_type = 'LICENSE_EMAIL_ACCEPTED' AND outcome = 'success')::text AS accepted,
          COUNT(*) FILTER (WHERE event_type = 'LICENSE_EMAIL_FAILED' AND outcome = 'failure')::text AS failed
         FROM audit_events WHERE occurred_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
      ),
    ]);
    const successful = Number(validationResult.rows[0]?.successful || 0);
    const failed = Number(validationResult.rows[0]?.failed || 0);
    const totalValidations = successful + failed;
    return res.json({
      generatedAt: new Date().toISOString(), window: '24h',
      licenses: { total: Number(licenseResult.rows[0]?.total || 0), active: Number(licenseResult.rows[0]?.active || 0) },
      activeDevices: Number(licenseResult.rows[0]?.active_devices || 0),
      validations24h: { successful, failed, successRate: totalValidations ? Math.round(successful * 100 / totalValidations) : null },
      emails24h: { accepted: Number(emailResult.rows[0]?.accepted || 0), failed: Number(emailResult.rows[0]?.failed || 0) },
    });
  } catch (error) {
    console.error('Admin metrics query failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
    return fail(res, 503, 'Operational metrics are unavailable.', 'METRICS_UNAVAILABLE');
  }
}));

router.get('/audit-events', asyncRoute(async (req, res) => {
  const page = Math.max(1, Math.min(100_000, Number.parseInt(String(req.query.page || '1'), 10) || 1));
  const pageSize = Math.max(1, Math.min(1000, Number.parseInt(String(req.query.pageSize || '100'), 10) || 100));
  const offset = (page - 1) * pageSize;
  const events = typeof req.query.event === 'string' ? req.query.event.split(',').map(value => value.trim()).filter(value => /^[A-Z0-9_]{1,64}$/.test(value)).slice(0, 10) : [];
  const outcome = typeof req.query.outcome === 'string' && ['success', 'failure', 'warning'].includes(req.query.outcome)
    ? req.query.outcome : '';
  const conditions: string[] = [];
  const params: Array<string | number | string[]> = [];
  const addParam = (value: string | number | string[]) => { params.push(value); return `$${params.length}`; };
  if (events.length === 1) conditions.push(`a.event_type = ${addParam(events[0])}`);
  else if (events.length > 1) conditions.push(`a.event_type = ANY(${addParam(events)}::varchar[])`);
  if (outcome) conditions.push(`a.outcome = ${addParam(outcome)}`);
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const db = getPool();
    const countResult = await db.query<{ total: string }>(`SELECT COUNT(*) AS total FROM audit_events a ${where}`, params);
    const limit = addParam(pageSize);
    const pageOffset = addParam(offset);
    const result = await db.query<{
      id: string; event_type: string; outcome: string; reason: string | null; occurred_at: Date | string;
      license_id: string | null; key_prefix: string | null; product_name: string | null; request_id: string | null;
      metadata_json: unknown;
    }>(
      `SELECT a.id, a.event_type, a.outcome, a.reason, a.occurred_at, a.license_id, a.request_id, a.metadata_json,
              l.key_prefix, p.name AS product_name
       FROM audit_events a LEFT JOIN licenses l ON l.id = a.license_id
       LEFT JOIN products p ON p.id = l.product_id
       ${where} ORDER BY a.occurred_at DESC, a.id DESC LIMIT ${limit} OFFSET ${pageOffset}`,
      params,
    );
    const actionMap: Record<string, string> = {
      LICENSE_CREATED: 'CREATION', LICENSE_REVOKED: 'REVOCATION',
      LICENSE_RENEWED: 'RENEWAL', LICENSE_ARCHIVED: 'ARCHIVE',
      LICENSE_FEATURES_UPDATED: 'FEATURES_UPDATED',
      CLIENT_LICENSE_VALIDATED: 'VALIDATION', CLIENT_LICENSE_REJECTED: 'VALIDATION',
      CLIENT_DEVICE_ACTIVATED: 'ACTIVATION', CLIENT_DEVICE_DEACTIVATED: 'DEACTIVATION',
      LICENSE_EMAIL_ACCEPTED: 'EMAIL_SENT', LICENSE_EMAIL_FAILED: 'EMAIL_FAILED',
    };
    const auditLogs = result.rows.map(row => {
      const value = jsonValue(row.metadata_json);
      const metadata = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
      const action = row.event_type === 'LICENSE_STATUS_CHANGED'
        ? (metadata.to === 'active' ? 'REINSTATE' : 'SUSPEND')
        : actionMap[row.event_type] || 'RETRIEVAL';
      return {
        id: row.id,
        timestamp: dateIso(row.occurred_at),
        licenseKey: row.key_prefix ? `${row.key_prefix}-${KEY_MASK}` : '—',
        licenseId: row.license_id || undefined,
        productName: row.product_name || undefined,
        action,
        status: row.outcome === 'success' ? 'SUCCESS' : row.outcome === 'failure' ? 'FAILED' : 'WARN',
        reason: row.reason || undefined,
        ipAddress: 'Not collected', location: 'Not collected', deviceFingerprint: 'Not collected', deviceName: 'Not recorded', os: 'Not recorded',
        clientVersion: '', latencyMs: null,
        metadata: { ...metadata, requestId: row.request_id, eventType: row.event_type },
      };
    });
    return res.json({ auditLogs, page, pageSize, total: Number(countResult.rows[0]?.total || 0) });
  } catch (error) {
    console.error('Admin audit event listing failed.', { requestId: res.getHeader('X-Request-Id'), code: safeErrorCode(error) });
    return fail(res, 503, 'Audit history is unavailable.', 'AUDIT_STORAGE_UNAVAILABLE');
  }
}));

export default router;
