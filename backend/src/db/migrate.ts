import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const resolveDatabaseUrl = (rawUrl?: string): string | undefined => {
  if (!rawUrl) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname;

    if (/^dpg-[a-z0-9-]+-a$/i.test(hostname) && !hostname.includes('.')) {
      const region = (process.env.RENDER_REGION || 'oregon').toLowerCase();
      parsed.hostname = `${hostname}.${region}-postgres.render.com`;

      if (!parsed.searchParams.has('sslmode')) {
        parsed.searchParams.set('sslmode', 'require');
      }
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
};

const connectionString = resolveDatabaseUrl(
  process.env.DIRECT_URL || process.env.DATABASE_URL
);

const useSsl = Boolean(
  connectionString &&
    connectionString.includes('render.com') &&
    !connectionString.includes('localhost')
);

const pool = new Pool({
  connectionString,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

const ensureMigrationsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

const getAppliedMigrations = async (): Promise<Set<string>> => {
  const result = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row) => row.filename));
};

const getMigrationFiles = (): string[] => {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
};

const applyMigration = async (filename: string): Promise<void> => {
  const fullPath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(fullPath, 'utf8');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`Applied migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Failed migration: ${filename}`);
    throw error;
  } finally {
    client.release();
  }
};

export const runMigrations = async (): Promise<void> => {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = getMigrationFiles();

  for (const filename of files) {
    if (applied.has(filename)) {
      continue;
    }
    await applyMigration(filename);
  }
};

const main = async () => {
  try {
    await runMigrations();
    console.log('Migration run completed');
  } catch (error) {
    console.error('Migration run failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  main();
}
