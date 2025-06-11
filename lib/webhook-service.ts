import { sql } from '@vercel/postgres';

export interface CallData {
  id: string
  caller_name: string
  phone: string
  call_start: Date | string
  call_end: Date | string
  duration: string | number // Can be either string (e.g., "2m 30s") or number (seconds)
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
    console.log('💽 Saving call to database:', {
      ...call,
      call_start: new Date(call.call_start).toISOString(),
      call_end: new Date(call.call_end).toISOString()
    });

    const result = await sql`
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
        ${call.transcript || null},
        ${call.success_flag},
        ${call.cost}
      )
      ON CONFLICT (id) DO UPDATE SET
        call_end = EXCLUDED.call_end,
        duration = EXCLUDED.duration,
        transcript = EXCLUDED.transcript,
        success_flag = EXCLUDED.success_flag,
        cost = EXCLUDED.cost
      RETURNING id
    `;

    console.log('💾 Database save result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error in saveCallData:', error);
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

// Format seconds into "Xm Ys" format
function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return '0m 0s'
  }
  
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const hours = Math.floor(mins / 60)
  
  if (hours > 0) {
    return `${hours}h ${mins % 60}m ${secs}s`
  }
  
  return `${mins}m ${secs}s`
}

// Calculate duration between two dates in seconds
function calculateDuration(startTime: string | Date, endTime: string | Date): number {
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  const durationMs = end - start
  
  if (isNaN(durationMs) || durationMs < 0) {
    return 0
  }
  
  return Math.floor(durationMs / 1000)
}

export async function calculateMetrics(data: CallData[]): Promise<DashboardMetrics> {
  const totalCalls = data.length
  const successfulCalls = data.filter(call => call.success_flag).length
  const totalCost = data.reduce((sum, call) => sum + (call.cost || 0), 0)
  
  // Calculate total duration in seconds
  const totalDurationSeconds = data.reduce((total, call) => {
    if (typeof call.duration === 'number') {
      return total + call.duration
    } else if (typeof call.duration === 'string') {
      // Try to parse string duration (e.g., "2m 30s")
      const match = call.duration.match(/(\d+)m\s*(\d*)s?/)
      if (match) {
        const minutes = parseInt(match[1]) || 0
        const seconds = parseInt(match[2]) || 0
        return total + (minutes * 60) + seconds
      }
    }
    return total
  }, 0)
  
  const avgCallDurationSeconds = totalCalls > 0 ? Math.round(totalDurationSeconds / totalCalls) : 0
  const avgCallDuration = formatDuration(avgCallDurationSeconds)
  
  // Format numbers with Indian numbering system
  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount).replace('₹', '₹')
  }

  const currentBalance = INITIAL_BALANCE - totalCost
  const avgCallCostValue = totalCalls > 0 ? (totalCost / totalCalls) : 0
  
  return {
    totalCalls,
    avgCallDuration,
    totalBalance: formatINR(currentBalance),
    avgCallCost: formatINR(avgCallCostValue),
    successRate: totalCalls > 0 ? `${Math.round((successfulCalls / totalCalls) * 100)}%` : '0%',
    totalReservations: data.filter(call => 
      call.transcript?.toLowerCase().includes('reservation')
    ).length,
    lastRefreshed: new Date().toLocaleTimeString()
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
      try {
        const callDate = new Date(call.call_start)
        return callDate.toDateString() === date.toDateString()
      } catch (e) {
        console.error('Error parsing call date:', call.call_start, e)
        return false
      }
    }).length

    return {
      date: dateStr,
      calls: callsOnDate
    }
  })
}

// Function to get call duration distribution data
export function getCallDurationData(data: CallData[]) {
  let shortCalls = 0
  let mediumCalls = 0
  let longCalls = 0

  data.forEach(call => {
    let minutes = 0
    
    if (typeof call.duration === 'number') {
      // Duration is in seconds, convert to minutes
      minutes = call.duration / 60
    } else if (typeof call.duration === 'string') {
      // Parse duration string (e.g., "2m 30s")
      const match = call.duration.match(/(\d+)m\s*(\d*)s?/)
      if (match) {
        minutes = parseInt(match[1]) || 0
        const seconds = parseInt(match[2]) || 0
        minutes += seconds / 60
      }
    }

    if (minutes < 1) {
      shortCalls++
    } else if (minutes <= 3) {
      mediumCalls++
    } else {
      longCalls++
    }
  })

  return [
    { name: "< 1 min", value: shortCalls, color: "#06B6D4" },
    { name: "1-3 min", value: mediumCalls, color: "#8B5CF6" },
    { name: "> 3 min", value: longCalls, color: "#F59E0B" },
  ]
}
