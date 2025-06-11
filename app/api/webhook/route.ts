import { NextResponse, NextRequest } from 'next/server';
import { CallData, saveCallData, getAllCalls } from '@/lib/webhook-service';
import { initDB } from '@/lib/db';

// Initialize database on server start
initDB().catch(console.error);

// POST /api/webhook - Receive webhook data from Make.com
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // If data is an array, use it directly, otherwise wrap in array
    const newData = Array.isArray(data) ? data : [data];
    let savedCount = 0;

    // Process each call in the webhook data
    for (const item of newData) {
      try {
        // Transform and validate the data
        const callData: CallData = {
          id: item.id || `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          caller_name: item.caller_name || 'Unknown Caller',
          phone: item.phone || 'N/A',
          call_start: item.call_start || new Date().toISOString(),
          call_end: item.call_end || new Date().toISOString(),
          duration: item.duration || '0m 0s',
          transcript: item.transcript || item.summary || '',
          success_flag: item.success_flag !== undefined ? Boolean(item.success_flag) : null,
          cost: parseFloat(item.cost?.toString() || '0')
        };

        // Validate required fields
        const requiredFields: (keyof CallData)[] = ['id', 'caller_name', 'phone', 'call_start', 'call_end', 'duration', 'transcript', 'success_flag', 'cost'];
        const missingFields = requiredFields.filter(field => callData[field] === undefined);
        
        if (missingFields.length > 0) {
          console.error('❌ Missing required fields:', missingFields);
          return NextResponse.json(
            { success: false, error: `Missing required fields: ${missingFields.join(', ')}` }, 
            { status: 400 }
          );
        }

        try {
          // Save to database
          console.log('💾 Attempting to save call data...');
          const saved = await saveCallData(callData);
          console.log('✅ Save result:', saved);
          savedCount++;
        } catch (dbError) {
          console.error('❌ Database error:', dbError);
          return NextResponse.json(
            { 
              success: false, 
              error: 'Failed to save to database',
              details: dbError instanceof Error ? dbError.message : String(dbError)
            }, 
            { status: 500 }
          );
        }
      } catch (error) {
        console.error('❌ Error processing call data:', error, item);
        // Continue processing other items even if one fails
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      saved: savedCount,
      total: newData.length,
      message: 'Call data saved successfully'
    });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }, 
      { status: 500 }
    );
  }
}

// GET /api/webhook - Get all webhook data
export async function GET() {
  try {
    console.log('📡 Fetching all calls from database...');
    const calls = await getAllCalls();
    console.log(`✅ Found ${calls.length} calls in database`);
    return NextResponse.json(calls);
  } catch (error) {
    console.error('❌ Error fetching call data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch call data',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
