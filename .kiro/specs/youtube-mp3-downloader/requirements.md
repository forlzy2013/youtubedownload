# Requirements Document

## Introduction

This document specifies the requirements for a YouTube MP3 Downloader web application. The system enables users to download audio from YouTube videos by providing a URL. The application uses a multi-tier fallback architecture combining third-party APIs (RapidAPI) and a self-hosted worker service (Render) to ensure high availability and cost efficiency for a 5-person internal team.

## Glossary

- **Frontend Application**: The static web interface hosted on Vercel that users interact with
- **API Gateway**: Vercel Serverless Functions that route download requests intelligently
- **Fast Track**: RapidAPI-based download path with 3-5 second response time
- **Stable Track**: Render Worker-based download path with 30-60 second response time
- **Task**: An asynchronous download job tracked in Redis with a unique identifier
- **Render Worker**: Docker container running yt-dlp and ffmpeg for video-to-audio conversion
- **Upstash Redis**: Serverless Redis database for task state management
- **Video Metadata**: Information including title, thumbnail, duration, and author

## Requirements

### Requirement 1: URL Input and Validation

**User Story:** As a user, I want to input a YouTube video URL into a search box, so that I can specify which video to download.

#### Acceptance Criteria

1. THE Frontend Application SHALL display a search input field in the upper section of the page occupying 40% of the viewport height
2. WHEN the user pastes a URL into the search field, THE Frontend Application SHALL validate the URL format against YouTube URL patterns
3. THE Frontend Application SHALL accept YouTube URLs in formats including "youtube.com/watch?v=", "youtu.be/", and "youtube.com/embed/"
4. IF the URL format is invalid, THEN THE Frontend Application SHALL display an error message indicating the URL is not a valid YouTube link
5. THE Frontend Application SHALL extract the video ID from the validated URL

### Requirement 2: Video Analysis

**User Story:** As a user, I want to click an "Analyze" button to retrieve video information, so that I can verify the correct video before downloading.

#### Acceptance Criteria

1. THE Frontend Application SHALL display an "Analyze" button adjacent to the search input field
2. WHEN the user clicks the "Analyze" button with a valid URL, THE Frontend Application SHALL send a request to the API Gateway endpoint "/api/video-info"
3. THE API Gateway SHALL respond with Video Metadata within 2 seconds
4. WHEN Video Metadata is received, THE Frontend Application SHALL display the video title, thumbnail image, duration, and author in the lower section occupying 60% of the viewport height
5. IF the API Gateway fails to retrieve Video Metadata, THEN THE Frontend Application SHALL display an error message with retry option

### Requirement 3: Download Initiation

**User Story:** As a user, I want to click a "Download MP3" button after analyzing a video, so that I can obtain the audio file.

#### Acceptance Criteria

1. WHEN Video Metadata is successfully displayed, THE Frontend Application SHALL render a "Download MP3" button
2. WHEN the user clicks the "Download MP3" button, THE Frontend Application SHALL send a download request to the API Gateway endpoint "/api/download"
3. THE API Gateway SHALL attempt to process the request through the Fast Track within 5 seconds
4. IF the Fast Track succeeds, THEN THE API Gateway SHALL return a direct download URL
5. IF the Fast Track fails after trying all three RapidAPI endpoints, THEN THE API Gateway SHALL create a Task and return a task identifier

### Requirement 4: Fast Track Download with Intelligent API Selection

**User Story:** As a user, I want my download to complete quickly when possible, so that I can save time.

#### Acceptance Criteria

1. THE API Gateway SHALL select a primary RapidAPI endpoint using weighted random selection based on current quota status
2. THE API Gateway SHALL assign selection weights as follows: API 1 (10%), API 2 (10%), API 3 (80%) when all quotas are available
3. WHEN an API quota reaches 80% utilization, THE API Gateway SHALL reduce that API's selection weight to 0%
4. THE API Gateway SHALL attempt the selected primary API endpoint with a 5-second timeout
5. IF the primary API fails or times out, THEN THE API Gateway SHALL attempt the remaining two APIs in priority order (1, 2, 3)
6. WHEN any RapidAPI endpoint returns a valid download URL, THE API Gateway SHALL immediately return the URL to the Frontend Application
7. IF all three RapidAPI endpoints fail, THEN THE API Gateway SHALL proceed to the Stable Track
8. THE Frontend Application SHALL trigger an automatic browser download when receiving a direct download URL
9. THE API Gateway SHALL log each API attempt with endpoint name, success/failure status, response time, and quota utilization for monitoring purposes

### Requirement 5: Stable Track Fallback

**User Story:** As a user, I want the system to still process my download even when fast APIs fail, so that I can reliably obtain the audio file.

#### Acceptance Criteria

1. WHEN all Fast Track attempts fail, THE API Gateway SHALL check the Render Worker health status
2. IF the Render Worker is in sleep mode, THEN THE API Gateway SHALL send a wake-up request
3. THE API Gateway SHALL create a Task record in Upstash Redis with status "pending"
4. THE API Gateway SHALL send the Task to the Render Worker endpoint "/download"
5. THE API Gateway SHALL return the task identifier to the Frontend Application within 1 second

### Requirement 6: Asynchronous Task Processing

**User Story:** As a user, I want to see the progress of my download when it takes longer, so that I know the system is working.

#### Acceptance Criteria

1. WHEN the Frontend Application receives a task identifier, THE Frontend Application SHALL display a "Processing..." status message
2. THE Frontend Application SHALL poll the API Gateway endpoint "/api/task-status" every 3 seconds
3. THE API Gateway SHALL query Upstash Redis and return the current Task status
4. THE Frontend Application SHALL display progress percentage when available
5. WHEN the Task status changes to "completed", THE Frontend Application SHALL retrieve the download URL and trigger an automatic browser download

### Requirement 7: Worker Video Processing

**User Story:** As a system, I want the Render Worker to reliably convert YouTube videos to MP3, so that users receive high-quality audio files.

#### Acceptance Criteria

1. WHEN the Render Worker receives a Task, THE Render Worker SHALL update the Task status to "processing" in Upstash Redis
2. THE Render Worker SHALL execute yt-dlp to download the video with audio extraction
3. THE Render Worker SHALL execute ffmpeg to convert the audio to MP3 format with 128kbps bitrate
4. THE Render Worker SHALL process a maximum of 3 concurrent Tasks
5. WHEN conversion completes, THE Render Worker SHALL update the Task status to "completed" and store the download URL in Upstash Redis

### Requirement 8: Download History

**User Story:** As a user, I want to see my recent downloads, so that I can re-download files or track my usage.

#### Acceptance Criteria

1. THE Frontend Application SHALL store completed download records in browser localStorage
2. THE Frontend Application SHALL display a download history section showing the most recent 50 downloads
3. WHILE viewing download history, THE Frontend Application SHALL display video title, download timestamp, and file size for each record
4. THE Frontend Application SHALL provide a "Re-download" button for each history entry
5. THE Frontend Application SHALL provide a "Clear History" button to remove all local records

### Requirement 9: Error Handling

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and what to do next.

#### Acceptance Criteria

1. IF any API request fails, THEN THE Frontend Application SHALL display a user-friendly error message describing the issue
2. THE Frontend Application SHALL provide a "Retry" button for failed operations
3. IF a Task fails during processing, THEN THE Render Worker SHALL update the Task status to "failed" with an error description
4. THE API Gateway SHALL return appropriate HTTP status codes (400 for invalid input, 500 for server errors, 503 for service unavailable)
5. THE Frontend Application SHALL log errors to the browser console for debugging purposes

### Requirement 10: Responsive Design

**User Story:** As a user, I want to use the application on different devices, so that I can download videos from my phone, tablet, or computer.

#### Acceptance Criteria

1. THE Frontend Application SHALL render correctly on mobile devices with screen widths from 320px to 480px
2. THE Frontend Application SHALL render correctly on tablet devices with screen widths from 481px to 1024px
3. THE Frontend Application SHALL render correctly on desktop devices with screen widths above 1024px
4. THE Frontend Application SHALL use flexible layouts that adapt to different viewport sizes
5. THE Frontend Application SHALL ensure touch targets are at least 44x44 pixels on mobile devices

### Requirement 11: Performance Optimization

**User Story:** As a user, I want the application to respond quickly, so that I have a smooth experience.

#### Acceptance Criteria

1. THE Frontend Application SHALL display the initial page within 2 seconds on a 3G connection
2. THE API Gateway SHALL respond to "/api/video-info" requests within 2 seconds
3. THE API Gateway SHALL respond to "/api/download" requests within 5 seconds for Fast Track or 1 second for Stable Track task creation
4. THE API Gateway SHALL respond to "/api/task-status" requests within 1 second
5. THE Render Worker SHALL complete video processing within 60 seconds for videos under 10 minutes

### Requirement 12: Cost Management

**User Story:** As a system administrator, I want to minimize operational costs, so that the service remains sustainable for the team.

#### Acceptance Criteria

1. THE system SHALL utilize free tier resources from Vercel, Render, RapidAPI, and Upstash
2. THE API Gateway SHALL prioritize RapidAPI endpoints with higher free quotas
3. THE system SHALL monitor monthly API usage and display warnings when approaching 80% of free quotas
4. THE Render Worker SHALL implement a health check endpoint for external ping services to prevent cold starts
5. THE system SHALL maintain total monthly operational costs below $5 USD

### Requirement 13: Service Health Monitoring

**User Story:** As a system administrator, I want to monitor service health, so that I can identify and resolve issues quickly.

#### Acceptance Criteria

1. THE API Gateway SHALL provide a "/api/health" endpoint that checks connectivity to Upstash Redis, RapidAPI, and Render Worker
2. THE Render Worker SHALL provide a "/health" endpoint that returns service status and uptime
3. THE API Gateway health endpoint SHALL respond within 2 seconds
4. THE Render Worker health endpoint SHALL respond within 1 second
5. WHEN any dependency is unavailable, THE health endpoint SHALL return HTTP status 503 with details about the failing component

### Requirement 14: Cold Start Prevention

**User Story:** As a system administrator, I want to prevent the Render Worker from entering sleep mode, so that users experience consistent response times.

#### Acceptance Criteria

1. THE Render Worker SHALL provide a "/health" endpoint that responds with HTTP status 200 when the service is operational
2. THE system SHALL be configured to receive external HTTP GET requests to the Render Worker "/health" endpoint every 10 minutes
3. WHEN the Render Worker receives a health check request, THE Render Worker SHALL respond within 1 second without performing any processing
4. THE external ping service SHALL be configured using cron-job.org or equivalent service
5. THE Render Worker SHALL log the timestamp of each health check request for monitoring purposes

### Requirement 15: API Quota Management

**User Story:** As a system administrator, I want to track API usage against quotas, so that I can avoid service disruptions.

#### Acceptance Criteria

1. THE API Gateway SHALL maintain separate counters in Upstash Redis for each RapidAPI endpoint per month
2. THE API Gateway SHALL increment the appropriate counter after each RapidAPI request attempt
3. WHEN any RapidAPI usage counter reaches 80% of its monthly quota, THE API Gateway SHALL log a warning message
4. WHEN RapidAPI endpoint 1 reaches 100% of its 300 monthly quota, THE API Gateway SHALL skip endpoint 1 and start with endpoint 2
5. WHEN RapidAPI endpoint 2 reaches 100% of its 300 monthly quota, THE API Gateway SHALL skip endpoint 2 and start with endpoint 3
6. WHEN RapidAPI endpoint 3 reaches 100% of its 500 daily quota, THE API Gateway SHALL skip endpoint 3 for the remainder of the day
7. WHEN all RapidAPI endpoints are exhausted, THE API Gateway SHALL route all requests directly to Stable Track
8. THE API Gateway SHALL reset monthly usage counters on the first day of each month
9. THE API Gateway SHALL reset daily usage counters at midnight UTC

### Requirement 16: Rate Limiting

**User Story:** As a system administrator, I want to limit request frequency, so that the service avoids being blocked by YouTube.

#### Acceptance Criteria

1. THE API Gateway SHALL track the number of download requests per client IP address using Upstash Redis
2. THE API Gateway SHALL limit each IP address to a maximum of 5 download requests per minute
3. IF a client exceeds the rate limit, THEN THE API Gateway SHALL return HTTP status 429 with a "Too Many Requests" message
4. THE Frontend Application SHALL display a user-friendly message when rate limited, indicating the wait time
5. THE rate limit counter SHALL expire after 60 seconds

### Requirement 17: Task Timeout Handling

**User Story:** As a user, I want to be notified if my download takes too long, so that I can retry or choose a different video.

#### Acceptance Criteria

1. THE Render Worker SHALL set a maximum processing time of 120 seconds for each Task
2. IF a Task exceeds 120 seconds, THEN THE Render Worker SHALL terminate the yt-dlp process
3. THE Render Worker SHALL update the Task status to "failed" with error message "Processing timeout exceeded"
4. THE Frontend Application SHALL stop polling when a Task status is "failed"
5. THE Frontend Application SHALL display a retry button when a Task fails due to timeout

### Requirement 18: Task Expiration Handling

**User Story:** As a user, I want to understand why I cannot retrieve an old download, so that I know to initiate a new download.

#### Acceptance Criteria

1. THE Upstash Redis SHALL automatically delete Task records after 24 hours using TTL expiration
2. WHEN the Frontend Application polls for a Task that no longer exists, THE API Gateway SHALL return HTTP status 404
3. THE Frontend Application SHALL detect 404 responses and display a message "Download link expired. Please start a new download."
4. THE Frontend Application SHALL remove expired tasks from the download history
5. THE Frontend Application SHALL provide a "Download Again" button for expired tasks

### Requirement 19: Error Recovery

**User Story:** As a user, I want the system to automatically retry failed operations when appropriate, so that temporary issues do not prevent my download.

#### Acceptance Criteria

1. WHEN the RapidAPI request fails with a network error, THE API Gateway SHALL retry the request once after a 2-second delay
2. WHEN the Render Worker fails to download a video due to a network error, THE Render Worker SHALL retry the download once
3. THE Render Worker SHALL NOT retry if the error is "Video unavailable" or "Private video"
4. THE API Gateway SHALL NOT retry if the error is "Invalid URL" or "Rate limit exceeded"
5. THE system SHALL log all retry attempts with timestamps and error details
