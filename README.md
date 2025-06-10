# Voice Assistant Dashboard

A dynamic Next.js dashboard for tracking voice assistant call analytics with real-time data integration.

## Features

- **Real-time KPI Tracking**: Monitor total calls, average duration, success rate, and more
- **Dynamic Balance Management**: Track remaining balance from ₹5,000 initial amount
- **Interactive Charts**: Visualize calls per day and call duration distribution
- **Recent Calls Table**: View detailed call logs with transcripts and status
- **Auto-refresh**: Data updates every 10 seconds automatically
- **Responsive Design**: Works on desktop and mobile devices

## Data Integration

### Webhook Receiver
- **Webhook Endpoint**: `POST /api/webhook` - Receives data from Make.com
- **Dashboard Data**: Fetches from local storage via `GET /api/webhook`
- **No Fallback**: Dashboard starts with zero data and only displays real webhook data

### Make.com Configuration
Configure your Make.com scenario to send HTTP POST requests to:
```
http://your-domain.com/api/webhook
```
For local development: `http://localhost:3000/api/webhook`

The webhook should send JSON data when call events occur.

### Expected Data Format

The webhook should return a JSON array. The dashboard supports both flat and nested structures:

**Option 1: Flat Structure**
```json
[
  {
    "id": "call_001",
    "caller_name": "John Doe",
    "phone": "+91 98765 43210",
    "call_start": "2024-01-01T10:00:00Z",
    "call_end": "2024-01-01T10:02:30Z",
    "transcript": "I would like to book a table...",
    "success_flag": true,
    "cost": 125.50
  }
]
```

**Option 2: Make.com Nested Structure**
```json
[
  {
    "id": "call_001",
    "phone": "+91 98765 43210",
    "message": {
      "startedAt": "2024-01-01T10:00:00Z",
      "endedAt": "2024-01-01T10:02:30Z",
      "summary": "I would like to book a table...",
      "cost": 125.50,
      "analysis": {
        "structuredData": {
          "name": "John Doe"
        },
        "successEvaluation": true
      }
    }
  }
]
```

### Field Mapping
- **caller_name**: `message.analysis.structuredData.name` or `caller_name`
- **phone**: `phone` (direct field)
- **call_start**: `message.startedAt` or `call_start`
- **call_end**: `message.endedAt` or `call_end`
- **transcript**: `message.summary` or `transcript`
- **cost**: `message.cost` or `cost`
- **success_flag**: `message.analysis.successEvaluation` or `success_flag`

## KPI Calculations

- **Total Calls**: Count of all call records
- **Average Call Duration**: Mean duration across all calls
- **Current Balance**: ₹5,000 - total cost of all calls
- **Average Call Cost**: Total cost divided by number of calls
- **Success Rate**: Percentage of calls with `success_flag: true`
- **Total Reservations**: Count of successful calls

## Getting Started

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Architecture

- **Frontend**: Next.js 15 with React 19
- **UI Components**: shadcn/ui with Radix UI primitives
- **Charts**: Recharts for data visualization
- **Styling**: Tailwind CSS with custom gradients
- **Data Fetching**: Custom webhook service with caching
- **TypeScript**: Full type safety throughout

## File Structure

```
├── app/
│   ├── api/test-webhook/route.ts    # Test data endpoint
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Main page
├── components/
│   ├── dashboard.tsx                # Main dashboard component
│   ├── recent-calls-table.tsx       # Calls table
│   ├── calls-per-day-chart.tsx      # Line chart
│   ├── call-duration-chart.tsx      # Pie chart
│   └── ui/                          # UI components
├── lib/
│   ├── webhook-service.ts           # Data fetching logic
│   └── utils.ts                     # Utilities
```

## Customization

### Webhook URL
Update the `WEBHOOK_URL` constant in `lib/webhook-service.ts`:

```typescript
const WEBHOOK_URL = "your-webhook-url-here"
```

### Initial Balance
Modify the `INITIAL_BALANCE` constant:

```typescript
const INITIAL_BALANCE = 5000 // Change to your desired amount
```

### Refresh Interval
Adjust auto-refresh timing in `components/dashboard.tsx`:

```typescript
const interval = setInterval(refreshData, 2 * 60 * 1000) // 2 minutes
```

## Error Handling

- Clear error messages if webhook fails
- 30-second caching to reduce API calls
- Loading states and error indicators
- Empty states when no data is available
- Retry mechanism on refresh button

## Performance

- Client-side caching prevents excessive API calls
- Optimized re-renders with React hooks
- Responsive design with minimal bundle size
- Progressive loading with skeleton states
