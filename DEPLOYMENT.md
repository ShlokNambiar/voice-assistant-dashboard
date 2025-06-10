# 🚀 Deployment Guide - Voice Assistant Dashboard

## Step 1: Deploy to Vercel (Free)

### Option A: Deploy via GitHub (Recommended)

1. **Create GitHub Repository**
   ```bash
   # Initialize git in your project folder
   git init
   git add .
   git commit -m "Initial commit - Voice Assistant Dashboard"
   ```

2. **Push to GitHub**
   - Go to [GitHub.com](https://github.com) and create a new repository
   - Name it: `voice-assistant-dashboard`
   - Copy the commands GitHub provides and run them:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/voice-assistant-dashboard.git
   git branch -M main
   git push -u origin main
   ```

3. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with your GitHub account
   - Click "New Project"
   - Import your `voice-assistant-dashboard` repository
   - Click "Deploy" (Vercel will auto-detect Next.js)

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login and Deploy**
   ```bash
   vercel login
   vercel --prod
   ```

## Step 2: Get Your Deployment URL

After deployment, Vercel will give you a URL like:
```
https://voice-assistant-dashboard-abc123.vercel.app
```

**Your webhook endpoint will be:**
```
https://voice-assistant-dashboard-abc123.vercel.app/api/webhook
```

## Step 3: Configure Make.com Webhook

### Current Setup (What you have now):
- **Webhook URL**: `https://hook.eu2.make.com/xr96mpnk747rzostpd736mxcm87axq7l`
- **Type**: Outgoing webhook (Make.com receives data)

### What we need to change:
- **Target URL**: Your Vercel app webhook endpoint
- **Method**: POST
- **Content-Type**: application/json

### Steps to Update Make.com:

1. **Open your Make.com scenario**
   - Go to [make.com](https://make.com)
   - Open the scenario that currently uses the webhook

2. **Find the Webhook Module**
   - Look for the module that has the URL `https://hook.eu2.make.com/xr96mpnk747rzostpd736mxcm87axq7l`

3. **Replace with HTTP Module**
   - Delete the current webhook module
   - Add a new "HTTP" > "Make a request" module
   - Configure it as follows:

   **HTTP Module Settings:**
   ```
   URL: https://your-vercel-app.vercel.app/api/webhook
   Method: POST
   Headers:
     Content-Type: application/json
   Body Type: Raw
   Content Type: JSON (application/json)
   ```

4. **Map the Data**
   In the Body field, map your call data:
   ```json
   {
     "id": "{{call_id}}",
     "phone": "{{phone_number}}",
     "message": {
       "startedAt": "{{call_start_time}}",
       "endedAt": "{{call_end_time}}",
       "summary": "{{call_transcript}}",
       "cost": {{call_cost}},
       "analysis": {
         "structuredData": {
           "name": "{{caller_name}}"
         },
         "successEvaluation": {{success_flag}}
       }
     }
   }
   ```

## Step 4: Test the Integration

1. **Test Webhook Endpoint**
   ```bash
   curl -X POST https://your-vercel-app.vercel.app/api/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "id": "test_call",
       "phone": "+91 98765 43210",
       "message": {
         "startedAt": "2024-01-01T10:00:00Z",
         "endedAt": "2024-01-01T10:02:30Z",
         "summary": "Test call",
         "cost": 100,
         "analysis": {
           "structuredData": {
             "name": "Test User"
           },
           "successEvaluation": true
         }
       }
     }'
   ```

2. **Check Dashboard**
   - Visit: `https://your-vercel-app.vercel.app`
   - Should show the test call data

3. **Test Make.com Scenario**
   - Run your Make.com scenario
   - Check if data appears in the dashboard

## Step 5: Monitor and Debug

### Check Vercel Logs:
- Go to your Vercel dashboard
- Click on your project
- Go to "Functions" tab
- Check logs for `/api/webhook`

### Common Issues:
- **CORS errors**: Already handled in `vercel.json`
- **Timeout**: Webhook has 10-second timeout
- **Data format**: Ensure JSON matches expected structure

## Environment Variables (if needed)

If you need to add environment variables:
1. Go to Vercel dashboard
2. Project Settings > Environment Variables
3. Add any required variables

## Custom Domain (Optional)

To use a custom domain:
1. Go to Vercel dashboard
2. Project Settings > Domains
3. Add your custom domain
4. Update Make.com webhook URL accordingly

## Success Checklist

- ✅ App deployed to Vercel
- ✅ Webhook endpoint accessible
- ✅ Make.com configured to POST to your app
- ✅ Test data flowing through
- ✅ Dashboard showing real-time updates
- ✅ ₹5,000 balance tracking working
