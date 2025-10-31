/**
 * Render Worker Express Server
 * Handles YouTube MP3 conversion using yt-dlp and ffmpeg
 */

const express = require('express');
const app = express();

// ============================================
// Environment Variable Validation
// ============================================

const requiredEnvVars = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'R2_ENDPOINT',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL'
];

const optionalEnvVars = {
  'MAX_CONCURRENT_TASKS': '3',
  'TASK_TIMEOUT': '120000',
  'MAX_FILE_SIZE': '104857600', // 100MB
  'SMALL_FILE_THRESHOLD': '5242880' // 5MB
};

// Check required variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease set all required environment variables and restart the server.');
  process.exit(1);
}

// Set optional variables with defaults
Object.entries(optionalEnvVars).forEach(([varName, defaultValue]) => {
  if (!process.env[varName]) {
    process.env[varName] = defaultValue;
    console.log(`ℹ️  Using default value for ${varName}: ${defaultValue}`);
  }
});

console.log('✅ All required environment variables are set');

// ============================================
// Middleware
// ============================================

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// Global State
// ============================================

const startTime = Date.now();
let queueSize = 0;

// ============================================
// Routes
// ============================================

/**
 * GET /health - Health check endpoint
 */
app.get('/health', (req, res) => {
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  res.status(200).json({
    status: 'ok',
    uptime: uptime,
    timestamp: Date.now(),
    queueSize: queueSize,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    }
  });
});

/**
 * POST /download - Download endpoint
 */
app.post('/download', async (req, res) => {
  const { taskId, url } = req.body;

  // Validate request body
  if (!taskId || !url) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: taskId and url'
    });
  }

  console.log(`📥 Received download request for task ${taskId}`);

  // Return immediate response
  res.status(200).json({
    success: true,
    message: 'Task queued',
    taskId: taskId
  });

  // Process task asynchronously
  queueSize++;
  console.log(`📋 Task ${taskId} queued (queue size: ${queueSize})`);
  
  // Import and call download handler
  const downloadHandler = require('./download-handler');
  
  // Process in background (don't await)
  downloadHandler.process(taskId, url)
    .then(() => {
      queueSize--;
      console.log(`✅ Task ${taskId} completed successfully (queue size: ${queueSize})`);
    })
    .catch((error) => {
      queueSize--;
      console.error(`❌ Task ${taskId} failed: ${error.message} (queue size: ${queueSize})`);
    });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 Render Worker Server Started');
  console.log('================================');
  console.log(`Port: ${PORT}`);
  console.log(`Node: ${process.version}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Max Concurrent Tasks: ${process.env.MAX_CONCURRENT_TASKS}`);
  console.log(`Task Timeout: ${process.env.TASK_TIMEOUT}ms`);
  console.log(`Max File Size: ${Math.round(parseInt(process.env.MAX_FILE_SIZE) / 1024 / 1024)}MB`);
  console.log(`Small File Threshold: ${Math.round(parseInt(process.env.SMALL_FILE_THRESHOLD) / 1024 / 1024)}MB`);
  console.log('================================');
  console.log('');
});

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
