# Troubleshooting Guide for Developers

## Overview

This guide helps developers diagnose and fix common issues with the YouTube MP3 Downloader system.

## 🔍 Diagnostic Tools

### Quick Health Check

```bash
# Check all services
curl https://your-app.vercel.app/api/health | jq

# Check specific service
curl https://youtube-mp3-worker.onrender.com/health | jq

# Test video info
curl "https://your-app.vercel.app/api/video-info?url=https://youtu.be/dQw4w9WgXcQ" | jq

# Test download
curl "https://your-app.vercel.app/api/download?url=https://youtu.be/dQw4w9WgXcQ" | jq
```

### Check Logs

**Vercel:**
```bash
vercel logs --follow
```

**Render:**
- Go to https://dashboard.render.com
- Select your service
- Click "Logs" tab
- Use search and filters

**Redis:**
```bash
# Using Upstash CLI or REST API
curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  "$UPSTASH_REDIS_REST_URL/keys/*"
```

---

## 🚨 Critical Issues

### Issue: All Services Down

**Symptoms:**
- Health endpoint returns 503
- All downloads fail
- Frontend shows errors

**Diagnosis:**
```bash
# Check each service individually
curl -I https://your-app.vercel.app/api/health
curl -I https://youtube-mp3-worker.onrender.com/health

# Check external service status
# Vercel: https://www.vercel-status.com
# Render: https://status.render.com
# Upstash: https://status.upstash.com
```

**Common Causes:**
1. **Platform outage** - Check status pages
2. **Deployment failure** - Check deployment logs
3. **Environment variables missing** - Verify in dashboard
4. **Redis connection failed** - Check Upstash dashboard

**Solutions:**

**If platform outage:**
- Wait for platform to recover
- Monitor status page
- Communicate with users

**If deployment failure:**
```bash
# Rollback to previous version
vercel rollback

# Or redeploy
vercel --prod
```

**If environment variables missing:**
1. Go to Vercel/Render dashboard
2. Settings → Environment Variables
3. Verify all required variables exist
4. Redeploy if variables were added

**If Redis connection failed:**
1. Check Upstash dashboard
2. Verify credentials in environment variables
3. Test connection:
```bash
curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  "$UPSTASH_REDIS_REST_URL/ping"
```

---

### Issue: Render Worker Not Responding

**Symptoms:**
- Fast Track works
- Stable Track fails
- Worker health check times out
- Downloads stuck in "pending" status

**Diagnosis:**
```bash
# Check worker health
curl -v https://youtube-mp3-worker.onrender.com/health

# Check worker logs
# Go to Render dashboard → Logs

# Check CRON job
# Go to cron-job.org → Execution history
```

**Common Causes:**
1. **Worker is sleeping** - First request after 15 min inactivity
2. **Worker crashed** - Check logs for errors
3. **Out of memory** - Check memory usage
4. **CRON job not running** - Check cron-job.org

**Solutions:**

**If worker is sleeping:**
1. Wait 30-60 seconds for wake-up
2. Verify CRON job is configured:
```bash
# Should ping every 10 minutes
# Check cron-job.org execution history
```
3. If CRON not working, set it up: See [CRON-SETUP.md](CRON-SETUP.md)

**If worker crashed:**
1. Check Render logs for error
2. Common errors:
   - `ECONNREFUSED` - Redis connection failed
   - `ENOMEM` - Out of memory
   - `yt-dlp error` - Video download failed
3. Restart service:
   - Go to Render dashboard
   - Click "Manual Deploy" → "Clear build cache & deploy"

**If out of memory:**
1. Check Render metrics
2. If consistently high:
   - Reduce `MAX_CONCURRENT_TASKS` to 2
   - Add memory cleanup in download-handler.js
   - Consider upgrading Render plan

**If CRON job not running:**
1. Log in to cron-job.org
2. Check job is enabled
3. Check execution history
4. If failing, verify URL is correct
5. Test URL manually:
```bash
curl https://youtube-mp3-worker.onrender.com/health
```

---

### Issue: Redis Connection Errors

**Symptoms:**
- "Redis connection failed" in logs
- Task status queries return 404
- Rate limiting not working
- Quota tracking broken

**Diagnosis:**
```bash
# Test Redis connection
curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  "$UPSTASH_REDIS_REST_URL/ping"

# Check Redis dashboard
# Go to https://console.upstash.com
```

**Common Causes:**
1. **Invalid credentials** - Token expired or wrong
2. **Network issue** - Temporary connectivity problem
3. **Quota exceeded** - Free tier limit reached
4. **Redis instance down** - Upstash issue

**Solutions:**

**If invalid credentials:**
1. Go to Upstash dashboard
2. Copy correct URL and token
3. Update environment variables:
   - Vercel: Settings → Environment Variables
   - Render: Settings → Environment Variables
4. Redeploy both services

**If network issue:**
1. Wait a few minutes
2. Retry
3. Check Upstash status page

**If quota exceeded:**
1. Check Upstash dashboard → Usage
2. Free tier: 300K requests/month
3. If exceeded:
   - Wait for monthly reset
   - Optimize Redis usage
   - Consider upgrading

**If Redis instance down:**
1. Check Upstash status page
2. Wait for recovery
3. Consider backup Redis instance

---

## ⚠️ Common Issues

### Issue: Fast Track Always Fails

**Symptoms:**
- All downloads go to Stable Track
- RapidAPI errors in logs
- Health endpoint shows API issues

**Diagnosis:**
```bash
# Check API quotas
curl https://your-app.vercel.app/api/health | jq '.data.services.rapidapi.quotas'

# Test RapidAPI directly
curl -X GET "https://youtube-mp36.p.rapidapi.com/dl?id=dQw4w9WgXcQ" \
  -H "x-rapidapi-key: $RAPIDAPI_KEY" \
  -H "x-rapidapi-host: youtube-mp36.p.rapidapi.com"
```

**Common Causes:**
1. **Quotas exhausted** - All 3 APIs at limit
2. **Invalid API key** - Key expired or wrong
3. **API endpoint down** - RapidAPI service issue
4. **Network timeout** - Slow API response

**Solutions:**

**If quotas exhausted:**
1. Check quota status:
```bash
curl https://your-app.vercel.app/api/health | jq '.data.services.rapidapi.quotas'
```
2. Wait for reset:
   - API 1 & 2: Monthly reset (1st of month)
   - API 3: Daily reset (midnight UTC)
3. Temporary solution: Rely on Stable Track
4. Long-term: Consider upgrading RapidAPI plan

**If invalid API key:**
1. Go to RapidAPI dashboard
2. Check API key is active
3. Generate new key if needed
4. Update environment variable:
```bash
# In Vercel dashboard
RAPIDAPI_KEY=new_key_here
```
5. Redeploy

**If API endpoint down:**
1. Check RapidAPI status
2. Test other endpoints
3. Wait for recovery
4. Stable Track will handle all requests

**If network timeout:**
1. Check timeout settings (currently 5s)
2. Increase if needed in rapidapi-client.js
3. Monitor response times

---

### Issue: Stable Track Timeouts

**Symptoms:**
- Tasks stuck in "processing" status
- Tasks fail with "timeout" error
- Worker logs show long-running processes

**Diagnosis:**
```bash
# Check task status
curl "https://your-app.vercel.app/api/task-status?taskId=TASK_ID" | jq

# Check worker logs
# Look for "timeout" or "killed" messages

# Check video duration
curl "https://your-app.vercel.app/api/video-info?url=VIDEO_URL" | jq '.data.duration'
```

**Common Causes:**
1. **Video too long** - Over 1 hour
2. **Large file size** - Over 100MB
3. **Slow download** - Network issues
4. **yt-dlp hanging** - Extraction issues

**Solutions:**

**If video too long:**
1. Current limit: 1 hour (3600 seconds)
2. Enforced in download-handler.js:
```javascript
--match-filter "duration < 3600"
```
3. User should try shorter video
4. Or increase limit if needed

**If large file size:**
1. Current limit: 100MB
2. Enforced in download-handler.js:
```javascript
--max-filesize 100M
```
3. User should try shorter/lower quality video
4. Or increase limit and ensure R2 can handle it

**If slow download:**
1. Check worker network speed
2. Check YouTube throttling
3. Increase timeout in download-handler.js:
```javascript
const timeout = 180000; // 3 minutes instead of 2
```

**If yt-dlp hanging:**
1. Update yt-dlp:
```dockerfile
# In worker/Dockerfile
RUN pip3 install --upgrade yt-dlp
```
2. Add more verbose logging
3. Check yt-dlp GitHub issues

---

### Issue: Rate Limiting Not Working

**Symptoms:**
- Users can make unlimited requests
- No 429 errors
- Redis rate limit keys not created

**Diagnosis:**
```bash
# Check Redis for rate limit keys
curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
  "$UPSTASH_REDIS_REST_URL/keys/ratelimit:*"

# Test rate limiting
for i in {1..10}; do
  curl "https://your-app.vercel.app/api/download?url=https://youtu.be/dQw4w9WgXcQ"
  echo "Request $i"
done
```

**Common Causes:**
1. **Rate limiter not called** - Missing middleware
2. **Redis connection failed** - Can't store counters
3. **IP extraction failed** - Can't identify client
4. **TTL not set** - Keys don't expire

**Solutions:**

**If rate limiter not called:**
1. Check api/download.js:
```javascript
// Should be at the top
const rateLimitResult = await RateLimiter.check(clientIp);
if (rateLimitResult.limited) {
  return res.status(429).json({...});
}
```
2. Ensure it's before any processing

**If Redis connection failed:**
1. Fix Redis connection (see Redis section above)
2. Test rate limiter:
```javascript
// In api/lib/rate-limiter.js
console.log('Rate limit check for IP:', clientIp);
```

**If IP extraction failed:**
1. Check IP extraction:
```javascript
const clientIp = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] || 
                 req.connection.remoteAddress;
console.log('Client IP:', clientIp);
```
2. Vercel provides `x-forwarded-for`
3. Test locally with different header

**If TTL not set:**
1. Check rate-limiter.js:
```javascript
// Should set TTL to 60 seconds
await redis.setex(`ratelimit:${clientIp}`, 60, count);
```

---

### Issue: Download History Not Saving

**Symptoms:**
- History section empty
- Downloads don't appear in history
- History clears on page refresh

**Diagnosis:**
```javascript
// In browser console
localStorage.getItem('youtube-mp3-history')

// Check if localStorage is available
typeof(Storage) !== "undefined"

// Check for errors
console.log('LocalStorage test:', localStorage.setItem('test', 'value'))
```

**Common Causes:**
1. **LocalStorage disabled** - Browser settings
2. **Private/Incognito mode** - Storage not persisted
3. **Storage quota exceeded** - Too much data
4. **JavaScript error** - Code not executing

**Solutions:**

**If localStorage disabled:**
1. User must enable in browser settings
2. Or use regular (non-private) browsing
3. Show error message to user

**If private/incognito mode:**
1. Detect and warn user:
```javascript
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (e) {
  alert('History not available in private mode');
}
```

**If storage quota exceeded:**
1. Current limit: 50 items
2. Implement cleanup:
```javascript
// In HistoryManager
if (history.length >= 50) {
  history.shift(); // Remove oldest
}
```

**If JavaScript error:**
1. Check browser console for errors
2. Check HistoryManager class
3. Add error handling:
```javascript
try {
  localStorage.setItem('youtube-mp3-history', JSON.stringify(history));
} catch (e) {
  console.error('Failed to save history:', e);
}
```

---

### Issue: CORS Errors

**Symptoms:**
- "CORS policy" errors in browser console
- API calls fail from frontend
- Works in curl but not in browser

**Diagnosis:**
```javascript
// In browser console
fetch('https://your-app.vercel.app/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Common Causes:**
1. **Missing CORS headers** - Not configured in API
2. **Wrong origin** - Frontend domain not allowed
3. **Preflight failure** - OPTIONS request fails

**Solutions:**

**Add CORS headers in vercel.json:**
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type" }
      ]
    }
  ]
}
```

**Or add in each API function:**
```javascript
export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // ... rest of handler
}
```

**For production, restrict origin:**
```javascript
res.setHeader('Access-Control-Allow-Origin', 'https://your-app.vercel.app');
```

---

## 🔧 Performance Issues

### Issue: Slow Response Times

**Symptoms:**
- Requests take > 10 seconds
- Users report slowness
- Timeout errors

**Diagnosis:**
```bash
# Measure response times
time curl "https://your-app.vercel.app/api/video-info?url=https://youtu.be/dQw4w9WgXcQ"

# Check Vercel analytics
# Go to Vercel dashboard → Analytics → Performance

# Check Render metrics
# Go to Render dashboard → Metrics
```

**Common Causes:**
1. **Cold start** - Function not warmed up
2. **Slow external API** - RapidAPI or YouTube slow
3. **Redis latency** - Network delay
4. **Large response** - Too much data

**Solutions:**

**If cold start:**
1. Vercel functions warm up after first request
2. Implement warming:
```bash
# Ping endpoints every 5 minutes
curl https://your-app.vercel.app/api/health
```

**If slow external API:**
1. Reduce timeout:
```javascript
// In rapidapi-client.js
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 3000); // 3s instead of 5s
```
2. Implement caching:
```javascript
// Cache video info for 5 minutes
const cacheKey = `video:${videoId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);
```

**If Redis latency:**
1. Check Upstash region (should be close to Vercel region)
2. Reduce Redis calls:
```javascript
// Batch operations
const pipeline = redis.pipeline();
pipeline.get('key1');
pipeline.get('key2');
const results = await pipeline.exec();
```

**If large response:**
1. Reduce response size:
```javascript
// Only return necessary fields
return {
  videoId,
  title,
  thumbnail: thumbnail.replace('maxresdefault', 'mqdefault'), // Smaller image
  duration
};
```

---

### Issue: High Memory Usage

**Symptoms:**
- Render Worker crashes
- "Out of memory" errors
- Slow performance

**Diagnosis:**
```bash
# Check Render metrics
# Go to Render dashboard → Metrics → Memory

# Check for memory leaks
# Add logging in worker/download-handler.js
console.log('Memory usage:', process.memoryUsage());
```

**Common Causes:**
1. **Too many concurrent tasks** - Exceeding capacity
2. **Large files in memory** - Not streaming
3. **Memory leak** - Not cleaning up
4. **Temp files not deleted** - Disk full

**Solutions:**

**If too many concurrent tasks:**
1. Reduce MAX_CONCURRENT_TASKS:
```bash
# In Render environment variables
MAX_CONCURRENT_TASKS=2  # Instead of 3
```

**If large files in memory:**
1. Use streaming:
```javascript
// Instead of reading entire file
const fileBuffer = await fs.readFile(filePath);

// Use streams
const stream = fs.createReadStream(filePath);
```

**If memory leak:**
1. Add cleanup:
```javascript
// In download-handler.js
finally {
  // Always cleanup
  await fs.rm(tempDir, { recursive: true, force: true });
  
  // Force garbage collection (if enabled)
  if (global.gc) global.gc();
}
```

**If temp files not deleted:**
1. Check cleanup logic:
```javascript
// Ensure cleanup runs even on error
try {
  // ... download logic
} catch (error) {
  // ... error handling
} finally {
  // Always cleanup
  await fs.rm(tempDir, { recursive: true, force: true });
}
```

2. Add periodic cleanup:
```javascript
// In worker/server.js
setInterval(async () => {
  const tmpDir = '/tmp';
  const files = await fs.readdir(tmpDir);
  for (const file of files) {
    const filePath = path.join(tmpDir, file);
    const stats = await fs.stat(filePath);
    // Delete files older than 1 hour
    if (Date.now() - stats.mtimeMs > 3600000) {
      await fs.rm(filePath, { recursive: true, force: true });
    }
  }
}, 600000); // Every 10 minutes
```

---

## 🧪 Testing Issues

### Issue: Local Development Not Working

**Symptoms:**
- Can't run locally
- Environment variables not loaded
- API calls fail

**Diagnosis:**
```bash
# Check Node version
node --version  # Should be 20+

# Check environment variables
cat .env.local

# Check Vercel CLI
vercel --version

# Try running
vercel dev
```

**Common Causes:**
1. **Wrong Node version** - Need 20+
2. **Missing .env.local** - Not configured
3. **Vercel CLI not installed** - Can't run dev server
4. **Port already in use** - 3000 occupied

**Solutions:**

**If wrong Node version:**
```bash
# Install Node 20
nvm install 20
nvm use 20
```

**If missing .env.local:**
```bash
# Copy example
cp .env.example .env.local

# Edit with your values
nano .env.local
```

**If Vercel CLI not installed:**
```bash
npm install -g vercel
vercel login
```

**If port in use:**
```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9

# Or use different port
vercel dev --listen 3001
```

---

## 📊 Monitoring and Alerts

### Set Up Monitoring

**Vercel:**
1. Go to Project → Settings → Integrations
2. Add monitoring service (e.g., Sentry)
3. Configure alerts for errors

**Render:**
1. Go to Service → Settings → Notifications
2. Add email for alerts
3. Configure thresholds

**Custom Monitoring:**
```bash
#!/bin/bash
# monitor.sh - Run every 5 minutes

HEALTH=$(curl -s https://your-app.vercel.app/api/health | jq -r '.data.status')

if [ "$HEALTH" != "healthy" ]; then
  echo "ALERT: Service unhealthy"
  # Send email/SMS/Slack notification
fi
```

---

## 📝 Debug Checklist

When investigating an issue:

- [ ] Check health endpoint
- [ ] Review recent logs (Vercel + Render)
- [ ] Verify environment variables
- [ ] Test each service individually
- [ ] Check external service status pages
- [ ] Review recent deployments
- [ ] Check API quotas
- [ ] Test with curl
- [ ] Check browser console (for frontend issues)
- [ ] Review Redis data
- [ ] Check CRON job execution
- [ ] Verify network connectivity

---

## 🆘 Emergency Procedures

### Complete System Failure

1. **Assess scope:**
   - Check all services
   - Check external dependencies
   - Check recent changes

2. **Immediate actions:**
   - Rollback recent deployments
   - Check environment variables
   - Restart services if needed

3. **Communication:**
   - Notify users
   - Provide status updates
   - Set expectations

4. **Recovery:**
   - Fix root cause
   - Test thoroughly
   - Redeploy
   - Monitor closely

5. **Post-mortem:**
   - Document what happened
   - Identify root cause
   - Implement preventive measures
   - Update runbooks

---

## 📞 Support Contacts

- **Vercel Support:** https://vercel.com/support
- **Render Support:** https://render.com/support  
- **RapidAPI Support:** https://rapidapi.com/support
- **Upstash Support:** https://upstash.com/support
- **Cloudflare Support:** https://support.cloudflare.com

---

**Last Updated:** 2025-10-30
