# 项目准备工作清单

## 📋 概述

在开始实施tasks.md之前,你需要完成以下准备工作。这些是外部服务的注册和配置,必须在编码前完成。

---

## ✅ 已完成的准备工作

根据`准备.txt`,你已经完成:

- ✅ GitHub账号: forlzy2013
- ✅ Vercel账号: 已注册
- ✅ Render账号: 已注册  
- ✅ RapidAPI账号: 已注册
- ✅ RapidAPI Key: 2411876baamsh8db1f6ac9e4b41fp1ed553jsn3520b7122fec
- ✅ Upstash Redis: 已配置
  - URL: https://amazed-quagga-6163.upstash.io
  - Token: ARgTAAImcDJlZmFkODdiNTE3NTg0ODcwOGUwNmJkZDY1MGNjNzczY3AyNjE2Mw
- ✅ 本地环境:
  - Node.js v20.17.0
  - Git 2.50.0

---

## 🚨 必须完成的准备工作

### 1. Cloudflare R2 存储配置 (CRITICAL)

**为什么需要:** 用于存储≥5MB的大文件,避免Redis 10MB限制

**步骤:**

#### 1.1 注册Cloudflare账号
- 访问: https://dash.cloudflare.com/sign-up
- 使用邮箱注册(建议使用与GitHub相同的邮箱)
- 验证邮箱

#### 1.2 启用R2服务
- 登录Cloudflare Dashboard
- 左侧菜单选择 "R2"
- 点击 "Purchase R2 Plan"
- 选择 "Free Plan" (10GB存储 + 10M读取/月)
- **注意:** 不需要绑定信用卡,免费版完全够用

#### 1.3 创建R2 Bucket
- 在R2页面点击 "Create bucket"
- Bucket名称: `youtube-mp3-downloads`
- 位置: 选择 "Automatic" (自动选择最近的区域)
- 点击 "Create bucket"

#### 1.4 配置Bucket生命周期规则
- 进入创建的bucket
- 点击 "Settings" 标签
- 找到 "Lifecycle rules" 部分
- 点击 "Add rule"
- 规则配置:
  - Rule name: `auto-delete-after-24h`
  - Action: `Delete objects`
  - Days after object creation: `1`
- 保存规则

#### 1.5 生成API Token
- 在R2页面点击 "Manage R2 API Tokens"
- 点击 "Create API token"
- Token配置:
  - Token name: `youtube-mp3-worker`
  - Permissions: `Object Read & Write`
  - Bucket: 选择 `youtube-mp3-downloads`
  - TTL: `Forever` (永久)
- 点击 "Create API Token"
- **重要:** 立即复制并保存以下信息(只显示一次):
  ```
  Access Key ID: ____________________
  Secret Access Key: ____________________
  ```

#### 1.6 配置Public Access (可选)
- 进入bucket设置
- 找到 "Public access" 部分
- 启用 "Allow public access"
- 记录Public URL: `https://pub-[random].r2.dev`
- **注意:** 如果不启用,需要使用预签名URL

#### 1.7 获取R2 Endpoint
- 在API Token页面可以看到
- 格式: `https://[account-id].r2.cloudflarestorage.com`
- 记录你的Account ID

**需要记录的信息:**
```bash
R2_ENDPOINT=https://[your-account-id].r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=[从步骤1.5复制]
R2_SECRET_ACCESS_KEY=[从步骤1.5复制]
R2_BUCKET_NAME=youtube-mp3-downloads
R2_PUBLIC_URL=https://pub-[random].r2.dev  # 如果启用了public access
```

**预计时间:** 15-20分钟

---

### 2. CRON Job配置 (IMPORTANT)

**为什么需要:** 防止Render Worker休眠,保持响应速度

**步骤:**

#### 2.1 注册cron-job.org
- 访问: https://cron-job.org/en/signup/
- 注册免费账号
- 验证邮箱

#### 2.2 创建CRON Job
- 登录后点击 "Cronjobs" → "Create cronjob"
- 配置:
  - Title: `Keep Render Worker Awake`
  - URL: `https://youtube-mp3-worker.onrender.com/health`
    - **注意:** 这个URL在Task 23部署Render后才能获得
    - **现在先记录这个步骤,部署后再配置**
  - Schedule: `*/10 * * * *` (每10分钟)
  - Timezone: `UTC`
  - Enabled: `Yes`
- 保存

**需要记录的信息:**
```
CRON Job URL: [等待Render部署后填写]
```

**预计时间:** 5分钟(现在) + 5分钟(部署后)

---

## 📝 可选的准备工作

### 3. Sentry错误监控 (OPTIONAL)

**为什么需要:** 生产环境错误追踪和监控

**步骤:**
- 访问: https://sentry.io/signup/
- 注册免费账号
- 创建新项目: Node.js
- 获取DSN: `https://[key]@[org].ingest.sentry.io/[project]`

**需要记录的信息:**
```bash
SENTRY_DSN=[your-sentry-dsn]  # 可选
```

**预计时间:** 10分钟

---

## 📊 准备工作完成度检查

### 必须完成 (阻塞开发)
- [ ] Cloudflare R2账号已注册
- [ ] R2 Bucket已创建: `youtube-mp3-downloads`
- [ ] R2生命周期规则已配置: 24小时自动删除
- [ ] R2 API Token已生成并保存
- [ ] R2 Endpoint已记录
- [ ] R2 Public URL已记录(如果启用)

### 部署前完成 (阻塞部署)
- [ ] cron-job.org账号已注册
- [ ] CRON Job已创建(等待Render URL)

### 可选完成 (提升体验)
- [ ] Sentry账号已注册(可选)
- [ ] Sentry DSN已获取(可选)

---

## 🔐 环境变量汇总

将以下信息整理到`.env.example`文件中:

### Vercel环境变量 (API Gateway)
```bash
# RapidAPI
RAPIDAPI_KEY=2411876baamsh8db1f6ac9e4b41fp1ed553jsn3520b7122fec
RAPIDAPI_HOST_1=youtube-mp36.p.rapidapi.com
RAPIDAPI_HOST_2=yt-api.p.rapidapi.com
RAPIDAPI_HOST_3=youtube-media-downloader.p.rapidapi.com

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://amazed-quagga-6163.upstash.io
UPSTASH_REDIS_REST_TOKEN=ARgTAAImcDJlZmFkODdiNTE3NTg0ODcwOGUwNmJkZDY1MGNjNzczY3AyNjE2Mw

# Render Worker
RENDER_WORKER_URL=[等待部署后填写]

# API Quotas
RAPIDAPI_1_MONTHLY_QUOTA=300
RAPIDAPI_2_MONTHLY_QUOTA=300
RAPIDAPI_3_DAILY_QUOTA=2000

# Frontend (for CORS)
FRONTEND_URL=[等待部署后填写]
```

### Render环境变量 (Worker Service)
```bash
# Node Environment
NODE_ENV=production

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://amazed-quagga-6163.upstash.io
UPSTASH_REDIS_REST_TOKEN=ARgTAAImcDJlZmFkODdiNTE3NTg0ODcwOGUwNmJkZDY1MGNjNzczY3AyNjE2Mw

# Cloudflare R2 Storage (从准备工作1获取)
R2_ENDPOINT=[从Cloudflare获取]
R2_ACCESS_KEY_ID=[从Cloudflare获取]
R2_SECRET_ACCESS_KEY=[从Cloudflare获取]
R2_BUCKET_NAME=youtube-mp3-downloads
R2_PUBLIC_URL=[从Cloudflare获取,如果启用public access]

# Task Configuration
MAX_CONCURRENT_TASKS=3
TASK_TIMEOUT=120000
MAX_FILE_SIZE=100M
SMALL_FILE_THRESHOLD=5

# Server Configuration
PORT=3000

# Optional: Sentry
SENTRY_DSN=[可选]
```

---

## 🎯 下一步行动

### 立即执行 (今天)
1. ✅ 阅读本清单
2. 🔲 注册Cloudflare账号
3. 🔲 创建R2 Bucket
4. 🔲 配置生命周期规则
5. 🔲 生成API Token
6. 🔲 记录所有R2环境变量
7. 🔲 注册cron-job.org账号

### 开发阶段 (第1-7天)
- 按照tasks.md执行Task 1-22
- R2配置在Task 19使用

### 部署阶段 (第8天)
- 执行Task 23: 部署到Vercel和Render
- 获取Render Worker URL
- 配置CRON Job
- 执行Task 24-26: 测试和文档

---

## ❓ 常见问题

### Q1: R2一定要配置吗?
**A:** 是的,必须配置。大文件(≥5MB)必须用R2存储,否则会超过Redis 10MB限制导致失败。

### Q2: R2免费版够用吗?
**A:** 完全够用。免费版提供:
- 10GB存储空间
- 10M读取/月
- 无限写入
- 零出口费用
- 你的使用量预计: <1GB存储 + <100K读取/月

### Q3: 如果不想用R2怎么办?
**A:** 可以修改策略只支持小文件(<5MB),但会限制30%的视频无法下载。不推荐。

### Q4: CRON Job一定要配置吗?
**A:** 强烈建议。不配置的话:
- Render Worker会在15分钟无请求后休眠
- 首次请求需要30-60秒冷启动
- 用户体验差

### Q5: 可以用其他CRON服务吗?
**A:** 可以,任何能定时发送HTTP请求的服务都行:
- UptimeRobot (推荐,免费)
- Pingdom
- Better Uptime
- 自己的服务器

### Q6: 准备工作大概需要多长时间?
**A:** 
- Cloudflare R2: 15-20分钟
- CRON Job: 5分钟(注册) + 5分钟(部署后配置)
- 总计: 约30分钟

---

## 📞 获取帮助

如果在准备过程中遇到问题:

1. **Cloudflare R2问题:**
   - 官方文档: https://developers.cloudflare.com/r2/
   - 社区论坛: https://community.cloudflare.com/

2. **CRON Job问题:**
   - cron-job.org文档: https://cron-job.org/en/documentation/

3. **其他问题:**
   - 查看`production-readiness-audit.md`
   - 查看`design.md`相关章节

---

**准备工作完成后,即可开始执行tasks.md中的Task 1!** 🚀

