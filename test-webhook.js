// Test webhook endpoint with sample data
const fetch = require('node-fetch');

const WEBHOOK_URL = 'http://localhost:3000/api/webhook';

// Sample webhook payload
const testPayload = {
  id: `test_${Date.now()}`,
  caller_name: 'Test User',
  phone: '+1234567890',
  call_start: new Date().toISOString(),
  call_end: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes later
  duration: '5m 0s',
  transcript: 'This is a test call',
  success_flag: true,
  cost: 2.50
};

async function testWebhook() {
  console.log('Sending test webhook payload:');
  console.log(JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    const responseData = await response.json();
    
    console.log('\nResponse status:', response.status);
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    
    if (!response.ok) {
      console.error('Error:', responseData.error || 'Unknown error');
    } else {
      console.log('✅ Webhook test successful!');
    }
  } catch (error) {
    console.error('Error sending webhook:', error);
  }
}

testWebhook();
