/**
 * RapidAPI Client Library
 * Unified client for all 3 YouTube MP3 download APIs
 */

/**
 * API 1: YouTube MP3 (youtube-mp36)
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<object>} {success, downloadUrl?, error?}
 */
export async function callAPI1(videoId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

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
      throw new Error(`API 1 returned status ${response.status}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data || data.status !== 'ok' || !data.link || typeof data.link !== 'string') {
      throw new Error('Invalid response structure: missing required fields (link, status)');
    }

    return {
      success: true,
      downloadUrl: data.link,
      title: data.title || null,
      duration: data.duration || null
    };

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'API 1 timeout (>5 seconds)'
      };
    }

    return {
      success: false,
      error: `API 1 failed: ${error.message}`
    };
  }
}

/**
 * API 2: YouTube MP3 2025 (youtube-mp3-2025)
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<object>} {success, downloadUrl?, error?}
 */
export async function callAPI2(videoId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      'https://youtube-mp3-2025.p.rapidapi.com/v1/social/youtube/audio',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'youtube-mp3-2025.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY
        },
        body: JSON.stringify({ id: videoId }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API 2 returned status ${response.status}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data || !data.url || typeof data.url !== 'string' || data.ext !== 'mp3') {
      throw new Error('Invalid response structure: missing required fields (url, ext)');
    }

    return {
      success: true,
      downloadUrl: data.url,
      quality: data.quality || null
    };

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'API 2 timeout (>5 seconds)'
      };
    }

    return {
      success: false,
      error: `API 2 failed: ${error.message}`
    };
  }
}

/**
 * API 3: YouTube Info & Download API (youtube-info-download-api)
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<object>} {success, downloadUrl?, error?}
 */
export async function callAPI3(videoId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    // Construct full YouTube URL and encode it
    const fullYouTubeURL = `https://www.youtube.com/watch?v=${videoId}`;
    const encodedURL = encodeURIComponent(fullYouTubeURL);

    const response = await fetch(
      `https://youtube-info-download-api.p.rapidapi.com/ajax/download.php?format=mp3&url=${encodedURL}&audio_quality=128`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'youtube-info-download-api.p.rapidapi.com',
          'x-rapidapi-key': process.env.RAPIDAPI_KEY
        },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API 3 returned status ${response.status}`);
    }

    const data = await response.json();

    // Validate response structure - API 3 returns different structure
    // Look for download URL in various possible fields
    let downloadUrl = null;
    
    if (data.download_url) {
      downloadUrl = data.download_url;
    } else if (data.url) {
      downloadUrl = data.url;
    } else if (data.link) {
      downloadUrl = data.link;
    } else if (data.data && data.data.url) {
      downloadUrl = data.data.url;
    }

    if (!downloadUrl || typeof downloadUrl !== 'string') {
      throw new Error('Invalid response structure: no valid download URL found');
    }

    return {
      success: true,
      downloadUrl: downloadUrl
    };

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'API 3 timeout (>5 seconds)'
      };
    }

    return {
      success: false,
      error: `API 3 failed: ${error.message}`
    };
  }
}

/**
 * Try all APIs in priority order with fallback
 * @param {string} videoId - YouTube video ID
 * @param {Array<number>} apiPriority - Array of API numbers to try (default: [1, 2, 3])
 * @returns {Promise<object>} {success, downloadUrl?, error?, apiUsed?}
 */
export async function tryAPIsWithFallback(videoId, apiPriority = [1, 2, 3]) {
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

    console.log(`Trying API ${apiNum}...`);
    const result = await apiCall(videoId);

    if (result.success) {
      console.log(`API ${apiNum} succeeded`);
      return {
        ...result,
        apiUsed: apiNum
      };
    }

    console.log(`API ${apiNum} failed: ${result.error}`);
  }

  return {
    success: false,
    error: 'All APIs failed'
  };
}

/**
 * Get video info using API 1 (fastest for metadata)
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<object>} Video info or error
 */
export async function getVideoInfo(videoId) {
  return await callAPI1(videoId);
}

// Export individual API functions and utility
export default {
  callAPI1,
  callAPI2,
  callAPI3,
  tryAPIsWithFallback,
  getVideoInfo
};
