# RapidAPI 功能调研

## 需要核实的问题

技术方案中提供的API示例可能不是用于MP3下载的端点。需要核实每个API是否有专门的下载端点。

---

## API 1: YouTube MP3 (ytjar) ✅

**API链接:** https://rapidapi.com/ytjar/api/youtube-mp36

**端点:** `GET /dl?id={videoId}`

**示例请求:**
```bash
curl --request GET \
  --url 'https://youtube-mp36.p.rapidapi.com/dl?id=UxxajLWwzqY' \
  --header 'x-rapidapi-host: youtube-mp36.p.rapidapi.com' \
  --header 'x-rapidapi-key: 2411876baamsh8db1f6ac9e4b41fp1ed553jsn3520b7122fec'
```

**示例响应:**
```json
{
  "link": "https://cdn02.ytjar.xyz/get.php/6/29/UxxajLWwzqY.mp3?h=...",
  "title": "Icona Pop - I Love It (feat. Charli XCX) [OFFICIAL VIDEO]",
  "progress": 0,
  "duration": 180.062,
  "status": "ok",
  "msg": "success"
}
```

**功能确认:** ✅ 直接返回MP3下载链接
**免费额度:** 300次/月
**优先级:** 1 (最高)

---

## API 2: YT-API (ytjar) ❓

**API链接:** https://rapidapi.com/ytjar/api/yt-api

**技术方案中的端点:** `GET /video/screenshot` - ❌ 这是截图功能

**需要核实的问题:**
1. 这个API是否有MP3下载端点?
2. 可能的端点名称: `/dl`, `/download`, `/mp3`, `/audio`
3. 如果有,请求格式是什么?
4. 响应格式是什么?

**建议操作:**
- 访问 https://rapidapi.com/ytjar/api/yt-api
- 查看所有可用端点列表
- 寻找与"download"、"mp3"、"audio"相关的端点
- 测试端点是否返回下载链接

**临时结论:** ⚠️ 需要进一步调研

---

## API 3: YouTube Media Downloader (DataFanatic) ❓

**API链接:** https://rapidapi.com/DataFanatic/api/youtube-media-downloader

**技术方案中的端点:** `GET /v2/playlist/videos` - ❌ 这是播放列表信息

**需要核实的问题:**
1. 这个API是否有单个视频下载端点?
2. 可能的端点名称: `/v2/video/download`, `/v2/video/info`, `/download`
3. 是否支持MP3格式?还是只有视频格式?
4. 如果支持,请求和响应格式是什么?

**建议操作:**
- 访问 https://rapidapi.com/DataFanatic/api/youtube-media-downloader/playground
- 查看所有可用端点
- 特别关注包含"download"的端点
- 测试是否支持音频格式下载

**临时结论:** ⚠️ 需要进一步调研

---

## 调研任务清单

### 任务1: 核实 YT-API 的下载能力
- [ ] 访问API文档页面
- [ ] 列出所有可用端点
- [ ] 识别下载相关端点
- [ ] 测试端点功能
- [ ] 记录请求/响应格式
- [ ] 确认免费额度

### 任务2: 核实 YouTube Media Downloader 的下载能力  
- [ ] 访问API文档页面
- [ ] 列出所有可用端点
- [ ] 识别视频/音频下载端点
- [ ] 测试MP3格式支持
- [ ] 记录请求/响应格式
- [ ] 确认免费额度

### 任务3: 寻找备选API
如果API 2和API 3不可用,需要寻找其他RapidAPI上的YouTube下载服务:

搜索关键词:
- "youtube mp3"
- "youtube audio"
- "youtube downloader"
- "yt download"

评估标准:
- 免费额度 > 50次/月
- 响应时间 < 10秒
- 返回直接下载链接(不是需要二次请求)
- 支持常见YouTube URL格式

---

## 当前状态

| API | 功能确认 | 可用性 | 优先级 |
|-----|---------|-------|--------|
| API 1: YouTube MP3 | ✅ MP3下载 | ✅ 确认可用 | 1 |
| API 2: YT-API | ❓ 待核实 | ⚠️ 未知 | 2 |
| API 3: YouTube Media Downloader | ❓ 待核实 | ⚠️ 未知 | 3 |

---

## 下一步行动

**选项A: 用户自行调研**
- 用户访问API文档页面
- 测试API端点
- 反馈调研结果

**选项B: 简化架构**
- 仅使用API 1 (已确认可用)
- 快速通道: API 1
- 降级通道: Render Worker
- 接受快速通道覆盖率降低

**选项C: 寻找新API**
- 在RapidAPI市场搜索其他YouTube下载服务
- 评估并测试新API
- 更新技术方案

**推荐:** 选项A + 选项C并行
- 先核实现有API 2和API 3
- 同时搜索备选API
- 确保至少有2-3个可用的快速通道API

---

## 问题

**给用户的问题:**

1. 你能否访问这两个API的完整文档,查看是否有MP3下载端点?
   - YT-API: https://rapidapi.com/ytjar/api/yt-api
   - YouTube Media Downloader: https://rapidapi.com/DataFanatic/api/youtube-media-downloader

2. 如果这两个API不支持MP3下载,你是否愿意:
   - 接受只用1个快速通道API (降低快速通道覆盖率)
   - 或者花时间寻找其他可用的API?

3. 你是否已经测试过这些API?如果是,能否分享测试结果?
