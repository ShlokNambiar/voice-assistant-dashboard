import { sql } from '@vercel/postgres';

async function addSummaryColumnIfNotExists() {
  try {
    // Check if the summary column exists
    const columnExists = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'calls' AND column_name = 'summary';
    `;
    
    // If the column doesn't exist, add it
    if (columnExists.rowCount === 0) {
      console.log('🔄 Adding summary column to calls table...');
      await sql`
        ALTER TABLE calls 
        ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '';
      `;
      console.log('✅ Added summary column to calls table');
    } else {
      console.log('ℹ️ Summary column already exists in calls table');
    }
  } catch (error) {
    console.error('❌ Error adding summary column:', error);
    throw error;
  }
}

export async function initDB() {
  try {
    // Create the table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS calls (
        id VARCHAR(255) PRIMARY KEY,
        caller_name TEXT NOT NULL DEFAULT 'Unknown Caller',
        phone TEXT DEFAULT '',
        call_start TIMESTAMP WITH TIME ZONE NOT NULL,
        call_end TIMESTAMP WITH TIME ZONE NOT NULL,
        duration INTEGER NOT NULL,
        transcript TEXT NOT NULL DEFAULT '',
        summary TEXT DEFAULT '',
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

    // Add the summary column if it doesn't exist
    await addSummaryColumnIfNotExists();
    
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}
