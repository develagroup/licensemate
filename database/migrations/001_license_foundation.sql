CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id),
  key_hash BYTEA NOT NULL UNIQUE CHECK (octet_length(key_hash) = 32),
  key_prefix VARCHAR(24) NOT NULL,
  customer_email VARCHAR(254) NOT NULL,
  customer_name VARCHAR(160) NOT NULL,
  plan VARCHAR(48) NOT NULL,
  license_type VARCHAR(32) NOT NULL CHECK (license_type IN ('single_device', 'multi_device')),
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
  max_devices SMALLINT NOT NULL DEFAULT 1 CHECK (max_devices BETWEEN 1 AND 1000),
  features_json JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(features_json) = 'array'),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ,
  renewed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason VARCHAR(500),
  source_reference VARCHAR(190),
  notes TEXT,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_licenses_customer_email ON licenses(customer_email);
CREATE INDEX IF NOT EXISTS idx_licenses_status_expiry ON licenses(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_licenses_product_created ON licenses(product_id, created_at);

CREATE TABLE IF NOT EXISTS license_devices (
  id UUID PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses(id),
  fingerprint_hash BYTEA NOT NULL CHECK (octet_length(fingerprint_hash) = 32),
  device_name VARCHAR(160),
  platform VARCHAR(40),
  client_version VARCHAR(80),
  status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  deactivation_reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_device_license_fingerprint UNIQUE (license_id, fingerprint_hash)
);
CREATE INDEX IF NOT EXISTS idx_devices_license_status ON license_devices(license_id, status);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY,
  actor_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
  event_type VARCHAR(64) NOT NULL,
  outcome VARCHAR(16) NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'failure', 'warning')),
  reason VARCHAR(500),
  request_id VARCHAR(100),
  ip_address INET,
  metadata_json JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_license_time ON audit_events(license_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_type_time ON audit_events(event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_request ON audit_events(request_id);

CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY,
  license_id UUID REFERENCES licenses(id) ON DELETE SET NULL,
  recipient_email VARCHAR(254) NOT NULL,
  message_type VARCHAR(64) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'accepted', 'failed')),
  attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  provider_message_id VARCHAR(190),
  last_error_code VARCHAR(100),
  last_error_summary VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_outbox_delivery ON email_outbox(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_outbox_license ON email_outbox(license_id, created_at);

INSERT INTO admin_users (id, email, display_name, role, active)
VALUES ('00000000-0000-4000-8000-000000000001', 'mistervela@gmail.com', 'Mister Vela', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;
