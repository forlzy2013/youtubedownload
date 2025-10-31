/**
 * YouTube MP3 Downloader - Frontend Application
 * Handles URL validation, video info fetching, and download management
 */

// ============================================
// URLValidator Class
// ============================================

class URLValidator {
  constructor() {
    // Regex patterns for different YouTube URL formats
    this.patterns = {
      // Standard: https://www.youtube.com/watch?v=VIDEO_ID
      // Also matches: http://youtube.com/watch?v=VIDEO_ID&other=params
      watch: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?/,
      
      // Short: https://youtu.be/VIDEO_ID
      // Also matches: http://youtu.be/VIDEO_ID?t=123
      short: /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?/,
      
      // Embed: https://www.youtube.com/embed/VIDEO_ID
      // Also matches: http://youtube.com/embed/VIDEO_ID?autoplay=1
      embed: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?.*)?/,
      
      // Mobile: https://m.youtube.com/watch?v=VIDEO_ID
      mobile: /(?:https?:\/\/)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?/,
      
      // Shorts: https://www.youtube.com/shorts/VIDEO_ID
      shorts: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:\?.*)?/
    };
  }

  /**
   * Validate YouTube URL and extract video ID
   * @param {string} url - YouTube URL to validate
   * @returns {object} {valid: boolean, videoId: string|null, error: string|null}
   */
  validate(url) {
    // Check if URL is empty
    if (!url || url.trim() === '') {
      return {
        valid: false,
        videoId: null,
        error: 'Please enter a YouTube URL'
      };
    }

    // Trim whitespace
    url = url.trim();

    // Try to extract video ID
    const videoId = this.extractVideoId(url);

    if (videoId) {
      return {
        valid: true,
        videoId: videoId,
        error: null
      };
    }

    // If no video ID found, return error
    return {
      valid: false,
      videoId: null,
      error: 'Invalid YouTube URL. Please use a valid format like:\n' +
             '• https://www.youtube.com/watch?v=VIDEO_ID\n' +
             '• https://youtu.be/VIDEO_ID\n' +
             '• https://www.youtube.com/embed/VIDEO_ID'
    };
  }

  /**
   * Extract video ID from YouTube URL
   * @param {string} url - YouTube URL
   * @returns {string|null} Video ID or null if not found
   */
  extractVideoId(url) {
    // Try each pattern
    for (const [format, pattern] of Object.entries(this.patterns)) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Check if URL is a valid YouTube URL (quick check)
   * @param {string} url - URL to check
   * @returns {boolean} True if URL contains youtube.com or youtu.be
   */
  isYouTubeURL(url) {
    return /(?:youtube\.com|youtu\.be)/.test(url);
  }

  /**
   * Get URL format type
   * @param {string} url - YouTube URL
   * @returns {string|null} Format type (watch, short, embed, mobile, shorts) or null
   */
  getURLFormat(url) {
    for (const [format, pattern] of Object.entries(this.patterns)) {
      if (pattern.test(url)) {
        return format;
      }
    }
    return null;
  }
}

// ============================================
// VideoInfoManager Class
// ============================================

class VideoInfoManager {
  constructor() {
    this.currentVideoData = null;
    this.isLoading = false;
  }

  /**
   * Fetch video info from API
   * @param {string} url - YouTube URL
   * @returns {Promise<object>} Video info data
   */
  async fetchInfo(url) {
    try {
      const response = await fetch(`/api/video-info?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch video information');
      }

      this.currentVideoData = data.data;
      return data.data;

    } catch (error) {
      console.error('Error fetching video info:', error);
      throw error;
    }
  }

  /**
   * Display video info in the UI
   * @param {object} data - Video data {videoId, title, author, duration, thumbnail}
   */
  displayInfo(data) {
    // Update video info elements
    document.getElementById('videoThumbnail').src = data.thumbnail;
    document.getElementById('videoThumbnail').alt = data.title;
    document.getElementById('videoTitle').textContent = data.title;
    document.getElementById('videoAuthor').textContent = data.author;
    document.getElementById('videoId').textContent = `Video ID: ${data.videoId}`;
    document.getElementById('videoDuration').textContent = data.duration;

    // Show download button
    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.classList.remove('hidden');
    downloadBtn.disabled = false;

    // Hide empty state and show video info
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('videoInfo').classList.remove('hidden');
  }

  /**
   * Clear video info display
   */
  clearInfo() {
    this.currentVideoData = null;
    document.getElementById('videoInfo').classList.add('hidden');
    document.getElementById('emptyState').classList.remove('hidden');
  }

  /**
   * Get current video data
   * @returns {object|null} Current video data
   */
  getCurrentVideo() {
    return this.currentVideoData;
  }
}

// ============================================
// DownloadManager Class
// ============================================

class DownloadManager {
  constructor() {
    this.currentTaskId = null;
    this.pollingInterval = null;
    this.isDownloading = false;
  }

  /**
   * Start download process
   * @param {string} url - YouTube URL
   * @returns {Promise<void>}
   */
  async startDownload(url) {
    if (this.isDownloading) {
      return;
    }

    this.isDownloading = true;

    try {
      console.log('Starting download for:', url);

      // Call /api/download
      const response = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Download failed');
      }

      // Handle response based on type
      if (data.type === 'direct') {
        // Fast Track - direct download
        this.handleDirectDownload(data);
      } else if (data.type === 'async') {
        // Stable Track - async task
        this.handleAsyncDownload(data);
      } else {
        throw new Error('Unknown response type');
      }

    } catch (error) {
      console.error('Download error:', error);
      this.isDownloading = false;
      showErrorWithRetry(error.message || 'Download failed. Please try again.');
    }
  }

  /**
   * Handle direct download (Fast Track)
   * @param {object} data - Response data {downloadUrl, filename}
   */
  async handleDirectDownload(data) {
    console.log('Fast Track download:', data);

    try {
      // Trigger browser download
      await this.triggerBrowserDownload(data.downloadUrl, data.filename);

      // Save to history
      const videoData = videoInfoManager.getCurrentVideo();
      historyManager.saveDownload({
        videoId: data.videoId,
        videoTitle: videoData?.title || `Video ${data.videoId}`,
        filename: data.filename,
        downloadUrl: data.downloadUrl,
        fileSize: 'Unknown'
      });

      // Show success message
      showSuccess(`Download completed! Using Fast Track (API ${data.apiUsed})`);
      
      // Reset downloading state
      this.isDownloading = false;
      
    } catch (error) {
      console.error('Fast Track download failed:', error);
      
      // Check if link expired or not found
      const isLinkExpired = error.message.includes('404') || 
                           error.message.includes('Not Found') ||
                           error.message.includes('expired') ||
                           error.message.includes('Failed to download file');
      
      if (isLinkExpired) {
        console.log('🔄 Fast Track link expired, falling back to Stable Track');
        showWarning('Fast Track link expired. Switching to Stable Track...');
        
        // Get original URL from input
        const urlInput = document.getElementById('urlInput');
        if (urlInput && urlInput.value) {
          try {
            // Call API to create Stable Track task
            console.log('📡 Requesting Stable Track fallback...');
            const response = await fetch(`/api/download?url=${encodeURIComponent(urlInput.value)}&force_stable=true`);
            const fallbackData = await response.json();
            
            console.log('📦 Stable Track response:', fallbackData);
            
            if (fallbackData.success && fallbackData.type === 'async') {
              // Handle as async download
              this.handleAsyncDownload(fallbackData);
              return; // Don't reset isDownloading - polling will handle it
            } else {
              throw new Error(fallbackData.error || 'Stable Track fallback failed');
            }
          } catch (fallbackError) {
            console.error('❌ Stable Track fallback failed:', fallbackError);
            showErrorWithRetry('Both Fast Track and Stable Track failed. Please try again.');
            this.isDownloading = false;
          }
        } else {
          showErrorWithRetry('Cannot fallback to Stable Track: URL not found');
          this.isDownloading = false;
        }
      } else {
        // Other errors - don't fallback
        showErrorWithRetry(error.message || 'Download failed. Please try again.');
        this.isDownloading = false;
      }
    }
  }

  /**
   * Handle async download (Stable Track)
   * @param {object} data - Response data {taskId, status}
   */
  handleAsyncDownload(data) {
    console.log('Stable Track download:', data);

    // Store task ID
    this.currentTaskId = data.taskId;

    // Show processing message
    showProcessing('Processing with Stable Track...');

    // Start polling
    this.pollTaskStatus();
  }

  /**
   * Sanitize filename for download
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    if (!filename) return 'download.mp3';
    
    // Try to decode URL encoding
    try {
      filename = decodeURIComponent(filename);
    } catch (e) {
      // Keep original if decode fails
    }
    
    // Remove invalid characters
    let sanitized = filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/\.{2,}/g, '.')
      .replace(/^[.-]+|[.-]+$/g, '')
      .trim();
    
    // Truncate if too long
    if (sanitized.length > 100) {
      sanitized = sanitized.substring(0, 96);
    }
    
    // Ensure .mp3 extension
    if (!sanitized.endsWith('.mp3')) {
      sanitized += '.mp3';
    }
    
    return sanitized || 'download.mp3';
  }

  /**
   * Trigger browser download using temporary <a> element
   * @param {string} url - Download URL
   * @param {string} filename - Filename
   */
  async triggerBrowserDownload(url, filename) {
    try {
      // Sanitize filename
      filename = this.sanitizeFilename(filename);
      
      // For external URLs, try direct download first, then proxy if CORS fails
      if (url.startsWith('http://') || url.startsWith('https://')) {
        console.log('Downloading from external URL:', url);
        
        // Show downloading message
        showProcessing('Downloading file...');
        
        let blob;
        let method = 'unknown';
        
        try {
          // Try direct download first
          console.log('Trying direct download...');
          const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit',
            headers: {
              'Accept': 'audio/mpeg,audio/*,*/*'
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          blob = await response.blob();
          method = 'direct';
          console.log('Direct download successful');
        } catch (directError) {
          console.warn('Direct download failed:', directError.message);
          
          // Try proxy download
          console.log('Trying proxy download...');
          const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(url)}`;
          const proxyResponse = await fetch(proxyUrl);
          
          if (!proxyResponse.ok) {
            const errorData = await proxyResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Proxy download failed');
          }
          
          blob = await proxyResponse.blob();
          method = 'proxy';
          console.log('Proxy download successful');
        }
        
        // Validate blob
        if (!blob || blob.size === 0) {
          throw new Error('Downloaded file is empty');
        }
        
        console.log(`Downloaded ${(blob.size / 1024 / 1024).toFixed(2)}MB via ${method}`);
        
        // Create object URL
        const blobUrl = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        }, 100);
        
        console.log('Download triggered successfully');
      } else {
        // For data URLs or same-origin URLs, use direct download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
        }, 100);
      }
    } catch (error) {
      console.error('Download error:', error);
      throw new Error(error.message || 'Failed to download file. Please try again.');
    }
  }

  /**
   * Poll task status (for Stable Track)
   */
  async pollTaskStatus() {
    if (!this.currentTaskId) {
      return;
    }

    // Clear any existing interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Poll every 3 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/task-status?taskId=${this.currentTaskId}`);
        const data = await response.json();

        if (response.status === 404) {
          // Task expired
          this.stopPolling();
          this.isDownloading = false;
          showErrorWithRetry('Task expired. Please try downloading again.');
          return;
        }

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to get task status');
        }

        const task = data.data;

        // Update progress
        updateProgress(task.progress, task.status);

        // Check if complete or failed
        if (task.status === 'completed') {
          this.stopPolling();
          this.isDownloading = false;

          // Save to history
          historyManager.saveDownload({
            videoId: task.videoId,
            videoTitle: task.videoTitle || `Video ${task.videoId}`,
            filename: task.filename,
            downloadUrl: task.downloadUrl,
            fileSize: 'Unknown'
          });

          // Trigger download
          this.triggerBrowserDownload(task.downloadUrl, task.filename);
          showSuccess('Download completed!');

        } else if (task.status === 'failed') {
          this.stopPolling();
          this.isDownloading = false;
          showErrorWithRetry(task.error || 'Download failed');
        }

      } catch (error) {
        console.error('Polling error:', error);
        this.stopPolling();
        this.isDownloading = false;
        showErrorWithRetry('Failed to check download status');
      }
    }, 3000);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    hideProcessing();
  }
}

// ============================================
// HistoryManager Class
// ============================================

class HistoryManager {
  constructor() {
    this.storageKey = 'youtube-mp3-history';
    this.maxItems = 50;
  }

  /**
   * Save download to history
   * @param {object} download - Download record
   */
  saveDownload(download) {
    const history = this.getHistory();
    
    // Add new download at the beginning
    history.unshift({
      videoId: download.videoId,
      videoTitle: download.videoTitle,
      filename: download.filename,
      downloadUrl: download.downloadUrl,
      timestamp: Date.now(),
      fileSize: download.fileSize || 'Unknown'
    });

    // Enforce 50-item limit (FIFO)
    if (history.length > this.maxItems) {
      history.splice(this.maxItems);
    }

    // Save to localStorage
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(history));
      this.displayHistory();
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  /**
   * Get history from localStorage
   * @returns {Array} History array
   */
  getHistory() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  }

  /**
   * Clear all history
   */
  clearHistory() {
    try {
      localStorage.removeItem(this.storageKey);
      this.displayHistory();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Remove expired tasks from history
   */
  removeExpiredTasks() {
    const history = this.getHistory();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Filter out items older than 24 hours
    const filtered = history.filter(item => {
      return (now - item.timestamp) < oneDayMs;
    });

    if (filtered.length !== history.length) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(filtered));
      } catch (error) {
        console.error('Error updating localStorage:', error);
      }
    }

    return filtered;
  }

  /**
   * Display history in UI
   */
  displayHistory() {
    const historySection = document.getElementById('historySection');
    const historyList = document.getElementById('historyList');

    if (!historySection || !historyList) {
      return;
    }

    // Remove expired tasks
    const history = this.removeExpiredTasks();

    if (history.length === 0) {
      historySection.classList.add('hidden');
      return;
    }

    // Show history section
    historySection.classList.remove('hidden');

    // Clear existing items
    historyList.innerHTML = '';

    // Add history items
    history.forEach((item, index) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `
        <div class="history-info">
          <div class="history-title">${this.escapeHtml(item.videoTitle)}</div>
          <div class="history-meta">
            <span class="history-date">${this.formatDate(item.timestamp)}</span>
            <span class="history-size">${item.fileSize}</span>
          </div>
        </div>
        <button class="btn btn-small btn-secondary redownload-btn" data-index="${index}">
          Re-download
        </button>
      `;

      historyList.appendChild(historyItem);
    });

    // Add event listeners to re-download buttons
    const redownloadBtns = historyList.querySelectorAll('.redownload-btn');
    redownloadBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.redownload(index);
      });
    });
  }

  /**
   * Re-download from history
   * @param {number} index - History item index
   */
  async redownload(index) {
    const history = this.getHistory();
    const item = history[index];

    if (!item) {
      return;
    }

    // Construct YouTube URL
    const url = `https://www.youtube.com/watch?v=${item.videoId}`;
    
    // Set URL in input
    document.getElementById('urlInput').value = url;

    // Trigger download
    await downloadManager.startDownload(url);
  }

  /**
   * Format timestamp to readable date
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Formatted date
   */
  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ============================================
// DOM Elements
// ============================================

const urlInput = document.getElementById('urlInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const loadingState = document.getElementById('loadingState');
const videoInfo = document.getElementById('videoInfo');
const emptyState = document.getElementById('emptyState');

// ============================================
// Global State
// ============================================

const validator = new URLValidator();
const videoInfoManager = new VideoInfoManager();
const downloadManager = new DownloadManager();
const historyManager = new HistoryManager();
let currentUrl = null;
let isAnalyzing = false;

// ============================================
// Event Listeners
// ============================================

// Real-time validation on input
urlInput.addEventListener('input', (e) => {
  const url = e.target.value.trim();
  
  // Clear error if input is empty
  if (url === '') {
    hideError();
    return;
  }

  // Quick check if it looks like a YouTube URL
  if (url.length > 10 && !validator.isYouTubeURL(url)) {
    showError('This doesn\'t look like a YouTube URL');
  } else {
    hideError();
  }
});

// Validate on Enter key
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleAnalyze();
  }
});

// Analyze button click
analyzeBtn.addEventListener('click', handleAnalyze);

// Download button click
const downloadBtn = document.getElementById('downloadBtn');
if (downloadBtn) {
  downloadBtn.addEventListener('click', async () => {
    if (currentUrl) {
      await downloadManager.startDownload(currentUrl);
    }
  });
}

// Clear history button click
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all download history?')) {
      historyManager.clearHistory();
    }
  });
}

// Display history on page load
historyManager.displayHistory();

// ============================================
// Main Functions
// ============================================

/**
 * Handle analyze button click
 */
async function handleAnalyze() {
  // Prevent multiple simultaneous requests
  if (isAnalyzing) {
    return;
  }

  const url = urlInput.value.trim();

  // Validate URL
  const result = validator.validate(url);

  if (!result.valid) {
    showError(result.error);
    return;
  }

  // Store current URL for retry
  currentUrl = url;

  // Hide error
  hideError();

  // Show loading state
  showLoading();

  // Fetch video info using VideoInfoManager
  try {
    const videoData = await videoInfoManager.fetchInfo(url);
    
    hideLoading();

    // Display video info
    videoInfoManager.displayInfo(videoData);

  } catch (error) {
    hideLoading();
    
    // Show error with retry button
    showErrorWithRetry(
      error.message || 'Network error. Please check your connection and try again.'
    );
  }
}

/**
 * Retry fetching video info
 */
async function retryAnalyze() {
  if (currentUrl) {
    urlInput.value = currentUrl;
    await handleAnalyze();
  }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
  errorText.textContent = message;
  errorMessage.classList.remove('hidden');
  
  // Remove retry button if exists
  const existingRetryBtn = errorMessage.querySelector('.retry-btn');
  if (existingRetryBtn) {
    existingRetryBtn.remove();
  }
  
  // Add shake animation
  errorMessage.style.animation = 'none';
  setTimeout(() => {
    errorMessage.style.animation = 'shake 0.5s';
  }, 10);
}

/**
 * Show error message with retry button
 * @param {string} message - Error message to display
 */
function showErrorWithRetry(message) {
  errorText.textContent = message;
  errorMessage.classList.remove('hidden');
  
  // Remove existing retry button if any
  const existingRetryBtn = errorMessage.querySelector('.retry-btn');
  if (existingRetryBtn) {
    existingRetryBtn.remove();
  }
  
  // Add retry button
  const retryBtn = document.createElement('button');
  retryBtn.className = 'btn btn-small btn-secondary retry-btn';
  retryBtn.innerHTML = '<span class="btn-text">Retry</span> <span class="btn-icon">🔄</span>';
  retryBtn.style.marginLeft = '10px';
  retryBtn.onclick = retryAnalyze;
  errorMessage.appendChild(retryBtn);
  
  // Add shake animation
  errorMessage.style.animation = 'none';
  setTimeout(() => {
    errorMessage.style.animation = 'shake 0.5s';
  }, 10);
}

/**
 * Hide error message
 */
function hideError() {
  errorMessage.classList.add('hidden');
  
  // Remove retry button if exists
  const existingRetryBtn = errorMessage.querySelector('.retry-btn');
  if (existingRetryBtn) {
    existingRetryBtn.remove();
  }
}

/**
 * Show loading state
 */
function showLoading() {
  isAnalyzing = true;
  analyzeBtn.disabled = true;
  urlInput.disabled = true;
  
  emptyState.classList.add('hidden');
  videoInfo.classList.add('hidden');
  loadingState.classList.remove('hidden');
}

/**
 * Hide loading state
 */
function hideLoading() {
  isAnalyzing = false;
  analyzeBtn.disabled = false;
  urlInput.disabled = false;
  
  loadingState.classList.add('hidden');
}



// ============================================
// Utility Functions
// ============================================

/**
 * Format duration from seconds to MM:SS or HH:MM:SS
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Sanitize filename for download
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
  // Remove illegal characters
  return filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 200);
}

// ============================================
// Add shake animation to CSS
// ============================================

const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);

// ============================================
// Initialize
// ============================================

console.log('YouTube MP3 Downloader initialized');
console.log('URLValidator ready');

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { URLValidator };
}


// ============================================
// Download Helper Functions
// ============================================

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
  const successMessage = document.getElementById('successMessage');
  const successText = document.getElementById('successText');
  
  if (successMessage && successText) {
    successText.textContent = message;
    successMessage.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      successMessage.classList.add('hidden');
    }, 5000);
  }
}

/**
 * Show processing message with progress
 * @param {string} message - Processing message
 */
function showProcessing(message) {
  const progressContainer = document.getElementById('progressContainer');
  const progressText = document.getElementById('progressText');
  
  if (progressContainer && progressText) {
    progressText.textContent = message;
    progressContainer.classList.remove('hidden');
  }
}

/**
 * Update progress bar
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} status - Status text
 */
function updateProgress(progress, status) {
  const progressFill = document.getElementById('progressFill');
  const progressPercent = document.getElementById('progressPercent');
  const progressText = document.getElementById('progressText');
  
  if (progressFill) {
    progressFill.style.width = `${progress}%`;
  }
  
  if (progressPercent) {
    progressPercent.textContent = `${progress}%`;
  }
  
  if (progressText) {
    const statusMessages = {
      'pending': 'Waiting in queue...',
      'processing': 'Converting to MP3...',
      'completed': 'Complete!',
      'failed': 'Failed'
    };
    progressText.textContent = statusMessages[status] || status;
  }
}

/**
 * Hide processing indicator
 */
function hideProcessing() {
  const progressContainer = document.getElementById('progressContainer');
  if (progressContainer) {
    progressContainer.classList.add('hidden');
  }
}
