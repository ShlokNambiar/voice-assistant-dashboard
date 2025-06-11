import { Suspense } from 'react'
import Dashboard from "@/components/dashboard-fixed"

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    }>
      <Dashboard />
    </Suspense>
  )
}
