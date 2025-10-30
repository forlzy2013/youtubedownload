/**
 * Redis Client Test File
 * Run with: node api/lib/redis-client.test.js
 * 
 * Note: This is a manual test file for development.
 * Requires environment variables to be set.
 */

import {
  getRedisClient,
  checkHealth,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  getQuota,
  incrementQuota,
  resetQuota,
  checkRateLimit,
  incrementRateLimit
} from './redis-client.js';

async function runTests() {
  console.log('🧪 Starting Redis Client Tests...\n');

  try {
    // Test 1: Health Check
    console.log('Test 1: Health Check');
    const health = await checkHealth();
    console.log('✅ Health:', health);
    console.log('');

    // Test 2: Create Task
    console.log('Test 2: Create Task');
    const taskId = 'test-task-' + Date.now();
    await createTask(taskId, {
      videoUrl: 'https://youtube.com/watch?v=test',
      videoId: 'test',
      videoTitle: 'Test Video'
    });
    console.log('✅ Task created:', taskId);
    console.log('');

    // Test 3: Get Task
    console.log('Test 3: Get Task');
    const task = await getTask(taskId);
    console.log('✅ Task retrieved:', task);
    console.log('');

    // Test 4: Update Task
    console.log('Test 4: Update Task');
    await updateTask(taskId, {
      status: 'processing',
      progress: 50
    });
    const updatedTask = await getTask(taskId);
    console.log('✅ Task updated:', updatedTask);
    console.log('');

    // Test 5: Quota Operations
    console.log('Test 5: Quota Operations');
    const quota1 = await getQuota('api1');
    console.log('✅ API 1 Quota:', quota1);
    
    await incrementQuota('api1');
    const quota2 = await getQuota('api1');
    console.log('✅ API 1 Quota after increment:', quota2);
    console.log('');

    // Test 6: Rate Limit Operations
    console.log('Test 6: Rate Limit Operations');
    const testIp = '192.168.1.1';
    
    const rateLimit1 = await checkRateLimit(testIp);
    console.log('✅ Rate limit check:', rateLimit1);
    
    await incrementRateLimit(testIp);
    const rateLimit2 = await checkRateLimit(testIp);
    console.log('✅ Rate limit after increment:', rateLimit2);
    console.log('');

    // Test 7: Delete Task
    console.log('Test 7: Delete Task');
    await deleteTask(taskId);
    const deletedTask = await getTask(taskId);
    console.log('✅ Task deleted (should be null):', deletedTask);
    console.log('');

    console.log('🎉 All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
