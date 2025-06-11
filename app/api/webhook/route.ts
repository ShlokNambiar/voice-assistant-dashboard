import { NextResponse, NextRequest } from 'next/server';
import { CallData, saveCallData, getAllCalls } from '@/lib/webhook-service';
import { initDB } from '@/lib/db';

// Initialize database on server start
initDB().catch(console.error);

// POST /api/webhook - Receive webhook data from Make.com
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.text();
    console.log('📥 Raw webhook received:', requestBody);
    
    let data;
    try {
      data = JSON.parse(requestBody);
      console.log('📝 Parsed JSON data:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Process the data array or single object
    const newData = Array.isArray(data) ? data : [data];
    console.log(`🔄 Processing ${newData.length} call(s)`);
    let savedCount = 0;

    for (const item of newData) {
      try {
        // Calculate duration in seconds if not provided
        const callStart = new Date(item.call_start || item['Call Start'] || new Date().toISOString());
        const callEnd = new Date(item.call_end || item['Call End'] || new Date().toISOString());
        
        // Ensure duration is a number (in seconds)
        let duration = 0;
        if (typeof item.duration === 'string') {
          // Parse duration string like "2m 30s" to seconds
          const match = item.duration.match(/(\d+)m\s*(\d*)s?/);
          if (match) {
            const minutes = parseInt(match[1]) || 0;
            const seconds = parseInt(match[2]) || 0;
            duration = (minutes * 60) + seconds;
          }
        } else if (typeof item.duration === 'number') {
          duration = Math.floor(item.duration);
        } else {
          // Calculate from timestamps if duration not provided
          duration = Math.floor((callEnd.getTime() - callStart.getTime()) / 1000);
        }

        // Parse cost from various possible field names and ensure it's a number
        const cost = typeof item.cost === 'number' 
          ? item.cost 
          : typeof item.Cost === 'number' 
            ? item.Cost 
            : typeof item.cost === 'string' 
              ? parseFloat(item.cost) || 0 
              : typeof item.Cost === 'string' 
                ? parseFloat(item.Cost) || 0 
                : 0;

        // Transform the data to match our CallData interface
        const callData: CallData = {
          id: item.id || item.ID?.toString() || `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          caller_name: item.caller_name || item['Caller Name']?.toString() || 'Unknown Caller',
          phone: item.phone?.toString() || '',
          call_start: callStart.toISOString(),
          call_end: callEnd.toISOString(),
          duration: duration,
          transcript: item.transcript || item.Summary?.toString() || '',
          success_flag: item.success_flag !== undefined ? Boolean(item.success_flag) : (item.Success !== undefined ? Boolean(item.Success) : false),
          cost: cost // Include the parsed cost
        };
        
        console.log('🔄 Processed call data:', JSON.stringify(callData, null, 2));
        console.log('💾 Attempting to save call data...');
        const saved = await saveCallData(callData);
        console.log('✅ Save result:', saved);
        savedCount++;
        
      } catch (error) {
        console.error('❌ Error processing call data:', error, item);
        // Continue processing other items even if one fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      saved: savedCount,
      total: newData.length,
      message: 'Call data processed successfully'
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
