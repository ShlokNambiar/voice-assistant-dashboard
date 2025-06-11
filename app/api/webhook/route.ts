import { NextResponse, NextRequest } from 'next/server';
import { CallData, saveCallData, getAllCalls } from '@/lib/webhook-service';
import { initDB } from '@/lib/db';

// Initialize database on server start
initDB().catch(error => {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
});

// Helper function to generate unique request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// Helper function to log request details
function logRequest(request: NextRequest, requestId: string) {
  console.log(`\n--- [${new Date().toISOString()}] Webhook Request ${requestId} ---`);
  console.log('🌐 Method:', request.method);
  console.log('🔗 URL:', request.url);
  
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  console.log('📋 Headers:', JSON.stringify(headers, null, 2));
}

// Helper function to create error response
function createErrorResponse(error: string, status: number, requestId: string, details?: any) {
  console.error(`❌ [${requestId}] ${error}`, details || '');
  return NextResponse.json(
    { 
      requestId,
      error,
      details: details?.message || details || 'No additional details',
      timestamp: new Date().toISOString()
    },
    { status, statusText: error }
  );
}

// POST /api/webhook - Receive webhook data from Make.com
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();
  logRequest(request, requestId);
  
  // Log request start
  const startTime = Date.now();
  console.log(`🔄 [${requestId}] Processing webhook request...`);
  
  try {
    // Get raw request body for logging and validation
    let requestBody: string;
    try {
      requestBody = await request.text();
      console.log(`📥 [${requestId}] Request body length: ${requestBody.length} bytes`);
      
      if (!requestBody || requestBody.trim() === '') {
        return createErrorResponse('Empty request body', 400, requestId);
      }
    } catch (error) {
      return createErrorResponse('Failed to read request body', 400, requestId, error);
    }
    
    // Parse JSON
    let data: any;
    try {
      data = JSON.parse(requestBody);
      console.log(`📝 [${requestId}] Successfully parsed JSON data`);
    } catch (parseError) {
      return createErrorResponse('Invalid JSON payload', 400, requestId, parseError);
    }

    // Process the data array or single object
    const newData = Array.isArray(data) ? data : [data];
    console.log(`🔄 [${requestId}] Processing ${newData.length} call(s)`);
    
    if (newData.length === 0) {
      return createErrorResponse('No call data provided', 400, requestId);
    }
    
    let savedCount = 0;
    const saveErrors: Array<{id?: string, error: string, details?: string}> = [];
    const processedCalls: any[] = [];

    for (const item of newData) {
      const callId = item.id || item.ID?.toString() || `call_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      try {
        // Parse and validate timestamps
        let callStart: Date;
        let callEnd: Date;
        
        try {
          callStart = new Date(item.call_start || item['Call Start'] || new Date().toISOString());
          callEnd = new Date(item.call_end || item['Call End'] || new Date().toISOString());
          
          if (isNaN(callStart.getTime()) || isNaN(callEnd.getTime())) {
            throw new Error('Invalid date format');
          }
        } catch (dateError) {
          const errorMsg = `Invalid date format in call data (ID: ${callId})`;
          console.error(`❌ ${errorMsg}:`, dateError);
          saveErrors.push({ id: callId, error: errorMsg });
          continue;
        }
        
        // Calculate duration in seconds
        const duration = Math.max(0, Math.floor((callEnd.getTime() - callStart.getTime()) / 1000));

        // Parse cost with validation
        let cost: number;
        try {
          cost = typeof item.cost === 'number' 
            ? item.cost 
            : typeof item.Cost === 'number' 
              ? item.Cost 
              : typeof item.cost === 'string' 
                ? parseFloat(item.cost) || 0 
                : typeof item.Cost === 'string' 
                  ? parseFloat(item.Cost) || 0 
                  : 0;
          
          if (isNaN(cost) || !isFinite(cost)) {
            throw new Error('Invalid cost value');
          }
          cost = Math.max(0, parseFloat(cost.toFixed(4))); // Ensure non-negative with 4 decimal places
        } catch (costError) {
          console.warn(`⚠️ Invalid cost for call ${callId}, defaulting to 0:`, costError);
          cost = 0;
        }

        // Transform the data to match our CallData interface with validation
        const callData: CallData = {
          id: callId,
          caller_name: (item.caller_name || item['Caller Name']?.toString() || 'Unknown Caller').substring(0, 255),
          phone: (item.phone?.toString() || '').substring(0, 50),
          call_start: callStart.toISOString(),
          call_end: callEnd.toISOString(),
          duration: duration,
          transcript: (item.transcript || item.Summary?.toString() || '').substring(0, 10000),
          success_flag: item.success_flag !== undefined 
            ? Boolean(item.success_flag) 
            : (item.Success !== undefined ? Boolean(item.Success) : false),
          cost: cost
        };
        
        // Log processed data (sensitive info redacted)
        console.log(`📊 [${requestId}] Processed call data for ${callId}:`, {
          id: callData.id,
          caller: callData.caller_name,
          duration: `${callData.duration}s`,
          cost: `₹${callData.cost.toFixed(4)}`,
          success: callData.success_flag,
          timestamp: callData.call_start
        });
        
        // Save to database
        console.log(`💾 [${requestId}] Saving call ${callId} to database...`);
        const saved = await saveCallData(callData);
        
        if (saved) {
          console.log(`✅ [${requestId}] Successfully saved call ${callId}`);
          savedCount++;
          processedCalls.push({
            id: callData.id,
            status: 'saved',
            timestamp: new Date().toISOString()
          });
        } else {
          throw new Error('Save operation returned false');
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        const callId = item?.id || item?.ID?.toString() || 'unknown';
        console.error(`❌ [${requestId}] Error processing call ${callId}:`, errorMsg);
        saveErrors.push({ 
          id: callId, 
          error: `Failed to process call: ${errorMsg}`,
          details: error instanceof Error ? error.stack : undefined
        });
      }
    }

    // Calculate processing time
    const processingTime = Date.now() - startTime;
    
    // Prepare response
    const response = {
      requestId,
      success: savedCount > 0 && saveErrors.length === 0,
      processed: {
        total: newData.length,
        saved: savedCount,
        failed: saveErrors.length,
        skipped: newData.length - savedCount - saveErrors.length
      },
      durationMs: processingTime,
      timestamp: new Date().toISOString(),
      ...(saveErrors.length > 0 && { 
        errors: saveErrors,
        errorCount: saveErrors.length,
        errorSummary: `${saveErrors.length} of ${newData.length} calls failed to process`
      })
    };
    
    // Log completion
    const statusEmoji = response.success ? '✅' : saveErrors.length > 0 ? '⚠️' : '❌';
    console.log(`\n${statusEmoji} [${requestId}] Webhook processing completed in ${processingTime}ms`);
    console.log(`   • Total: ${response.processed.total}`);
    console.log(`   • Saved: ${response.processed.saved}`);
    if (response.processed.failed > 0) {
      console.log(`   • Failed: ${response.processed.failed}`);
    }
    
    return NextResponse.json(response, { 
      status: response.success ? 200 : (savedCount > 0 ? 207 : 400) 
    });
    
  } catch (error) {
    const errorId = `err_${Date.now()}`;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ [${requestId}] Critical error processing webhook (${errorId}):`, error);
    
    return createErrorResponse(
      'Internal server error', 
      500, 
      requestId,
      {
        errorId,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      }
    );
  }
}

// GET /api/webhook - Get all call data
export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  logRequest(request, requestId);
  
  try {
    console.log(`🔍 [${requestId}] Fetching all call records...`);
    const startTime = Date.now();
    
    const calls = await getAllCalls();
    
    console.log(`✅ [${requestId}] Successfully retrieved ${calls.length} call records in ${Date.now() - startTime}ms`);
    
    return NextResponse.json({
      requestId,
      success: true,
      count: calls.length,
      data: calls,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error fetching calls:`, error);
    
    return createErrorResponse(
      'Failed to fetch calls', 
      500, 
      requestId,
      error instanceof Error ? error.message : 'Unknown error'
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
