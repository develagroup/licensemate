ALTER TABLE licenses ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(24) NOT NULL DEFAULT 'annual'
  CHECK (billing_cycle IN ('monthly', 'annual', 'lifetime'));
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0.00
  CHECK (price >= 0);
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ;
ALTER TABLE licenses ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_licenses_archived_created ON licenses(archived_at, created_at);
