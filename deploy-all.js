#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const path = require('path');

// 加载环境变量
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
}

loadEnv('.env.local');
loadEnv('worker/.env');

console.log('🚀 YouTube MP3 Downloader - 自动化部署工具\n');

// 检查必需的环境变量
function checkEnvVars() {
  console.log('📋 检查环境变量...');
  
  const required = [
    'RAPIDAPI_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ 缺少必需的环境变量:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n请在 .env.local 和 worker/.env 中配置这些变量');
    process.exit(1);
  }
  
  console.log('✅ 环境变量检查通过\n');
}

// 部署到 Vercel
async function deployVercel() {
  console.log('📦 部署到 Vercel...');
  
  try {
    // 检查是否已登录
    try {
      execSync('vercel whoami', { stdio: 'ignore' });
      console.log('   已登录 Vercel');
    } catch {
      console.log('   请先登录 Vercel...');
      execSync('vercel login', { stdio: 'inherit' });
    }

    // 构建环境变量参数
    const envVars = [
      `RAPIDAPI_KEY=${process.env.RAPIDAPI_KEY}`,
      `RAPIDAPI_HOST_1=${process.env.RAPIDAPI_HOST_1 || 'youtube-mp36.p.rapidapi.com'}`,
      `RAPIDAPI_HOST_2=${process.env.RAPIDAPI_HOST_2 || 'youtube-mp3-2025.p.rapidapi.com'}`,
      `RAPIDAPI_HOST_3=${process.env.RAPIDAPI_HOST_3 || 'youtube-info-download-api.p.rapidapi.com'}`,
      `UPSTASH_REDIS_REST_URL=${process.env.UPSTASH_REDIS_REST_URL}`,
      `UPSTASH_REDIS_REST_TOKEN=${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      `RENDER_WORKER_URL=${process.env.RENDER_WORKER_URL || 'https://youtube-mp3-worker.onrender.com'}`,
      `RAPIDAPI_1_MONTHLY_QUOTA=300`,
      `RAPIDAPI_2_MONTHLY_QUOTA=300`,
      `RAPIDAPI_3_DAILY_QUOTA=500`
    ];

    // 部署
    console.log('   正在部署...');
    const result = execSync('vercel --prod --yes', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const urlMatch = result.match(/https:\/\/[^\s]+/);
    const deployUrl = urlMatch ? urlMatch[0] : 'Unknown';
    
    console.log('✅ Vercel 部署成功！');
    console.log(`   URL: ${deployUrl}\n`);
    
    return deployUrl;
  } catch (error) {
    console.error('❌ Vercel 部署失败:', error.message);
    console.error('\n提示: 请确保已安装 Vercel CLI:');
    console.error('   npm install -g vercel');
    throw error;
  }
}

// 部署到 Render
async function deployRender() {
  console.log('📦 部署到 Render...');
  
  const RENDER_API_KEY = process.env.RENDER_API_KEY;
  
  if (!RENDER_API_KEY) {
    console.error('❌ 缺少 RENDER_API_KEY');
    console.error('\n请按以下步骤获取 API Key:');
    console.error('   1. 访问 https://dashboard.render.com/account/api-keys');
    console.error('   2. 创建新的 API Key');
    console.error('   3. 添加到 .env.local: RENDER_API_KEY=rnd_xxxxx');
    throw new Error('Missing RENDER_API_KEY');
  }

  // 首先获取 owner ID
  const ownerInfo = await new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.render.com',
      path: '/v1/owners',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          const owners = JSON.parse(data);
          if (owners && owners.length > 0) {
            resolve(owners[0].owner.id);
          } else {
            reject(new Error('No owners found'));
          }
        } else {
          reject(new Error('Failed to get owner ID'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });

  console.log(`   Owner ID: ${ownerInfo}`);

  const serviceConfig = {
    type: 'web_service',
    name: 'youtube-mp3-worker',
    ownerId: ownerInfo,
    serviceDetails: {
      env: 'docker',
      region: 'singapore',
      plan: 'free',
      dockerfilePath: './worker/Dockerfile',
      dockerContext: './worker',
      healthCheckPath: '/health',
      envVars: [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'UPSTASH_REDIS_REST_URL', value: process.env.UPSTASH_REDIS_REST_URL },
      { key: 'UPSTASH_REDIS_REST_TOKEN', value: process.env.UPSTASH_REDIS_REST_TOKEN },
      { key: 'R2_ENDPOINT', value: process.env.R2_ENDPOINT },
      { key: 'R2_ACCESS_KEY_ID', value: process.env.R2_ACCESS_KEY_ID },
      { key: 'R2_SECRET_ACCESS_KEY', value: process.env.R2_SECRET_ACCESS_KEY },
      { key: 'R2_BUCKET_NAME', value: process.env.R2_BUCKET_NAME },
      { key: 'R2_PUBLIC_URL', value: process.env.R2_PUBLIC_URL },
      { key: 'MAX_CONCURRENT_TASKS', value: '3' },
      { key: 'TASK_TIMEOUT', value: '120000' },
      { key: 'PORT', value: '3000' }
      ]
    }
  };

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(serviceConfig);
    
    const options = {
      hostname: 'api.render.com',
      path: '/v1/services',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    console.log('   正在创建 Render 服务...');

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 201) {
          const service = JSON.parse(responseData);
          console.log('✅ Render 服务创建成功！');
          console.log(`   服务 ID: ${service.service.id}`);
          console.log(`   服务名称: ${service.service.name}`);
          console.log(`   服务 URL: ${service.service.serviceDetails.url}`);
          console.log('   ⏳ 首次部署需要 5-10 分钟...\n');
          resolve(service.service.serviceDetails.url);
        } else if (res.statusCode === 409) {
          console.log('ℹ️  服务已存在');
          console.log('   URL: https://youtube-mp3-worker.onrender.com');
          console.log('   提示: 如需重新部署，请在 Render 控制台手动触发\n');
          resolve('https://youtube-mp3-worker.onrender.com');
        } else {
          console.error('❌ Render 部署失败 (HTTP ' + res.statusCode + ')');
          try {
            const error = JSON.parse(responseData);
            console.error('   错误:', error.message || responseData);
          } catch {
            console.error('   响应:', responseData);
          }
          reject(new Error(responseData));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ 请求失败:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// 主函数
async function main() {
  try {
    // 1. 检查环境变量
    checkEnvVars();

    // 2. 部署到 Vercel
    const vercelUrl = await deployVercel();

    // 3. 部署到 Render
    const renderUrl = await deployRender();

    // 4. 显示总结
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 部署完成！\n');
    console.log('📝 部署信息:');
    console.log(`   Frontend (Vercel): ${vercelUrl}`);
    console.log(`   Worker (Render):   ${renderUrl}`);
    console.log('\n⚠️  重要：下一步操作');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n1️⃣  更新 Vercel 环境变量:');
    console.log('   访问: https://vercel.com/dashboard');
    console.log('   设置: RENDER_WORKER_URL = ' + renderUrl);
    console.log('   然后重新部署 Vercel');
    console.log('\n2️⃣  设置 CRON 任务（防止 Render 休眠）:');
    console.log('   访问: https://cron-job.org');
    console.log('   URL: ' + renderUrl + '/health');
    console.log('   频率: 每 10 分钟 (*/10 * * * *)');
    console.log('\n3️⃣  测试部署:');
    console.log('   等待 5-10 分钟让 Render 完成首次构建');
    console.log('   然后访问: ' + vercelUrl);
    console.log('\n4️⃣  运行端到端测试:');
    console.log('   BASE_URL=' + vercelUrl + ' \\');
    console.log('   WORKER_URL=' + renderUrl + ' \\');
    console.log('   bash test-e2e.sh');
    console.log('\n═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ 部署失败:', error.message);
    console.error('\n请检查:');
    console.error('   1. 环境变量是否正确配置');
    console.error('   2. Vercel CLI 是否已安装并登录');
    console.error('   3. Render API Key 是否有效');
    console.error('   4. 网络连接是否正常');
    process.exit(1);
  }
}

// 运行
main();
