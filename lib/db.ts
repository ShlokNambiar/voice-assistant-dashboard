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
      
      // After adding the column, migrate any existing transcript data to summary
      try {
        console.log('🔄 Migrating existing transcript data to summary column...');
        const result = await sql`
          UPDATE calls 
          SET summary = transcript 
          WHERE (summary IS NULL OR summary = '') 
          AND (transcript IS NOT NULL AND transcript != '');
        `;
        console.log(`✅ Migrated ${result.rowCount} records from transcript to summary`);
      } catch (migrateError) {
        console.error('⚠️ Error migrating transcript data to summary:', migrateError);
        // Don't fail the entire operation if migration fails
      }
    } else {
      console.log('ℹ️ Summary column already exists in calls table');
      
      // Check if we have any records where summary is empty but transcript has data
      const needsMigration = await sql`
        SELECT COUNT(*) as count 
        FROM calls 
        WHERE (summary IS NULL OR summary = '') 
        AND (transcript IS NOT NULL AND transcript != '');
      `;
      
      const count = parseInt(needsMigration.rows[0]?.count || '0');
      if (count > 0) {
        console.log(`🔄 Found ${count} records with transcript data but no summary. Migrating now...`);
        const result = await sql`
          UPDATE calls 
          SET summary = transcript 
          WHERE (summary IS NULL OR summary = '') 
          AND (transcript IS NOT NULL AND transcript != '');
        `;
        console.log(`✅ Migrated ${result.rowCount} records from transcript to summary`);
      } else {
        console.log('✅ No data migration needed');
      }
    }
  } catch (error) {
    console.error('❌ Error in addSummaryColumnIfNotExists:', error);
    // Don't throw here to allow the app to continue running
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
