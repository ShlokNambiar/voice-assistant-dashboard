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
  Headphones,
  Search
} from "lucide-react"
import { Input } from "@/components/ui/input"
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

  // Fetch data from database
  const refreshData = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const response = await fetch('/api/webhook')
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      console.log('API Response:', data) // Debug log

      if (!data.success || !Array.isArray(data.data)) {
        throw new Error('Invalid data format received from API')
      }

      const processedCalls = data.data.map((call: any) => ({
        ...call,
        call_start: new Date(call.call_start),
        call_end: call.call_end ? new Date(call.call_end) : null,
        success_flag: call.success_flag ?? null,
        cost: call.cost ?? 0,
      }))

      console.log('Processed calls data:', processedCalls) // Debug log

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
    refreshData()
  }, [])

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50">
      <div className="flex flex-col sm:gap-4 sm:py-4">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <h1 className="text-lg font-semibold">Call Dashboard</h1>
          <div className="relative ml-auto flex-1 md:grow-0">
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground">
                <Search className="h-4 w-4" />
              </span>
              <Input
                type="search"
                placeholder="Search calls..."
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
              />
            </div>
          </div>
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

              <Tabs defaultValue="recent-calls" className="w-full mt-6">
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
            </ErrorBoundary>
          )}
        </main>
      </div>
    </div>
  )
}
