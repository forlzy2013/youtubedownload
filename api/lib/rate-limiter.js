/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP
 */

import { checkRateLimit, incrementRateLimit } from './redis-client.js';

/**
 * Check if IP is rate limited
 * @param {string} ip - Client IP address
 * @param {number} limit - Max requests per minute (default: 5)
 * @param {number} ttl - Time window in seconds (default: 60)
 * @returns {Promise<object>} {limited: boolean, count: number, retryAfter: number}
 */
export async function isLimited(ip, limit = 5, ttl = 60) {
  try {
    const result = await checkRateLimit(ip, limit);
    
    return {
      limited: result.limited,
      count: result.count,
      retryAfter: result.retryAfter,
      limit: limit
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the request (fail open)
    return {
      limited: false,
      count: 0,
      retryAfter: 0,
      limit: limit
    };
  }
}

/**
 * Increment rate limit counter for IP
 * @param {string} ip - Client IP address
 * @param {number} ttl - Time to live in seconds (default: 60)
 * @returns {Promise<number>} New count value
 */
export async function incrementLimit(ip, ttl = 60) {
  try {
    return await incrementRateLimit(ip, ttl);
  } catch (error) {
    console.error('Error incrementing rate limit:', error);
    return 0;
  }
}

/**
 * Rate limiting middleware for Vercel serverless functions
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {number} limit - Max requests per minute (default: 5)
 * @returns {Promise<boolean>} True if request should be blocked
 */
export async function rateLimitMiddleware(req, res, limit = 5) {
  // Extract client IP
  const ip = getClientIP(req);
  
  // Check if IP is rate limited
  const rateLimitStatus = await isLimited(ip, limit);
  
  if (rateLimitStatus.limited) {
    // Return 429 Too Many Requests
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: rateLimitStatus.retryAfter,
      limit: rateLimitStatus.limit,
      current: rateLimitStatus.count
    });
    
    return true; // Request blocked
  }
  
  // Increment counter
  await incrementLimit(ip);
  
  return false; // Request allowed
}

/**
 * Get client IP address from request
 * @param {object} req - Request object
 * @returns {string} Client IP address
 */
export function getClientIP(req) {
  // Try various headers in order of preference
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = req.headers['cf-connecting-ip'];
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to connection remote address
  return req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         'unknown';
}

/**
 * Create rate limit response headers
 * @param {number} limit - Max requests per minute
 * @param {number} remaining - Remaining requests
 * @param {number} reset - Unix timestamp when limit resets
 * @returns {object} Headers object
 */
export function createRateLimitHeaders(limit, remaining, reset) {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, remaining).toString(),
    'X-RateLimit-Reset': reset.toString()
  };
}

// Export all functions
export default {
  isLimited,
  incrementLimit,
  rateLimitMiddleware,
  getClientIP,
  createRateLimitHeaders
};
