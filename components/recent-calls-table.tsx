"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { formatDistanceToNow } from "date-fns"
import { type CallData } from "@/lib/webhook-service"

// Helper function to format duration (handles both string and number types)
function formatDuration(duration: string | number): string {
  if (typeof duration === 'number') {
    // Convert seconds to "Xm Ys" format
    const minutes = Math.floor(duration / 60)
    const seconds = Math.floor(duration % 60)
    return `${minutes}m ${seconds}s`
  }
  
  // If it's already a string, return as is
  return duration
}

interface RecentCallsTableProps {
  callData: CallData[]
}

export function RecentCallsTable({ callData }: RecentCallsTableProps) {
  // Only use real webhook data, no fallback
  const recentCalls = callData.slice(0, 10).map(call => ({
    id: call.id,
    caller_name: call.caller_name,
    phone: call.phone,
    duration: call.duration,
    cost: call.cost || 0, // Ensure cost is always a number
    timestamp: new Date(call.call_start),
    transcript: call.transcript,
    success: call.success_flag,
  }))

  if (recentCalls.length === 0) {
    return (
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50">
              <TableHead className="min-w-[100px]">Caller</TableHead>
              <TableHead className="min-w-[80px] hidden sm:table-cell">Duration</TableHead>
              <TableHead className="min-w-[100px]">Time</TableHead>
              <TableHead className="min-w-[150px]">Summary</TableHead>
              <TableHead className="min-w-[80px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No call data available. Waiting for webhook data...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50">
            <TableHead className="min-w-[100px]">Caller</TableHead>
            <TableHead className="min-w-[80px] hidden sm:table-cell">Duration</TableHead>
            <TableHead className="min-w-[100px]">Time</TableHead>
            <TableHead className="min-w-[150px]">Summary</TableHead>
            <TableHead className="min-w-[80px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentCalls.map((call) => (
            <TableRow
              key={call.id}
              className="hover:bg-gradient-to-r hover:from-purple-25 hover:via-pink-25 hover:to-blue-25"
            >
              <TableCell className="font-medium">{call.caller_name}</TableCell>
              <TableCell className="hidden sm:table-cell">{formatDuration(call.duration)}</TableCell>
              <TableCell className="text-sm">{formatDistanceToNow(call.timestamp, { addSuffix: true })}</TableCell>
              <TableCell className="max-w-[200px] sm:max-w-[300px]">
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="truncate cursor-pointer text-blue-600 hover:text-blue-800 hover:underline">
                      {call.transcript}
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto mx-4">
                    <DialogHeader>
                      <DialogTitle>Call Summary</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <strong>Caller:</strong> {call.caller_name || 'Unknown'}
                        </div>
                        <div>
                          <strong>Duration:</strong> {formatDuration(call.duration)}
                        </div>
                        <div>
                          <strong>Cost:</strong> ₹{call.cost.toFixed(4)}
                        </div>
                        <div>
                          <strong>Time:</strong> {call.timestamp.toLocaleString()}
                        </div>
                        <div>
                          <strong>Status:</strong> {call.success ? '✅ Success' : '❌ Failed'}
                        </div>
                        <div className="sm:col-span-2">
                          <strong>Phone:</strong> {call.phone || 'N/A'}
                        </div>
                        <div className="sm:col-span-2">
                          <strong>Transcript:</strong>
                          <div className="mt-2 p-3 bg-gray-50 rounded-md">
                            {call.transcript || 'No transcript available'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <strong>Full Summary:</strong>
                        <div className="mt-2 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-sm">
                          {call.transcript}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    call.success === true
                      ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200"
                      : call.success === false
                      ? "bg-gradient-to-r from-red-100 to-rose-100 text-red-800 border border-red-200"
                      : "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 border border-orange-200"
                  }`}
                >
                  {call.success === true ? "Success" : call.success === false ? "Failed" : "Incomplete"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
