ALTER TABLE email_outbox
  ADD COLUMN IF NOT EXISTS payload_ciphertext BYTEA;

CREATE INDEX IF NOT EXISTS idx_outbox_stale_sending
  ON email_outbox(status, last_attempt_at)
  WHERE status = 'sending';
