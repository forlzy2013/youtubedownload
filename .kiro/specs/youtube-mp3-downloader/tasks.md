# Implementation Plan

## Overview

This implementation plan breaks down the YouTube MP3 Downloader project into discrete, manageable coding tasks. Each task builds incrementally on previous work, ensuring continuous integration and testability.

## Current Status

✅ Environment variables configured (.env.local, .env.example, worker/.env)
✅ R2 storage configured (credentials available)
✅ Upstash Redis configured (credentials available)
✅ RapidAPI key obtained
⏳ No code implementation yet - starting from scratch

## Task List

- [x] 1. Project initialization and infrastructure setup
  - Environment variables already configured
  - .env.example files exist
  - Need to create project folder structure and package.json files
  - _Requirements: 12.1, 13.1_
  - _Status: Environment setup complete, code structure needed_

- [x] 2. Create project structure and package.json files



  - Create root package.json with project metadata
  - Create public/ folder for frontend files
  - Create api/ folder for Vercel serverless functions
  - Create api/lib/ folder for shared utilities
  - Create worker/ folder structure (already has .env)
  - Create worker/package.json with dependencies (@upstash/redis, @aws-sdk/client-s3, express)
  - Create vercel.json for Vercel deployment configuration
  - Create worker/Dockerfile for Render deployment
  - Create .gitignore to exclude node_modules and .env files



  - _Requirements: 12.1, 14.1_

- [ ] 3. Implement Upstash Redis client library
  - Create api/lib/redis-client.js with connection setup using UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
  - **Implement singleton pattern with getRedisClient() function for connection pooling**
  - **Ensure single Redis connection is reused across all requests**
  - Implement task CRUD operations (create, read, update, delete)
  - Implement quota counter operations (get, increment, reset)
  - Implement rate limit operations (check, increment with TTL)
  - Add error handling and connection retry logic



  - **Add connection health check and auto-reconnect on failure**
  - **Implement graceful shutdown on process exit**
  - _Requirements: 5.3, 15.1, 16.1, Performance optimization_
  - _Note: Connection pooling prevents Redis connection exhaustion under high load_

- [ ] 4. Build frontend HTML structure and basic styling
  - Create public/index.html with semantic HTML5 structure



  - Implement 40/60 split layout (upper search section, lower results section)
  - Add search input field and "Analyze" button in upper section
  - Add video info display area in lower section (hidden by default)
  - Add download button placeholder (hidden by default)
  - Create public/style.css with responsive Flexbox layout
  - Implement mobile (320-480px), tablet (481-1024px), and desktop (1024px+) breakpoints



  - _Requirements: 1.1, 2.1, 10.1, 10.2, 10.3, 10.4_

- [ ] 5. Implement frontend URL validation and video ID extraction
  - Create public/app.js with URLValidator class
  - Implement regex patterns for youtube.com/watch, youtu.be, and youtube.com/embed formats
  - Add validate() method that returns {valid, videoId, error}
  - Add extractVideoId() method for all URL formats
  - Implement real-time validation on input field
  - Display error messages for invalid URLs
  - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 6. Implement /api/video-info endpoint



  - Create api/video-info.js serverless function
  - Implement URL parameter extraction and validation
  - Call RapidAPI client library to fetch video metadata with 5-second timeout
  - Add fallback to basic info extraction from URL if API fails
  - Return JSON response with {videoId, title, thumbnail, duration, author}
  - Add error handling for invalid URLs (400) and API failures (500)
  - _Requirements: 2.2, 2.3, 2.5, 11.2_

- [ ] 7. Connect frontend to video info API
  - Create VideoInfoManager class in app.js
  - Implement fetchInfo() method that calls /api/video-info
  - Add loading state display (skeleton screen or spinner)
  - Implement displayInfo() method to show video metadata in lower section
  - Display video thumbnail, title, duration, and author
  - Show "Download MP3" button when video info loads successfully
  - Add error display with retry button for API failures
  - _Requirements: 2.4, 3.1, 9.1, 9.2_

- [x] 8. Implement RapidAPI client library


  - Create api/lib/rapidapi-client.js module
  - **Implement API 1 (youtube-mp36): GET /dl?id={videoId}**
    - Request headers: x-rapidapi-host, x-rapidapi-key
    - Response validation: Check for {link: string, status: "ok"}
    - Extract download URL from response.link
  - **Implement API 2 (youtube-mp3-2025): POST /v1/social/youtube/audio**
    - Request headers: Content-Type: application/json, x-rapidapi-host, x-rapidapi-key
    - Request body: {"id": "videoId"}
    - Response validation: Check for {url: string, ext: "mp3"}
    - Extract download URL from response.url
  - **Implement API 3 (youtube-info-download-api): GET /ajax/download.php**
    - Query parameters: format=mp3, url={encodedFullYouTubeURL}, audio_quality=128
    - Note: Must URL-encode the FULL YouTube URL (not just videoId)
    - Response validation: Check for valid download URL in response
    - Extract download URL from response
  - **Add 5-second timeout for each API call using AbortController**
  - **Implement response validation for each API (validate required fields exist)**
  - **Throw descriptive error if response structure is invalid or missing critical data**
  - **Add error handling for network failures (timeout, connection refused, etc.)**
  - **Return standardized response format: {success: boolean, downloadUrl?: string, error?: string}**
  - _Requirements: 3.1, 3.2, 3.3, 4.4, 4.5, 4.6, 11.2_

- [x] 9. Implement API quota management system


  - Create api/lib/quota-manager.js class
  - Implement getAvailableAPIs() method with weighted selection logic
  - Add quota checking against Redis counters (API 1: 300/month, API 2: 300/month, API 3: 500/day)
  - Implement incrementUsage() method to update counters after each API call
  - **Add automatic quota reset logic:**
    - For monthly quotas (API 1, 2): Check if current month > stored month, reset counter if true
    - For daily quotas (API 3): Check if current date > stored date, reset counter if true
    - Store last reset timestamp in Redis for each API (keys: quota:api1:reset, quota:api2:reset, quota:api3:reset)
    - Implement reset check on each getAvailableAPIs() call
  - Implement 80% warning threshold logging
  - Return API priority list excluding exhausted APIs with weights (1:1:8 for API 1:2:3)
  - _Requirements: 4.1, 4.2, 4.3, 12.2, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8, 15.9_

- [x] 10. Implement rate limiting middleware





  - Create api/lib/rate-limiter.js module
  - Implement isLimited() function that checks Redis counter for client IP
  - Add increment logic with 60-second TTL
  - Enforce 5 requests per minute limit per IP
  - Return rate limit status and retry-after time
  - _Requirements: 16.1, 16.2, 16.5_

- [x] 11. Implement /api/download endpoint with smart routing




  - Create api/download.js serverless function
  - **Create api/lib/utils.js with sanitizeFilename() function to remove illegal characters**
  - **Validate filename length (max 200 characters) and add .mp3 extension**
  - Add rate limiting check at request start (return 429 if limited)
  - Implement URL validation and video ID extraction
  - Integrate QuotaManager to get available APIs with weights
  - Implement Fast Track: try RapidAPI endpoints in priority order with 5-second timeouts
  - Add retry logic for network errors (1 retry with 2-second delay)
  - **Validate RapidAPI response format before using (check for required fields)**
  - On Fast Track success: return {success: true, type: 'direct', downloadUrl, filename}
  - On Fast Track failure: generate UUID taskId and create task in Redis
  - Send async request to Render Worker /download endpoint (fire-and-forget)
  - On Stable Track: return {success: true, type: 'async', taskId, status: 'pending'}
  - Log all API attempts with success/failure status
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.1, 5.2, 5.3, 5.4, 5.5, 9.4, 11.3, 16.3, 16.4, 19.1, 19.4_

- [x] 12. Implement /api/task-status endpoint


  - Create api/task-status.js serverless function
  - Extract taskId from query parameters
  - Query Redis for task data using RedisClient
  - Return 404 if task not found or expired
  - Return task object with {taskId, status, progress, downloadUrl, error}
  - Ensure response time < 1 second
  - _Requirements: 6.3, 11.4, 18.2, 18.3_

- [ ] 13. Implement /api/health endpoint



  - Create api/health.js serverless function
  - Check Upstash Redis connectivity with ping
  - Check RapidAPI quota status from Redis counters
  - **Check Render Worker health with 10-second timeout using AbortSignal.timeout()**
  - **Handle timeout gracefully: mark worker as "warming_up" on first failure, "degraded" after 3 consecutive failures**
  - **Store worker health check history in Redis with 5-minute TTL**
  - Return aggregated health status with service details
  - Return 503 if any critical service is unavailable
  - Ensure response time < 12 seconds (including worker check)
  - _Requirements: 13.1, 13.3, 13.5, 11.2_

- [x] 14. Implement frontend download manager for Fast Track


  - Create DownloadManager class in app.js
  - Implement startDownload() method that calls /api/download
  - Handle 'direct' response type: extract downloadUrl and filename
  - Implement triggerBrowserDownload() method using temporary <a> element
  - Set download attribute with filename and click programmatically
  - Display success message after download starts
  - Add error handling for API failures with retry button
  - _Requirements: 4.8, 9.1, 9.2_

- [x] 15. Implement frontend async task polling for Stable Track

  - Extend DownloadManager with pollTaskStatus() method
  - Handle 'async' response type from /api/download
  - Display "Processing..." message with progress indicator
  - Implement polling loop: call /api/task-status every 3 seconds
  - Update progress bar based on task.progress value
  - Stop polling when status is 'completed' or 'failed'
  - On 'completed': trigger browser download with downloadUrl
  - On 'failed': display error message with retry button
  - Handle 404 responses (expired tasks) with appropriate message
  - _Requirements: 6.1, 6.2, 6.4, 6.5, 17.4, 18.3, 18.4_

- [x] 16. Implement download history management


  - Create HistoryManager class in app.js
  - Implement saveDownload() method to store records in localStorage
  - Enforce 50-item limit using FIFO (first-in-first-out) logic
  - Implement getHistory() method to retrieve all records
  - Create history display UI section below video info
  - Display video title, download timestamp, and file size for each record
  - Add "Re-download" button for each history item
  - Implement clearHistory() method and "Clear History" button
  - Remove expired tasks from history when detected
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 18.4, 18.5_

- [x] 17. Set up Render Worker Docker environment


  - Create worker/Dockerfile based on node:20-alpine
  - Install system dependencies: python3, py3-pip, ffmpeg
  - Install yt-dlp using pip3
  - Set up Node.js working directory and copy package.json
  - **Add @aws-sdk/client-s3 to worker/package.json dependencies for R2 storage**
  - Install Node.js production dependencies
  - Copy application code and expose port 3000
  - Add Docker HEALTHCHECK command for /health endpoint
  - Set CMD to start server with node server.js
  - _Requirements: 7.1, 7.2, 7.3, 14.1_
  - _Note: This task installs R2 SDK. Task 21 configures R2. Task 22 uses R2. Must complete in this order!_

- [x] 18. Implement Render Worker Express server


  - Create worker/server.js with Express setup
  - **Add environment variable validation at startup (check all required vars exist)**
  - **Required vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL, MAX_CONCURRENT_TASKS, TASK_TIMEOUT, MAX_FILE_SIZE, SMALL_FILE_THRESHOLD**
  - **Throw descriptive error if any variable is missing**
  - Add JSON body parser middleware
  - Implement GET /health endpoint returning {status, uptime, timestamp, queueSize}
  - Implement POST /download endpoint accepting {taskId, url}
  - Validate request body (taskId and url required)
  - Initialize TaskQueue with maxConcurrent: 3
  - Add tasks to queue in /download endpoint (non-blocking)
  - Return immediate response {success: true, message: 'Task queued'}
  - Start server on PORT from environment or 3000
  - _Requirements: 5.4, 13.2, 13.4, 14.2, 14.3, 12.1_

- [x] 19. Implement Render Worker task queue system


  - Create worker/task-queue.js class
  - Initialize with maxConcurrent parameter (default 3)
  - Implement add() method to enqueue task functions
  - Implement process() method with concurrency control
  - Track running task count and queue length
  - Execute tasks asynchronously with error handling
  - Automatically process next task when one completes
  - Implement size() method to return current queue length
  - _Requirements: 7.4_

- [x] 20. Implement Render Worker Redis client


  - Create worker/redis-client.js module
  - Set up Upstash Redis REST client with environment variables
  - Implement getTask() method to fetch task by ID
  - Implement updateTask() method to update task fields
  - Add automatic TTL extension (24 hours) on updates
  - Add error handling and connection retry logic
  - _Requirements: 5.3, 7.1, 7.5_

- [x] 21. Configure Cloudflare R2 storage for large files

  - Create Cloudflare account and enable R2 service (see preparation checklist below)
  - Create R2 bucket named 'youtube-mp3-downloads'
  - Configure bucket lifecycle rule: auto-delete objects after 24 hours
  - Generate R2 API token with read/write permissions
  - Configure public access URL for the bucket
  - Add R2 environment variables to Render Worker: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
  - **Test R2 connectivity with simple connection test (not full upload/download - that's in Task 22)**
  - _Requirements: 7.5, 12.1_
  - _Note: R2 is free (10GB storage + 10M reads/month) and has no egress fees, making it ideal for this use case_
  - _CRITICAL: Task 17 (SDK) → Task 21 (R2 Config) → Task 22 (Use R2). Must complete in this order!_

- [x] 22. Implement Render Worker download handler with hybrid storage strategy



  - Create worker/download-handler.js class
  - **Implement sanitizeFilename() helper function to remove illegal characters and limit length**
  - Implement process() method accepting taskId and url
  - Update task status to 'processing' with progress: 10
  - Create temporary directory /tmp/{taskId}
  - Execute yt-dlp command with audio extraction and MP3 conversion
  - Set yt-dlp options: -x, --audio-format mp3, --audio-quality 128K, --max-filesize 100M, --match-filter "duration < 3600"
  - Update progress to 30 after yt-dlp starts, 80 after completion
  - Find generated MP3 file in temp directory
  - Check file size: if <5MB use base64 data URL, if ≥5MB upload to Cloudflare R2
  - **For small files: read file, convert to base64 data URL, and store in Redis task object (within 10MB Redis limit)**
  - **For large files: upload to R2 using @aws-sdk/client-s3 with 24-hour expiration metadata, store R2 URL in Redis task object**
  - **If R2 upload fails: attempt to compress file using ffmpeg with lower bitrate (96K)**
  - **If compression succeeds and file <5MB: use base64 fallback**
  - **If still too large: return error "File too large, please try shorter video"**
  - Update task status to 'completed' with downloadUrl and filename
  - Clean up temporary directory after success
  - Add 120-second timeout with process termination
  - On error: update task status to 'failed' with error message
  - On timeout: update task with error 'Processing timeout exceeded'
  - Implement retry logic for network errors (1 retry)
  - Do not retry for 'Video unavailable' or 'Private video' errors
  - _Requirements: 7.1, 7.2, 7.3, 7.5, 11.5, 17.1, 17.2, 17.3, 17.5, 19.2, 19.3_
  - _Note: Hybrid strategy avoids Redis 10MB limit and optimizes for common use case (most videos <5MB)_

- [x] 23. Implement comprehensive error handling across all components

  - Add try-catch blocks in all API endpoints
  - Implement centralized error handler in API Gateway
  - Return appropriate HTTP status codes (400, 429, 404, 500, 503)
  - Create error code constants (INVALID_URL, RATE_LIMITED, etc.)
  - Add user-friendly error messages in frontend
  - Display error notifications with appropriate actions (Retry, Wait, etc.)
  - Log all errors with context (endpoint, method, IP, stack trace)
  - Implement ErrorHandler class in frontend for consistent error display
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 24. Implement responsive design and UI polish

  - Add CSS media queries for mobile (320-480px), tablet (481-1024px), desktop (1024px+)
  - Ensure touch targets are minimum 44x44 pixels on mobile
  - Add loading states: skeleton screens, spinners, progress bars
  - Implement smooth transitions and animations
  - Add hover states for buttons and interactive elements
  - Ensure proper contrast ratios for accessibility
  - Test layout on various screen sizes and devices
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 25. Configure deployment and environment setup






  - Create .env.example with all required variables (including R2 credentials)
  - **Add CORS configuration:**
    - Option 1: Add to vercel.json: {"headers": [{"source": "/api/(.*)", "headers": [{"key": "Access-Control-Allow-Origin", "value": "*"}]}]}
    - Option 2: Add CORS headers in each API function response
    - For production: restrict origin to your Vercel domain instead of "*"
  - Set up Vercel project and connect GitHub repository
  - Configure Vercel environment variables (RAPIDAPI_KEY, UPSTASH_REDIS_REST_URL, RENDER_WORKER_URL, etc.)
  - Deploy frontend and API Gateway to Vercel
  - Set up Render project and connect GitHub repository
  - Configure Render environment variables (including R2 credentials)
  - Deploy Worker service to Render
  - Verify vercel.json and render.yaml configurations
  - Test deployed endpoints with both small (<5MB) and large (>5MB) files
  - _Requirements: 12.1, 12.4_

- [x] 26. Configure external CRON job for cold start prevention




  - Register account on cron-job.org or similar service
  - Create CRON job targeting Render Worker /health endpoint
  - Set schedule to every 10 minutes (*/10 * * * *)
  - Set timezone to UTC
  - Enable job and verify it runs successfully
  - Monitor Render Worker logs to confirm health checks are received
  - _Requirements: 14.2, 14.3, 14.4, 14.5_

- [x] 27. Create project documentation







  - Write README.md with project overview and features
  - Document installation and setup instructions
  - Add usage guide with screenshots
  - Document environment variable requirements
  - Create troubleshooting section for common issues
  - Add API documentation for all endpoints
  - Document deployment process for Vercel and Render
  - Include maintenance and monitoring guidelines
  - _Requirements: 12.1_

- [x] 28. Perform end-to-end testing and bug fixes



  - Test complete Fast Track flow: URL input → Analyze → Download (RapidAPI)
  - Test complete Stable Track flow: URL input → Analyze → Download (Render Worker) → Poll → Complete
  - Test error scenarios: invalid URL, rate limiting, task timeout, expired task
  - Test responsive design on mobile, tablet, and desktop devices
  - Test download history: save, display, re-download, clear
  - Test API quota management: verify switching when quotas exhausted
  - Test concurrent downloads (multiple users)
  - Fix any bugs discovered during testing
  - Verify all requirements are met
  - _Requirements: All requirements_

## Notes

- Each task should be completed and tested before moving to the next
- Tasks 1-16 focus on frontend and API Gateway (can be developed and tested locally with Vercel CLI)
- Tasks 17-22 focus on Render Worker (can be tested locally with Docker)
- Tasks 23-24 are cross-cutting improvements
- Task 21 configures Cloudflare R2 for large file storage (hybrid strategy)
- Tasks 25-26 are deployment and infrastructure
- Tasks 27-28 are documentation and final testing
- Optional testing tasks are marked with * but are not included in this plan per requirements

## Storage Strategy

The implementation uses a **hybrid storage approach** to optimize for both performance and reliability:

- **Small files (<5MB):** Base64 data URL stored in Redis task object
  - Advantages: Instant delivery, no external dependencies, zero cost
  - Limitations: Redis 10MB value limit (base64 encoding increases size by ~33%, so max ~7.5MB original file)
  - Use case: ~70% of videos (most music videos, short clips)
  - Implementation: Convert MP3 to base64 string and store in Redis task.downloadUrl field

- **Large files (≥5MB):** Upload to Cloudflare R2
  - Advantages: No size limit, CDN acceleration, automatic 24h expiration
  - Limitations: Requires R2 setup, slight upload delay (~2-5 seconds)
  - Use case: ~30% of videos (long videos, high-quality audio)
  - Cost: $0/month (within 10GB storage + 10M reads free tier)
  - Implementation: Upload to R2, store R2 public URL in Redis task.downloadUrl field

This strategy ensures the system can handle files up to 100MB while maintaining zero operational cost.
