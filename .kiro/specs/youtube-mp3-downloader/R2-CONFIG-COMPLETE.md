# Cloudflare R2 配置信息 (已完成)

## ✅ 配置状态: 完成

**创建日期:** 2025-10-30  
**Token名称:** youtube-mp3-worker  
**状态:** ✅ 已成功创建

---

## 🔑 完整的R2配置信息

### 1. Token信息

```bash
# Token名称
TOKEN_NAME="youtube-mp3-worker"

# 令牌ID (用于API身份验证)
R2_TOKEN="5Pws4qZZ0_PCwZaMGQwcQRH4wS7paXzbLRldW_r"
```

### 2. S3 API凭证

```bash
# 访问密钥ID (Access Key ID)
R2_ACCESS_KEY_ID="e869fc75040a0dce67ce8d9cf50598f9"

# 机密访问密钥 (Secret Access Key)
R2_SECRET_ACCESS_KEY="b34670109e8580352d391533bc73e0e8286921f869b3922fba58932e400d8b69"
```

### 3. R2 Endpoint

```bash
# S3 API终结点
R2_ENDPOINT="https://92e41f3c8ef664503660f8fb563d604.r2.cloudflarestorage.com"
```

### 4. Bucket信息

```bash
# Bucket名称
R2_BUCKET_NAME="youtube-mp3-downloads"

# Account ID
ACCOUNT_ID="92e41f3c8ef664503660f8fb563d"
```

### 5. 公共访问URL (已完成)

```bash
# R2公共访问域名
R2_PUBLIC_URL="https://pub-26a6e40311764f32b576bbb68ff6f8ba.r2.dev"
```

---

## 📋 环境变量配置

### 用于 .env.local (API Gateway)

```bash
# Cloudflare R2配置
R2_ENDPOINT=https://92e41f3c8ef664503660f8fb563d604.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=e869fc75040a0dce67ce8d9cf50598f9
R2_SECRET_ACCESS_KEY=b34670109e8580352d391533bc73e0e8286921f869b3922fba58932e400d8b69
R2_BUCKET_NAME=youtube-mp3-downloads
R2_PUBLIC_URL=待配置
```

### 用于 worker/.env (Render Worker)

```bash
# Cloudflare R2配置
R2_ENDPOINT=https://92e41f3c8ef664503660f8fb563d604.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=e869fc75040a0dce67ce8d9cf50598f9
R2_SECRET_ACCESS_KEY=b34670109e8580352d391533bc73e0e8286921f869b3922fba58932e400d8b69
R2_BUCKET_NAME=youtube-mp3-downloads
R2_PUBLIC_URL=待配置
```

---

## ✅ 已完成的配置步骤

- [x] 1. 创建Cloudflare账户
- [x] 2. 启用R2服务
- [x] 3. 创建R2 Bucket: youtube-mp3-downloads
- [x] 4. 配置CORS规则
- [x] 5. 配置生命周期规则(24小时自动删除)
- [x] 6. 创建API Token
- [x] 7. 获取Access Key ID和Secret Access Key
- [x] 8. 获取R2 Endpoint

---

## ⏭️ 下一步: 配置公共访问URL

### 步骤:

1. 进入R2 Bucket: `youtube-mp3-downloads`
2. 点击 **"Settings"** 标签
3. 找到 **"Public Access"** 或 **"R2.dev subdomain"**
4. 点击 **"Allow Access"** 或 **"Enable"**
5. 复制显示的公共URL (格式: `https://pub-xxxxx.r2.dev`)
6. 更新环境变量中的 `R2_PUBLIC_URL`

---

## 🔒 安全提醒

### ⚠️ 重要:

1. **不要分享这些凭证** - 它们可以访问你的R2存储
2. **不要提交到Git** - 确保.env文件在.gitignore中
3. **定期轮换Token** - 建议每6-12个月更换一次
4. **限制权限** - Token只有R2 Edit权限,已经是最小权限

### 如果凭证泄露:

1. 立即在Cloudflare Dashboard中删除该Token
2. 创建新的Token
3. 更新所有环境变量
4. 检查R2 Bucket中是否有异常文件

---

## 📊 配置验证清单

### R2配置完整性检查:

- [x] R2_ENDPOINT - ✅ 已获取
- [x] R2_ACCESS_KEY_ID - ✅ 已获取
- [x] R2_SECRET_ACCESS_KEY - ✅ 已获取
- [x] R2_BUCKET_NAME - ✅ 已设置
- [x] ACCOUNT_ID - ✅ 已获取
- [x] R2_PUBLIC_URL - ✅ 已完成

### 配置文件状态:

- [ ] .env.local - 待创建
- [ ] worker/.env - 待创建
- [x] .env.local.example - ✅ 已创建(参考模板)

---

## 🎯 使用示例

### 在代码中使用R2配置:

```javascript
// worker/download-handler.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

// 上传文件到R2
async function uploadToR2(filePath, key) {
  const fileBuffer = await fs.readFile(filePath);
  
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: 'audio/mpeg'
  });
  
  await r2Client.send(command);
  
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}
```

---

## 📞 故障排除

### 常见问题:

#### Q1: 上传文件时报错 "Access Denied"

**解决方案:**
- 检查Access Key ID和Secret Access Key是否正确
- 确认Token权限包含R2 Edit
- 验证Bucket名称是否正确

#### Q2: 无法访问上传的文件

**解决方案:**
- 确认已启用Public Access
- 检查CORS配置是否正确
- 验证R2_PUBLIC_URL是否正确

#### Q3: Token过期

**解决方案:**
- 在Cloudflare Dashboard中检查Token状态
- 如果设置了TTL,需要重新创建Token
- 更新环境变量中的凭证

---

## 🎉 配置完成度

### 当前进度: 100% ✅ 完成!

- ✅ R2 Bucket创建
- ✅ CORS配置
- ✅ 生命周期规则
- ✅ API Token创建
- ✅ 凭证获取
- ✅ 公共访问URL配置

### 🎉 R2配置完全就绪!

- ✅ 进度达到 100%
- ✅ 可以开始Task 1开发
- ✅ R2存储完全就绪

---

**文档创建日期:** 2025-10-30  
**最后更新:** 2025-10-30  
**状态:** ✅ 90%完成,待配置公共访问URL
