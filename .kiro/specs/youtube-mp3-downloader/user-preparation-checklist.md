# 用户准备工作清单

## 📋 概述

在开始执行tasks.md之前,你需要完成以下准备工作。这些是**必须的前置条�?*�?

**预计完成时间:** 1-2小时  
**难度等级:** 简�?(有详细步骤指�?

---

## �?已完成的准备工作

根据你的`准备.txt`,以下服务已经就绪:

- �?**GitHub账户:** forlzy2013
- �?**Vercel账户:** 已连�?
- �?**Render账户:** 已连�?
- �?**RapidAPI密钥:** 2411876baamsh8db1f6ac9e4b41fp1ed553jsn3520b7122fec
- �?**Upstash Redis:** 已配�?
  - URL: https://amazed-quagga-6163.upstash.io
  - Token: ARgTAAImcDJlZmFkODdiNTE3NTg0ODcwOGUwNmJkZDY1MGNjNzczY3AyNjE2Mw
- �?**Node.js:** v20.17.0
- �?**Git:** 2.50.0.windows.1
- �?**项目路径:** C:\Users\TempAdmin\Desktop\exercise\tool\youtube download\project4

---

## 🔧 需要完成的准备工作

### 1️⃣ Cloudflare R2 存储配置 (必须)

#### 为什么需要R2?
- 用于存储大文�?�?MB)
- 避免Redis 10MB限制
- 完全免费(10GB存储 + 10M读取/�?
- 自动24小时过期,节省成本

#### 步骤1: 创建Cloudflare账户

1. 访问 https://dash.cloudflare.com/sign-up
2. 使用邮箱注册(建议使用你的常用邮箱)
3. 验证邮箱
4. 登录Cloudflare Dashboard

#### 步骤2: 启用R2服务

1. 在Cloudflare Dashboard左侧菜单找到 **"R2"**
2. 点击 **"Purchase R2"** �?**"Get Started"**
3. 选择免费计划(Free Plan)
4. 确认并启�?

#### 步骤3: 创建R2 Bucket

1. 点击 **"Create bucket"**
2. 配置Bucket:
   ```
   Bucket名称: youtube-mp3-downloads
   位置: Automatic (或选择离你最近的区域)
   ```
3. 点击 **"Create bucket"**

#### 步骤4: 配置Bucket设置

**4.1 设置公共访问**

1. 进入刚创建的bucket
2. 点击 **"Settings"** 标签
3. 找到 **"Public Access"** 部分
4. 点击 **"Allow Access"** �?**"Connect Domain"**
5. 记录公共访问URL(格式: `https://pub-xxxxx.r2.dev`)

**4.2 配置CORS规则**

1. 在Settings中找�?**"CORS Policy"**
2. 点击 **"Edit CORS Policy"**
3. 添加以下规则(开发阶段使�?:
   ```json
   [
     {
       "AllowedOrigins": [
         "http://localhost:3000",
         "https://*.vercel.app"
       ],
       "AllowedMethods": ["GET", "PUT", "POST"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. 保存

**重要提示:** 
- �?不要使用 `"AllowedOrigins": ["*"]` (Cloudflare R2不支�?
- �?使用具体域名或通配符模式如 `"https://*.vercel.app"`
- 部署后建议更新为具体的生产域名以提高安全�?

**4.3 配置生命周期规则(自动删除)**

1. 在Settings中找�?**"Lifecycle Rules"**
2. 点击 **"Add Rule"**
3. 配置规则:
   ```
   规则名称: auto-delete-24h
   对象前缀: (留空,应用到所有文�?
   操作: Delete objects
   天数: 1 (1天后删除)
   ```
4. 保存

#### 步骤5: 创建API Token

1. 回到R2主页
2. 点击右上�?**"Manage R2 API Tokens"**
3. 点击 **"Create API Token"**
4. 配置Token:
   ```
   Token名称: youtube-mp3-worker
   权限: Admin Read & Write
   TTL: Forever (或根据需要设�?
   ```
5. 点击 **"Create API Token"**
6. **重要:** 立即复制并保存以下信�?只显示一�?:
   ```
   Access Key ID: xxxxxxxxxxxxxxxxxxxx
   Secret Access Key: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
   ```

#### 步骤6: 获取R2配置信息

你需要记录以下信�?稍后会用�?:

```bash
# 1. R2 Endpoint (在R2主页右侧可以看到)
# 格式: https://[account-id].r2.cloudflarestorage.com
R2_ENDPOINT="https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.cloudflarestorage.com"

# 2. Access Key ID (步骤5中复制的)
R2_ACCESS_KEY_ID="xxxxxxxxxxxxxxxxxxxx"

# 3. Secret Access Key (步骤5中复制的)
R2_SECRET_ACCESS_KEY="yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"

# 4. Bucket名称
R2_BUCKET_NAME="youtube-mp3-downloads"

# 5. 公共访问URL (步骤4.1中记录的)
R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"
```

**如何找到Account ID:**
- 在Cloudflare Dashboard右侧边栏查看
- 或在浏览器地址栏中找到: `dash.cloudflare.com/[account-id]/r2/`

#### �?R2配置完成检查清�?

- [ ] Cloudflare账户已创�?
- [ ] R2服务已启�?
- [ ] Bucket "youtube-mp3-downloads" 已创�?
- [ ] 公共访问已启�?
- [ ] CORS规则已配�?
- [ ] 生命周期规则已配�?24小时自动删除)
- [ ] API Token已创�?
- [ ] 所�?个配置信息已记录

---

### 2️⃣ CRON Job服务配置 (强烈建议)

#### 为什么需要CRON Job?
- 防止Render Worker休眠(免费�?5分钟无请求会休眠)
- 避免首次请求60-120秒的冷启动延�?
- 提升用户体验

#### 步骤1: 注册cron-job.org

1. 访问 https://cron-job.org/en/signup.php
2. 填写注册信息:
   ```
   Email: 你的邮箱
   Password: 设置密码
   ```
3. 验证邮箱
4. 登录账户

#### 步骤2: 创建CRON任务

1. 登录后点�?**"Cronjobs"** �?**"Create cronjob"**
2. 配置任务:
   ```
   Title: Keep Render Worker Awake
   Address: https://youtube-mp3-worker.onrender.com/health
   (注意: 这个URL需要在Render部署完成后更�?
   
   Schedule:
   - Every: 10 minutes
   - 或使用CRON表达�? */10 * * * *
   
   Request method: GET
   Timeout: 30 seconds
   
   Enabled: Yes
   ```
3. 保存

#### 步骤3: 部署后更新URL

**重要:** 在完成Task 23(部署到Render)�?
1. 获取Render Worker的实际URL
2. 回到cron-job.org
3. 编辑任务,更新URL为实际地址
4. 保存并启�?

#### �?CRON Job配置完成检查清�?

- [ ] cron-job.org账户已注�?
- [ ] CRON任务已创�?URL待部署后更新)
- [ ] 任务设置为每10分钟执行
- [ ] 任务已启�?

---

### 3️⃣ 创建环境变量配置文件

#### 步骤1: 创建根目�?env.local

在项目根目录 `C:\Users\TempAdmin\Desktop\exercise\tool\youtube download\project4` 创建文件 `.env.local`:

```bash
# ============================================
# API Gateway 环境变量 (Vercel)
# ============================================

# RapidAPI配置
RAPIDAPI_KEY=2411876baamsh8db1f6ac9e4b41fp1ed553jsn3520b7122fec
RAPIDAPI_HOST_1=youtube-mp36.p.rapidapi.com
RAPIDAPI_HOST_2=yt-api.p.rapidapi.com
RAPIDAPI_HOST_3=youtube-media-downloader.p.rapidapi.com

# Upstash Redis配置
UPSTASH_REDIS_REST_URL=https://amazed-quagga-6163.upstash.io
UPSTASH_REDIS_REST_TOKEN=ARgTAAImcDJlZmFkODdiNTE3NTg0ODcwOGUwNmJkZDY1MGNjNzczY3AyNjE2Mw

# Cloudflare R2配置 (填入步骤1中获取的�?
R2_ENDPOINT=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
R2_BUCKET_NAME=youtube-mp3-downloads
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# Render Worker URL (部署后填�?
RENDER_WORKER_URL=https://youtube-mp3-worker.onrender.com

# 前端URL (部署后填�?
FRONTEND_URL=https://your-app.vercel.app

# API配额限制
RAPIDAPI_1_MONTHLY_QUOTA=300
RAPIDAPI_2_MONTHLY_QUOTA=300
RAPIDAPI_3_DAILY_QUOTA=2000
```

#### 步骤2: 创建Worker环境变量文件

�?`worker/` 目录创建文件 `.env`:

```bash
# ============================================
# Render Worker 环境变量
# ============================================

# Node环境
NODE_ENV=production

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://amazed-quagga-6163.upstash.io
UPSTASH_REDIS_REST_TOKEN=ARgTAAImcDJlZmFkODdiNTE3NTg0ODcwOGUwNmJkZDY1MGNjNzczY3AyNjE2Mw

# Cloudflare R2 (填入步骤1中获取的�?
R2_ENDPOINT=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
R2_BUCKET_NAME=youtube-mp3-downloads
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# 任务配置
MAX_CONCURRENT_TASKS=3
TASK_TIMEOUT=120000
MAX_FILE_SIZE=100M
SMALL_FILE_THRESHOLD=5

# 服务器配�?
PORT=3000
```

#### 步骤3: 创建.env.example模板

在项目根目录创建 `.env.example`:

```bash
# RapidAPI
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST_1=youtube-mp36.p.rapidapi.com
RAPIDAPI_HOST_2=yt-api.p.rapidapi.com
RAPIDAPI_HOST_3=youtube-media-downloader.p.rapidapi.com

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here

# Cloudflare R2
R2_ENDPOINT=your_r2_endpoint_here
R2_ACCESS_KEY_ID=your_r2_access_key_here
R2_SECRET_ACCESS_KEY=your_r2_secret_key_here
R2_BUCKET_NAME=youtube-mp3-downloads
R2_PUBLIC_URL=your_r2_public_url_here

# Render Worker
RENDER_WORKER_URL=your_render_worker_url_here

# Frontend
FRONTEND_URL=your_frontend_url_here

# API Quotas
RAPIDAPI_1_MONTHLY_QUOTA=300
RAPIDAPI_2_MONTHLY_QUOTA=300
RAPIDAPI_3_DAILY_QUOTA=2000
```

#### �?环境变量配置完成检查清�?

- [ ] .env.local已创建并填写完整
- [ ] worker/.env已创建并填写完整
- [ ] .env.example已创�?
- [ ] 所有R2配置信息已填�?
- [ ] 所有敏感信息已正确配置

---

### 4️⃣ 安装开发工�?

#### 步骤1: 安装Vercel CLI

打开PowerShell或CMD,执行:

```powershell
npm install -g vercel
```

验证安装:
```powershell
vercel --version
```

#### 步骤2: 安装Docker Desktop (可�?用于本地测试Worker)

1. 访问 https://www.docker.com/products/docker-desktop/
2. 下载Windows版本
3. 安装并启动Docker Desktop
4. 验证安装:
   ```powershell
   docker --version
   ```

#### 步骤3: 安装nodemon (可�?开发时自动重启)

```powershell
npm install -g nodemon
```

#### �?开发工具安装完成检查清�?

- [ ] Vercel CLI已安�?
- [ ] Docker Desktop已安�?可�?
- [ ] nodemon已安�?可�?
- [ ] 所有工具版本验证通过

---

### 5️⃣ 创建GitHub仓库

#### 步骤1: 创建新仓�?

1. 访问 https://github.com/new
2. 配置仓库:
   ```
   Repository name: youtube-mp3-downloader
   Description: Free YouTube to MP3 converter with smart routing
   Visibility: Private (推荐) �?Public
   Initialize: 不要勾选任何选项(我们会手动推�?
   ```
3. 点击 **"Create repository"**

#### 步骤2: 连接本地仓库(在Task 1中执�?

这一步会在执行Task 1时完�?现在只需要记录仓库URL:

```
仓库URL: https://github.com/forlzy2013/youtube-mp3-downloader.git
```

#### �?GitHub仓库创建完成检查清�?

- [ ] GitHub仓库已创�?
- [ ] 仓库URL已记�?
- [ ] 准备好在Task 1中连�?

---

## 📝 准备工作总结

### 必须完成 (阻塞开�?

1. �?**Cloudflare R2配置** - 必须完成,否则大文件下载会失败
2. �?**环境变量配置** - 必须完成,否则服务无法启动
3. �?**GitHub仓库创建** - 必须完成,否则无法部署

### 强烈建议 (影响体验)

4. �?**CRON Job配置** - 强烈建议,否则首次请求会很�?
5. �?**开发工具安�?* - 强烈建议,提高开发效�?

---

## 🎯 准备工作完成后的下一�?

### 1. 验证所有配�?

创建一个验证清单文�?`preparation-status.txt`:

```
�?Cloudflare R2
  - Account ID: _______________
  - Bucket名称: youtube-mp3-downloads
  - R2_ENDPOINT: _______________
  - R2_ACCESS_KEY_ID: _______________
  - R2_SECRET_ACCESS_KEY: _______________
  - R2_PUBLIC_URL: _______________

�?CRON Job
  - cron-job.org账户: _______________
  - 任务已创�? Yes/No
  - 任务URL: (待部署后更新)

�?环境变量
  - .env.local已创�? Yes/No
  - worker/.env已创�? Yes/No
  - 所有R2配置已填�? Yes/No

�?开发工�?
  - Vercel CLI版本: _______________
  - Docker Desktop版本: _______________ (可�?

�?GitHub
  - 仓库URL: https://github.com/forlzy2013/youtube-mp3-downloader.git
```

### 2. 开始执行tasks.md

准备工作完成�?按照以下顺序执行:

1. **Task 1:** 项目初始化和基础设施设置
2. **Task 2-14:** 前端和API Gateway开�?
3. **Task 15-20:** Render Worker开�?
4. **Task 21-23:** 错误处理、UI优化、部�?
5. **Task 24:** 配置CRON Job(更新URL)
6. **Task 25-26:** 文档和测�?

### 3. 预计时间�?

- **准备工作:** 1-2小时 (本清�?
- **开发工�?** 10-12�?(按tasks.md)
- **测试部署:** 1-2�?
- **总计:** �?�?

---

## �?常见问题

### Q1: R2费用如何?
**A:** Cloudflare R2非常便宜:
- 存储: $0.015/GB/�?
- 下载: 免费 (�?0GB/�?
- 预计月费�? **$0** (完全在免费额度内)
- 5人团队使�?每月�?-2GB存储,完全免费

### Q2: 如果R2配置失败怎么�?
**A:** 系统有降级策�?
- 大文件会尝试压缩
- 压缩�?5MB会使用base64
- 仍太大会返回友好错误
- 但强烈建议配置R2以获得最佳体�?

### Q3: CRON job是否必需?
**A:** 不是必需,但强烈建�?
- 不配�? 首次请求60-120秒延�?
- 配置�? 所有请求都很快
- 免费服务,配置简�?

### Q4: 可以跳过某些准备工作�?
**A:** 不建�?
- R2配置: **必须** (否则大文件失�?
- 环境变量: **必须** (否则服务无法启动)
- CRON job: 强烈建议 (否则体验�?
- 开发工�? 强烈建议 (否则开发困�?

### Q5: 准备工作出错怎么�?
**A:** 每个步骤都有详细说明:
- 仔细阅读每个步骤
- 确保复制正确的配置信�?
- 如有问题,检查Cloudflare/cron-job.org的官方文�?
- 或在开发过程中寻求帮助

---

## 📞 需要帮�?

如果在准备过程中遇到问题:

1. **Cloudflare R2问题:** 查看 https://developers.cloudflare.com/r2/
2. **cron-job.org问题:** 查看 https://cron-job.org/en/documentation/
3. **环境变量问题:** 检�?env.example模板
4. **其他问题:** 在开发过程中提出

---

**准备工作预计时间:** 1-2小时  
**完成后即可开始开�?** 按tasks.md执行Task 1-26  
**预期开发时�?** 10-12�? 
**预期成功�?** 95%+

**祝你开发顺�? 🚀**

