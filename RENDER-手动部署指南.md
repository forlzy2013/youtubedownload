# Render 手动部署指南（小白版）

## 📋 前提条件

- ✅ 已有 Render 账号（如果没有，先去 https://render.com 注册）
- ✅ 已有 GitHub 账号
- ✅ 代码已上传到 GitHub（或者准备手动上传）

---

## 🎯 方案选择

### 方案 A: 使用自动化脚本（推荐，最简单）

**优点：** 一键完成，无需手动操作
**缺点：** 需要获取 Render API Key

```bash
npm run deploy
```

### 方案 B: 手动在 Render 网页上部署（本指南）

**优点：** 不需要 API Key，可视化操作
**缺点：** 需要先上传代码到 GitHub

---

## 📦 方案 B：手动部署步骤

### 第一步：准备 GitHub 仓库

#### 选项 1: 如果你还没有 GitHub 仓库

1. 访问 https://github.com/new
2. 创建新仓库：
   - Repository name: `youtube-mp3-downloader`
   - 选择 Public 或 Private
   - 不要勾选 "Initialize this repository with a README"
3. 点击 "Create repository"

4. 在本地项目目录运行：
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/youtube-mp3-downloader.git
git push -u origin main
```

#### 选项 2: 如果你已经有 GitHub 仓库

确保代码已经推送到 GitHub：
```bash
git add .
git commit -m "Update for deployment"
git push
```

---

### 第二步：在 Render 创建 Web Service

#### 2.1 登录 Render

1. 访问 https://dashboard.render.com
2. 使用你的账号登录

#### 2.2 创建新服务

1. 点击右上角的 **"New +"** 按钮
2. 在下拉菜单中选择 **"Web Service"**

   ```
   ┌─────────────────────────┐
   │  New +                  │
   ├─────────────────────────┤
   │  Web Service      ← 选这个
   │  Static Site            │
   │  Private Service        │
   │  Background Worker      │
   │  Cron Job              │
   └─────────────────────────┘
   ```

#### 2.3 连接 GitHub 仓库

**如果是第一次使用 Render：**

1. 点击 **"Connect GitHub"** 按钮
2. 授权 Render 访问你的 GitHub
3. 选择要授权的仓库（可以选择全部或特定仓库）

**如果已经连接过 GitHub：**

1. 在仓库列表中找到 `youtube-mp3-downloader`
2. 点击右侧的 **"Connect"** 按钮

**如果找不到你的仓库：**

1. 点击 **"Configure account"**
2. 在 GitHub 授权页面添加仓库访问权限
3. 返回 Render 刷新页面

---

### 第三步：配置服务（重要！）

现在你会看到配置页面，按照以下步骤填写：

#### 3.1 基本信息

**Name（服务名称）：**
```
youtube-mp3-worker
```
> 注意：这个名称会成为你的 URL 的一部分

**Region（区域）：**
```
Singapore (Southeast Asia)
```
> 选择离你最近的区域，中国用户建议选 Singapore

**Branch（分支）：**
```
main
```
> 或者你使用的其他分支名

#### 3.2 环境配置（关键步骤！）

**Environment（环境）：** 这是你问的问题！

在页面上找到 **"Environment"** 下拉菜单：

```
┌─────────────────────────────────┐
│ Environment                     │
├─────────────────────────────────┤
│ ○ Node                         │
│ ○ Python                       │
│ ○ Ruby                         │
│ ○ Go                           │
│ ● Docker          ← 选择这个！  │
│ ○ Rust                         │
│ ○ Elixir                       │
└─────────────────────────────────┘
```

**重要：** 必须选择 **Docker**！

#### 3.3 Docker 配置

选择 Docker 后，会出现新的选项：

**Dockerfile Path（Dockerfile 路径）：**
```
./worker/Dockerfile
```

**Docker Context（Docker 上下文）：**
```
./worker
```

**Docker Command（可选，留空）：**
```
（留空，使用 Dockerfile 中的 CMD）
```

#### 3.4 实例类型

**Instance Type（实例类型）：**
```
Free
```
> 选择免费版即可

#### 3.5 高级设置（展开 Advanced）

点击 **"Advanced"** 展开高级设置：

**Health Check Path（健康检查路径）：**
```
/health
```

**Auto-Deploy（自动部署）：**
```
✅ Yes
```
> 勾选后，每次 push 代码会自动重新部署

---

### 第四步：添加环境变量（非常重要！）

在配置页面向下滚动，找到 **"Environment Variables"** 部分。

点击 **"Add Environment Variable"** 按钮，逐个添加以下变量：

#### 必需的环境变量（共 11 个）

| Key | Value | 说明 |
|-----|-------|------|
| `NODE_ENV` | `production` | Node 环境 |
| `UPSTASH_REDIS_REST_URL` | `https://amazed-quagga-6163.upstash.io` | 你的 Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | `ARgTAAImcD...` | 你的 Redis Token（完整的） |
| `R2_ENDPOINT` | `https://92e41f3c8ef664503660f8fb563d604.r2.cloudflarestorage.com` | 你的 R2 Endpoint |
| `R2_ACCESS_KEY_ID` | `e869fc75040a0dce67ce8d9cf50598f9` | 你的 R2 Access Key |
| `R2_SECRET_ACCESS_KEY` | `b34670109e8580352d391533bc73e0e8286921f869b3922fba58932e400d8b69` | 你的 R2 Secret Key |
| `R2_BUCKET_NAME` | `youtube-mp3-downloads` | R2 Bucket 名称 |
| `R2_PUBLIC_URL` | `https://pub-26a6e40311764f32b576bbb68ff6f8ba.r2.dev` | 你的 R2 Public URL |
| `MAX_CONCURRENT_TASKS` | `3` | 最大并发任务数 |
| `TASK_TIMEOUT` | `120000` | 任务超时时间（毫秒） |
| `PORT` | `3000` | 服务端口 |

**添加方法：**

1. 点击 **"Add Environment Variable"**
2. 在 **Key** 框输入变量名（如 `NODE_ENV`）
3. 在 **Value** 框输入变量值（如 `production`）
4. 点击 **"Add"** 或直接添加下一个
5. 重复以上步骤，添加所有 11 个变量

**提示：** 可以从你的 `worker/.env` 文件复制粘贴值

---

### 第五步：创建服务

1. 检查所有配置是否正确：
   - ✅ Environment: Docker
   - ✅ Dockerfile Path: ./worker/Dockerfile
   - ✅ Docker Context: ./worker
   - ✅ 11 个环境变量都已添加

2. 点击页面底部的 **"Create Web Service"** 按钮

3. Render 会开始构建你的服务

---

### 第六步：等待构建完成

#### 6.1 构建过程

你会看到构建日志，显示类似内容：

```
==> Cloning from https://github.com/你的用户名/youtube-mp3-downloader...
==> Checking out commit abc123...
==> Building Docker image...
==> Installing system dependencies...
==> Installing yt-dlp...
==> Installing Node.js dependencies...
==> Starting service...
```

#### 6.2 构建时间

- **首次构建：** 5-10 分钟（需要下载和安装所有依赖）
- **后续构建：** 2-3 分钟（使用缓存）

#### 6.3 构建成功标志

当你看到：
```
==> Your service is live 🎉
```

说明部署成功！

---

### 第七步：获取服务 URL

构建完成后，在页面顶部你会看到服务 URL：

```
https://youtube-mp3-worker.onrender.com
```

**复制这个 URL！** 你需要在 Vercel 中使用它。

---

### 第八步：测试 Render Worker

在浏览器或命令行测试：

```bash
# 测试健康检查
curl https://youtube-mp3-worker.onrender.com/health

# 应该返回：
# {"status":"ok","uptime":123,"timestamp":1234567890,"queueSize":0}
```

如果返回正常，说明 Worker 部署成功！

---

## 🔧 常见问题

### Q1: 找不到 "Docker" 选项

**原因：** 可能选错了服务类型

**解决：**
1. 确保选择的是 **"Web Service"**（不是 Static Site）
2. 如果还是没有，刷新页面重试
3. 确保你的 GitHub 仓库中有 `worker/Dockerfile` 文件

### Q2: 构建失败，提示找不到 Dockerfile

**错误信息：**
```
Error: Dockerfile not found at ./worker/Dockerfile
```

**解决：**
1. 检查 Dockerfile Path 是否正确：`./worker/Dockerfile`
2. 检查 Docker Context 是否正确：`./worker`
3. 确保 GitHub 仓库中确实有这个文件

### Q3: 构建失败，提示缺少环境变量

**错误信息：**
```
Error: Missing required environment variable: UPSTASH_REDIS_REST_URL
```

**解决：**
1. 进入服务的 **Environment** 标签页
2. 检查是否添加了所有 11 个环境变量
3. 检查变量名是否拼写正确（区分大小写）
4. 重新部署：点击 **"Manual Deploy"** → **"Deploy latest commit"**

### Q4: 服务启动后立即崩溃

**解决：**
1. 查看 **Logs** 标签页的错误信息
2. 常见原因：
   - Redis 连接失败：检查 Redis URL 和 Token
   - R2 连接失败：检查 R2 配置
   - 端口配置错误：确保 PORT=3000

### Q5: 健康检查失败

**错误信息：**
```
Health check failed
```

**解决：**
1. 确保 Health Check Path 设置为 `/health`
2. 等待服务完全启动（首次需要 1-2 分钟）
3. 检查服务日志是否有错误

---

## 📝 部署后的操作

### 1. 更新 Vercel 环境变量

1. 访问 https://vercel.com/dashboard
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加或更新：
   ```
   RENDER_WORKER_URL = https://youtube-mp3-worker.onrender.com
   ```
5. 点击 **Save**
6. 重新部署 Vercel

### 2. 设置 CRON 任务

按照 [CRON-SETUP.md](CRON-SETUP.md) 指南设置 CRON 任务，防止 Render 休眠。

### 3. 测试完整流程

1. 访问你的 Vercel URL
2. 输入 YouTube URL
3. 点击 "Analyze"
4. 点击 "Download MP3"
5. 验证下载功能正常

---

## 🎯 成功检查清单

部署成功后，确认：

- [ ] Render 服务状态显示 "Live"（绿色）
- [ ] 健康检查通过（绿色勾）
- [ ] 可以访问 `/health` 端点
- [ ] 日志中没有错误信息
- [ ] Vercel 已更新 RENDER_WORKER_URL
- [ ] CRON 任务已设置
- [ ] 完整下载流程测试通过

---

## 💡 小贴士

### 查看实时日志

1. 进入 Render 服务页面
2. 点击 **"Logs"** 标签
3. 可以看到实时的服务日志
4. 用于调试和监控

### 手动重新部署

1. 进入 Render 服务页面
2. 点击右上角 **"Manual Deploy"**
3. 选择 **"Deploy latest commit"**
4. 或选择 **"Clear build cache & deploy"**（如果有缓存问题）

### 修改环境变量

1. 进入 **"Environment"** 标签
2. 修改变量值
3. 点击 **"Save Changes"**
4. 服务会自动重新部署

---

## 🆘 需要帮助？

如果遇到问题：

1. 查看 Render 的 **Logs** 标签页
2. 查看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. 检查所有环境变量是否正确
4. 确保 GitHub 仓库代码是最新的

---

**祝部署顺利！** 🚀

如果手动部署太复杂，建议使用自动化脚本：`npm run deploy`
