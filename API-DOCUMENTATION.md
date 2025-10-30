# API Documentation

## Overview

The YouTube MP3 Downloader provides 4 RESTful API endpoints for video information retrieval, download management, task status tracking, and system health monitoring.

## Base URL

- **Development:** `http://localhost:3000`
- **Production:** `https://your-app.vercel.app`

## Authentication

No authentication required. Rate limiting applies (5 requests per minute per IP).

---

## Endpoints

### 1. GET /api/video-info

Get YouTube video metadata.

**Request:**
```http
GET /api/video-info?url={YouTube_URL}
```

**Parameters:**
- `url` (required): YouTube video URL

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "videoId": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up",
    "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    "duration": "3:33",
    "author": "YouTube",
    "durationSeconds": 213
  }
}
```

**Error Responses:**
```json
// 400 Bad Request
{
  "success": false,
  "error": "Missing required parameter: url"
}

// 400 Bad Request
{
  "success": false,
  "error": "Invalid YouTube URL. Could not extract video ID."
}

// 500 Internal Server Error
{
  "success": false,
  "error": "Internal server error. Please try again later."
}
```

---

### 2. GET /api/download

Download YouTube video as MP3 with smart routing.

**Request:**
```http
GET /api/download?url={YouTube_URL}
```

**Parameters:**
- `url` (required): YouTube video URL

**Response - Fast Track (200 OK):**
```json
{
  "success": true,
  "type": "direct",
  "downloadUrl": "https://cdn.example.com/file.mp3",
  "filename": "video-title.mp3",
  "videoId": "dQw4w9WgXcQ",
  "apiUsed": 1
}
```

**Response - Stable Track (200 OK):**
```json
{
  "success": true,
  "type": "async",
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "videoId": "dQw4w9WgXcQ",
  "message": "Task created. Use /api/task-status to check progress."
}
```

**Error Responses:**
```json
// 429 Too Many Requests
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 60,
  "limit": 5,
  "current": 5
}

// 400 Bad Request
{
  "success": false,
  "error": "Invalid YouTube URL. Could not extract video ID."
}
```

---

### 3. GET /api/task-status

Query async task status and progress.

**Request:**
```http
GET /api/task-status?taskId={TASK_ID}
```

**Parameters:**
- `taskId` (required): Task UUID from /api/download

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "progress": 100,
    "downloadUrl": "https://r2.example.com/file.mp3",
    "filename": "video-title.mp3",
    "error": null,
    "videoId": "dQw4w9WgXcQ",
    "videoTitle": "Video Title",
    "createdAt": 1698765432000,
    "updatedAt": 1698765492000
  }
}
```

**Status Values:**
- `pending` - Task queued, waiting to process
- `processing` - Currently downloading and converting
- `completed` - Download ready
- `failed` - Download failed

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Task not found or expired. Tasks expire after 24 hours."
}
```

---

### 4. GET /api/health

System health check and monitoring.

**Request:**
```http
GET /api/health
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": 1698765432000,
    "responseTime": "245ms",
    "services": {
      "redis": {
        "status": "healthy",
        "message": "Redis connection healthy"
      },
      "rapidapi": {
        "status": "healthy",
        "quotas": {
          "api1": {
            "used": 50,
            "limit": 300,
            "remaining": 250,
            "usagePercent": "16.7%",
            "type": "monthly"
          },
          "api2": {
            "used": 30,
            "limit": 300,
            "remaining": 270,
            "usagePercent": "10.0%",
            "type": "monthly"
          },
          "api3": {
            "used": 100,
            "limit": 500,
            "remaining": 400,
            "usagePercent": "20.0%",
            "type": "daily"
          }
        }
      },
      "renderWorker": {
        "status": "healthy",
        "message": "Render Worker is responding",
        "consecutiveFailures": 0,
        "lastCheck": 1698765432000
      }
    }
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "success": false,
  "data": {
    "status": "degraded",
    "services": {
      "redis": {
        "status": "down",
        "message": "Connection failed"
      }
    }
  }
}
```

---

## Rate Limiting

All endpoints are rate limited to **5 requests per minute per IP address**.

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1698765492
```

**Rate Limit Response (429):**
```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 60,
  "limit": 5,
  "current": 5
}
```

---

## Error Codes

| HTTP Status | Meaning | Common Causes |
|-------------|---------|---------------|
| 200 | Success | Request completed successfully |
| 400 | Bad Request | Missing parameters, invalid URL |
| 404 | Not Found | Task not found or expired |
| 405 | Method Not Allowed | Wrong HTTP method used |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Critical service down |

---

## Usage Examples

### JavaScript (Fetch API)

```javascript
// Get video info
const response = await fetch('/api/video-info?url=' + encodeURIComponent(youtubeUrl));
const data = await response.json();

if (data.success) {
  console.log('Video:', data.data.title);
}

// Download video
const downloadResponse = await fetch('/api/download?url=' + encodeURIComponent(youtubeUrl));
const downloadData = await downloadResponse.json();

if (downloadData.type === 'direct') {
  // Fast Track - download immediately
  window.location.href = downloadData.downloadUrl;
} else if (downloadData.type === 'async') {
  // Stable Track - poll for status
  const taskId = downloadData.taskId;
  
  const interval = setInterval(async () => {
    const statusResponse = await fetch('/api/task-status?taskId=' + taskId);
    const statusData = await statusResponse.json();
    
    if (statusData.data.status === 'completed') {
      clearInterval(interval);
      window.location.href = statusData.data.downloadUrl;
    } else if (statusData.data.status === 'failed') {
      clearInterval(interval);
      console.error('Download failed:', statusData.data.error);
    }
  }, 3000);
}
```

### cURL

```bash
# Get video info
curl "https://your-app.vercel.app/api/video-info?url=https://youtu.be/dQw4w9WgXcQ"

# Download video
curl "https://your-app.vercel.app/api/download?url=https://youtu.be/dQw4w9WgXcQ"

# Check task status
curl "https://your-app.vercel.app/api/task-status?taskId=550e8400-e29b-41d4-a716-446655440000"

# Health check
curl "https://your-app.vercel.app/api/health"
```

---

## Performance

| Endpoint | Avg Response Time | Max Response Time |
|----------|-------------------|-------------------|
| /api/video-info | 2-3 seconds | 5 seconds |
| /api/download (Fast) | 3-5 seconds | 10 seconds |
| /api/download (Stable) | <1 second | 2 seconds |
| /api/task-status | <500ms | 1 second |
| /api/health | 1-2 seconds | 12 seconds |

---

## Quotas and Limits

### RapidAPI Quotas
- API 1: 300 requests/month
- API 2: 300 requests/month
- API 3: 500 requests/day

### Rate Limits
- 5 requests per minute per IP
- Applies to all endpoints

### File Size Limits
- Maximum: 100MB
- Maximum duration: 1 hour (3600 seconds)

### Task Expiration
- Tasks expire after 24 hours
- Download URLs expire after 24 hours

---

## Best Practices

1. **Always check response.success** before using data
2. **Handle both 'direct' and 'async' download types**
3. **Implement exponential backoff** for retries
4. **Cache video info** to avoid redundant API calls
5. **Show progress indicators** for async downloads
6. **Handle 429 errors** by waiting retryAfter seconds
7. **Validate URLs** on client side before API calls
8. **Clean up expired tasks** from local storage

---

## Support

For issues or questions:
- GitHub: https://github.com/forlzy2013/youtube-mp3-downloader
- Email: [your-email]

---

**Last Updated:** 2025-10-30
