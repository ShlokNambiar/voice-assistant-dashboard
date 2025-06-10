// Test script for deployed webhook on Vercel
// Usage: node test-deployed-webhook.js YOUR_VERCEL_URL

const VERCEL_URL = process.argv[2]

if (!VERCEL_URL) {
  console.log('❌ Please provide your Vercel URL')
  console.log('Usage: node test-deployed-webhook.js https://your-app.vercel.app')
  process.exit(1)
}

const WEBHOOK_ENDPOINT = `${VERCEL_URL}/api/webhook`

// Test data in Make.com format
const testCallData = {
  id: "test_call_" + Date.now(),
  phone: "+91 98765 43210",
  message: {
    startedAt: new Date(Date.now() - 150000).toISOString(), // 2.5 minutes ago
    endedAt: new Date(Date.now() - 30000).toISOString(),    // 30 seconds ago
    summary: "Customer called to book a table for 4 people tonight. Reservation confirmed for 7 PM.",
    cost: 125.75,
    analysis: {
      structuredData: {
        name: "Rajesh Kumar"
      },
      successEvaluation: true
    }
  }
}

async function testDeployedWebhook() {
  console.log(`🚀 Testing Deployed Webhook`)
  console.log(`=`.repeat(50))
  console.log(`🌐 Vercel URL: ${VERCEL_URL}`)
  console.log(`📡 Webhook Endpoint: ${WEBHOOK_ENDPOINT}`)
  
  try {
    console.log(`\n📤 Sending test webhook data...`)
    
    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCallData)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    console.log(`✅ Webhook data sent successfully!`)
    console.log(`📊 Response:`, result)
    
    // Wait a moment then check stored data
    console.log(`\n⏳ Waiting 2 seconds...`)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log(`📥 Checking stored data...`)
    const getResponse = await fetch(WEBHOOK_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!getResponse.ok) {
      throw new Error(`HTTP error! status: ${getResponse.status}`)
    }

    const storedData = await getResponse.json()
    console.log(`✅ Retrieved ${storedData.length} stored calls`)
    
    if (storedData.length > 0) {
      const latestCall = storedData[storedData.length - 1]
      console.log(`\n📋 Latest call:`)
      console.log(`   ID: ${latestCall.id}`)
      console.log(`   Phone: ${latestCall.phone}`)
      console.log(`   Received: ${latestCall.received_at}`)
    }
    
    console.log(`\n✨ Test completed successfully!`)
    console.log(`🌐 Check your dashboard: ${VERCEL_URL}`)
    console.log(`📊 Expected to see:`)
    console.log(`   - 1+ total calls`)
    console.log(`   - Updated balance (₹5,000 - call costs)`)
    console.log(`   - Recent calls table with test data`)
    console.log(`   - Charts with real data`)
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`)
    console.log(`\n🔧 Troubleshooting:`)
    console.log(`   1. Check if ${VERCEL_URL} is accessible`)
    console.log(`   2. Verify deployment was successful`)
    console.log(`   3. Check Vercel function logs`)
    console.log(`   4. Ensure webhook endpoint is working`)
  }
}

// Run the test
testDeployedWebhook().catch(console.error)
