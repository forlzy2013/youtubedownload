/**
 * Download Handler with Hybrid Storage Strategy
 * Handles yt-dlp download, conversion, and storage (base64 or R2)
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { updateTask } = require('./redis-client');

const execAsync = promisify(exec);

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

const SMALL_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const TASK_TIMEOUT = 120000; // 120 seconds

/**
 * Sanitize filename
 */
function sanitizeFilename(filename, maxLength = 200) {
  if (!filename) return 'download.mp3';
  
  let sanitized = filename
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, maxLength - 4);
  
  if (!sanitized.endsWith('.mp3')) {
    sanitized += '.mp3';
  }
  
  return sanitized || 'download.mp3';
}

/**
 * Process download task
 */
async function process(taskId, url) {
  const tempDir = `/tmp/${taskId}`;
  
  try {
    // Update status to processing
    await updateTask(taskId, {
      status: 'processing',
      progress: 10
    });

    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });

    // Execute yt-dlp with timeout
    const ytdlpPromise = downloadWithYtDlp(tempDir, url);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Processing timeout exceeded')), TASK_TIMEOUT)
    );

    await updateTask(taskId, { progress: 30 });

    const outputFile = await Promise.race([ytdlpPromise, timeoutPromise]);

    await updateTask(taskId, { progress: 80 });

    // Check file size and handle storage
    const stats = await fs.stat(outputFile);
    const fileSize = stats.size;

    let downloadUrl, filename;

    if (fileSize < SMALL_FILE_THRESHOLD) {
      // Small file: use base64
      const result = await handleSmallFile(outputFile);
      downloadUrl = result.downloadUrl;
      filename = result.filename;
    } else {
      // Large file: upload to R2
      try {
        const result = await uploadToR2(outputFile, taskId);
        downloadUrl = result.downloadUrl;
        filename = result.filename;
      } catch (r2Error) {
        console.error('R2 upload failed, trying compression:', r2Error);
        
        // Try compression
        const compressedFile = await compressFile(outputFile);
        const compressedStats = await fs.stat(compressedFile);
        
        if (compressedStats.size < SMALL_FILE_THRESHOLD) {
          const result = await handleSmallFile(compressedFile);
          downloadUrl = result.downloadUrl;
          filename = result.filename;
        } else {
          throw new Error('File too large, please try shorter video');
        }
      }
    }

    // Update task to completed
    await updateTask(taskId, {
      status: 'completed',
      progress: 100,
      downloadUrl,
      filename
    });

    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });

  } catch (error) {
    console.error('Download handler error:', error);
    
    // Update task to failed
    await updateTask(taskId, {
      status: 'failed',
      error: error.message
    });

    // Cleanup
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    throw error;
  }
}

/**
 * Download with yt-dlp
 */
async function downloadWithYtDlp(tempDir, url) {
  const command = `yt-dlp -x --audio-format mp3 --audio-quality 128K --max-filesize 100M --match-filter "duration < 3600" -o "${tempDir}/%(title)s.%(ext)s" "${url}"`;
  
  await execAsync(command);
  
  // Find the MP3 file
  const files = await fs.readdir(tempDir);
  const mp3File = files.find(f => f.endsWith('.mp3'));
  
  if (!mp3File) {
    throw new Error('No MP3 file generated');
  }
  
  return path.join(tempDir, mp3File);
}

/**
 * Handle small file (base64)
 */
async function handleSmallFile(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const base64 = fileBuffer.toString('base64');
  const downloadUrl = `data:audio/mp3;base64,${base64}`;
  const filename = sanitizeFilename(path.basename(filePath));
  
  return { downloadUrl, filename };
}

/**
 * Upload to R2
 */
async function uploadToR2(filePath, taskId) {
  const fileBuffer = await fs.readFile(filePath);
  const filename = sanitizeFilename(path.basename(filePath));
  const key = `${taskId}/${filename}`;
  
  await r2Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: 'audio/mpeg',
    Metadata: {
      'expiry': (Date.now() + 24 * 60 * 60 * 1000).toString()
    }
  }));
  
  const downloadUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
  
  return { downloadUrl, filename };
}

/**
 * Compress file with ffmpeg
 */
async function compressFile(filePath) {
  const compressedPath = filePath.replace('.mp3', '-compressed.mp3');
  const command = `ffmpeg -i "${filePath}" -b:a 96k "${compressedPath}"`;
  
  await execAsync(command);
  
  return compressedPath;
}

module.exports = {
  process,
  sanitizeFilename
};
