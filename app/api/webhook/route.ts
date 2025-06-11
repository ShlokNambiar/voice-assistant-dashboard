import { NextResponse, NextRequest } from 'next/server';
import { CallData, saveCallData, getAllCalls } from '@/lib/webhook-service';
import { initDB } from '@/lib/db';

// Initialize database on server start
initDB().catch(console.error);

// POST /api/webhook - Receive webhook data from Make.com
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('📥 Webhook received with data:', JSON.stringify(data, null, 2));

    // Process the data array or single object
    const newData = Array.isArray(data) ? data : [data];
    let savedCount = 0;

    for (const item of newData) {
      try {
        // Calculate duration in seconds if not provided
        const callStart = new Date(item['Call Start'] || item.call_start || new Date().toISOString());
        const callEnd = new Date(item['Call End'] || item.call_end || new Date().toISOString());
        const duration = item.duration || Math.floor((callEnd.getTime() - callStart.getTime()) / 1000);

        // Transform the data to match our CallData interface
        const callData: CallData = {
          id: item.ID?.toString() || `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          caller_name: item['Caller Name']?.toString() || 'Unknown Caller',
          phone: item.phone?.toString() || item.ID?.toString() || '',
          call_start: callStart.toISOString(),
          call_end: callEnd.toISOString(),
          duration: duration,
          transcript: item.Summary?.toString() || item.transcript?.toString() || '',
          success_flag: Boolean(item.Success || item.success_flag || false),
          cost: parseFloat(item.Cost?.toString() || item.cost?.toString() || '0')
        };

        console.log('📝 Processed call data:', callData);

        // Save to database
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
