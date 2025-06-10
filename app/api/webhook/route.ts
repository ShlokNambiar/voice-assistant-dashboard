import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for call data (in production, use a database)
let callDataStore: any[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received webhook data:', JSON.stringify(body, null, 2))

    // Add timestamp to the received data
    const callData = {
      ...body,
      received_at: new Date().toISOString(),
      id: body.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Store the call data
    callDataStore.push(callData)

    // Keep only the last 100 calls to prevent memory issues
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
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process webhook data' },
      { status: 400 }
    )
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
