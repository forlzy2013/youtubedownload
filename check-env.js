#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 检查环境变量配置...\n');

// 加载环境变量
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    return {};
  }
  
  const env = {};
  const content = fs.readFileSync(filePath, 'utf-8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (key && value) {
        env[key] = value;
      }
    }
  });
  return env;
}

const envLocal = loadEnv('.env.local');
const workerEnv = loadEnv('worker/.env');

// 检查必需的变量
const checks = {
  '.env.local': {
    required: [
      'RAPIDAPI_KEY',
      'RAPIDAPI_HOST_1',
      'RAPIDAPI_HOST_2',
      'RAPIDAPI_HOST_3',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'R2_ENDPOINT',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
      'R2_PUBLIC_URL',
      'RENDER_API_KEY'
    ],
    optional: [
      'RENDER_WORKER_URL',
      'FRONTEND_URL'
    ]
  },
  'worker/.env': {
    required: [
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'R2_ENDPOINT',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET_NAME',
      'R2_PUBLIC_URL',
      'MAX_CONCURRENT_TASKS',
      'TASK_TIMEOUT'
    ],
    optional: [
      'NODE_ENV',
      'PORT',
      'MAX_FILE_SIZE',
      'SMALL_FILE_THRESHOLD'
    ]
  }
};

let allGood = true;

// 检查 .env.local
console.log('📋 检查 .env.local:');
console.log('─────────────────────────────────────');

checks['.env.local'].required.forEach(key => {
  if (envLocal[key]) {
    const value = envLocal[key];
    const displayValue = key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET')
      ? value.substring(0, 10) + '...' + value.substring(value.length - 5)
      : value;
    console.log(`✅ ${key}: ${displayValue}`);
  } else {
    console.log(`❌ ${key}: 缺失`);
    allGood = false;
  }
});

console.log('\n可选变量:');
checks['.env.local'].optional.forEach(key => {
  if (envLocal[key]) {
    console.log(`✅ ${key}: ${envLocal[key]}`);
  } else {
    console.log(`⚠️  ${key}: 未设置（部署后会自动生成）`);
  }
});

// 检查 worker/.env
console.log('\n\n📋 检查 worker/.env:');
console.log('─────────────────────────────────────');

checks['worker/.env'].required.forEach(key => {
  if (workerEnv[key]) {
    const value = workerEnv[key];
    const displayValue = key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET')
      ? value.substring(0, 10) + '...' + value.substring(value.length - 5)
      : value;
    console.log(`✅ ${key}: ${displayValue}`);
  } else {
    console.log(`❌ ${key}: 缺失`);
    allGood = false;
  }
});

console.log('\n可选变量:');
checks['worker/.env'].optional.forEach(key => {
  if (workerEnv[key]) {
    console.log(`✅ ${key}: ${workerEnv[key]}`);
  } else {
    console.log(`⚠️  ${key}: 未设置（使用默认值）`);
  }
});

// 验证格式
console.log('\n\n🔍 验证配置格式:');
console.log('─────────────────────────────────────');

// 检查 RapidAPI Key 格式
if (envLocal.RAPIDAPI_KEY) {
  if (envLocal.RAPIDAPI_KEY.length > 20) {
    console.log('✅ RapidAPI Key 格式正确');
  } else {
    console.log('⚠️  RapidAPI Key 可能不正确（长度太短）');
  }
}

// 检查 Redis URL 格式
if (envLocal.UPSTASH_REDIS_REST_URL) {
  if (envLocal.UPSTASH_REDIS_REST_URL.startsWith('https://') && 
      envLocal.UPSTASH_REDIS_REST_URL.includes('upstash.io')) {
    console.log('✅ Redis URL 格式正确');
  } else {
    console.log('⚠️  Redis URL 格式可能不正确');
  }
}

// 检查 Redis Token 格式
if (envLocal.UPSTASH_REDIS_REST_TOKEN) {
  if (envLocal.UPSTASH_REDIS_REST_TOKEN.length > 20) {
    console.log('✅ Redis Token 格式正确');
  } else {
    console.log('⚠️  Redis Token 可能不正确（长度太短）');
  }
}

// 检查 R2 配置
if (envLocal.R2_ENDPOINT) {
  if (envLocal.R2_ENDPOINT.startsWith('https://') && 
      envLocal.R2_ENDPOINT.includes('r2.cloudflarestorage.com')) {
    console.log('✅ R2 Endpoint 格式正确');
  } else {
    console.log('⚠️  R2 Endpoint 格式可能不正确');
  }
}

if (envLocal.R2_PUBLIC_URL) {
  if (envLocal.R2_PUBLIC_URL.startsWith('https://') && 
      envLocal.R2_PUBLIC_URL.includes('r2.dev')) {
    console.log('✅ R2 Public URL 格式正确');
  } else {
    console.log('⚠️  R2 Public URL 格式可能不正确');
  }
}

// 检查 Render API Key
if (envLocal.RENDER_API_KEY) {
  if (envLocal.RENDER_API_KEY.startsWith('rnd_')) {
    console.log('✅ Render API Key 格式正确');
  } else {
    console.log('⚠️  Render API Key 格式不正确（应该以 rnd_ 开头）');
  }
}

// 检查配额设置
console.log('\n\n📊 API 配额设置:');
console.log('─────────────────────────────────────');
console.log(`API 1 月配额: ${envLocal.RAPIDAPI_1_MONTHLY_QUOTA || '300'}`);
console.log(`API 2 月配额: ${envLocal.RAPIDAPI_2_MONTHLY_QUOTA || '300'}`);
console.log(`API 3 日配额: ${envLocal.RAPIDAPI_3_DAILY_QUOTA || '500'}`);

// 最终结果
console.log('\n\n' + '═'.repeat(50));
if (allGood) {
  console.log('✅ 所有必需的环境变量都已正确配置！');
  console.log('\n🚀 你可以开始部署了:');
  console.log('   npm run deploy');
} else {
  console.log('❌ 有些必需的环境变量缺失或不正确');
  console.log('\n请检查并修复上述问题后再部署。');
  process.exit(1);
}
console.log('═'.repeat(50) + '\n');
