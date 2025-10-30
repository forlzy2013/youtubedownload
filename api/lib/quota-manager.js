/**
 * API Quota Management System
 * Manages RapidAPI usage quotas and weighted API selection
 */

import { getQuota, incrementQuota, resetQuota } from './redis-client.js';

/**
 * QuotaManager Class
 */
export class QuotaManager {
  constructor() {
    this.quotaLimits = {
      api1: parseInt(process.env.RAPIDAPI_1_MONTHLY_QUOTA || '300'),
      api2: parseInt(process.env.RAPIDAPI_2_MONTHLY_QUOTA || '300'),
      api3: parseInt(process.env.RAPIDAPI_3_DAILY_QUOTA || '500')
    };

    // Weighted selection: API 1:2:3 = 1:1:8 (10%, 10%, 80%)
    this.defaultWeights = {
      api1: 1,
      api2: 1,
      api3: 8
    };
  }

  /**
   * Get available APIs with weighted selection
   * @returns {Promise<Array<number>>} Array of API numbers in priority order
   */
  async getAvailableAPIs() {
    try {
      // Check and reset quotas if needed
      await this.checkAndResetQuotas();

      // Get current quota status for all APIs
      const quotas = await Promise.all([
        getQuota('api1'),
        getQuota('api2'),
        getQuota('api3')
      ]);

      // Check which APIs are available (not exhausted)
      const availableAPIs = [];
      const weights = [];

      for (let i = 0; i < 3; i++) {
        const apiKey = `api${i + 1}`;
        const quota = quotas[i];
        const usagePercent = (quota.count / quota.limit) * 100;

        // Log warning if usage > 80%
        if (usagePercent >= 80 && usagePercent < 100) {
          console.warn(`⚠️ API ${i + 1} quota at ${usagePercent.toFixed(1)}% (${quota.count}/${quota.limit})`);
        }

        // Include API if not exhausted
        if (quota.count < quota.limit) {
          availableAPIs.push(i + 1);
          weights.push(this.defaultWeights[apiKey]);
        } else {
          console.warn(`❌ API ${i + 1} quota exhausted (${quota.count}/${quota.limit})`);
        }
      }

      // If no APIs available, return empty array
      if (availableAPIs.length === 0) {
        console.error('🚨 All API quotas exhausted!');
        return [];
      }

      // Weighted random selection for primary API
      const primaryAPI = this.weightedRandomSelect(availableAPIs, weights);

      // Build priority list: primary first, then others
      const priorityList = [primaryAPI];
      for (const api of availableAPIs) {
        if (api !== primaryAPI) {
          priorityList.push(api);
        }
      }

      console.log(`📊 Available APIs: [${availableAPIs.join(', ')}]`);
      console.log(`🎯 Priority order: [${priorityList.join(', ')}]`);

      return priorityList;

    } catch (error) {
      console.error('Error getting available APIs:', error);
      // Fallback to default order if error
      return [1, 2, 3];
    }
  }

  /**
   * Increment usage counter for an API
   * @param {number} apiNum - API number (1, 2, or 3)
   * @returns {Promise<number>} New count value
   */
  async incrementUsage(apiNum) {
    try {
      const apiKey = `api${apiNum}`;
      const newCount = await incrementQuota(apiKey);
      
      const quota = await getQuota(apiKey);
      const usagePercent = (quota.count / quota.limit) * 100;
      
      console.log(`📈 API ${apiNum} usage: ${quota.count}/${quota.limit} (${usagePercent.toFixed(1)}%)`);
      
      return newCount;
    } catch (error) {
      console.error(`Error incrementing usage for API ${apiNum}:`, error);
      throw error;
    }
  }

  /**
   * Check and reset quotas if needed
   * @returns {Promise<void>}
   */
  async checkAndResetQuotas() {
    try {
      const now = new Date();
      const currentMonth = now.getUTCMonth();
      const currentDate = now.getUTCDate();
      const currentYear = now.getUTCFullYear();

      // Check API 1 and API 2 (monthly quotas)
      for (const apiKey of ['api1', 'api2']) {
        const quota = await getQuota(apiKey);
        
        if (quota.resetDate) {
          const resetDate = new Date(quota.resetDate);
          const resetMonth = resetDate.getUTCMonth();
          const resetYear = resetDate.getUTCFullYear();

          // Reset if current month > stored month or new year
          if (currentYear > resetYear || (currentYear === resetYear && currentMonth > resetMonth)) {
            console.log(`🔄 Resetting ${apiKey} quota (monthly reset)`);
            await resetQuota(apiKey);
          }
        }
      }

      // Check API 3 (daily quota)
      const quota3 = await getQuota('api3');
      
      if (quota3.resetDate) {
        const resetDate = new Date(quota3.resetDate);
        const resetDay = resetDate.getUTCDate();
        const resetMonth = resetDate.getUTCMonth();
        const resetYear = resetDate.getUTCFullYear();

        // Reset if current date > stored date
        if (
          currentYear > resetYear ||
          (currentYear === resetYear && currentMonth > resetMonth) ||
          (currentYear === resetYear && currentMonth === resetMonth && currentDate > resetDay)
        ) {
          console.log(`🔄 Resetting api3 quota (daily reset)`);
          await resetQuota('api3');
        }
      }

    } catch (error) {
      console.error('Error checking/resetting quotas:', error);
    }
  }

  /**
   * Weighted random selection
   * @param {Array} items - Array of items to select from
   * @param {Array<number>} weights - Array of weights for each item
   * @returns {*} Selected item
   */
  weightedRandomSelect(items, weights) {
    // Calculate total weight
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

    // Generate random number between 0 and totalWeight
    let random = Math.random() * totalWeight;

    // Select item based on weight
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    // Fallback to first item
    return items[0];
  }

  /**
   * Get quota status for all APIs
   * @returns {Promise<object>} Quota status for all APIs
   */
  async getQuotaStatus() {
    try {
      const quotas = await Promise.all([
        getQuota('api1'),
        getQuota('api2'),
        getQuota('api3')
      ]);

      return {
        api1: {
          ...quotas[0],
          usagePercent: (quotas[0].count / quotas[0].limit) * 100,
          type: 'monthly'
        },
        api2: {
          ...quotas[1],
          usagePercent: (quotas[1].count / quotas[1].limit) * 100,
          type: 'monthly'
        },
        api3: {
          ...quotas[2],
          usagePercent: (quotas[2].count / quotas[2].limit) * 100,
          type: 'daily'
        }
      };
    } catch (error) {
      console.error('Error getting quota status:', error);
      throw error;
    }
  }
}

// Export singleton instance
let quotaManagerInstance = null;

export function getQuotaManager() {
  if (!quotaManagerInstance) {
    quotaManagerInstance = new QuotaManager();
  }
  return quotaManagerInstance;
}

export default {
  QuotaManager,
  getQuotaManager
};
