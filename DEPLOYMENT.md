# Deployment Guide

## Prerequisites

- GitHub account
- Vercel account (free tier)
- Render account (free tier)
- RapidAPI account with API keys
- Upstash Redis account
- Cloudflare R2 account

## Step 1: Prepare Environment Variables

### For Vercel (API Gateway)

Copy `.env.example` to `.env.local` and fill in:

```bash
RAPIDAPI_KEY=your_rapidapi_key
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
RENDER_WORKER_URL=https://your-worker.onrender.com
RAPIDAPI_1_MONTHLY_QUOTA=300
RAPIDAPI_2_MONTHLY_QUOTA=300
RAPIDAPI_3_DAILY_QUOTA=500
```

### For Render (Worker)

Copy `worker/.env.example` to `worker/.env` and fill in:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
R2_ENDPOINT=https://your-account.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=youtube-mp3-downloads
R2_PUBLIC_URL=https://your-bucket.r2.dev
MAX_CONCURRENT_TASKS=3
TASK_TIMEOUT=120000
```

## Step 2: Deploy to Vercel

1. Push code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: (leave empty)
   - Output Directory: public
5. Add environment variables from `.env.local`
6. Click "Deploy"
7. Note your deployment URL (e.g., https://your-app.vercel.app)

## Step 3: Deploy to Render

1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure service:
   - Name: youtube-mp3-worker
   - Environment: Docker
   - Region: Singapore (or closest to you)
   - Branch: main
   - Dockerfile Path: ./worker/Dockerfile
   - Docker Context: ./worker
5. Add environment variables from `worker/.env`
6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes for first deploy)
8. Note your worker URL (e.g., https://youtube-mp3-worker.onrender.com)

## Step 4: Update Environment Variables

### Update Vercel

Add the Render Worker URL:
```bash
RENDER_WORKER_URL=https://youtube-mp3-worker.onrender.com
```

Redeploy Vercel to apply changes.

## Step 5: Configure CRON Job (Optional but Recommended)

To prevent Render from sleeping:

1. Go to https://cron-job.org
2. Create account
3. Add new cron job:
   - Title: Keep Render Worker Alive
   - URL: https://youtube-mp3-worker.onrender.com/health
   - Schedule: Every 10 minutes (*/10 * * * *)
   - Timezone: UTC
4. Save and enable

## Step 6: Test Deployment

### Test API Gateway (Vercel)

```bash
# Test health endpoint
curl https://your-app.vercel.app/api/health

# Test video info
curl "https://your-app.vercel.app/api/video-info?url=https://youtu.be/dQw4w9WgXcQ"

# Test download
curl "https://your-app.vercel.app/api/download?url=https://youtu.be/dQw4w9WgXcQ"
```

### Test Worker (Render)

```bash
# Test health endpoint
curl https://youtube-mp3-worker.onrender.com/health
```

## Step 7: Monitor

### Vercel Dashboard
- View function logs
- Monitor bandwidth usage
- Check function invocations

### Render Dashboard
- View service logs
- Monitor uptime
- Check resource usage

### Upstash Dashboard
- Monitor Redis requests
- Check storage usage

## Troubleshooting

### Vercel Deployment Fails
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Ensure vercel.json is valid JSON

### Render Deployment Fails
- Check build logs in Render dashboard
- Verify Dockerfile syntax
- Ensure all dependencies are in package.json

### Worker Not Responding
- Check if worker is sleeping (first request takes 30-60s)
- Verify CRON job is running
- Check Render logs for errors

### API Quota Exhausted
- Check Upstash Redis for quota counters
- Wait for quota reset (daily/monthly)
- Consider upgrading RapidAPI plan

## Production Checklist

- [ ] All environment variables configured
- [ ] Vercel deployed successfully
- [ ] Render deployed successfully
- [ ] CRON job configured
- [ ] Test small file download (<5MB)
- [ ] Test large file download (>5MB)
- [ ] Test rate limiting (6 requests in 1 minute)
- [ ] Test error handling (invalid URL)
- [ ] Monitor logs for 24 hours
- [ ] Set up alerts for quota usage

## Cost Monitoring

All services should remain free with these limits:
- Vercel: <100GB bandwidth, <1M function calls
- Render: <750 hours/month
- RapidAPI: <900 requests/month total
- Upstash: <300K requests/month
- Cloudflare R2: <10GB storage, <10M reads/month

Monitor usage weekly to stay within free tiers.
