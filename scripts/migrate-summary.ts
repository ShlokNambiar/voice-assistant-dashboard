import { sql } from '@vercel/postgres';

async function migrateSummaryField() {
  console.log('🚀 Starting database migration: Migrating summary field...');
  
  try {
    // 1. Check if summary column exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'calls' AND column_name = 'summary';
    `;

    if (columnCheck.rowCount === 0) {
      console.log('🔍 Summary column does not exist. Adding it now...');
      
      // Add the summary column
      await sql`
        ALTER TABLE calls 
        ADD COLUMN summary TEXT DEFAULT '';
      `;
      
      console.log('✅ Added summary column to calls table');
      
      // Migrate data from transcript to summary if needed
      const migrateResult = await sql`
        UPDATE calls 
        SET summary = transcript 
        WHERE summary = '' AND transcript IS NOT NULL AND transcript != '';
      `;
      
      console.log(`🔄 Migrated ${migrateResult.rowCount} records from transcript to summary`);
    } else {
      console.log('ℹ️ Summary column already exists. Checking for data migration...');
      
      // Check if we need to migrate any data
      const needsMigration = await sql`
        SELECT COUNT(*) as count 
        FROM calls 
        WHERE (summary IS NULL OR summary = '') 
        AND (transcript IS NOT NULL AND transcript != '')
      `;
      
      const count = parseInt(needsMigration.rows[0].count);
      
      if (count > 0) {
        console.log(`🔄 Found ${count} records needing migration. Migrating now...`);
        
        const migrateResult = await sql`
          UPDATE calls 
          SET summary = transcript 
          WHERE (summary IS NULL OR summary = '') 
          AND (transcript IS NOT NULL AND transcript != '');
        `;
        
        console.log(`✅ Migrated ${migrateResult.rowCount} records from transcript to summary`);
      } else {
        console.log('✅ No data migration needed');
      }
    }
    
    console.log('🏁 Database migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateSummary();
