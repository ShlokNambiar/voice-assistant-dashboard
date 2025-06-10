import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for call data (in production, use a database)
let callDataStore: any[] = []

export async function POST(request: NextRequest) {
  try {
    console.log('Webhook POST request received')
    console.log('Headers:', Object.fromEntries(request.headers.entries()))

    const contentType = request.headers.get('content-type')
    console.log('Content-Type:', contentType)

    let body
    try {
      body = await request.json()
      console.log('Received webhook data:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError)
      try {
        const text = await request.text()
        console.log('Raw body that failed to parse:', text)
        return NextResponse.json(
          { success: false, error: `Invalid JSON format: ${parseError.message}` },
          { status: 400 }
        )
      } catch (textError) {
        console.error('Could not read request as text either:', textError)
        return NextResponse.json(
          { success: false, error: 'Could not read request body' },
          { status: 400 }
        )
      }
    }

    // Validate that we have some data
    if (!body || (typeof body === 'object' && Object.keys(body).length === 0)) {
      console.error('Empty or invalid body received')
      return NextResponse.json(
        { success: false, error: 'Empty request body' },
        { status: 400 }
      )
    }

    // Normalize the data structure to handle different formats
    const normalizedData = {
      id: body.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      caller_name: extractCallerName(body),
      phone: body.phone || '',
      call_start: extractCallStart(body),
      call_end: extractCallEnd(body),
      duration: extractDuration(body),
      transcript: extractTranscript(body),
      success_flag: extractSuccessFlag(body),
      cost: extractCost(body),
      received_at: new Date().toISOString(),
      // Keep original data for debugging
      original_data: body
    }

    console.log('Normalized call data:', JSON.stringify(normalizedData, null, 2))

    // Store the normalized call data
    callDataStore.push(normalizedData)

    // Keep only the last 100 calls to prevent memory issues
    if (callDataStore.length > 100) {
      callDataStore = callDataStore.slice(-100)
    }

    console.log(`Stored call data. Total calls: ${callDataStore.length}`)

    return NextResponse.json({
      success: true,
      message: 'Call data received and stored',
      totalCalls: callDataStore.length,
      normalizedData: normalizedData
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { success: false, error: `Failed to process webhook data: ${error.message}` },
      { status: 500 }
    )
  }
}

// Helper functions to extract data from different formats
function extractCallerName(data: any): string {
  return data.caller_name ||
         data.message?.analysis?.structuredData?.name ||
         data.message?.analysis?.structuredData?._name ||
         data.name ||
         'Unknown Caller'
}

function extractCallStart(data: any): string {
  return data.call_start ||
         data.message?.startedAt ||
         data.startedAt ||
         new Date().toISOString()
}

function extractCallEnd(data: any): string {
  return data.call_end ||
         data.message?.endedAt ||
         data.endedAt ||
         new Date().toISOString()
}

function extractDuration(data: any): string {
  if (data.duration) return data.duration

  const start = extractCallStart(data)
  const end = extractCallEnd(data)

  try {
    const startTime = new Date(start)
    const endTime = new Date(end)
    const diffMs = endTime.getTime() - startTime.getTime()
    const diffSeconds = Math.floor(Math.abs(diffMs) / 1000)
    const minutes = Math.floor(diffSeconds / 60)
    const seconds = diffSeconds % 60
    return `${minutes}m ${seconds}s`
  } catch {
    return '0m 0s'
  }
}

function extractTranscript(data: any): string {
  return data.transcript ||
         data.message?.summary ||
         data.summary ||
         ''
}

function extractSuccessFlag(data: any): boolean | null {
  if (data.success_flag !== undefined) return data.success_flag
  if (data.message?.analysis?.successEvaluation !== undefined) return data.message.analysis.successEvaluation
  if (data.successEvaluation !== undefined) return data.successEvaluation
  return null
}

function extractCost(data: any): number {
  const cost = data.cost || data.message?.cost || 0
  return parseFloat(cost.toString()) || 0
}

export async function GET() {
  // Return stored call data for the dashboard
  return NextResponse.json(callDataStore)
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
