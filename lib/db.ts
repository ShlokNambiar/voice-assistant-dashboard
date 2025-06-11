import { sql } from '@vercel/postgres';

export async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS calls (
        id VARCHAR(255) PRIMARY KEY,
        caller_name TEXT,
        phone TEXT,
        call_start TIMESTAMP WITH TIME ZONE,
        call_end TIMESTAMP WITH TIME ZONE,
        duration TEXT,
        transcript TEXT,
        success_flag BOOLEAN,
        cost DECIMAL(10, 2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('Database initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
