/**
 * /api/task-status - Query async task status
 * Returns task progress and download URL when complete
 */

import { getTask } from './lib/redis-client.js';

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

  try {
    // Extract taskId from query parameters
    const { taskId } = req.query;

    // Validate taskId parameter
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: taskId'
      });
    }

    // Query Redis for task data
    const task = await getTask(taskId);

    // Return 404 if task not found or expired
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or expired. Tasks expire after 24 hours.'
      });
    }

    // Return task object
    return res.status(200).json({
      success: true,
      data: {
        taskId: task.taskId,
        status: task.status,
        progress: task.progress || 0,
        downloadUrl: task.downloadUrl || null,
        filename: task.filename || null,
        error: task.error || null,
        videoId: task.videoId || null,
        videoTitle: task.videoTitle || null,
        createdAt: task.createdAt || null,
        updatedAt: task.updatedAt || null
      }
    });

  } catch (error) {
    console.error('Error in task-status endpoint:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again later.'
    });
  }
}
