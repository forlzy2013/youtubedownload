# API Library Documentation

## redis-client.js

Upstash Redis client library with singleton pattern for connection pooling and reuse.

### Features

- ✅ **Singleton Pattern**: Single Redis connection reused across all requests
- ✅ **Connection Pooling**: Automatic connection management
- ✅ **Auto-Reconnect**: Automatic reconnection on failure with retry logic
- ✅ **Health Checks**: Built-in connection health monitoring
- ✅ **Graceful Shutdown**: Proper cleanup on process exit
- ✅ **Error Handling**: Comprehensive error handling with retry logic

### Environment Variables

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
RAPIDAPI_1_MONTHLY_QUOTA=300
RAPIDAPI_2_MONTHLY_QUOTA=300
RAPIDAPI_3_DAILY_QUOTA=500
```

### Usage

#### Import

```javascript
import {
  getRedisClient,
  checkHealth,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  getQuota,
  incrementQuota,
  resetQuota,
  checkRateLimit,
  incrementRateLimit
} from './lib/redis-client.js';
```

#### Task Operations

```javascript
// Create a task
await createTask('task-123', {
  videoUrl: 'https://youtube.com/watch?v=abc',
  videoId: 'abc',
  videoTitle: 'My Video'
});

// Get a task
const task = await getTask('task-123');
// Returns: { taskId, status, progress, videoUrl, ... }

// Update a task
await updateTask('task-123', {
  status: 'processing',
  progress: 50
});

// Delete a task
await deleteTask('task-123');
```

#### Quota Operations

```javascript
// Get quota status
const quota = await getQuota('api1');
// Returns: { count: 10, limit: 300, resetDate: 1234567890, remaining: 290 }

// Increment quota
const newCount = await incrementQuota('api1');

// Reset quota (usually automatic)
await resetQuota('api1');
```

#### Rate Limit Operations

```javascript
// Check if IP is rate limited
const rateLimit = await checkRateLimit('192.168.1.1');
// Returns: { limited: false, count: 3, retryAfter: 60 }

// Increment rate limit counter
const count = await incrementRateLimit('192.168.1.1');
```

#### Health Check

```javascript
const health = await checkHealth();
// Returns: { healthy: true, message: 'Redis connection healthy' }
```

### Data Structures

#### Task Object

```javascript
{
  taskId: 'uuid-1234',
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: 0-100,
  videoUrl: 'https://youtube.com/watch?v=...',
  videoId: 'abc123',
  videoTitle: 'Video Title',
  downloadUrl: null | 'https://...' | 'data:audio/mp3;base64,...',
  filename: 'video-title.mp3',
  error: null | 'Error message',
  createdAt: 1234567890,
  updatedAt: 1234567890,
  expiresAt: 1234567890
}
```

#### Redis Keys

- `task:{taskId}` - Task data (TTL: 24 hours)
- `quota:{apiKey}:count` - API usage counter
- `quota:{apiKey}:reset` - Next reset timestamp
- `ratelimit:{ip}` - Rate limit counter (TTL: 60 seconds)

### Error Handling

All functions include automatic retry logic:

1. On error, attempt to reconnect to Redis
2. If reconnection succeeds, retry the operation once
3. If retry fails, throw the error

```javascript
try {
  await createTask('task-123', data);
} catch (error) {
  console.error('Failed to create task:', error);
  // Handle error appropriately
}
```

### Performance

- **Connection Reuse**: Single connection shared across all requests
- **Automatic TTL**: Tasks expire after 24 hours
- **Rate Limit TTL**: Rate limit counters expire after 60 seconds
- **Retry Logic**: Exponential backoff (1s, 2s, 4s, max 10s)

### Testing

Run the test file to verify functionality:

```bash
node api/lib/redis-client.test.js
```

### Best Practices

1. **Always use getRedisClient()** - Never create Redis instances directly
2. **Handle errors** - All operations can throw errors
3. **Check health** - Use checkHealth() in health check endpoints
4. **Monitor quotas** - Check quota status before making API calls
5. **Rate limit** - Always check rate limits before processing requests

### Troubleshooting

#### Connection Errors

```
Error: Redis configuration missing
```
**Solution**: Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN

#### Task Not Found

```
Error: Task task-123 not found
```
**Solution**: Task may have expired (24h TTL) or never existed

#### Rate Limited

```
{ limited: true, count: 5, retryAfter: 60 }
```
**Solution**: Wait 60 seconds before retrying

### Architecture

```
API Endpoint
    ↓
redis-client.js (Singleton)
    ↓
Upstash Redis REST API
    ↓
Redis Database
```

### Quota Reset Logic

- **Monthly Quotas (API 1, 2)**: Reset on 1st of each month at 00:00 UTC
- **Daily Quotas (API 3)**: Reset daily at 00:00 UTC
- **Automatic**: Checked on each getQuota() call
- **Manual**: Can be triggered with resetQuota()

### Rate Limit Logic

- **Limit**: 5 requests per minute per IP
- **Window**: 60 seconds sliding window
- **TTL**: Counter expires after 60 seconds
- **Reset**: Automatic after TTL expires
