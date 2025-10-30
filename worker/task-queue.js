/**
 * Task Queue System
 * Manages concurrent task execution with queue
 */

class TaskQueue {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }

  /**
   * Add task to queue
   * @param {Function} taskFn - Async function to execute
   * @returns {Promise<void>}
   */
  async add(taskFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ taskFn, resolve, reject });
      this.process();
    });
  }

  /**
   * Process queue with concurrency control
   */
  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const { taskFn, resolve, reject } = this.queue.shift();
    this.running++;

    try {
      const result = await taskFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process(); // Process next task
    }
  }

  /**
   * Get current queue size
   * @returns {number} Queue length
   */
  size() {
    return this.queue.length;
  }

  /**
   * Get running task count
   * @returns {number} Running tasks
   */
  getRunning() {
    return this.running;
  }
}

module.exports = TaskQueue;
