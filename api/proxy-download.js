/**
 * /api/proxy-download - Proxy download endpoint
 * Proxies external download URLs to avoid CORS issues
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

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    console.log('Proxying download from:', url);

    // Fetch the file
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`External server returned ${response.status}`);
    }

    // Get content type and length
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');

    // Check file size (Vercel has 4.5MB response limit)
    if (contentLength) {
      const sizeMB = parseInt(contentLength) / 1024 / 1024;
      if (sizeMB > 4.5) {
        return res.status(413).json({
          success: false,
          error: 'File too large for proxy (>4.5MB). Please use Stable Track.'
        });
      }
    }

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'attachment; filename="download.mp3"');
    res.setHeader('Cache-Control', 'no-cache');
    
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the response
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy download error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to download file. The link may have expired.'
    });
  }
}
