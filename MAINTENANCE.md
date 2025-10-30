# Maintenance and Monitoring Guide

## Overview

This guide covers daily, weekly, and monthly maintenance tasks to keep the YouTube MP3 Downloader running smoothly and within free tier limits.

## 📅 Daily Tasks (5 minutes)

### 1. Check System Health

**Action:** Visit health endpoint
```bash
curl https://your-app.vercel.app/api/health
```

**What to Check:**
- ✅ All services show "healthy" status
- ✅ Redis connection is working
- ✅ Render Worker is responding
- ✅ No API quotas above 90%

**Red Flags:**
- ❌ Any service shows "down" or "degraded"
- ❌ Render Worker consecutive failures > 3
- ❌ Any API quota > 90%

### 2. Review Error Logs

**Vercel Logs:**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Logs" tab
4. Filter by "Errors" (last 24 hours)

**What to Look For:**
- Unusual error spikes
- Repeated errors from same endpoint
- 500 errors (server issues)
- 429 errors (rate limiting)

**Render Logs:**
1. Go to https://dashboard.render.com
2. Select youtube-mp3-worker
3. Click "Logs" tab
4. Look for ERROR or WARN messages

**What to Look For:**
- yt-dlp failures
- Memory issues
- Timeout errors
- Connection errors

### 3. Verify CRON Job

**Action:** Check cron-job.org execution history

1. Log in to https://cron-job.org
2. Go to your "Keep Render Worker Alive" job
3. Check "Execution history" tab

**What to Check:**
- ✅ Last execution was within 10 minutes
- ✅ Status is "Succeeded" (HTTP 200)
- ✅ Response time < 1 second

**Red Flags:**
- ❌ No executions in last 30 minutes
- ❌ Multiple consecutive failures
- ❌ Response time > 5 seconds

### 4. Check API Quotas

**Action:** Review quota usage in health endpoint response

```bash
curl https://your-app.vercel.app/api/health | jq '.data.services.rapidapi.quotas'
```

**What to Check:**
- API 1 (monthly): < 240/300 (80%)
- API 2 (monthly): < 240/300 (80%)
- API 3 (daily): < 400/500 (80%)

**Actions:**
- If any quota > 80%: Monitor more frequently
- If any quota > 90%: Prepare for fallback to Stable Track
- If all quotas > 90%: Consider upgrading or reducing usage

---

## 📊 Weekly Tasks (15 minutes)

### 1. Review Usage Statistics

**Vercel Analytics:**
1. Go to Vercel dashboard → Your project → Analytics
2. Review:
   - Total function invocations
   - Bandwidth usage
   - Error rate
   - Response times

**Target Metrics:**
- Function invocations: < 100K/week
- Bandwidth: < 10GB/week
- Error rate: < 3%
- P95 response time: < 10s

**Render Metrics:**
1. Go to Render dashboard → Your service → Metrics
2. Review:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

**Target Metrics:**
- CPU: < 50% average
- Memory: < 400MB
- Uptime: > 99%
- Response time: < 2s average

### 2. Check Download Success Rate

**Action:** Review logs for download outcomes

**Calculate Success Rate:**
```
Success Rate = (Successful Downloads / Total Attempts) × 100%
```

**Target:** > 95%

**If Below Target:**
- Check which track is failing (Fast or Stable)
- Review error messages
- Test manually with failing videos
- Check if specific API is causing issues

### 3. Review CRON Job Statistics

**Action:** Check weekly execution summary

1. Go to cron-job.org → Your job → Statistics
2. Review:
   - Total executions (should be ~1,008/week)
   - Success rate (should be > 99%)
   - Average response time

**Red Flags:**
- Success rate < 95%
- Average response time > 2s
- Missing executions

### 4. Test End-to-End Flow

**Action:** Manually test both tracks

**Fast Track Test:**
```bash
# Should complete in 3-5 seconds
curl "https://your-app.vercel.app/api/download?url=https://youtu.be/dQw4w9WgXcQ"
```

**Stable Track Test:**
1. Temporarily disable all RapidAPI keys
2. Try download (should create async task)
3. Poll task status until complete
4. Re-enable RapidAPI keys

**What to Verify:**
- ✅ Fast Track returns direct download URL
- ✅ Stable Track creates task and processes successfully
- ✅ Download history saves correctly
- ✅ UI displays correctly on mobile and desktop

### 5. Update Dependencies (if needed)

**Check for Updates:**
```bash
npm outdated
cd worker && npm outdated
```

**Update Strategy:**
- Patch updates: Apply immediately
- Minor updates: Test in development first
- Major updates: Review changelog, test thoroughly

---

## 📆 Monthly Tasks (30 minutes)

### 1. Review Cost and Usage

**Vercel:**
- Go to Settings → Usage
- Verify: < 100GB bandwidth, < 1M function calls
- Cost: $0 (within free tier)

**Render:**
- Go to Account → Usage
- Verify: < 750 hours/month
- Cost: $0 (within free tier)

**RapidAPI:**
- Go to My Apps → Your App → Analytics
- Verify total usage across all 3 APIs
- API 1: < 300/month
- API 2: < 300/month
- API 3: < 15,000/month (500/day × 30 days)
- Cost: $0 (within free tier)

**Upstash Redis:**
- Go to Dashboard → Your database → Metrics
- Verify: < 300K requests/month
- Storage: < 256MB
- Cost: $0 (within free tier)

**Cloudflare R2:**
- Go to R2 → Your bucket → Metrics
- Verify: < 10GB storage, < 10M reads/month
- Cost: $0 (within free tier)

**Total Monthly Cost:** $0

### 2. Security Audit

**Check Environment Variables:**
- Verify no API keys in Git history
- Rotate RapidAPI key if suspicious activity
- Update Redis token if needed

**Review Access Logs:**
- Check for unusual IP patterns
- Look for potential abuse
- Verify rate limiting is working

**Update Dependencies:**
```bash
npm audit
npm audit fix
cd worker && npm audit && npm audit fix
```

### 3. Performance Optimization

**Analyze Slow Requests:**
1. Review Vercel logs for requests > 10s
2. Identify bottlenecks
3. Optimize if needed

**Check Redis Performance:**
- Review connection times
- Check for slow queries
- Optimize data structures if needed

**Worker Optimization:**
- Check for memory leaks
- Review task queue efficiency
- Optimize yt-dlp parameters if needed

### 4. Backup Configuration

**What to Backup:**
- Environment variables (store securely)
- CRON job configuration
- Deployment settings
- API keys and tokens

**Where to Store:**
- Secure password manager (1Password, LastPass)
- Encrypted file in private repository
- Team documentation (encrypted)

### 5. Documentation Update

**Review and Update:**
- README.md (if features changed)
- API-DOCUMENTATION.md (if endpoints changed)
- DEPLOYMENT.md (if process changed)
- This MAINTENANCE.md (if tasks changed)

**Check for:**
- Outdated information
- Broken links
- Missing sections
- New features to document

---

## 🚨 Incident Response

### Critical Issues (Respond Immediately)

#### 1. All Services Down

**Symptoms:**
- Health endpoint returns 503
- No downloads working
- Users reporting errors

**Diagnosis:**
```bash
# Check each service
curl https://your-app.vercel.app/api/health
curl https://youtube-mp3-worker.onrender.com/health
```

**Actions:**
1. Check Vercel status: https://www.vercel-status.com
2. Check Render status: https://status.render.com
3. Check Upstash status: https://status.upstash.com
4. Review recent deployments (rollback if needed)
5. Check environment variables
6. Review error logs

#### 2. Render Worker Down

**Symptoms:**
- Fast Track works
- Stable Track fails
- Worker health check fails

**Actions:**
1. Check Render dashboard for errors
2. Review worker logs
3. Restart service if needed
4. Check CRON job is running
5. Verify environment variables

#### 3. Redis Connection Failed

**Symptoms:**
- Task status queries fail
- Quota management broken
- Rate limiting not working

**Actions:**
1. Check Upstash dashboard
2. Verify Redis credentials
3. Test connection manually
4. Check for quota exceeded
5. Restart services if needed

#### 4. All API Quotas Exhausted

**Symptoms:**
- All downloads go to Stable Track
- Health endpoint shows 100% quota usage

**Actions:**
1. Verify quota reset times
2. Check for unusual usage patterns
3. Consider temporary rate limit reduction
4. Monitor Stable Track capacity
5. Plan for quota increase if needed

### Non-Critical Issues (Respond Within 24 Hours)

#### 1. Slow Response Times

**Symptoms:**
- Requests taking > 10 seconds
- Users reporting slowness

**Actions:**
1. Check Vercel function logs
2. Review Render Worker metrics
3. Check Redis latency
4. Optimize slow queries
5. Consider caching improvements

#### 2. Occasional Download Failures

**Symptoms:**
- Success rate 90-95%
- Specific videos failing

**Actions:**
1. Identify failing video patterns
2. Test manually
3. Check yt-dlp version
4. Review error messages
5. Update extraction logic if needed

#### 3. CRON Job Failures

**Symptoms:**
- Occasional cold starts
- CRON execution history shows failures

**Actions:**
1. Check Render Worker health
2. Increase CRON timeout
3. Add backup CRON service
4. Monitor for patterns

---

## 📈 Monitoring Dashboard

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Overall Success Rate | > 95% | < 90% |
| Fast Track Success | > 80% | < 70% |
| Stable Track Success | > 95% | < 90% |
| Avg Response Time | < 5s | > 10s |
| API Quota Usage | < 80% | > 90% |
| Error Rate | < 3% | > 5% |
| Worker Uptime | > 99% | < 95% |
| CRON Success Rate | > 99% | < 95% |

### Monitoring Tools

**Built-in:**
- Vercel Analytics
- Render Metrics
- Upstash Dashboard
- cron-job.org Statistics

**Optional (Free):**
- UptimeRobot (uptime monitoring)
- Sentry (error tracking)
- LogRocket (session replay)

---

## 🔧 Maintenance Scripts

### Check All Services

```bash
#!/bin/bash
# check-services.sh

echo "Checking API Gateway..."
curl -s https://your-app.vercel.app/api/health | jq '.data.status'

echo "Checking Render Worker..."
curl -s https://youtube-mp3-worker.onrender.com/health | jq '.status'

echo "Checking API Quotas..."
curl -s https://your-app.vercel.app/api/health | jq '.data.services.rapidapi.quotas'
```

### Test Download Flow

```bash
#!/bin/bash
# test-download.sh

TEST_URL="https://youtu.be/dQw4w9WgXcQ"

echo "Testing video info..."
curl -s "https://your-app.vercel.app/api/video-info?url=$TEST_URL" | jq '.success'

echo "Testing download..."
curl -s "https://your-app.vercel.app/api/download?url=$TEST_URL" | jq '.success'
```

---

## 📝 Maintenance Log Template

Keep a log of maintenance activities:

```markdown
## Maintenance Log

### 2025-10-30
- **Task:** Daily health check
- **Status:** All services healthy
- **API Quotas:** API1: 45%, API2: 38%, API3: 22%
- **Issues:** None
- **Actions:** None required

### 2025-10-29
- **Task:** Weekly review
- **Status:** Success rate 97.5%
- **Issues:** Occasional CRON failures (3 in past week)
- **Actions:** Increased CRON timeout to 60s
```

---

## 🎯 Best Practices

1. **Automate Monitoring:** Set up alerts for critical metrics
2. **Document Everything:** Keep detailed logs of issues and resolutions
3. **Test Regularly:** Run end-to-end tests weekly
4. **Stay Updated:** Monitor service status pages
5. **Plan for Scale:** Review usage trends monthly
6. **Backup Configs:** Keep secure backups of all configurations
7. **Review Logs:** Don't wait for issues, proactively review logs
8. **Communicate:** Keep team informed of maintenance activities

---

## 📞 Emergency Contacts

- **Vercel Support:** https://vercel.com/support
- **Render Support:** https://render.com/support
- **RapidAPI Support:** https://rapidapi.com/support
- **Upstash Support:** https://upstash.com/support
- **Cloudflare Support:** https://support.cloudflare.com

---

**Last Updated:** 2025-10-30
