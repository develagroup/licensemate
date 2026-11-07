import 'dotenv/config';
import { closeDatabase, runMigrations } from './database.ts';
import { safeErrorCode } from './logging.ts';

if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_MIGRATION_URL) {
  throw new Error('DATABASE_MIGRATION_URL is required for production migrations.');
}
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_RUNTIME_ROLE) {
  throw new Error('DATABASE_RUNTIME_ROLE is required for production migrations.');
}

runMigrations()
  .then(() => console.log('Database migrations are up to date.'))
  .catch(error => {
    console.error('Database migration failed.', { code: safeErrorCode(error) });
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
