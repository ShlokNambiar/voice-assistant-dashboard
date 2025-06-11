import { sql } from '@vercel/postgres';

export interface CallData {
  id: string
  caller_name: string
  phone: string
  call_start: Date | string
  call_end: Date | string
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

const INITIAL_BALANCE = 5000; // ₹5000 starting balance

// Save call data to the database
export async function saveCallData(call: CallData) {
  try {
    await sql`
      INSERT INTO calls (
        id, caller_name, phone, call_start, call_end, 
        duration, transcript, success_flag, cost
      ) VALUES (
        ${call.id},
        ${call.caller_name},
        ${call.phone},
        ${new Date(call.call_start).toISOString()},
        ${new Date(call.call_end).toISOString()},
        ${call.duration},
        ${call.transcript},
        ${call.success_flag},
        ${call.cost}
      )
      ON CONFLICT (id) DO UPDATE SET
        call_end = EXCLUDED.call_end,
        duration = EXCLUDED.duration,
        transcript = EXCLUDED.transcript,
        success_flag = EXCLUDED.success_flag,
        cost = EXCLUDED.cost
    `;
  } catch (error) {
    console.error('Error saving call data:', error);
    throw error;
  }
}

// Define the database row type
interface DBCallRow {
  id: string;
  caller_name: string | null;
  phone: string | null;
  call_start: string | Date;
  call_end: string | Date;
  duration: string;
  transcript: string | null;
  success_flag: boolean | null;
  cost: number;
  created_at: string | Date;
}

// Get all calls from the database
export async function getAllCalls(): Promise<CallData[]> {
  try {
    const { rows } = await sql<DBCallRow>`
      SELECT * FROM calls 
      ORDER BY call_start DESC
    `;
    
    return rows.map((row: DBCallRow) => ({
      ...row,
      call_start: new Date(row.call_start),
      call_end: new Date(row.call_end)
    })) as CallData[];
  } catch (error) {
    console.error('Error fetching calls:', error);
    return [];
  }
}

// For backward compatibility
export async function fetchWebhookData(): Promise<CallData[]> {
  return getAllCalls();
}

// Calculate duration between two dates in "Xm Ys" format
export function calculateDuration(startTime: string | Date, endTime: string | Date): string {
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    // Handle invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error('Invalid date in calculateDuration:', { startTime, endTime })
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
