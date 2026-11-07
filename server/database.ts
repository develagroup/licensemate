import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg, { type Pool, type PoolClient, type QueryResultRow } from 'pg';

interface MigrationRow extends QueryResultRow {
  version: string;
}

const RUNTIME_GRANTS = [
  'GRANT SELECT ON admin_users TO',
  'GRANT SELECT, INSERT, UPDATE ON admin_sessions TO',
  'GRANT SELECT, INSERT ON products TO',
  'GRANT SELECT, INSERT, UPDATE ON licenses TO',
  'GRANT SELECT, INSERT, UPDATE ON license_devices TO',
  'GRANT SELECT, INSERT ON audit_events TO',
  'GRANT SELECT, INSERT, UPDATE ON email_outbox TO',
];

const REQUIRED_SCHEMA_VERSION = '004_admin_sessions.sql';
let pool: Pool | null = null;
let migrationPool: Pool | null = null;

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function createPool(uri: string) {
  if (!/^postgres(?:ql)?:\/\//i.test(uri)) {
    throw new Error('DATABASE_URL must use a PostgreSQL URL (postgres:// or postgresql://).');
  }
  return new pg.Pool({
    connectionString: uri,
    max: Number(process.env.DB_CONNECTION_LIMIT || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: 'licensepulse',
  });
}

export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  if (!pool) pool = createPool(process.env.DATABASE_URL);
  return pool;
}

function getMigrationPool() {
  const uri = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!uri) throw new Error('DATABASE_MIGRATION_URL (or DATABASE_URL for local development) is not configured.');
  if (!migrationPool) migrationPool = createPool(uri);
  return migrationPool;
}

function getRuntimeRole() {
  if (process.env.DATABASE_RUNTIME_ROLE) return process.env.DATABASE_RUNTIME_ROLE;
  const migrationUrl = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  return migrationUrl ? decodeURIComponent(new URL(migrationUrl).username) : '';
}

export async function checkDatabase() {
  if (!databaseConfigured()) return { ok: false as const, reason: 'not_configured' as const };
  try {
    const db = getPool();
    await db.query('SELECT 1');
    const result = await db.query<MigrationRow>(
      'SELECT version FROM schema_migrations WHERE version = $1 LIMIT 1', [REQUIRED_SCHEMA_VERSION],
    );
    if (!result.rows.length) return { ok: false as const, reason: 'migrations_missing' as const };
    return { ok: true as const, migration: REQUIRED_SCHEMA_VERSION };
  } catch {
    return { ok: false as const, reason: 'unavailable' as const };
  }
}

export async function runMigrations() {
  const db = getMigrationPool();
  const runtimeRole = getRuntimeRole();
  if (!/^[a-z_][a-z0-9_]*$/.test(runtimeRole)) throw new Error('DATABASE_RUNTIME_ROLE must be a simple PostgreSQL role name.');
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  const migrationsDir = path.resolve('database/migrations');
  const migrationFiles = (await readdir(migrationsDir)).filter(name => name.endsWith('.sql')).sort();
  const client: PoolClient = await db.connect();
  try {
    for (const file of migrationFiles) {
      const applied = await client.query<MigrationRow>(
        'SELECT version FROM schema_migrations WHERE version = $1', [file],
      );
      if (applied.rows.length) continue;

      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Applied database migration ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    await client.query(`GRANT USAGE ON SCHEMA public TO ${runtimeRole}`);
    await client.query(`GRANT SELECT ON schema_migrations TO ${runtimeRole}`);
    for (const grant of RUNTIME_GRANTS) await client.query(`${grant} ${runtimeRole}`);
  } finally {
    client.release();
  }
}

export async function closeDatabase() {
  const pools = [pool, migrationPool].filter((current): current is Pool => current !== null);
  pool = null;
  migrationPool = null;
  await Promise.all(pools.map(current => current.end()));
}
