"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  Clock, 
  Phone, 
  BarChart3, 
  Calendar, 
  CheckCircle, 
  RefreshCw, 
  IndianRupee,
  LineChart, 
  PieChart,
  AlertCircle,
  Headphones
} from "lucide-react"
import { RecentCallsTable } from "./recent-calls-table"
import { CallsPerDayChart } from "./calls-per-day-chart"
import { CallDurationChart } from "./call-duration-chart"
import { ErrorBoundary } from "./error-boundary"
import { fetchWebhookData, calculateMetrics, type CallData, type DashboardMetrics } from "@/lib/webhook-service"

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCalls: 0,
    avgCallDuration: "0m 0s",
    totalBalance: "₹5,000.00",
    avgCallCost: "₹0.00",
    successRate: "0%",
    totalReservations: 0,
    lastRefreshed: new Date().toLocaleTimeString(),
  })
  const [callData, setCallData] = useState<CallData[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditingBalance, setIsEditingBalance] = useState(false)

  // Fetch data from database
  const refreshData = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const response = await fetch('/api/webhook')
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', errorText)
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('API Response:', data) // Debug log
      
      // If data is an array, use it directly, otherwise use data.data if it exists
      let callsData: CallData[] = []
      
      if (Array.isArray(data)) {
        callsData = data
      } else if (data && Array.isArray(data.data)) {
        callsData = data.data
      } else if (data && typeof data === 'object') {
        // Try to find an array in the response object
        const possibleData = Object.values(data).find(Array.isArray)
        if (possibleData && Array.isArray(possibleData)) {
          callsData = possibleData
        }
      }
      
      console.log('Processed calls data:', callsData) // Debug log
      
      // Process each call to ensure data consistency
      const processedCalls = callsData.map(call => ({
        ...call,
        // Ensure success_flag is a boolean
        success_flag: call.success_flag !== undefined ? Boolean(call.success_flag) : false,
        // Ensure cost is a number
        cost: typeof call.cost === 'string' ? parseFloat(call.cost) : (call.cost || 0),
        // Ensure duration is a number (in seconds)
        duration: typeof call.duration === 'string' ? 
          (() => {
            const match = call.duration.match(/(\d+)m\s*(\d*)s?/)
            if (match) {
              const minutes = parseInt(match[1]) || 0
              const seconds = parseInt(match[2]) || 0
              return (minutes * 60) + seconds
            }
            return 0
          })() : 
          (typeof call.duration === 'number' ? call.duration : 0)
      }))
      
      const calculatedMetrics = await calculateMetrics(processedCalls)
      console.log('Calculated metrics:', calculatedMetrics) // Debug log

      setCallData(processedCalls)
      setMetrics(calculatedMetrics)
    } catch (err) {
      setError('Failed to fetch data. Please try again.')
      console.error('Error fetching data:', err)
    } finally {
      setIsRefreshing(false)
      setIsInitialLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      await refreshData()
      setIsInitialLoading(false)
    }
    loadInitialData()
    
    // Set up auto-refresh every 10 seconds
    const interval = setInterval(refreshData, 10 * 1000)
    return () => clearInterval(interval)
  }, [])



  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100">
      <div className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-gradient-to-r from-white/90 via-purple-50/80 to-blue-50/80 px-4 sm:px-6 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Headphones className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg sm:text-xl font-semibold">Voice Assistant Dashboard</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            {error && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-red-600 bg-red-50 px-2 sm:px-3 py-1 rounded-md border border-red-200">
                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Webhook Error: {error}</span>
                <span className="sm:hidden">Error</span>
              </div>
            )}
            <div className="text-xs sm:text-sm text-muted-foreground hidden md:block">Last updated: {metrics.lastRefreshed}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
              className="border-primary/20 hover:bg-gradient-to-r hover:from-purple-100 hover:to-blue-100 hover:text-purple-700"
            >
              <RefreshCw className={`mr-0 sm:mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6 md:gap-8 md:p-8">
          {isInitialLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading dashboard data...</p>
              </div>
            </div>
          ) : (
            <ErrorBoundary fallback={
              <div className="p-4 bg-red-50 border border-red-200 rounded-md m-4">
                <h3 className="text-red-800 font-medium">Error loading dashboard</h3>
                <p className="text-red-700 text-sm mt-1">
                  Please refresh the page or try again later.
                </p>
              </div>
            }>
              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="gradient-card purple overflow-hidden shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Calls Made</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalCalls}</div>
                <p className="text-xs text-muted-foreground">All calls tracked by the system</p>
              </CardContent>
            </Card>

            <Card className="gradient-card blue overflow-hidden shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Average Call Duration</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-dashboard-blue/10">
                  <Clock className="h-4 w-4 text-dashboard-blue" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.avgCallDuration}</div>
                <p className="text-xs text-muted-foreground">Average time from call start to end</p>
              </CardContent>
            </Card>

            <Card className="gradient-card green overflow-hidden shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-dashboard-green/10">
                  <IndianRupee className="h-4 w-4 text-dashboard-green" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalBalance}</div>
                <p className="text-xs text-muted-foreground">
                  Remaining from ₹5,000.00 initial balance
                </p>
              </CardContent>
            </Card>

            <Card className="gradient-card pink overflow-hidden shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Average Call Cost</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-dashboard-pink/10">
                  <BarChart3 className="h-4 w-4 text-dashboard-pink" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.avgCallCost}</div>
                <p className="text-xs text-muted-foreground">Sum of costs divided by total calls</p>
              </CardContent>
            </Card>

            <Card className="gradient-card orange overflow-hidden shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-dashboard-orange/10">
                  <CheckCircle className="h-4 w-4 text-dashboard-orange" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.successRate}</div>
                <p className="text-xs text-muted-foreground">Percentage of successful calls</p>
              </CardContent>
            </Card>

            <Card className="gradient-card teal overflow-hidden shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Reservations</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-dashboard-teal/10">
                  <Calendar className="h-4 w-4 text-dashboard-teal" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalReservations}</div>
                <p className="text-xs text-muted-foreground">Number of successful bookings</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="recent-calls" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-gradient-to-r from-purple-50 to-blue-50">
              <TabsTrigger value="recent-calls" className="text-sm">Recent Calls</TabsTrigger>
              <TabsTrigger value="analytics" className="text-sm">Analytics</TabsTrigger>
            </TabsList>
            <TabsContent value="recent-calls" className="border-none p-0 pt-6">
              <Card className="shadow-md">
                <CardHeader className="bg-gradient-to-r from-purple-100 via-pink-50 to-blue-100">
                  <CardTitle>Last 10 Calls</CardTitle>
                </CardHeader>
                <CardContent>
                  <RecentCallsTable callData={callData} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="analytics" className="border-none p-0 pt-6">
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                <Card className="shadow-md overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-100 via-cyan-50 to-teal-100 flex flex-row items-center justify-between">
                    <CardTitle>Calls Per Day</CardTitle>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                      <LineChart className="h-4 w-4 text-blue-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 px-0 pb-0">
                    <CallsPerDayChart callData={callData} />
                  </CardContent>
                </Card>
                <Card className="shadow-md overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-purple-100 via-pink-50 to-indigo-100 flex flex-row items-center justify-between">
                    <CardTitle>Call Duration Distribution</CardTitle>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
                      <PieChart className="h-4 w-4 text-purple-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <CallDurationChart callData={callData} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
            </div>
          </ErrorBoundary>
          )}
        </main>
      </div>
    </div>
  )
}
        </main>
      </div>
    </div>
  )
}
