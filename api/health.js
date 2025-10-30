/**
 * /api/health - System health check endpoint
 * Checks Redis, RapidAPI quotas, and Render Worker status
 */

import { checkHealth as checkRedisHealth } from './lib/redis-client.js';
import { getQuotaManager } from './lib/quota-manager.js';
import { getRedisClient } from './lib/redis-client.js';

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.'
    });
  }

  const startTime = Date.now();

  try {
    // Check Redis connectivity
    const redisHealth = await checkRedisHealth();

    // Check RapidAPI quota status
    const quotaManager = getQuotaManager();
    const quotaStatus = await quotaManager.getQuotaStatus();

    // Check Render Worker health
    const workerHealth = await checkWorkerHealth();

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Determine overall health
    const isHealthy = redisHealth.healthy && workerHealth.status !== 'down';

    // Build response
    const healthData = {
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: Date.now(),
      responseTime: `${responseTime}ms`,
      services: {
        redis: {
          status: redisHealth.healthy ? 'healthy' : 'down',
          message: redisHealth.message
        },
        rapidapi: {
          status: 'healthy',
          quotas: {
            api1: {
              used: quotaStatus.api1.count,
              limit: quotaStatus.api1.limit,
              remaining: quotaStatus.api1.remaining,
              usagePercent: quotaStatus.api1.usagePercent.toFixed(1) + '%',
              type: quotaStatus.api1.type
            },
            api2: {
              used: quotaStatus.api2.count,
              limit: quotaStatus.api2.limit,
              remaining: quotaStatus.api2.remaining,
              usagePercent: quotaStatus.api2.usagePercent.toFixed(1) + '%',
              type: quotaStatus.api2.type
            },
            api3: {
              used: quotaStatus.api3.count,
              limit: quotaStatus.api3.limit,
              remaining: quotaStatus.api3.remaining,
              usagePercent: quotaStatus.api3.usagePercent.toFixed(1) + '%',
              type: quotaStatus.api3.type
            }
          }
        },
        renderWorker: {
          status: workerHealth.status,
          message: workerHealth.message,
          consecutiveFailures: workerHealth.consecutiveFailures,
          lastCheck: workerHealth.lastCheck
        }
      }
    };

    // Return 503 if any critical service is unavailable
    const statusCode = isHealthy ? 200 : 503;

    return res.status(statusCode).json({
      success: isHealthy,
      data: healthData
    });

  } catch (error) {
    console.error('Error in health endpoint:', error);
    
    return res.status(503).json({
      success: false,
      status: 'error',
      error: 'Health check failed',
      message: error.message
    });
  }
}

/**
 * Check Render Worker health with intelligent failure tracking
 * @returns {Promise<object>} Worker health status
 */
async function checkWorkerHealth() {
  const renderWorkerUrl = process.env.RENDER_WORKER_URL;

  if (!renderWorkerUrl) {
    return {
      status: 'unknown',
      message: 'Render Worker URL not configured',
      consecutiveFailures: 0,
      lastCheck: Date.now()
    };
  }

  try {
    // Get Redis client for storing health check history
    const redis = getRedisClient();
    const healthKey = 'worker:health:failures';
    const lastCheckKey = 'worker:health:lastcheck';

    // Get consecutive failure count
    let consecutiveFailures = parseInt(await redis.get(healthKey) || '0');

    // Check worker health with 10-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${renderWorkerUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Worker is healthy, reset failure count
        await redis.set(healthKey, '0', { ex: 300 }); // 5-minute TTL
        await redis.set(lastCheckKey, Date.now().toString(), { ex: 300 });

        return {
          status: 'healthy',
          message: 'Render Worker is responding',
          consecutiveFailures: 0,
          lastCheck: Date.now()
        };
      } else {
        // Worker returned error status
        consecutiveFailures++;
        await redis.set(healthKey, consecutiveFailures.toString(), { ex: 300 });
        await redis.set(lastCheckKey, Date.now().toString(), { ex: 300 });

        if (consecutiveFailures === 1) {
          return {
            status: 'warming_up',
            message: 'Render Worker may be starting up',
            consecutiveFailures: consecutiveFailures,
            lastCheck: Date.now()
          };
        } else if (consecutiveFailures >= 3) {
          return {
            status: 'degraded',
            message: 'Render Worker is experiencing issues',
            consecutiveFailures: consecutiveFailures,
            lastCheck: Date.now()
          };
        } else {
          return {
            status: 'warming_up',
            message: 'Render Worker health check failed',
            consecutiveFailures: consecutiveFailures,
            lastCheck: Date.now()
          };
        }
      }

    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Increment failure count
      consecutiveFailures++;
      await redis.set(healthKey, consecutiveFailures.toString(), { ex: 300 });
      await redis.set(lastCheckKey, Date.now().toString(), { ex: 300 });

      if (fetchError.name === 'AbortError') {
        // Timeout
        if (consecutiveFailures === 1) {
          return {
            status: 'warming_up',
            message: 'Render Worker timeout (may be cold starting)',
            consecutiveFailures: consecutiveFailures,
            lastCheck: Date.now()
          };
        } else if (consecutiveFailures >= 3) {
          return {
            status: 'degraded',
            message: 'Render Worker consistently timing out',
            consecutiveFailures: consecutiveFailures,
            lastCheck: Date.now()
          };
        } else {
          return {
            status: 'warming_up',
            message: 'Render Worker timeout',
            consecutiveFailures: consecutiveFailures,
            lastCheck: Date.now()
          };
        }
      }

      // Other network error
      if (consecutiveFailures >= 3) {
        return {
          status: 'down',
          message: 'Render Worker is not responding',
          consecutiveFailures: consecutiveFailures,
          lastCheck: Date.now()
        };
      } else {
        return {
          status: 'warming_up',
          message: 'Render Worker connection failed',
          consecutiveFailures: consecutiveFailures,
          lastCheck: Date.now()
        };
      }
    }

  } catch (error) {
    console.error('Error checking worker health:', error);
    
    return {
      status: 'unknown',
      message: 'Failed to check Render Worker health',
      consecutiveFailures: 0,
      lastCheck: Date.now()
    };
  }
}
