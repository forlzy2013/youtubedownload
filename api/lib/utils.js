/**
 * Utility Functions
 */

/**
 * Sanitize filename for download
 * Removes illegal characters and limits length
 * @param {string} filename - Original filename
 * @param {number} maxLength - Maximum length (default: 200)
 * @returns {string} Sanitized filename with .mp3 extension
 */
export function sanitizeFilename(filename, maxLength = 100) {
  if (!filename || typeof filename !== 'string') {
    return 'download.mp3';
  }

  // Try to decode URL encoding
  try {
    filename = decodeURIComponent(filename);
  } catch (e) {
    // Keep original if decode fails
  }

  // Remove illegal characters: < > : " / \ | ? * and control characters
  let sanitized = filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\.{2,}/g, '.')
    .trim();

  // Remove leading/trailing dots and dashes
  sanitized = sanitized.replace(/^[.-]+|[.-]+$/g, '');

  // Limit length (reserve 4 chars for .mp3)
  if (sanitized.length > maxLength - 4) {
    sanitized = sanitized.substring(0, maxLength - 4);
  }

  // Ensure it's not empty
  if (sanitized.length === 0) {
    sanitized = 'download';
  }

  // Add .mp3 extension if not present
  if (!sanitized.toLowerCase().endsWith('.mp3')) {
    sanitized += '.mp3';
  }

  return sanitized;
}

/**
 * Generate UUID v4
 * @returns {string} UUID
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null
 */
export function extractVideoId(url) {
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
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  sanitizeFilename,
  generateUUID,
  extractVideoId,
  sleep
};
