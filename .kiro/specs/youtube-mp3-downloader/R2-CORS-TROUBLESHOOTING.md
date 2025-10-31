# Cloudflare R2 CORS配置故障排除指南

## 🚨 常见错误: "此策略无效"

### 问题描述
在配置Cloudflare R2的CORS规则时,使用以下配置会报错:

```json
❌ 错误配置:
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

**错误提示:** "此策略无效,请查看CORS策略文档,了解导致CORS策略无效的原因。"

---

## ✅ 解决方案

### 根本原因
Cloudflare R2**不支持**在`AllowedOrigins`中单独使用通配符`*`。

根据官方文档: https://developers.cloudflare.com/r2/buckets/cors/#common-issues

> `AllowedOrigins` does not support `"*"` alone. You must specify:
> - Exact origins: `"https://example.com"`
> - Wildcard patterns: `"https://*.example.com"`
> - HTTPS wildcard: `"https://*"`

---

## 🎯 正确的配置方案

### 方案1: 开发阶段(推荐)

适用于本地开发和Vercel预览环境:

```json
✅ 正确配置:
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

**说明:**
- `http://localhost:3000` - 允许本地开发
- `https://*.vercel.app` - 允许所有Vercel部署(包括预览环境)

---

### 方案2: 生产环境(部署后)

适用于已知的生产域名:

```json
✅ 正确配置:
[
  {
    "AllowedOrigins": [
      "https://your-app.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

**说明:**
- 将`your-app.vercel.app`替换为实际的Vercel部署域名
- 更安全,只允许特定域名访问

---

### 方案3: 允许所有HTTPS来源(仅测试)

⚠️ **不推荐用于生产环境**

```json
⚠️ 测试配置:
[
  {
    "AllowedOrigins": [
      "https://*"
    ],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

**说明:**
- 允许所有HTTPS来源
- 安全性较低,仅用于测试
- 生产环境应使用方案1或方案2

---

## 📋 配置步骤

### 步骤1: 删除错误配置

1. 进入R2 Bucket的Settings页面
2. 找到CORS Policy部分
3. 如果已有错误配置,点击删除

### 步骤2: 添加正确配置

1. 点击 **"Edit CORS Policy"**
2. 复制上面的**方案1**(开发阶段推荐)
3. 粘贴到编辑器中
4. 点击 **"保存"**

### 步骤3: 验证配置

保存后应该看到:
- ✅ 没有错误提示
- ✅ CORS规则显示在列表中
- ✅ 状态为"已启用"

---

## 🔍 配置对比

| 配置项 | 错误示例 | 正确示例 |
|--------|---------|---------|
| AllowedOrigins | `["*"]` ❌ | `["https://*.vercel.app"]` ✅ |
| AllowedOrigins | `["*"]` ❌ | `["https://example.com"]` ✅ |
| AllowedOrigins | `["*"]` ❌ | `["https://*"]` ✅ |
| AllowedMethods | `["GET", "PUT", "POST"]` ✅ | `["GET", "PUT", "POST"]` ✅ |
| AllowedHeaders | `["*"]` ✅ | `["*"]` ✅ |
| MaxAgeSeconds | `3600` ✅ | `3600` ✅ |

---

## 🎯 推荐配置流程

### 阶段1: 开发阶段(现在)

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

**优点:**
- 支持本地开发
- 支持Vercel预览环境
- 支持生产部署
- 配置一次,全程可用

---

### 阶段2: 生产优化(可选)

部署完成后,如果需要更高安全性:

```json
[
  {
    "AllowedOrigins": [
      "https://your-actual-app.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

**优点:**
- 更高安全性
- 只允许生产域名访问
- 防止未授权访问

---

## ❓ 常见问题

### Q1: 为什么不能使用`"*"`?

**A:** Cloudflare R2出于安全考虑,不允许使用单独的`*`通配符。必须指定协议(http/https)或具体域名。

---

### Q2: `https://*`和`*`有什么区别?

**A:** 
- `"*"` - ❌ 不支持,会报错
- `"https://*"` - ✅ 支持,允许所有HTTPS来源
- `"http://*"` - ✅ 支持,允许所有HTTP来源

---

### Q3: 可以同时配置多个来源吗?

**A:** 可以!示例:

```json
"AllowedOrigins": [
  "http://localhost:3000",
  "http://localhost:5000",
  "https://*.vercel.app",
  "https://example.com"
]
```

---

### Q4: 通配符`*.vercel.app`安全吗?

**A:** 
- **开发阶段:** ✅ 安全,方便测试
- **生产环境:** ⚠️ 建议改为具体域名
- **原因:** 通配符允许所有Vercel子域名访问

---

### Q5: 配置后多久生效?

**A:** 通常**立即生效**,无需等待。保存后即可使用。

---

## 🔗 参考资料

- **Cloudflare R2 CORS官方文档:** https://developers.cloudflare.com/r2/buckets/cors/
- **CORS常见问题:** https://developers.cloudflare.com/r2/buckets/cors/#common-issues
- **R2 API文档:** https://developers.cloudflare.com/r2/api/

---

## ✅ 验证清单

配置完成后,请确认:

- [ ] CORS规则已保存,无错误提示
- [ ] `AllowedOrigins`不包含单独的`"*"`
- [ ] 包含`http://localhost:3000`(用于本地开发)
- [ ] 包含`https://*.vercel.app`(用于Vercel部署)
- [ ] `AllowedMethods`包含`GET`, `PUT`, `POST`
- [ ] `AllowedHeaders`设置为`["*"]`
- [ ] `MaxAgeSeconds`设置为`3600`

---

## 🚀 下一步

CORS配置完成后,继续完成R2配置的其他步骤:

1. ✅ CORS规则已配置
2. ⏭️ 配置生命周期规则(24小时自动删除)
3. ⏭️ 创建API Token
4. ⏭️ 记录所有配置信息

返回 `user-preparation-checklist.md` 继续下一步!

---

**文档创建日期:** 2025-10-30  
**最后更新:** 2025-10-30  
**状态:** ✅ 已验证
