CREATE TABLE IF NOT EXISTS admin_users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'admin',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata_json LONGTEXT NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS licenses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  key_hash BINARY(32) NOT NULL UNIQUE,
  key_prefix VARCHAR(24) NOT NULL,
  customer_email VARCHAR(254) NOT NULL,
  customer_name VARCHAR(160) NOT NULL,
  plan VARCHAR(48) NOT NULL,
  license_type VARCHAR(32) NOT NULL,
  status ENUM('pending', 'active', 'suspended', 'revoked') NOT NULL DEFAULT 'pending',
  max_devices SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  features_json LONGTEXT NOT NULL,
  issued_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at TIMESTAMP(3) NULL,
  renewed_at TIMESTAMP(3) NULL,
  revoked_at TIMESTAMP(3) NULL,
  revoked_reason VARCHAR(500) NULL,
  source_reference VARCHAR(190) NULL,
  notes TEXT NULL,
  created_by CHAR(36) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_licenses_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_licenses_admin FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  INDEX idx_licenses_customer_email (customer_email),
  INDEX idx_licenses_status_expiry (status, expires_at),
  INDEX idx_licenses_product_created (product_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS license_devices (
  id CHAR(36) NOT NULL PRIMARY KEY,
  license_id CHAR(36) NOT NULL,
  fingerprint_hash BINARY(32) NOT NULL,
  device_name VARCHAR(160) NULL,
  platform VARCHAR(40) NULL,
  client_version VARCHAR(80) NULL,
  status ENUM('active', 'deactivated') NOT NULL DEFAULT 'active',
  activated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_heartbeat_at TIMESTAMP(3) NULL,
  deactivated_at TIMESTAMP(3) NULL,
  deactivation_reason VARCHAR(255) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_devices_license FOREIGN KEY (license_id) REFERENCES licenses(id),
  UNIQUE KEY uq_device_license_fingerprint (license_id, fingerprint_hash),
  INDEX idx_devices_license_status (license_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  actor_admin_id CHAR(36) NULL,
  license_id CHAR(36) NULL,
  event_type VARCHAR(64) NOT NULL,
  outcome ENUM('success', 'failure', 'warning') NOT NULL DEFAULT 'success',
  reason VARCHAR(500) NULL,
  request_id VARCHAR(100) NULL,
  ip_address VARCHAR(45) NULL,
  metadata_json LONGTEXT NULL,
  occurred_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_audit_admin FOREIGN KEY (actor_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_license FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE SET NULL,
  INDEX idx_audit_license_time (license_id, occurred_at),
  INDEX idx_audit_type_time (event_type, occurred_at),
  INDEX idx_audit_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_outbox (
  id CHAR(36) NOT NULL PRIMARY KEY,
  license_id CHAR(36) NULL,
  recipient_email VARCHAR(254) NOT NULL,
  message_type VARCHAR(64) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status ENUM('queued', 'sending', 'accepted', 'failed') NOT NULL DEFAULT 'queued',
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP(3) NULL,
  last_attempt_at TIMESTAMP(3) NULL,
  accepted_at TIMESTAMP(3) NULL,
  provider_message_id VARCHAR(190) NULL,
  last_error_code VARCHAR(100) NULL,
  last_error_summary VARCHAR(500) NULL,
  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_outbox_license FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE SET NULL,
  INDEX idx_outbox_delivery (status, next_attempt_at),
  INDEX idx_outbox_license (license_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
