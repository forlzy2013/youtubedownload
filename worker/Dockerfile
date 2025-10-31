# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg

# Install yt-dlp (with --break-system-packages for Python 3.12+)
RUN pip3 install --break-system-packages --upgrade yt-dlp

# Set working directory
WORKDIR /app

# Copy package files from worker directory
COPY worker/package*.json ./

# Install Node.js dependencies
RUN npm install --only=production

# Copy application code from worker directory
COPY worker/*.js ./

# Verify files are copied correctly
RUN echo "=== Contents of /app directory ===" && ls -la /app
RUN echo "=== Checking server.js ===" && ls -la /app/server.js

# Expose port
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
