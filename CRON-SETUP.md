# CRON Job Setup Guide

## Purpose

Configure an external CRON job to ping the Render Worker every 10 minutes, preventing it from going to sleep and ensuring fast response times.

## Why This Is Needed

Render's free tier puts services to sleep after 15 minutes of inactivity. The first request after sleep takes 30-60 seconds to wake up the service. By pinging every 10 minutes, we keep the worker always ready.

## Step-by-Step Setup

### Option 1: cron-job.org (Recommended)

1. **Register Account**
   - Go to https://cron-job.org
   - Click "Sign up" (free account)
   - Verify your email

2. **Create New Cron Job**
   - Click "Create cronjob" button
   - Fill in the form:

   **Title:** Keep Render Worker Alive
   
   **URL:** `https://your-worker-name.onrender.com/health`
   (Replace with your actual Render Worker URL)
   
   **Schedule:**
   - Pattern: `*/10 * * * *` (every 10 minutes)
   - Or use the visual editor:
     - Minutes: Every 10 minutes
     - Hours: Every hour
     - Days: Every day
     - Months: Every month
     - Weekdays: Every weekday
   
   **Timezone:** UTC
   
   **Request Method:** GET
   
   **Request Timeout:** 30 seconds

3. **Advanced Settings (Optional)**
   - Enable "Save responses" to monitor health check results
   - Enable "Notify on failure" to get alerts if worker is down
   - Add your email for notifications

4. **Save and Enable**
   - Click "Create cronjob"
   - Ensure the job is enabled (toggle should be ON)

5. **Verify Setup**
   - Wait 10 minutes for first execution
   - Check "Execution history" tab
   - Should see successful responses (HTTP 200)

### Option 2: UptimeRobot

1. **Register Account**
   - Go to https://uptimerobot.com
   - Sign up for free account (50 monitors included)

2. **Add New Monitor**
   - Click "+ Add New Monitor"
   - Monitor Type: HTTP(s)
   - Friendly Name: Render Worker Health
   - URL: `https://your-worker-name.onrender.com/health`
   - Monitoring Interval: 5 minutes (minimum on free tier)

3. **Configure Alerts**
   - Add email alert contact
   - Enable notifications for down events

4. **Save Monitor**
   - Click "Create Monitor"
   - Monitor will start immediately

### Option 3: EasyCron

1. **Register Account**
   - Go to https://www.easycron.com
   - Sign up for free account

2. **Create Cron Job**
   - Click "Add Cron Job"
   - URL: `https://your-worker-name.onrender.com/health`
   - Cron Expression: `*/10 * * * *`
   - Timezone: UTC
   - HTTP Method: GET

3. **Enable and Test**
   - Save the cron job
   - Click "Run Now" to test
   - Verify response is successful

## Verification

### Check CRON Job Execution

**cron-job.org:**
- Go to "Cronjobs" → Your job → "Execution history"
- Should see entries every 10 minutes
- Status should be "Succeeded" (HTTP 200)

**UptimeRobot:**
- Go to Dashboard
- Check monitor status (should be "Up")
- View response time graph

### Check Render Worker Logs

1. Go to Render Dashboard
2. Select your worker service
3. Click "Logs" tab
4. Should see health check requests every 10 minutes:
   ```
   GET /health 200 - 15ms
   GET /health 200 - 12ms
   GET /health 200 - 14ms
   ```

### Verify No Cold Starts

1. Wait 20 minutes without making any requests
2. Make a download request
3. Should respond quickly (not 30-60 second delay)
4. If fast response, CRON is working correctly

## Expected Health Check Response

```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": 1698765432000,
  "queueSize": 0
}
```

## Monitoring

### Daily Checks
- Verify CRON job is still enabled
- Check execution history for failures
- Monitor Render Worker uptime

### Weekly Checks
- Review CRON job execution statistics
- Check for any patterns in failures
- Verify worker response times are consistent

### Monthly Checks
- Confirm CRON service account is active
- Review Render Worker usage (should be ~720 hours/month)
- Ensure still within free tier limits

## Troubleshooting

### CRON Job Failing

**Symptom:** Execution history shows failures

**Solutions:**
1. Verify Render Worker URL is correct
2. Check if Render Worker is deployed and running
3. Test URL manually in browser
4. Check Render Worker logs for errors
5. Verify /health endpoint is implemented

### Worker Still Sleeping

**Symptom:** First request after inactivity is slow

**Solutions:**
1. Verify CRON job is enabled
2. Check execution history - should run every 10 minutes
3. Reduce interval to 5 minutes if possible
4. Check Render logs to confirm pings are received

### Too Many Requests

**Symptom:** Approaching Render's free tier limit (750 hours/month)

**Solutions:**
1. CRON every 10 minutes = 720 hours/month (within limit)
2. Don't reduce interval below 10 minutes
3. Monitor usage in Render dashboard

### CRON Service Down

**Symptom:** No executions in history

**Solutions:**
1. Check if CRON service is experiencing outages
2. Have backup CRON service configured
3. Temporarily accept cold starts until service recovers

## Cost Analysis

### cron-job.org
- Free tier: Unlimited jobs, 1-minute minimum interval
- Cost: $0/month

### UptimeRobot
- Free tier: 50 monitors, 5-minute minimum interval
- Cost: $0/month

### Render Worker Usage
- CRON pings: 6 per hour × 24 hours × 30 days = 4,320 requests/month
- Uptime: ~720 hours/month (with 10-minute pings)
- Free tier: 750 hours/month
- Cost: $0/month (within free tier)

## Best Practices

1. **Use Multiple Services:** Configure both cron-job.org and UptimeRobot for redundancy
2. **Enable Notifications:** Get alerted if worker goes down
3. **Monitor Regularly:** Check execution history weekly
4. **Document URL:** Keep Render Worker URL in secure location
5. **Test After Changes:** Verify CRON still works after redeploying worker

## Configuration Checklist

- [ ] CRON service account created
- [ ] CRON job configured with correct URL
- [ ] Schedule set to */10 * * * * (every 10 minutes)
- [ ] Timezone set to UTC
- [ ] Job enabled and running
- [ ] First execution verified in history
- [ ] Render Worker logs show health checks
- [ ] Email notifications configured
- [ ] Backup CRON service configured (optional)
- [ ] Documentation updated with CRON details

## Maintenance

### When Render Worker URL Changes
1. Update CRON job URL
2. Test new URL manually
3. Verify CRON executes successfully
4. Update documentation

### When Migrating to Paid Tier
1. CRON job can remain the same
2. Consider reducing interval to 5 minutes for even better uptime
3. Monitor costs vs. benefits

---

**Setup Complete!** Your Render Worker will now stay awake and respond quickly to all requests. 🎉
