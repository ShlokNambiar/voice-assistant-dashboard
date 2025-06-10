// Webhook service for fetching call data from Make.com

export interface CallData {
  id: string
  caller_name: string
  phone: string
  call_start: Date
  call_end: Date
  duration: string
  transcript: string
  success_flag: boolean | null // true = success, false = failed, null = incomplete
  cost: number // Cost in rupees
}

export interface DashboardMetrics {
  totalCalls: number
  avgCallDuration: string
  totalBalance: string
  avgCallCost: string
  successRate: string
  totalReservations: number
  lastRefreshed: string
}

// The webhook will POST data to /api/webhook, and we'll fetch it from there
const getDataUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use relative URL
    return "/api/webhook"
  } else {
    // Server-side: use absolute URL for production or localhost for dev
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'development'
        ? `http://localhost:${process.env.PORT || 3001}`
        : 'http://localhost:3000'
    return `${baseUrl}/api/webhook`
  }
}
const INITIAL_BALANCE = 5000 // ₹5000 starting balance

// Cache for storing fetched data
let cachedData: CallData[] = []
let lastFetchTime = 0
const CACHE_DURATION = 5000 // 5 seconds cache (shorter since it's local)

export async function fetchWebhookData(): Promise<CallData[]> {
  const now = Date.now()

  // Return cached data if it's still fresh
  if (cachedData.length > 0 && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedData
  }

  const response = await fetch(getDataUrl(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch call data: ${response.status}`)
  }

  const data = await response.json()

  // Transform the webhook data to match our CallData interface
  // Based on Make.com webhook structure:
  // - caller_name (A): 1. message.analysis.structuredData.* name
  // - phone (B): direct field
  // - call_start (C): 1. message.startedAt
  // - call_end (D): 1. message.endedAt
  // - transcript (E): 1. message.summary
  // - cost (F): 1. message.cost
  // - success_flag (G): 1. message.analysis.successEvaluation

  const transformedData: CallData[] = Array.isArray(data) ? data.map((item: any, index: number) => {
    // Extract nested data safely
    const message = item.message || item['1.message'] || {}
    const analysis = message.analysis || {}
    const structuredData = analysis.structuredData || {}

    return {
      id: item.id || `call_${index + 1}`,
      caller_name: structuredData.name || item.caller_name || `Unknown Caller`,
      phone: item.phone || 'N/A',
      call_start: new Date(message.startedAt || item.call_start || Date.now()),
      call_end: new Date(message.endedAt || item.call_end || Date.now()),
      duration: item.duration || calculateDuration(message.startedAt || item.call_start, message.endedAt || item.call_end),
      transcript: message.summary || item.transcript || '',
      success_flag: analysis.successEvaluation !== undefined ? analysis.successEvaluation : (item.success_flag !== undefined ? item.success_flag : null),
      cost: parseFloat(message.cost || item.cost || '0')
    }
  }) : []

  cachedData = transformedData
  lastFetchTime = now

  return transformedData
}

function calculateDuration(startTime: string | Date, endTime: string | Date): string {
  if (!startTime || !endTime) return '0m 0s'

  try {
    const start = new Date(startTime)
    const end = new Date(endTime)

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return '0m 0s'
    }

    const diffMs = end.getTime() - start.getTime()
    const diffSeconds = Math.floor(Math.abs(diffMs) / 1000) // Use absolute value

    const minutes = Math.floor(diffSeconds / 60)
    const seconds = diffSeconds % 60

    return `${minutes}m ${seconds}s`
  } catch (error) {
    console.error('Error calculating duration:', error)
    return '0m 0s'
  }
}

export async function calculateMetrics(data: CallData[]): Promise<DashboardMetrics> {
  const totalCalls = data.length
  const successfulCalls = data.filter(call => call.success_flag === true).length
  const totalCost = data.reduce((sum, call) => sum + call.cost, 0)
  const currentBalance = INITIAL_BALANCE - totalCost

  // Calculate average call duration
  let totalDurationSeconds = 0
  data.forEach(call => {
    const [minutes, seconds] = call.duration.split('m ')
    const mins = parseInt(minutes) || 0
    const secs = parseInt(seconds.replace('s', '')) || 0
    totalDurationSeconds += (mins * 60) + secs
  })

  const avgDurationSeconds = totalCalls > 0 ? Math.floor(totalDurationSeconds / totalCalls) : 0
  const avgMinutes = Math.floor(avgDurationSeconds / 60)
  const avgSeconds = avgDurationSeconds % 60
  const avgCallDuration = `${avgMinutes}m ${avgSeconds}s`

  const avgCallCost = totalCalls > 0 ? (totalCost / totalCalls).toFixed(2) : '0.00'
  const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0

  return {
    totalCalls,
    avgCallDuration,
    totalBalance: `₹${currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    avgCallCost: `₹${avgCallCost}`,
    successRate: `${successRate}%`,
    totalReservations: successfulCalls,
    lastRefreshed: new Date().toLocaleTimeString(),
  }
}

// Function to get chart data for calls per day
export function getCallsPerDayData(data: CallData[]) {
  const last14Days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (13 - i))
    return date
  })

  return last14Days.map(date => {
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const callsOnDate = data.filter(call => {
      const callDate = new Date(call.call_start)
      return callDate.toDateString() === date.toDateString()
    }).length

    return {
      date: dateStr,
      calls: callsOnDate
    }
  })
}

// Function to get call duration distribution data
export function getCallDurationData(data: CallData[]) {
  const shortCalls = data.filter(call => {
    const [minutes] = call.duration.split('m ')
    return parseInt(minutes) < 1
  }).length

  const mediumCalls = data.filter(call => {
    const [minutes] = call.duration.split('m ')
    const mins = parseInt(minutes)
    return mins >= 1 && mins <= 3
  }).length

  const longCalls = data.filter(call => {
    const [minutes] = call.duration.split('m ')
    return parseInt(minutes) > 3
  }).length

  return [
    { name: "< 1 min", value: shortCalls, color: "#06B6D4" },
    { name: "1-3 min", value: mediumCalls, color: "#8B5CF6" },
    { name: "> 3 min", value: longCalls, color: "#F59E0B" },
  ]
}
