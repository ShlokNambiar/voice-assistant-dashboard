import { sql } from '@vercel/postgres';

export async function initDB() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS calls (
        id VARCHAR(255) PRIMARY KEY,
        caller_name TEXT NOT NULL DEFAULT 'Unknown Caller',
        phone TEXT DEFAULT '',
        call_start TIMESTAMP WITH TIME ZONE NOT NULL,
        call_end TIMESTAMP WITH TIME ZONE NOT NULL,
        duration INTEGER NOT NULL,
        transcript TEXT NOT NULL DEFAULT '',
        success_flag BOOLEAN NOT NULL DEFAULT false,
        cost DECIMAL(10, 4) NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Add index for better query performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at)
    `;

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}
