"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDistanceToNow } from "date-fns"
import { type CallData } from "@/lib/webhook-service"

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
    timestamp: new Date(call.call_start),
    transcript: call.transcript,
    success: call.success_flag,
  }))

  if (recentCalls.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50">
              <TableHead>Caller</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Transcript</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No call data available. Waiting for webhook data...
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50">
            <TableHead>Caller</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Transcript</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentCalls.map((call) => (
            <TableRow
              key={call.id}
              className="hover:bg-gradient-to-r hover:from-purple-25 hover:via-pink-25 hover:to-blue-25"
            >
              <TableCell className="font-medium">{call.caller_name}</TableCell>
              <TableCell>{call.phone}</TableCell>
              <TableCell>{call.duration}</TableCell>
              <TableCell>{formatDistanceToNow(call.timestamp, { addSuffix: true })}</TableCell>
              <TableCell className="max-w-[200px]">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="truncate">{call.transcript}</div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[300px]">
                      <p>{call.transcript}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    call.success
                      ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200"
                      : "bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-800 border border-orange-200"
                  }`}
                >
                  {call.success ? "Success" : "Incomplete"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
