# CRON Job Setup - Step-by-Step Guide

## Overview

This guide will walk you through setting up an external CRON job to keep your Render Worker alive and prevent cold starts. We'll use **cron-job.org** as it's free, reliable, and easy to configure.

## Why This Matters

- **Problem:** Render's free tier puts services to sleep after 15 minutes of inactivity
- **Impact:** First request after sleep takes 30-60 seconds (bad user experience)
- **Solution:** Ping the worker every 10 minutes to keep it awake
- **Result:** All requests respond in <5 seconds

## Your Worker Details

- **Worker URL:** `https://youtube-mp3-worker.onrender.com`
- **Health Endpoint:** `https://youtube-mp3-worker.onrender.com/health`
- **Ping Frequency:** Every 10 minutes
- **Expected Response:** HTTP 200 with JSON health status

---

## Step 1: Create cron-job.org Account

### 1.1 Visit the Website

Go to: **https://cron-job.org**

### 1.2 Sign Up

1. Click the **"Sign up"** button in the top right
2. Fill in the registration form:
   - Email address
   - Password (strong password recommended)
   - Accept terms of service
3. Click **"Create account"**

### 1.3 Verify Email

1. Check your email inbox
2. Click the verification link in the email from cron-job.org
3. You'll be redirected to the login page

### 1.4 Log In

1. Enter your email and password
2. Click **"Sign in"**
3. You should now see the dashboard

---

## Step 2: Create the CRON Job

### 2.1 Start Creating

1. On the dashboard, click the **"Create cronjob"** button
2. You'll see a form with multiple fields

### 2.2 Basic Configuration

Fill in these fields:

**Title:**
```
Keep Render Worker Alive - YouTube MP3
```

**Address (URL):**
```
https://youtube-mp3-worker.onrender.com/health
```

**Request method:**
- Select: **GET**

**Request timeout:**
- Set to: **30 seconds**

### 2.3 Schedule Configuration

You have two options:

#### Option A: Use CRON Expression (Recommended)

1. Click on **"Advanced"** tab
2. Enter this CRON expression:
```
*/10 * * * *
```

This means: "Every 10 minutes, every hour, every day"

#### Option B: Use Visual Editor

1. Stay on **"Simple"** tab
2. Configure:
   - **Minutes:** Select "Every 10 minutes" from dropdown
   - **Hours:** Select "Every hour"
   - **Days:** Select "Every day"
   - **Months:** Select "Every month"
   - **Weekdays:** Select "Every weekday"

### 2.4 Timezone

- Select: **UTC (Coordinated Universal Time)**

### 2.5 Advanced Settings (Optional but Recommended)

Scroll down to find these options:

**Save responses:**
- ✅ Enable this
- Reason: Allows you to see the health check responses

**Notify on failure:**
- ✅ Enable this
- Reason: Get email alerts if the worker goes down

**Notification email:**
- Enter your email address

**Failure threshold:**
- Set to: **3 consecutive failures**
- Reason: Avoid false alarms from temporary network issues

---

## Step 3: Save and Enable

### 3.1 Create the Job

1. Review all settings
2. Click **"Create cronjob"** button at the bottom
3. You should see a success message

### 3.2 Verify It's Enabled

1. You'll be taken to the cronjob details page
2. Check the status toggle at the top
3. Ensure it shows **"Enabled"** (green)
4. If it's disabled, click the toggle to enable it

---

## Step 4: Verify Setup

### 4.1 Wait for First Execution

- The first execution will happen within 10 minutes
- You can see the next scheduled time on the job details page

### 4.2 Check Execution History

After 10 minutes:

1. Go to your cronjob details page
2. Click on **"Execution history"** tab
3. You should see an entry with:
   - **Status:** Succeeded
   - **HTTP Status:** 200
   - **Response time:** ~100-500ms

### 4.3 View Response

1. Click on an execution entry
2. You should see the response body:
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": 1698765432000,
  "queueSize": 0
}
```

### 4.4 Check Render Logs

1. Go to **https://dashboard.render.com**
2. Select your **youtube-mp3-worker** service
3. Click **"Logs"** tab
4. You should see entries like:
```
GET /health 200 - 15ms
GET /health 200 - 12ms
```

---

## Step 5: Test Cold Start Prevention

### 5.1 Wait 20 Minutes

- Don't make any manual requests to the worker
- Let the CRON job do its work

### 5.2 Make a Test Request

After 20 minutes, test the worker:

```bash
curl https://youtube-mp3-worker.onrender.com/health
```

### 5.3 Check Response Time

- **Expected:** Response in <1 second
- **If slow (30-60s):** CRON job is not working correctly

---

## Monitoring and Maintenance

### Daily Checks

✅ **Check CRON job status**
- Go to cron-job.org dashboard
- Verify job is still enabled
- Check for any failed executions

✅ **Check email notifications**
- If you receive failure alerts, investigate immediately

### Weekly Checks

✅ **Review execution statistics**
- Go to cronjob → "Statistics" tab
- Verify ~1,008 executions per week (6 per hour × 24 hours × 7 days)
- Success rate should be >99%

✅ **Check Render Worker uptime**
- Go to Render dashboard
- Verify worker has been running continuously
- Check for any unexpected restarts

### Monthly Checks

✅ **Verify free tier usage**
- Render: Should be ~720 hours/month (within 750 hour limit)
- cron-job.org: Unlimited on free tier

✅ **Review response times**
- Check if health checks are consistently fast
- Investigate if response times increase

---

## Troubleshooting

### Problem: CRON Job Shows "Failed" Status

**Possible Causes:**
1. Render Worker is down
2. Incorrect URL
3. Network timeout

**Solutions:**

1. **Test URL manually:**
```bash
curl https://youtube-mp3-worker.onrender.com/health
```

2. **Check Render Worker status:**
   - Go to Render dashboard
   - Verify service is deployed and running
   - Check logs for errors

3. **Verify URL in CRON job:**
   - Go to cronjob settings
   - Ensure URL is exactly: `https://youtube-mp3-worker.onrender.com/health`
   - No trailing slash, no typos

4. **Increase timeout:**
   - Edit cronjob
   - Set request timeout to 60 seconds
   - Save changes

### Problem: Worker Still Has Cold Starts

**Symptoms:**
- First request after inactivity takes 30-60 seconds

**Solutions:**

1. **Verify CRON job is running:**
   - Check execution history
   - Should see entries every 10 minutes

2. **Check CRON job is enabled:**
   - Go to cronjob details
   - Verify toggle is ON (green)

3. **Reduce ping interval:**
   - Edit cronjob
   - Change schedule to `*/5 * * * *` (every 5 minutes)
   - Note: This doubles the number of requests

4. **Check Render logs:**
   - Verify health checks are being received
   - Look for any errors or warnings

### Problem: Too Many Failed Executions

**Symptoms:**
- Multiple consecutive failures in execution history

**Solutions:**

1. **Check Render Worker health:**
   - Go to Render dashboard
   - Look for deployment errors
   - Check if service is out of memory

2. **Review Render logs:**
   - Look for error messages
   - Check if /health endpoint is working

3. **Temporarily disable notifications:**
   - If getting too many emails
   - Fix the underlying issue first
   - Re-enable notifications after fix

### Problem: CRON Job Account Suspended

**Symptoms:**
- Can't log in to cron-job.org
- Jobs stopped running

**Solutions:**

1. **Contact cron-job.org support:**
   - Email: support@cron-job.org
   - Explain your use case

2. **Use alternative service:**
   - Set up UptimeRobot (see Alternative Options below)
   - Configure with same URL and 5-minute interval

---

## Alternative Options

### Option 1: UptimeRobot

**Pros:**
- Also free
- Provides uptime monitoring dashboard
- 5-minute minimum interval

**Cons:**
- 5-minute interval (vs 10-minute) uses more Render hours
- Limited to 50 monitors on free tier

**Setup:**
1. Go to https://uptimerobot.com
2. Sign up for free account
3. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://youtube-mp3-worker.onrender.com/health`
   - Interval: 5 minutes
4. Save and enable

### Option 2: Koyeb (Alternative to Render)

**Pros:**
- No cold starts (always-on free tier)
- No need for CRON job

**Cons:**
- More complex setup
- Different deployment process

**Note:** Consider if cold starts become a major issue

---

## Configuration Summary

Here's a quick reference for your CRON job configuration:

| Setting | Value |
|---------|-------|
| **Service** | cron-job.org |
| **Job Title** | Keep Render Worker Alive - YouTube MP3 |
| **URL** | https://youtube-mp3-worker.onrender.com/health |
| **Method** | GET |
| **Schedule** | */10 * * * * (every 10 minutes) |
| **Timezone** | UTC |
| **Timeout** | 30 seconds |
| **Save Responses** | Enabled |
| **Notify on Failure** | Enabled |
| **Failure Threshold** | 3 consecutive failures |

---

## Success Checklist

Use this checklist to verify your setup is complete:

- [ ] cron-job.org account created and verified
- [ ] CRON job created with correct URL
- [ ] Schedule set to */10 * * * * (every 10 minutes)
- [ ] Timezone set to UTC
- [ ] Job is enabled (green toggle)
- [ ] First execution completed successfully
- [ ] Execution history shows HTTP 200 responses
- [ ] Render Worker logs show health check requests
- [ ] Email notifications configured
- [ ] Tested cold start prevention (worker responds quickly after 20 minutes)
- [ ] Documented CRON job details in team wiki/docs

---

## Cost Analysis

### CRON Job Service
- **Service:** cron-job.org
- **Cost:** $0/month (free tier)
- **Requests:** ~4,320/month (6 per hour × 24 hours × 30 days)

### Render Worker
- **Uptime:** ~720 hours/month (with 10-minute pings)
- **Free Tier Limit:** 750 hours/month
- **Usage:** 96% of free tier
- **Cost:** $0/month (within free tier)

### Total Monthly Cost
- **$0** (completely free)

---

## Next Steps

After completing this setup:

1. ✅ **Task 26 Complete:** CRON job configured
2. ➡️ **Move to Task 27:** Create project documentation
3. 📊 **Monitor for 24 hours:** Ensure everything works smoothly
4. 📝 **Update team docs:** Share CRON job details with team

---

## Support

If you encounter issues:

1. **Check this guide first:** Most issues are covered in Troubleshooting
2. **Review Render logs:** Often reveals the root cause
3. **Test manually:** Use curl to verify endpoints work
4. **Contact support:**
   - cron-job.org: support@cron-job.org
   - Render: https://render.com/support

---

**Setup Complete! 🎉**

Your Render Worker will now stay awake and respond quickly to all requests. Users will experience fast download times without cold start delays.
