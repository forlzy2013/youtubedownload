/**
 * /api/video-info - Get YouTube video metadata
 * Vercel Serverless Function
 */

/**
 * Main handler function
 * @param {object} req - Request object
 * @param {object} res - Response object
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

  try {
    // Extract URL from query parameters
    const { url } = req.query;

    // Validate URL parameter
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: url'
      });
    }

    // Extract video ID from URL
    const videoId = extractVideoId(url);

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid YouTube URL. Could not extract video ID.'
      });
    }

    // Try to fetch video info from RapidAPI (with timeout)
    let videoInfo;
    try {
      videoInfo = await fetchVideoInfoWithTimeout(videoId, 5000);
    } catch (error) {
      console.error('RapidAPI fetch failed:', error.message);
      
      // Fallback to basic info extraction
      videoInfo = getBasicVideoInfo(videoId, url);
    }

    // Return success response
    return res.status(200).json({
      success: true,
      data: videoInfo
    });

  } catch (error) {
    console.error('Error in video-info endpoint:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.'
    });
  }
}

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null
 */
function extractVideoId(url) {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?.*)?/,
    /(?:https?:\/\/)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:\?.*)?/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Fetch video info with timeout
 * @param {string} videoId - YouTube video ID
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<object>} Video info
 */
async function fetchVideoInfoWithTimeout(videoId, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(
      `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`RapidAPI returned status ${response.status}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data || data.status !== 'ok' || !data.link) {
      throw new Error('Invalid response structure from RapidAPI');
    }

    // Extract and return video info
    return {
      videoId: videoId,
      title: data.title || 'Unknown Title',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      duration: formatDuration(data.duration || 0),
      author: 'YouTube', // API 1 doesn't provide author info
      durationSeconds: data.duration || 0
    };

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    throw error;
  }
}

/**
 * Get basic video info as fallback
 * @param {string} videoId - YouTube video ID
 * @param {string} url - Original YouTube URL
 * @returns {object} Basic video info
 */
function getBasicVideoInfo(videoId, url) {
  return {
    videoId: videoId,
    title: `YouTube Video ${videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    duration: 'Unknown',
    author: 'YouTube',
    durationSeconds: 0,
    fallback: true
  };
}

/**
 * Format duration from seconds to MM:SS or HH:MM:SS
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
  if (!seconds || seconds === 0) {
    return '0:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
