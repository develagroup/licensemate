import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import type { PoolClient, QueryResultRow } from 'pg';
import { getPool } from './database.ts';
import { sendLicenseKeyEmail } from './emailService.ts';

interface EmailPayload {
  key: string;
  recipientName: string;
  productName: string;
}

interface OutboxRow extends QueryResultRow {
  id: string;
  license_id: string | null;
  recipient_email: string;
  message_type: string;
  subject: string;
  status: 'queued' | 'sending' | 'accepted' | 'failed';
  attempts: number;
  last_attempt_at: Date | string | null;
  payload_ciphertext: Buffer | null;
  provider_message_id: string | null;
  last_error_code: string | null;
  last_error_summary: string | null;
  accepted_at: Date | string | null;
  created_at: Date | string;
}

function encryptionKey() {
  const value = process.env.EMAIL_OUTBOX_ENCRYPTION_KEY || '';
  return /^[a-fA-F0-9]{64}$/.test(value) ? Buffer.from(value, 'hex') : null;
}

function encryptPayload(payload: EmailPayload) {
  const key = encryptionKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]);
}

function decryptPayload(encrypted: Buffer): EmailPayload {
  const key = encryptionKey();
  if (!key || encrypted.length < 30 || encrypted[0] !== 1) throw new Error('EMAIL_PAYLOAD_DECRYPT_FAILED');
  const iv = encrypted.subarray(1, 13);
  const tag = encrypted.subarray(13, 29);
  const ciphertext = encrypted.subarray(29);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const value = JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')) as Partial<EmailPayload>;
  if (typeof value.key !== 'string' || typeof value.recipientName !== 'string' || typeof value.productName !== 'string') throw new Error('EMAIL_PAYLOAD_INVALID');
  return value as EmailPayload;
}

export async function enqueueLicenseEmail(connection: PoolClient, input: {
  licenseId: string;
  recipientEmail: string;
  recipientName: string;
  productName: string;
  key: string;
}) {
  const id = randomUUID();
  const encrypted = encryptPayload({ key: input.key, recipientName: input.recipientName, productName: input.productName });
  const status = encrypted ? 'queued' : 'failed';
  const errorCode = encrypted ? null : 'EMAIL_ENCRYPTION_KEY_MISSING';
  const errorSummary = encrypted ? null : 'Set EMAIL_OUTBOX_ENCRYPTION_KEY to enable protected email delivery and retries.';
  await connection.query(
    `INSERT INTO email_outbox (id, license_id, recipient_email, message_type, subject, status,
      payload_ciphertext, last_error_code, last_error_summary)
     VALUES ($1, $2, $3, 'license_key', $4, $5, $6, $7, $8)`,
    [id, input.licenseId, input.recipientEmail, `Your ${input.productName} license key`, status, encrypted, errorCode, errorSummary],
  );
  return { id, status, attempts: 0, acceptedAt: null, lastErrorCode: errorCode, lastErrorSummary: errorSummary, retryable: Boolean(encrypted) };
}

export async function createResendDelivery(licenseId: string) {
  const db = getPool();
  const source = await db.query<OutboxRow>(
    `SELECT e.id, e.license_id, e.recipient_email, e.message_type, e.subject, e.status, e.attempts,
       e.last_attempt_at, e.payload_ciphertext, e.provider_message_id, e.last_error_code, e.last_error_summary,
       e.accepted_at, e.created_at
     FROM email_outbox e JOIN licenses l ON l.id = e.license_id
     WHERE e.license_id = $1 AND l.status = 'active' AND l.archived_at IS NULL
       AND (l.expires_at IS NULL OR l.expires_at > CURRENT_TIMESTAMP)
       AND e.message_type = 'license_key' AND e.payload_ciphertext IS NOT NULL
     ORDER BY e.created_at DESC LIMIT 1`, [licenseId],
  );
  if (!source.rows[0]) return null;
  const row = source.rows[0];
  const id = randomUUID();
  await db.query(
    `INSERT INTO email_outbox (id, license_id, recipient_email, message_type, subject, status, payload_ciphertext)
     VALUES ($1, $2, $3, 'license_key', $4, 'queued', $5)`,
    [id, row.license_id, row.recipient_email, row.subject, row.payload_ciphertext],
  );
  return { id, licenseId: row.license_id };
}

function errorCode(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String((error as { code?: unknown }).code || '') : '';
  return /^[A-Za-z0-9_-]{1,100}$/.test(code) ? code.toUpperCase() : 'SMTP_DELIVERY_FAILED';
}

function errorSummary(code: string) {
  if (code === 'SMTP_NOT_CONFIGURED') return 'SMTP is not configured for customer email delivery.';
  if (code === 'EMAIL_PAYLOAD_DECRYPT_FAILED' || code === 'EMAIL_PAYLOAD_INVALID') return 'The encrypted email payload cannot be opened. Check the stable outbox encryption key.';
  if (code === 'SMTP_RECIPIENT_REJECTED') return 'The SMTP server did not accept the recipient address.';
  return 'SMTP did not accept the email. Check the mail service and retry.';
}

function serializeOutbox(row: OutboxRow) {
  return {
    id: row.id,
    licenseId: row.license_id,
    recipientEmail: row.recipient_email,
    messageType: row.message_type,
    subject: row.subject,
    status: row.status,
    attempts: Number(row.attempts),
    createdAt: new Date(row.created_at).toISOString(),
    lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at).toISOString() : null,
    acceptedAt: row.accepted_at ? new Date(row.accepted_at).toISOString() : null,
    providerMessageId: row.provider_message_id,
    lastErrorCode: row.last_error_code,
    lastErrorSummary: row.last_error_summary,
    retryable: Boolean(row.payload_ciphertext) && row.status !== 'accepted' && Number(row.attempts) < 10,
  };
}

const OUTBOX_SELECT = `SELECT id, license_id, recipient_email, message_type, subject, status, attempts,
  last_attempt_at, payload_ciphertext, provider_message_id, last_error_code, last_error_summary,
  accepted_at, created_at FROM email_outbox`;

export async function deliverOutboxMessage(id: string, requestId: string) {
  const db = getPool();
  const claim = await db.query<OutboxRow>(
    `UPDATE email_outbox SET status = 'sending', attempts = attempts + 1,
       last_attempt_at = CURRENT_TIMESTAMP, last_error_code = NULL, last_error_summary = NULL,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND payload_ciphertext IS NOT NULL AND attempts < 10
       AND (status IN ('queued', 'failed') OR (status = 'sending' AND last_attempt_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes'))
     RETURNING id, license_id, recipient_email, message_type, subject, status, attempts,
       last_attempt_at, payload_ciphertext, provider_message_id, last_error_code, last_error_summary,
       accepted_at, created_at`, [id],
  );
  if (!claim.rows[0]) {
    const current = await db.query<OutboxRow>(`${OUTBOX_SELECT} WHERE id = $1`, [id]);
    if (!current.rows[0]) return null;
    if (current.rows[0].status === 'accepted' || current.rows[0].status === 'sending' || current.rows[0].attempts >= 10) return serializeOutbox(current.rows[0]);
    if (!current.rows[0].payload_ciphertext) return serializeOutbox(current.rows[0]);
    return serializeOutbox(current.rows[0]);
  }

  const row = claim.rows[0];
  let status: 'accepted' | 'failed' = 'accepted';
  let code: string | null = null;
  let summary: string | null = null;
  let providerMessageId: string | null = null;
  try {
    const payload = decryptPayload(row.payload_ciphertext!);
    const sent = await sendLicenseKeyEmail({
      to: row.recipient_email,
      recipientName: payload.recipientName,
      productName: payload.productName,
      key: payload.key,
      messageId: `<licensepulse-${row.id}@licensepulse.local>`,
    });
    providerMessageId = sent.messageId.slice(0, 190);
  } catch (error) {
    status = 'failed';
    code = errorCode(error);
    summary = errorSummary(code);
    console.warn('License email delivery attempt failed.', { deliveryId: row.id, code });
  }

  const connection = await db.connect();
  try {
    await connection.query('BEGIN');
    const updated = await connection.query<OutboxRow>(
      `UPDATE email_outbox SET status = $1, accepted_at = $2, provider_message_id = $3,
       last_error_code = $4, last_error_summary = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6
       RETURNING id, license_id, recipient_email, message_type, subject, status, attempts,
       last_attempt_at, payload_ciphertext, provider_message_id, last_error_code, last_error_summary,
       accepted_at, created_at`,
      [status, status === 'accepted' ? new Date() : null, providerMessageId, code, summary, row.id],
    );
    await connection.query(
      `INSERT INTO audit_events (id, license_id, event_type, outcome, reason, request_id, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [randomUUID(), row.license_id, status === 'accepted' ? 'LICENSE_EMAIL_ACCEPTED' : 'LICENSE_EMAIL_FAILED', status === 'accepted' ? 'success' : 'failure', status === 'accepted' ? 'SMTP accepted the license email.' : summary, requestId, JSON.stringify({ deliveryId: row.id, attempts: Number(row.attempts) })],
    );
    await connection.query('COMMIT');
    return serializeOutbox(updated.rows[0]);
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally { connection.release(); }
}

export async function getOutboxDelivery(id: string) {
  const result = await getPool().query<OutboxRow>(`${OUTBOX_SELECT} WHERE id = $1`, [id]);
  return result.rows[0] ? serializeOutbox(result.rows[0]) : null;
}
