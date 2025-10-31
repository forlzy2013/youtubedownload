/**
 * /api/download - Smart routing download endpoint
 * Tries RapidAPI (Fast Track) first, falls back to Render Worker (Stable Track)
 */

import { rateLimitMiddleware } from './lib/rate-limiter.js';
import { getQuotaManager } from './lib/quota-manager.js';
import { tryAPIsWithFallback, callAPI1, callAPI2, callAPI3 } from './lib/rapidapi-client.js';
import { createTask } from './lib/redis-client.js';
import { sanitizeFilename, generateUUID, extractVideoId, sleep } from './lib/utils.js';

/**
 * Main handler function
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET or POST.'
    });
  }

  try {
    // Apply rate limiting (5 requests per minute per IP)
    const blocked = await rateLimitMiddleware(req, res, 5);
    if (blocked) {
      return; // Response already sent by middleware
    }

    // Extract URL from query or body
    const url = req.method === 'GET' ? req.query.url : req.body?.url;
    const forceStable = req.query.force_stable === 'true' || req.body?.force_stable === true;

    // Validate URL parameter
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: url'
      });
    }

    // Extract video ID
    const videoId = extractVideoId(url);

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid YouTube URL. Could not extract video ID.'
      });
    }

    console.log(`📥 Download request for video: ${videoId}`);

    // If forced to use Stable Track, skip Fast Track
    if (forceStable) {
      console.log('🔄 Forcing Stable Track (user requested or Fast Track failed)');
      return await handleStableTrack(videoId, url, res);
    }

    // Get available APIs from QuotaManager
    const quotaManager = getQuotaManager();
    const availableAPIs = await quotaManager.getAvailableAPIs();

    if (availableAPIs.length === 0) {
      console.warn('⚠️ All API quotas exhausted, going directly to Stable Track');
      return await handleStableTrack(videoId, url, res);
    }

    // Try Fast Track (RapidAPI)
    console.log(`🚀 Trying Fast Track with APIs: [${availableAPIs.join(', ')}]`);
    
    const fastTrackResult = await tryFastTrack(videoId, availableAPIs, quotaManager);

    if (fastTrackResult.success) {
      // Fast Track succeeded
      console.log(`✅ Fast Track succeeded with API ${fastTrackResult.apiUsed}`);
      
      // Generate filename
      const filename = sanitizeFilename(fastTrackResult.title || `youtube-${videoId}`);

      return res.status(200).json({
        success: true,
        type: 'direct',
        downloadUrl: fastTrackResult.downloadUrl,
        filename: filename,
        videoId: videoId,
        apiUsed: fastTrackResult.apiUsed
      });
    }

    // Fast Track failed, use Stable Track
    console.log('⚠️ Fast Track failed, switching to Stable Track');
    return await handleStableTrack(videoId, url, res);

  } catch (error) {
    console.error('Error in download endpoint:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.'
    });
  }
}

/**
 * Try Fast Track (RapidAPI) with retry logic
 * @param {string} videoId - YouTube video ID
 * @param {Array<number>} apiPriority - API priority list
 * @param {object} quotaManager - QuotaManager instance
 * @returns {Promise<object>} Result object
 */
async function tryFastTrack(videoId, apiPriority, quotaManager) {
  const apiCalls = {
    1: callAPI1,
    2: callAPI2,
    3: callAPI3
  };

  for (const apiNum of apiPriority) {
    const apiCall = apiCalls[apiNum];
    
    if (!apiCall) {
      continue;
    }

    console.log(`🔄 Trying API ${apiNum}...`);
    
    // Try API with retry logic
    let result = await apiCall(videoId);

    // Retry once on network error
    if (!result.success && result.error && result.error.includes('timeout')) {
      console.log(`⏱️ API ${apiNum} timeout, retrying after 2 seconds...`);
      await sleep(2000);
      result = await apiCall(videoId);
    }

    if (result.success) {
      // Validate response format
      if (!result.downloadUrl || typeof result.downloadUrl !== 'string') {
        console.error(`❌ API ${apiNum} returned invalid response format`);
        continue;
      }

      console.log(`✅ API ${apiNum} succeeded`);
      
      // Increment usage counter
      await quotaManager.incrementUsage(apiNum);

      return {
        ...result,
        apiUsed: apiNum
      };
    }

    console.log(`❌ API ${apiNum} failed: ${result.error}`);
  }

  return {
    success: false,
    error: 'All Fast Track APIs failed'
  };
}

/**
 * Handle Stable Track (Render Worker)
 * @param {string} videoId - YouTube video ID
 * @param {string} url - Original YouTube URL
 * @param {object} res - Response object
 * @returns {Promise<void>}
 */
async function handleStableTrack(videoId, url, res) {
  try {
    // Generate task ID
    const taskId = generateUUID();

    console.log(`📋 Creating task ${taskId} for Stable Track`);

    // Create task in Redis
    await createTask(taskId, {
      videoUrl: url,
      videoId: videoId,
      videoTitle: `YouTube Video ${videoId}`,
      status: 'pending',
      progress: 0
    });

    // Send async request to Render Worker (fire-and-forget)
    const renderWorkerUrl = process.env.RENDER_WORKER_URL;
    
    if (renderWorkerUrl) {
      // Don't await - fire and forget
      fetch(`${renderWorkerUrl}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId: taskId,
          url: url
        })
      }).catch(error => {
        console.error('Error sending request to Render Worker:', error);
        // Task will remain in pending state and can be retried
      });

      console.log(`🚀 Sent async request to Render Worker for task ${taskId}`);
    } else {
      console.warn('⚠️ RENDER_WORKER_URL not configured, task will remain pending');
    }

    // Return task ID immediately
    return res.status(200).json({
      success: true,
      type: 'async',
      taskId: taskId,
      status: 'pending',
      videoId: videoId,
      message: 'Task created. Use /api/task-status to check progress.'
    });

  } catch (error) {
    console.error('Error in Stable Track:', error);
    throw error;
  }
}
