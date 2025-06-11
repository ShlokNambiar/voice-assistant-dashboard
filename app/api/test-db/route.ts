import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic query
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ Database connection successful');
    
    // Check if calls table exists
    try {
      await sql`SELECT 1 FROM calls LIMIT 1`;
      console.log('✅ Calls table exists');
      return NextResponse.json({ 
        success: true, 
        time: result.rows[0].time,
        tableExists: true,
        message: 'Database connection successful and calls table exists'
      });
    } catch (tableError) {
      console.log('ℹ️ Calls table does not exist or is not accessible');
      return NextResponse.json({ 
        success: true, 
        time: result.rows[0].time,
        tableExists: false,
        message: 'Database connection successful but calls table does not exist'
      });
    }
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to connect to database',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
