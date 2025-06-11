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

        // Save to database
        await saveCallData(callData);
        savedCount++;
      } catch (error) {
        console.error('Error processing call data:', error, item);
        // Continue processing other items even if one fails
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      saved: savedCount,
      total: newData.length
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// GET /api/webhook - Get all webhook data
export async function GET() {
  try {
    const calls = await getAllCalls();
    return NextResponse.json(calls);
  } catch (error) {
    console.error('Error fetching call data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call data', details: error instanceof Error ? error.message : String(error) },
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
