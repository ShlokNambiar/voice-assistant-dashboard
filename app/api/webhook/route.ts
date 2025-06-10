import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for call data (in production, use a database)
let callDataStore: any[] = []

export async function POST(request: NextRequest) {
  try {
    console.log('Webhook POST request received')

    let body
    try {
      body = await request.json()
      console.log('Received webhook data:', JSON.stringify(body, null, 2))
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError)
      return NextResponse.json(
        { success: false, error: `Invalid JSON: ${parseError.message}` },
        { status: 400 }
      )
    }

    // Very basic validation - just check if we have any data
    if (!body) {
      return NextResponse.json(
        { success: false, error: 'No data received' },
        { status: 400 }
      )
    }

    // Create a simple normalized data structure with only essential fields
    const callData = {
      id: body.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      caller_name: extractCallerName(body) || 'Unknown Caller',
      call_start: extractCallStart(body) || new Date().toISOString(),
      call_end: extractCallEnd(body) || new Date().toISOString(),
      duration: extractDuration(body) || '0m 0s',
      transcript: extractTranscript(body) || 'No summary available',
      success_flag: extractSuccessFlag(body),
      cost: extractCost(body) || 0,
      received_at: new Date().toISOString()
    }

    console.log('Processed call data:', JSON.stringify(callData, null, 2))

    // Store the call data
    callDataStore.push(callData)

    // Keep only the last 100 calls
    if (callDataStore.length > 100) {
      callDataStore = callDataStore.slice(-100)
    }

    console.log(`Stored call data. Total calls: ${callDataStore.length}`)

    return NextResponse.json({
      success: true,
      message: 'Call data received and stored',
      totalCalls: callDataStore.length
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    )
  }
}

// Simple helper functions to extract data safely
function extractCallerName(data: any): string | null {
  try {
    return data?.caller_name ||
           data?.message?.analysis?.structuredData?.name ||
           data?.message?.analysis?.structuredData?._name ||
           data?.name ||
           null
  } catch {
    return null
  }
}

function extractCallStart(data: any): string | null {
  try {
    return data?.call_start ||
           data?.message?.startedAt ||
           data?.startedAt ||
           null
  } catch {
    return null
  }
}

function extractCallEnd(data: any): string | null {
  try {
    return data?.call_end ||
           data?.message?.endedAt ||
           data?.endedAt ||
           null
  } catch {
    return null
  }
}

function extractDuration(data: any): string | null {
  try {
    if (data?.duration) return data.duration

    const start = extractCallStart(data)
    const end = extractCallEnd(data)

    if (!start || !end) return null

    const startTime = new Date(start)
    const endTime = new Date(end)
    const diffMs = endTime.getTime() - startTime.getTime()
    const diffSeconds = Math.floor(Math.abs(diffMs) / 1000)
    const minutes = Math.floor(diffSeconds / 60)
    const seconds = diffSeconds % 60
    return `${minutes}m ${seconds}s`
  } catch {
    return null
  }
}

function extractTranscript(data: any): string | null {
  try {
    return data?.transcript ||
           data?.message?.summary ||
           data?.summary ||
           null
  } catch {
    return null
  }
}

function extractSuccessFlag(data: any): boolean | null {
  try {
    if (data?.success_flag !== undefined) return data.success_flag
    if (data?.message?.analysis?.successEvaluation !== undefined) return data.message.analysis.successEvaluation
    if (data?.successEvaluation !== undefined) return data.successEvaluation
    return null
  } catch {
    return null
  }
}

function extractCost(data: any): number | null {
  try {
    const cost = data?.cost || data?.message?.cost
    if (cost === undefined || cost === null) return null
    return parseFloat(cost.toString()) || 0
  } catch {
    return null
  }
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
