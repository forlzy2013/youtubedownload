# 🔧 Vercel 环境变量设置指南

## ❌ 错误原因

```
Error: Redis configuration missing: 
UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required
```

**原因：** Vercel部署时没有找到环境变量，需要在Vercel控制台手动添加。

---

## ✅ 解决步骤

### 步骤1：访问Vercel项目设置

1. 打开浏览器，访问：https://vercel.com/dashboard
2. 登录你的Vercel账号
3. 找到并点击你的项目（应该叫 `youtubedownload` 或类似名称）
4. 点击顶部的 **"Settings"** 标签
5. 在左侧菜单中点击 **"Environment Variables"**

---

### 步骤2：添加环境变量

在 "Environment Variables" 页面，你会看到一个表单。按照以下格式逐个添加：

#### 必需的环境变量列表

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `RAPIDAPI_KEY` | `2411876baamsh8db1f6ac9e4b41fp1ed553jsn3520b7122fec` | Production |
| `UPSTASH_REDIS_REST_URL` | `https://amazed-quagga-6163.upstash.io` | Production |
| `UPSTASH_REDIS_REST_TOKEN` | `ARgTAAImcDJlZmFkODdiNTE3NTg0ODcwOGUwNmJkZDY1MGNjNzczY3AyNjE2Mw` | Production |
| `R2_ENDPOINT` | `https://92e41f3c8ef6645036608f8b563d9604.r2.cloudflarestorage.com` | Production |
| `R2_ACCESS_KEY_ID` | `e889fc75040a0dce67ce8d9cf50598f9` | Production |
| `R2_SECRET_ACCESS_KEY` | `b34670109e8580352d391533bc73e0e8286921f869b3922fba58932e400d8b69` | Production |
| `R2_BUCKET_NAME` | `youtube-mp3-downloads` | Production |
| `R2_PUBLIC_URL` | `https://pub-26a6e40311764f32b576bbb68ff6f8ba.r2.dev` | Production |
| `RENDER_WORKER_URL` | `https://youtube-mp3-worker.onrender.com` | Production |
| `RAPIDAPI_1_MONTHLY_QUOTA` | `300` | Production |
| `RAPIDAPI_2_MONTHLY_QUOTA` | `300` | Production |
| `RAPIDAPI_3_DAILY_QUOTA` | `2000` | Production |

#### 添加方法

对于每个变量：

1. 在 **"Key"** 输入框中输入变量名（例如：`RAPIDAPI_KEY`）
2. 在 **"Value"** 输入框中输入对应的值
3. 在 **"Environment"** 下方，勾选：
   - ✅ **Production** （必选）
   - ⬜ Preview （可选）
   - ⬜ Development （可选）
4. 点击 **"Add"** 或 **"Save"** 按钮

**重复以上步骤，添加所有12个环境变量。**

---

### 步骤3：验证环境变量

添加完成后，你应该能在页面上看到所有12个环境变量的列表。

**检查清单：**
- [ ] RAPIDAPI_KEY
- [ ] UPSTASH_REDIS_REST_URL
- [ ] UPSTASH_REDIS_REST_TOKEN
- [ ] R2_ENDPOINT
- [ ] R2_ACCESS_KEY_ID
- [ ] R2_SECRET_ACCESS_KEY
- [ ] R2_BUCKET_NAME
- [ ] R2_PUBLIC_URL
- [ ] RENDER_WORKER_URL
- [ ] RAPIDAPI_1_MONTHLY_QUOTA
- [ ] RAPIDAPI_2_MONTHLY_QUOTA
- [ ] RAPIDAPI_3_DAILY_QUOTA

---

### 步骤4：重新部署

环境变量添加后，需要重新部署才能生效：

**方法1：通过Vercel控制台**
1. 点击顶部的 **"Deployments"** 标签
2. 找到最新的部署（第一行）
3. 点击右侧的 **"..."** 三点菜单
4. 选择 **"Redeploy"**
5. 在弹出的对话框中，确认点击 **"Redeploy"**

**方法2：通过Git推送**
```bash
# 在项目目录中执行
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

### 步骤5：验证部署

等待部署完成（约1-2分钟），然后测试：

#### 测试1：健康检查
```bash
curl https://your-app.vercel.app/api/health
```

**预期响应：**
```json
{
  "status": "ok",
  "timestamp": 1698765432000,
  "services": {
    "redis": "connected",
    "rapidapi": "available"
  }
}
```

#### 测试2：视频信息
```bash
curl "https://your-app.vercel.app/api/video-info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

**预期响应：**
```json
{
  "success": true,
  "data": {
    "videoId": "dQw4w9WgXcQ",
    "title": "...",
    "thumbnail": "...",
    "duration": 212
  }
}
```

#### 测试3：下载功能
```bash
curl "https://your-app.vercel.app/api/download?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

**预期响应：**
```json
{
  "success": true,
  "type": "direct",
  "downloadUrl": "https://...",
  "filename": "...",
  "apiUsed": 1
}
```

---

## 🚨 常见问题

### Q1: 添加环境变量后还是报错？

**A:** 确保你点击了 "Redeploy" 重新部署。环境变量只在新部署中生效。

### Q2: 找不到 "Environment Variables" 选项？

**A:** 确保你：
1. 已经登录Vercel
2. 选择了正确的项目
3. 在项目的 "Settings" 标签下

### Q3: 环境变量值太长，输入框显示不全？

**A:** 没关系，只要完整复制粘贴进去就可以。Vercel会保存完整的值。

### Q4: 需要给每个环境变量都选择 Production 吗？

**A:** 是的，至少要选择 Production。Preview 和 Development 是可选的。

### Q5: 可以批量导入环境变量吗？

**A:** Vercel支持通过 `.env` 文件导入，但需要使用CLI：

```bash
# 安装Vercel CLI
npm i -g vercel

# 登录
vercel login

# 导入环境变量
vercel env pull .env.production
```

---

## 📋 快速复制清单

为了方便，这里提供一个可以直接复制的格式：

```
RAPIDAPI_KEY=2411876baamsh8db1f6ac9e4b41fp1ed553jsn3520b7122fec
UPSTASH_REDIS_REST_URL=https://amazed-quagga-6163.upstash.io
UPSTASH_REDIS_REST_TOKEN=ARgTAAImcDJlZmFkODdiNTE3NTg0ODcwOGUwNmJkZDY1MGNjNzczY3AyNjE2Mw
R2_ENDPOINT=https://92e41f3c8ef6645036608f8b563d9604.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=e889fc75040a0dce67ce8d9cf50598f9
R2_SECRET_ACCESS_KEY=b34670109e8580352d391533bc73e0e8286921f869b3922fba58932e400d8b69
R2_BUCKET_NAME=youtube-mp3-downloads
R2_PUBLIC_URL=https://pub-26a6e40311764f32b576bbb68ff6f8ba.r2.dev
RENDER_WORKER_URL=https://youtube-mp3-worker.onrender.com
RAPIDAPI_1_MONTHLY_QUOTA=300
RAPIDAPI_2_MONTHLY_QUOTA=300
RAPIDAPI_3_DAILY_QUOTA=2000
```

---

## ✅ 完成标志

当你看到以下结果时，说明环境变量设置成功：

1. ✅ Vercel控制台显示12个环境变量
2. ✅ 重新部署状态为 "Ready"
3. ✅ `/api/health` 返回 `{"status":"ok"}`
4. ✅ 不再出现 "Redis configuration missing" 错误
5. ✅ 可以正常下载视频

---

**设置完成后，你的应用就可以正常工作了！** 🎉
