#!/bin/bash

# End-to-End Testing Script for YouTube MP3 Downloader
# This script automates basic API testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://your-app.vercel.app}"
WORKER_URL="${WORKER_URL:-https://youtube-mp3-worker.onrender.com}"
TEST_VIDEO_SHORT="https://youtu.be/dQw4w9WgXcQ"
TEST_VIDEO_MEDIUM="https://youtu.be/jNQXAC9IVRw"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
    echo ""
    echo "========================================="
    echo "$1"
    echo "========================================="
}

print_test() {
    echo ""
    echo "Test: $1"
    TESTS_RUN=$((TESTS_RUN + 1))
}

print_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

print_info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# Test functions

test_health_endpoint() {
    print_test "Health Endpoint"
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/health")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        status=$(echo "$body" | jq -r '.data.status')
        if [ "$status" = "healthy" ]; then
            print_pass "Health endpoint returns 200 and status is healthy"
        else
            print_fail "Health endpoint returns 200 but status is $status"
        fi
    else
        print_fail "Health endpoint returned $http_code"
    fi
}

test_worker_health() {
    print_test "Worker Health Endpoint"
    
    response=$(curl -s -w "\n%{http_code}" "$WORKER_URL/health")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        status=$(echo "$body" | jq -r '.status')
        if [ "$status" = "ok" ]; then
            print_pass "Worker health endpoint returns 200 and status is ok"
        else
            print_fail "Worker health endpoint returns 200 but status is $status"
        fi
    else
        print_fail "Worker health endpoint returned $http_code"
    fi
}

test_video_info() {
    print_test "Video Info Endpoint"
    
    start_time=$(date +%s)
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/video-info?url=$TEST_VIDEO_SHORT")
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        success=$(echo "$body" | jq -r '.success')
        if [ "$success" = "true" ]; then
            print_pass "Video info endpoint returns 200 and success is true"
            print_info "Response time: ${duration}s"
            
            # Check response time
            if [ "$duration" -le 5 ]; then
                print_pass "Response time is within target (<5s)"
            else
                print_fail "Response time exceeded target (${duration}s > 5s)"
            fi
        else
            print_fail "Video info endpoint returns 200 but success is false"
        fi
    else
        print_fail "Video info endpoint returned $http_code"
    fi
}

test_invalid_url() {
    print_test "Invalid URL Handling"
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/video-info?url=not-a-url")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "400" ]; then
        print_pass "Invalid URL returns 400 status code"
    else
        print_fail "Invalid URL returned $http_code instead of 400"
    fi
}

test_download_endpoint() {
    print_test "Download Endpoint (Fast Track)"
    
    start_time=$(date +%s)
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/download?url=$TEST_VIDEO_SHORT")
    end_time=$(date +%s)
    duration=$((end_time - start_time))
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        success=$(echo "$body" | jq -r '.success')
        type=$(echo "$body" | jq -r '.type')
        
        if [ "$success" = "true" ]; then
            print_pass "Download endpoint returns 200 and success is true"
            print_info "Download type: $type"
            print_info "Response time: ${duration}s"
            
            if [ "$type" = "direct" ]; then
                print_pass "Fast Track was used"
                downloadUrl=$(echo "$body" | jq -r '.downloadUrl')
                if [ -n "$downloadUrl" ] && [ "$downloadUrl" != "null" ]; then
                    print_pass "Download URL is present"
                else
                    print_fail "Download URL is missing"
                fi
            elif [ "$type" = "async" ]; then
                print_info "Stable Track was used (Fast Track unavailable)"
                taskId=$(echo "$body" | jq -r '.taskId')
                if [ -n "$taskId" ] && [ "$taskId" != "null" ]; then
                    print_pass "Task ID is present"
                else
                    print_fail "Task ID is missing"
                fi
            fi
        else
            print_fail "Download endpoint returns 200 but success is false"
        fi
    else
        print_fail "Download endpoint returned $http_code"
    fi
}

test_rate_limiting() {
    print_test "Rate Limiting (5 requests per minute)"
    
    print_info "Making 6 rapid requests..."
    
    success_count=0
    rate_limited=false
    
    for i in {1..6}; do
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/download?url=$TEST_VIDEO_SHORT")
        http_code=$(echo "$response" | tail -n1)
        
        if [ "$http_code" = "200" ]; then
            success_count=$((success_count + 1))
        elif [ "$http_code" = "429" ]; then
            rate_limited=true
            print_info "Request $i was rate limited (429)"
        fi
        
        sleep 0.5
    done
    
    if [ "$success_count" -le 5 ] && [ "$rate_limited" = true ]; then
        print_pass "Rate limiting is working (max 5 requests allowed)"
    else
        print_fail "Rate limiting not working correctly (allowed $success_count requests)"
    fi
}

test_task_status() {
    print_test "Task Status Endpoint"
    
    # First create a task
    response=$(curl -s "$BASE_URL/api/download?url=$TEST_VIDEO_SHORT")
    type=$(echo "$response" | jq -r '.type')
    
    if [ "$type" = "async" ]; then
        taskId=$(echo "$response" | jq -r '.taskId')
        print_info "Created task: $taskId"
        
        # Check task status
        status_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/task-status?taskId=$taskId")
        http_code=$(echo "$status_response" | tail -n1)
        
        if [ "$http_code" = "200" ]; then
            print_pass "Task status endpoint returns 200"
        else
            print_fail "Task status endpoint returned $http_code"
        fi
    else
        print_info "Skipping (Fast Track was used, no task created)"
    fi
}

test_api_quotas() {
    print_test "API Quota Tracking"
    
    response=$(curl -s "$BASE_URL/api/health")
    quotas=$(echo "$response" | jq -r '.data.services.rapidapi.quotas')
    
    if [ "$quotas" != "null" ]; then
        print_pass "API quotas are being tracked"
        
        # Check each API
        for api in api1 api2 api3; do
            used=$(echo "$quotas" | jq -r ".$api.used")
            limit=$(echo "$quotas" | jq -r ".$api.limit")
            print_info "$api: $used/$limit used"
        done
    else
        print_fail "API quotas are not available"
    fi
}

test_cors_headers() {
    print_test "CORS Headers"
    
    response=$(curl -s -I "$BASE_URL/api/health")
    
    if echo "$response" | grep -q "access-control-allow-origin"; then
        print_pass "CORS headers are present"
    else
        print_fail "CORS headers are missing"
    fi
}

# Main execution
main() {
    print_header "YouTube MP3 Downloader - E2E Tests"
    
    echo "Base URL: $BASE_URL"
    echo "Worker URL: $WORKER_URL"
    echo ""
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is not installed${NC}"
        echo "Please install jq: https://stedolan.github.io/jq/download/"
        exit 1
    fi
    
    # Run tests
    print_header "Category 1: Health Checks"
    test_health_endpoint
    test_worker_health
    
    print_header "Category 2: API Endpoints"
    test_video_info
    test_invalid_url
    test_download_endpoint
    test_task_status
    
    print_header "Category 3: Security & Limits"
    test_rate_limiting
    test_cors_headers
    
    print_header "Category 4: Monitoring"
    test_api_quotas
    
    # Summary
    print_header "Test Summary"
    echo "Total Tests: $TESTS_RUN"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    
    pass_rate=$((TESTS_PASSED * 100 / TESTS_RUN))
    echo "Pass Rate: ${pass_rate}%"
    
    if [ "$TESTS_FAILED" -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}✗ Some tests failed${NC}"
        exit 1
    fi
}

# Run main function
main
