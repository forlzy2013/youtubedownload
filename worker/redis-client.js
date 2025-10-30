/**
 * Render Worker Redis Client
 * Simplified Redis client for worker operations
 */

const { Redis } = require('@upstash/redis');

let redisClient = null;

/**
 * Get Redis client instance
 */
function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    });
  }
  return redisClient;
}

/**
 * Get task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<object|null>} Task data
 */
async function getTask(taskId) {
  try {
    const client = getRedisClient();
    const data = await client.get(`task:${taskId}`);
    
    if (!data) {
      return null;
    }

    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error('Error getting task:', error);
    throw error;
  }
}

/**
 * Update task
 * @param {string} taskId - Task ID
 * @param {object} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
async function updateTask(taskId, updates) {
  try {
    const client = getRedisClient();
    const task = await getTask(taskId);
    
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: Date.now()
    };

    // Update with 24-hour TTL extension
    await client.set(`task:${taskId}`, JSON.stringify(updatedTask), { ex: 86400 });
    return true;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

module.exports = {
  getRedisClient,
  getTask,
  updateTask
};
