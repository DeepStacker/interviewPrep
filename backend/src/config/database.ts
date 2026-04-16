import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { runMigrations } from '../db/migrate';

dotenv.config();

const resolveDatabaseUrl = (rawUrl?: string): string | undefined => {
  if (!rawUrl) {
    return rawUrl;
  }

  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname;

    // Render sometimes exposes short internal DB hosts like dpg-xxxx-a.
    // If private DNS lookup fails, convert to the public Render Postgres domain.
    if (/^dpg-[a-z0-9-]+-a$/i.test(hostname) && !hostname.includes('.')) {
      const region = (process.env.RENDER_REGION || 'oregon').toLowerCase();
      parsed.hostname = `${hostname}.${region}-postgres.render.com`;

      if (!parsed.searchParams.has('sslmode')) {
        parsed.searchParams.set('sslmode', 'require');
      }
    }

    const sslMode = parsed.searchParams.get('sslmode');
    if (
      sslMode &&
      ['prefer', 'require', 'verify-ca'].includes(sslMode) &&
      !parsed.searchParams.has('uselibpqcompat')
    ) {
      parsed.searchParams.set('uselibpqcompat', 'true');
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
};

const connectionString = resolveDatabaseUrl(process.env.DATABASE_URL);

const useSsl = Boolean(
  connectionString &&
    connectionString.includes('render.com') &&
    !connectionString.includes('localhost')
);

const pool = new Pool({
  connectionString,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;

export const initializeDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL');
    client.release();
    await runMigrations();
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};
