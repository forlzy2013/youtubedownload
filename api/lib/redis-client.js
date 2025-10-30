/**
 * Upstash Redis Client Library
 * Implements singleton pattern for connection pooling and reuse
 */

import { Redis } from '@upstash/redis';

// Singleton instance
let redisClient = null;
let isConnected = false;

/**
 * Get Redis client instance (singleton pattern)
 * Ensures single connection is reused across all requests
 */
export function getRedisClient() {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error('Redis configuration missing: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required');
    }

    redisClient = new Redis({
      url,
      token,
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(1000 * Math.pow(2, retryCount), 10000)
      }
    });

    isConnected = true;
    console.log('Redis client initialized');
  }

  return redisClient;
}

/**
 * Check Redis connection health
 */
export async function checkHealth() {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return { healthy: result === 'PONG', message: 'Redis connection healthy' };
  } catch (error) {
    console.error('Redis health check failed:', error);
    return { healthy: false, message: error.message };
  }
}

/**
 * Auto-reconnect on failure
 */
async function reconnect() {
  try {
    redisClient = null;
    isConnected = false;
    getRedisClient();
    await checkHealth();
    console.log('Redis reconnected successfully');
    return true;
  } catch (error) {
    console.error('Redis reconnection failed:', error);
    return false;
  }
}

// ============================================
// Task CRUD Operations
// ============================================

/**
 * Create a new task
 * @param {string} taskId - Unique task identifier
 * @param {object} taskData - Task data object
 * @returns {Promise<boolean>} Success status
 */
export async function createTask(taskId, taskData) {
  try {
    const client = getRedisClient();
    const task = {
      taskId,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      ...taskData
    };

    // Store task with 24-hour TTL
    await client.set(`task:${taskId}`, JSON.stringify(task), { ex: 86400 });
    return true;
  } catch (error) {
    console.error('Error creating task:', error);
    // Attempt reconnect and retry
    if (await reconnect()) {
      return createTask(taskId, taskData);
    }
    throw error;
  }
}

/**
 * Read a task by ID
 * @param {string} taskId - Task identifier
 * @returns {Promise<object|null>} Task data or null if not found
 */
export async function getTask(taskId) {
  try {
    const client = getRedisClient();
    const data = await client.get(`task:${taskId}`);
    
    if (!data) {
      return null;
    }

    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error('Error getting task:', error);
    // Attempt reconnect and retry
    if (await reconnect()) {
      return getTask(taskId);
    }
    throw error;
  }
}

/**
 * Update a task
 * @param {string} taskId - Task identifier
 * @param {object} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export async function updateTask(taskId, updates) {
  try {
    const client = getRedisClient();
    const task = await getTask(taskId);
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: Date.now()
    };

    // Update with 24-hour TTL extension
    await client.set(`task:${taskId}`, JSON.stringify(updatedTask), { ex: 86400 });
    return true;
  } catch (error) {
    console.error('Error updating task:', error);
    // Attempt reconnect and retry
    if (await reconnect()) {
      return updateTask(taskId, updates);
    }
    throw error;
  }
}

/**
 * Delete a task
 * @param {string} taskId - Task identifier
 * @returns {Promise<boolean>} Success status
 */
export async function deleteTask(taskId) {
  try {
    const client = getRedisClient();
    await client.del(`task:${taskId}`);
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    // Attempt reconnect and retry
    if (await reconnect()) {
      return deleteTask(taskId);
    }
    throw error;
  }
}

// ============================================
// Quota Counter Operations
// ============================================

/**
 * Get quota counter for an API
 * @param {string} apiKey - API identifier (api1, api2, api3)
 * @returns {Promise<object>} Quota data {count, limit, resetDate}
 */
export async function getQuota(apiKey) {
  try {
    const client = getRedisClient();
    const count = await client.get(`quota:${apiKey}:count`) || 0;
    const resetDate = await client.get(`quota:${apiKey}:reset`) || Date.now();
    
    // Get limit from environment
    const limits = {
      api1: parseInt(process.env.RAPIDAPI_1_MONTHLY_QUOTA || '300'),
      api2: parseInt(process.env.RAPIDAPI_2_MONTHLY_QUOTA || '300'),
      api3: parseInt(process.env.RAPIDAPI_3_DAILY_QUOTA || '500')
    };

    return {
      count: parseInt(count),
      limit: limits[apiKey] || 0,
      resetDate: parseInt(resetDate),
      remaining: Math.max(0, limits[apiKey] - parseInt(count))
    };
  } catch (error) {
    console.error('Error getting quota:', error);
    if (await reconnect()) {
      return getQuota(apiKey);
    }
    throw error;
  }
}

/**
 * Increment quota counter
 * @param {string} apiKey - API identifier
 * @returns {Promise<number>} New count value
 */
export async function incrementQuota(apiKey) {
  try {
    const client = getRedisClient();
    const newCount = await client.incr(`quota:${apiKey}:count`);
    
    // Set reset date if not exists
    const resetExists = await client.exists(`quota:${apiKey}:reset`);
    if (!resetExists) {
      const resetDate = apiKey === 'api3' 
        ? getNextDayTimestamp() 
        : getNextMonthTimestamp();
      await client.set(`quota:${apiKey}:reset`, resetDate);
    }

    return newCount;
  } catch (error) {
    console.error('Error incrementing quota:', error);
    if (await reconnect()) {
      return incrementQuota(apiKey);
    }
    throw error;
  }
}

/**
 * Reset quota counter
 * @param {string} apiKey - API identifier
 * @returns {Promise<boolean>} Success status
 */
export async function resetQuota(apiKey) {
  try {
    const client = getRedisClient();
    await client.set(`quota:${apiKey}:count`, 0);
    
    const resetDate = apiKey === 'api3' 
      ? getNextDayTimestamp() 
      : getNextMonthTimestamp();
    await client.set(`quota:${apiKey}:reset`, resetDate);
    
    return true;
  } catch (error) {
    console.error('Error resetting quota:', error);
    if (await reconnect()) {
      return resetQuota(apiKey);
    }
    throw error;
  }
}

// ============================================
// Rate Limit Operations
// ============================================

/**
 * Check if IP is rate limited
 * @param {string} ip - Client IP address
 * @param {number} limit - Max requests per minute (default: 5)
 * @returns {Promise<object>} {limited, count, retryAfter}
 */
export async function checkRateLimit(ip, limit = 5) {
  try {
    const client = getRedisClient();
    const key = `ratelimit:${ip}`;
    const count = await client.get(key) || 0;
    
    return {
      limited: parseInt(count) >= limit,
      count: parseInt(count),
      retryAfter: 60 // seconds
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    if (await reconnect()) {
      return checkRateLimit(ip, limit);
    }
    throw error;
  }
}

/**
 * Increment rate limit counter with TTL
 * @param {string} ip - Client IP address
 * @param {number} ttl - Time to live in seconds (default: 60)
 * @returns {Promise<number>} New count value
 */
export async function incrementRateLimit(ip, ttl = 60) {
  try {
    const client = getRedisClient();
    const key = `ratelimit:${ip}`;
    
    const count = await client.incr(key);
    
    // Set TTL only on first increment
    if (count === 1) {
      await client.expire(key, ttl);
    }
    
    return count;
  } catch (error) {
    console.error('Error incrementing rate limit:', error);
    if (await reconnect()) {
      return incrementRateLimit(ip, ttl);
    }
    throw error;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get timestamp for next day at midnight UTC
 */
function getNextDayTimestamp() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

/**
 * Get timestamp for next month at midnight UTC
 */
function getNextMonthTimestamp() {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  nextMonth.setUTCDate(1);
  nextMonth.setUTCHours(0, 0, 0, 0);
  return nextMonth.getTime();
}

// ============================================
// Graceful Shutdown
// ============================================

/**
 * Graceful shutdown handler
 */
export function shutdown() {
  if (redisClient) {
    console.log('Closing Redis connection...');
    redisClient = null;
    isConnected = false;
  }
}

// Register shutdown handlers
if (typeof process !== 'undefined') {
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('exit', shutdown);
}

// Export all functions
export default {
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
  incrementRateLimit,
  shutdown
};
