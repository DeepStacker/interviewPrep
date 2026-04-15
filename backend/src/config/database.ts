import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { runMigrations } from '../db/migrate';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
