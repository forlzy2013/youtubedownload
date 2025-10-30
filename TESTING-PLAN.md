# End-to-End Testing Plan

## Overview

This document outlines the comprehensive testing plan for the YouTube MP3 Downloader project. All tests must pass before the system is considered production-ready.

## 🎯 Testing Objectives

1. Verify all user flows work correctly
2. Ensure error handling is robust
3. Validate responsive design across devices
4. Confirm API quota management works
5. Test rate limiting effectiveness
6. Verify download history functionality
7. Ensure all requirements are met

## 📋 Test Environment Setup

### Prerequisites

Before starting tests, ensure:

- [ ] Vercel deployment is live
- [ ] Render Worker is deployed and running
- [ ] CRON job is configured and running
- [ ] All environment variables are set
- [ ] Redis is accessible
- [ ] RapidAPI keys are valid
- [ ] R2 storage is configured

### Test Data

**Valid YouTube URLs:**
```
Short video (<3 min): https://youtu.be/dQw4w9WgXcQ
Medium video (5-10 min): https://youtu.be/jNQXAC9IVRw
Long video (>10 min): https://youtu.be/9bZkp7q19f0
```

**Invalid URLs:**
```
Not YouTube: https://vimeo.com/123456
Invalid format: not-a-url
Malformed: https://youtube.com/invalid
```

**Edge Cases:**
```
Private video: (find one)
Deleted video: (find one)
Age-restricted: (find one)
Live stream: (find one)
```

---

## 🧪 Test Cases

### Category 1: Fast Track Flow (Happy Path)

#### Test 1.1: Complete Fast Track Download

**Objective:** Verify end-to-end Fast Track flow works correctly

**Steps:**
1. Open application in browser
2. Paste valid YouTube URL: `https://youtu.be/dQw4w9WgXcQ`
3. Click "Analyze" button
4. Wait for video information to load
5. Verify video info displays correctly:
   - Thumbnail image
   - Video title
   - Duration
   - Channel name
6. Click "Download MP3" button
7. Wait for download to complete

**Expected Results:**
- ✅ Video info loads within 2-3 seconds
- ✅ All video metadata displays correctly
- ✅ Download completes within 3-5 seconds
- ✅ Response type is "direct"
- ✅ MP3 file downloads to browser
- ✅ File is playable
- ✅ Download appears in history

**Pass Criteria:**
- All steps complete without errors
- Download time < 10 seconds
- File size matches video duration (~1MB per minute)

---

#### Test 1.2: Fast Track with Different Video Lengths

**Objective:** Test Fast Track with various video durations

**Test Cases:**

| Video Length | URL | Expected File Size | Pass/Fail |
|--------------|-----|-------------------|-----------|
| <3 minutes | `https://youtu.be/dQw4w9WgXcQ` | ~3-4 MB | [ ] |
| 5-10 minutes | `https://youtu.be/jNQXAC9IVRw` | ~5-10 MB | [ ] |
| 10-20 minutes | `https://youtu.be/9bZkp7q19f0` | ~10-20 MB | [ ] |

**Expected Results:**
- ✅ All videos download successfully
- ✅ File sizes are reasonable
- ✅ All files are playable

---

#### Test 1.3: Fast Track API Rotation

**Objective:** Verify smart API selection works

**Steps:**
1. Monitor which API is used (check logs or response)
2. Make multiple download requests
3. Verify API rotation follows weighted selection (1:1:8)

**Expected Results:**
- ✅ API 3 is used ~80% of the time
- ✅ API 1 and 2 are used ~10% each
- ✅ Quota counters increment correctly

**How to Verify:**
```bash
# Check API usage
curl https://your-app.vercel.app/api/health | jq '.data.services.rapidapi.quotas'
```

---

### Category 2: Stable Track Flow (Fallback)

#### Test 2.1: Complete Stable Track Download

**Objective:** Verify Stable Track works when Fast Track fails

**Setup:**
- Temporarily disable RapidAPI (set invalid key or exhaust quotas)

**Steps:**
1. Open application in browser
2. Paste valid YouTube URL
3. Click "Analyze" button
4. Wait for video information to load
5. Click "Download MP3" button
6. Observe "Processing..." message appears
7. Watch progress bar update
8. Wait for download to complete

**Expected Results:**
- ✅ Fast Track fails gracefully
- ✅ System falls back to Stable Track
- ✅ Task is created in Redis
- ✅ "Processing..." message displays
- ✅ Progress bar updates (10% → 30% → 80% → 100%)
- ✅ Download completes within 30-60 seconds
- ✅ MP3 file downloads automatically
- ✅ File is playable
- ✅ Download appears in history

**Pass Criteria:**
- Fallback happens automatically
- User sees clear progress indication
- Download completes successfully
- Total time < 90 seconds

---

#### Test 2.2: Stable Track with Large File (>5MB)

**Objective:** Verify R2 storage works for large files

**Steps:**
1. Use Stable Track (disable Fast Track)
2. Download a long video (>10 minutes)
3. Verify file size > 5MB
4. Check that R2 is used (not base64)

**Expected Results:**
- ✅ File uploads to R2
- ✅ Download URL is R2 URL (not data URL)
- ✅ File downloads successfully
- ✅ File is playable

**How to Verify:**
```bash
# Check task status
curl "https://your-app.vercel.app/api/task-status?taskId=TASK_ID" | jq '.data.downloadUrl'

# Should start with R2_PUBLIC_URL, not "data:audio/mpeg"
```

---

#### Test 2.3: Stable Track with Small File (<5MB)

**Objective:** Verify base64 storage works for small files

**Steps:**
1. Use Stable Track (disable Fast Track)
2. Download a short video (<3 minutes)
3. Verify file size < 5MB
4. Check that base64 is used (not R2)

**Expected Results:**
- ✅ File is converted to base64
- ✅ Download URL is data URL
- ✅ File downloads successfully
- ✅ File is playable

**How to Verify:**
```bash
# Check task status
curl "https://your-app.vercel.app/api/task-status?taskId=TASK_ID" | jq '.data.downloadUrl'

# Should start with "data:audio/mpeg;base64,"
```

---

#### Test 2.4: Concurrent Stable Track Downloads

**Objective:** Verify task queue handles multiple concurrent requests

**Steps:**
1. Use Stable Track (disable Fast Track)
2. Start 5 downloads simultaneously
3. Monitor task queue size
4. Verify max 3 concurrent tasks

**Expected Results:**
- ✅ Max 3 tasks process concurrently
- ✅ Additional tasks queue
- ✅ All tasks complete successfully
- ✅ No tasks fail due to concurrency

**How to Verify:**
```bash
# Check worker health
curl https://youtube-mp3-worker.onrender.com/health | jq '.queueSize'

# Should never exceed 3 running + queued
```

---

### Category 3: Error Handling

#### Test 3.1: Invalid URL

**Objective:** Verify invalid URL handling

**Test Cases:**

| Input | Expected Error | Pass/Fail |
|-------|---------------|-----------|
| `not-a-url` | "Invalid YouTube URL" | [ ] |
| `https://vimeo.com/123` | "Invalid YouTube URL" | [ ] |
| `https://youtube.com/invalid` | "Invalid YouTube URL" | [ ] |
| Empty string | "Please enter a URL" | [ ] |

**Expected Results:**
- ✅ Error message displays immediately
- ✅ No API calls are made
- ✅ User can correct and retry

---

#### Test 3.2: Rate Limiting

**Objective:** Verify rate limiting works correctly

**Steps:**
1. Make 5 download requests within 1 minute
2. Attempt 6th request
3. Verify rate limit error

**Expected Results:**
- ✅ First 5 requests succeed
- ✅ 6th request returns 429 error
- ✅ Error message: "Too many requests. Please wait 60 seconds."
- ✅ Retry-after time is shown
- ✅ After 60 seconds, requests work again

**How to Test:**
```bash
# Make 6 rapid requests
for i in {1..6}; do
  curl "https://your-app.vercel.app/api/download?url=https://youtu.be/dQw4w9WgXcQ"
  echo "Request $i"
done
```

---

#### Test 3.3: Task Timeout

**Objective:** Verify timeout handling for long-running tasks

**Setup:**
- Use a very long video (>1 hour) or slow network

**Steps:**
1. Start download that will timeout
2. Wait for 120 seconds (timeout limit)
3. Check task status

**Expected Results:**
- ✅ Task fails after 120 seconds
- ✅ Status changes to "failed"
- ✅ Error message: "Processing timeout exceeded"
- ✅ User sees retry button
- ✅ Temp files are cleaned up

---

#### Test 3.4: Expired Task

**Objective:** Verify expired task handling

**Setup:**
- Create a task and wait 24+ hours (or manually delete from Redis)

**Steps:**
1. Try to check status of expired task
2. Verify 404 response

**Expected Results:**
- ✅ API returns 404
- ✅ Error message: "Task not found or expired"
- ✅ User sees "Download Again" button
- ✅ Task is removed from history

---

#### Test 3.5: Video Unavailable

**Objective:** Verify handling of unavailable videos

**Test Cases:**

| Scenario | Expected Error | Pass/Fail |
|----------|---------------|-----------|
| Private video | "Video is unavailable or private" | [ ] |
| Deleted video | "Video is unavailable or private" | [ ] |
| Age-restricted | "Video is unavailable or private" | [ ] |
| Live stream | "Live streams are not supported" | [ ] |

**Expected Results:**
- ✅ Error message is clear
- ✅ No retry for these errors
- ✅ User can try different video

---

#### Test 3.6: API Quota Exhausted

**Objective:** Verify behavior when all API quotas are exhausted

**Setup:**
- Exhaust all 3 RapidAPI quotas

**Steps:**
1. Attempt download
2. Verify fallback to Stable Track

**Expected Results:**
- ✅ Fast Track is skipped
- ✅ Stable Track is used immediately
- ✅ Download completes successfully
- ✅ Health endpoint shows exhausted quotas

**How to Verify:**
```bash
curl https://your-app.vercel.app/api/health | jq '.data.services.rapidapi.quotas'
```

---

### Category 4: Responsive Design

#### Test 4.1: Mobile Phone (320-480px)

**Objective:** Verify mobile layout works correctly

**Devices to Test:**
- iPhone SE (375x667)
- iPhone 12 (390x844)
- Samsung Galaxy S21 (360x800)

**Test Steps:**
1. Open app on mobile device or use browser dev tools
2. Test all functionality:
   - URL input
   - Analyze button
   - Video info display
   - Download button
   - Progress bar
   - History section

**Expected Results:**
- ✅ Layout adapts to small screen
- ✅ All text is readable
- ✅ Buttons are at least 44x44 pixels
- ✅ No horizontal scrolling
- ✅ Touch targets are easy to tap
- ✅ All features work

**Pass Criteria:**
- [ ] iPhone SE
- [ ] iPhone 12
- [ ] Samsung Galaxy S21

---

#### Test 4.2: Tablet (481-1024px)

**Objective:** Verify tablet layout works correctly

**Devices to Test:**
- iPad (768x1024)
- iPad Pro (1024x1366)
- Android Tablet (800x1280)

**Expected Results:**
- ✅ Layout uses available space efficiently
- ✅ All features work
- ✅ Touch targets are appropriate
- ✅ No layout issues

**Pass Criteria:**
- [ ] iPad
- [ ] iPad Pro
- [ ] Android Tablet

---

#### Test 4.3: Desktop (1024px+)

**Objective:** Verify desktop layout works correctly

**Resolutions to Test:**
- 1024x768 (small desktop)
- 1920x1080 (full HD)
- 2560x1440 (2K)

**Expected Results:**
- ✅ Layout is centered and readable
- ✅ No wasted space
- ✅ All features work
- ✅ Hover states work

**Pass Criteria:**
- [ ] 1024x768
- [ ] 1920x1080
- [ ] 2560x1440

---

#### Test 4.4: Browser Compatibility

**Objective:** Verify cross-browser compatibility

**Browsers to Test:**

| Browser | Version | Desktop | Mobile | Pass/Fail |
|---------|---------|---------|--------|-----------|
| Chrome | Latest | [ ] | [ ] | [ ] |
| Firefox | Latest | [ ] | [ ] | [ ] |
| Safari | Latest | [ ] | [ ] | [ ] |
| Edge | Latest | [ ] | [ ] | [ ] |

**Expected Results:**
- ✅ All features work in all browsers
- ✅ Layout is consistent
- ✅ No JavaScript errors

---

### Category 5: Download History

#### Test 5.1: Save Download to History

**Objective:** Verify downloads are saved to history

**Steps:**
1. Complete a download
2. Check history section
3. Verify download appears

**Expected Results:**
- ✅ Download appears in history immediately
- ✅ Shows video title
- ✅ Shows download timestamp
- ✅ Shows file size (if available)
- ✅ Shows thumbnail

---

#### Test 5.2: Re-download from History

**Objective:** Verify re-download functionality

**Steps:**
1. Find a download in history
2. Click "Re-download" button
3. Verify download starts

**Expected Results:**
- ✅ Download starts immediately
- ✅ Same video is downloaded
- ✅ New entry is added to history

---

#### Test 5.3: Clear History

**Objective:** Verify clear history functionality

**Steps:**
1. Have multiple downloads in history
2. Click "Clear History" button
3. Confirm action

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ All history is cleared
- ✅ History section is empty
- ✅ Downloaded files remain on computer

---

#### Test 5.4: History Limit (50 items)

**Objective:** Verify FIFO limit works

**Steps:**
1. Download 51 videos
2. Check history

**Expected Results:**
- ✅ Only 50 most recent downloads shown
- ✅ Oldest download is removed automatically
- ✅ FIFO order is maintained

---

#### Test 5.5: History Persistence

**Objective:** Verify history persists across sessions

**Steps:**
1. Download a video
2. Close browser
3. Reopen browser and visit app
4. Check history

**Expected Results:**
- ✅ History is still there
- ✅ All data is intact

**Note:** History is lost if user clears browser data

---

### Category 6: API Quota Management

#### Test 6.1: Quota Tracking

**Objective:** Verify quota counters work correctly

**Steps:**
1. Check initial quota status
2. Make several downloads
3. Check quota status again
4. Verify counters incremented

**Expected Results:**
- ✅ Counters increment after each API call
- ✅ Separate counters for each API
- ✅ Monthly quotas track correctly
- ✅ Daily quotas track correctly

**How to Verify:**
```bash
# Before downloads
curl https://your-app.vercel.app/api/health | jq '.data.services.rapidapi.quotas'

# After downloads
curl https://your-app.vercel.app/api/health | jq '.data.services.rapidapi.quotas'
```

---

#### Test 6.2: Quota Reset

**Objective:** Verify quota reset logic works

**Test Cases:**

| Quota Type | Reset Time | How to Test | Pass/Fail |
|------------|-----------|-------------|-----------|
| API 1 (monthly) | 1st of month | Wait or manually reset | [ ] |
| API 2 (monthly) | 1st of month | Wait or manually reset | [ ] |
| API 3 (daily) | Midnight UTC | Wait or manually reset | [ ] |

**Expected Results:**
- ✅ Quotas reset at correct time
- ✅ Counters return to 0
- ✅ APIs become available again

---

#### Test 6.3: 80% Warning Threshold

**Objective:** Verify warning logs when quota reaches 80%

**Steps:**
1. Use API until quota reaches 80%
2. Check logs for warning

**Expected Results:**
- ✅ Warning is logged
- ✅ Warning includes API name and usage
- ✅ System continues to work

---

### Category 7: Performance

#### Test 7.1: Response Times

**Objective:** Verify all endpoints meet performance targets

**Endpoints to Test:**

| Endpoint | Target | Actual | Pass/Fail |
|----------|--------|--------|-----------|
| /api/video-info | <2s | | [ ] |
| /api/download (Fast) | <5s | | [ ] |
| /api/download (Stable) | <1s | | [ ] |
| /api/task-status | <1s | | [ ] |
| /api/health | <12s | | [ ] |

**How to Measure:**
```bash
time curl "https://your-app.vercel.app/api/video-info?url=https://youtu.be/dQw4w9WgXcQ"
```

---

#### Test 7.2: Cold Start Prevention

**Objective:** Verify CRON job prevents cold starts

**Steps:**
1. Wait 20 minutes without making requests
2. Make a download request
3. Measure response time

**Expected Results:**
- ✅ Response time < 5 seconds (not 30-60s)
- ✅ Worker responds immediately
- ✅ CRON job is running

**How to Verify:**
```bash
# Check CRON execution history on cron-job.org
# Should see executions every 10 minutes
```

---

#### Test 7.3: Concurrent Users

**Objective:** Verify system handles multiple concurrent users

**Steps:**
1. Simulate 10 concurrent users
2. Each makes a download request
3. Verify all complete successfully

**Expected Results:**
- ✅ All requests complete
- ✅ No timeouts
- ✅ No errors
- ✅ Response times remain acceptable

**How to Test:**
```bash
# Use Apache Bench or similar
ab -n 10 -c 10 "https://your-app.vercel.app/api/download?url=https://youtu.be/dQw4w9WgXcQ"
```

---

### Category 8: Security

#### Test 8.1: Input Validation

**Objective:** Verify all inputs are validated

**Test Cases:**

| Input | Expected Behavior | Pass/Fail |
|-------|------------------|-----------|
| SQL injection attempt | Rejected | [ ] |
| XSS attempt | Sanitized | [ ] |
| Path traversal | Rejected | [ ] |
| Very long URL | Rejected | [ ] |

**Expected Results:**
- ✅ All malicious inputs are rejected
- ✅ No errors are exposed to user
- ✅ System remains secure

---

#### Test 8.2: Rate Limiting Bypass Attempts

**Objective:** Verify rate limiting cannot be bypassed

**Steps:**
1. Try to bypass rate limiting:
   - Change IP (use VPN)
   - Clear cookies
   - Use different browser
2. Verify rate limit still applies

**Expected Results:**
- ✅ Rate limit is per IP
- ✅ Cannot be bypassed easily
- ✅ System remains protected

---

#### Test 8.3: HTTPS Enforcement

**Objective:** Verify all connections use HTTPS

**Steps:**
1. Try to access via HTTP
2. Verify redirect to HTTPS

**Expected Results:**
- ✅ HTTP redirects to HTTPS
- ✅ All API calls use HTTPS
- ✅ No mixed content warnings

---

### Category 9: Requirements Verification

#### Test 9.1: All Requirements Met

**Objective:** Verify all 19 requirements are satisfied

**Checklist:**

- [ ] Requirement 1: URL Input and Validation
- [ ] Requirement 2: Video Analysis
- [ ] Requirement 3: Download Initiation
- [ ] Requirement 4: Fast Track Download
- [ ] Requirement 5: Stable Track Fallback
- [ ] Requirement 6: Asynchronous Task Processing
- [ ] Requirement 7: Worker Video Processing
- [ ] Requirement 8: Download History
- [ ] Requirement 9: Error Handling
- [ ] Requirement 10: Responsive Design
- [ ] Requirement 11: Performance Optimization
- [ ] Requirement 12: Cost Management
- [ ] Requirement 13: Service Health Monitoring
- [ ] Requirement 14: Cold Start Prevention
- [ ] Requirement 15: API Quota Management
- [ ] Requirement 16: Rate Limiting
- [ ] Requirement 17: Task Timeout Handling
- [ ] Requirement 18: Task Expiration Handling
- [ ] Requirement 19: Error Recovery

**How to Verify:**
- Review requirements.md
- Map each requirement to test cases
- Verify all acceptance criteria are met

---

## 🐛 Bug Tracking

### Bug Report Template

```markdown
## Bug #[NUMBER]

**Title:** [Brief description]

**Severity:** Critical / High / Medium / Low

**Category:** [Frontend / API / Worker / Infrastructure]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots/Logs:**
[If applicable]

**Environment:**
- Browser: [Chrome 120]
- Device: [Desktop / Mobile]
- OS: [Windows 11]

**Status:** Open / In Progress / Fixed / Closed

**Fix:**
[Description of fix if resolved]
```

### Known Issues

| Bug # | Title | Severity | Status | Fix |
|-------|-------|----------|--------|-----|
| | | | | |

---

## ✅ Test Execution Checklist

### Pre-Testing
- [ ] All services deployed
- [ ] Environment variables configured
- [ ] CRON job running
- [ ] Test data prepared
- [ ] Test accounts created

### Testing
- [ ] Category 1: Fast Track Flow (4 tests)
- [ ] Category 2: Stable Track Flow (4 tests)
- [ ] Category 3: Error Handling (6 tests)
- [ ] Category 4: Responsive Design (4 tests)
- [ ] Category 5: Download History (5 tests)
- [ ] Category 6: API Quota Management (3 tests)
- [ ] Category 7: Performance (3 tests)
- [ ] Category 8: Security (3 tests)
- [ ] Category 9: Requirements Verification (19 checks)

### Post-Testing
- [ ] All bugs documented
- [ ] Critical bugs fixed
- [ ] Regression testing completed
- [ ] Performance metrics recorded
- [ ] Test report generated

---

## 📊 Test Report Template

```markdown
# Test Execution Report

**Date:** [Date]
**Tester:** [Name]
**Environment:** [Production / Staging]

## Summary

- **Total Tests:** [Number]
- **Passed:** [Number]
- **Failed:** [Number]
- **Blocked:** [Number]
- **Pass Rate:** [Percentage]

## Test Results by Category

| Category | Total | Passed | Failed | Pass Rate |
|----------|-------|--------|--------|-----------|
| Fast Track | 4 | | | |
| Stable Track | 4 | | | |
| Error Handling | 6 | | | |
| Responsive Design | 4 | | | |
| Download History | 5 | | | |
| API Quota | 3 | | | |
| Performance | 3 | | | |
| Security | 3 | | | |
| Requirements | 19 | | | |

## Critical Issues

[List any critical issues found]

## Recommendations

[Any recommendations for improvements]

## Sign-off

- [ ] All critical bugs fixed
- [ ] All tests passed
- [ ] System ready for production

**Approved by:** [Name]
**Date:** [Date]
```

---

## 🚀 Production Readiness Criteria

Before marking the system as production-ready:

- [ ] All test categories completed
- [ ] Pass rate > 95%
- [ ] No critical bugs
- [ ] No high-severity bugs
- [ ] Performance targets met
- [ ] All requirements verified
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Backup procedures tested
- [ ] Rollback plan documented

---

**Last Updated:** 2025-10-30
**Version:** 1.0
