#!/bin/bash

# Revised AI Features - Automated Test Runner
# This script runs all critical tests for the new AI features

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
TEST_RESULTS=()
PASSED=0
FAILED=0

# Utility functions
log_test() {
  echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
  echo -e "${GREEN}✓ PASS${NC} $1"
  ((PASSED++))
}

log_fail() {
  echo -e "${RED}✗ FAIL${NC} $1"
  ((FAILED++))
  TEST_RESULTS+=("$1")
}

log_info() {
  echo -e "${YELLOW}[INFO]${NC} $1"
}

# Test: Health endpoint
test_health_check() {
  log_test "Health Check - Provider Status"
  
  response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/auto-messenger/health/providers")
  
  if [ "$response" = "200" ]; then
    log_pass "Health check endpoint responds"
  else
    log_fail "Health check returned status $response (expected 200)"
  fi
}

# Test: Get pending reply (creates default if not exists)
test_pending_reply_get() {
  log_test "Pending Reply - GET (creates default)"
  
  # Note: This test requires authentication
  # Using Bearer token from environment: $JWT_TOKEN
  
  if [ -z "$JWT_TOKEN" ]; then
    log_info "Skipping auth-required test (no JWT_TOKEN)"
    return
  fi
  
  response=$(curl -s -X GET "$BASE_URL/auto-messenger/pending-reply" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -w "\n%{http_code}")
  
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ] && echo "$body" | grep -q "message"; then
    log_pass "Pending reply endpoint returns greeting template"
  else
    log_fail "Pending reply returned status $http_code"
  fi
}

# Test: Update pending reply
test_pending_reply_update() {
  log_test "Pending Reply - PATCH (update)"
  
  if [ -z "$JWT_TOKEN" ]; then
    log_info "Skipping auth-required test (no JWT_TOKEN)"
    return
  fi
  
  response=$(curl -s -X PATCH "$BASE_URL/auto-messenger/pending-reply" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"message":"Thanks for reaching out!"}' \
    -w "\n%{http_code}")
  
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ] && echo "$body" | grep -q "Thanks for reaching out"; then
    log_pass "Pending reply update succeeds"
  else
    log_fail "Pending reply update returned status $http_code"
  fi
}

# Test: Get daily status
test_daily_status_get() {
  log_test "Daily Status - GET"
  
  if [ -z "$JWT_TOKEN" ]; then
    log_info "Skipping auth-required test (no JWT_TOKEN)"
    return
  fi
  
  response=$(curl -s -X GET "$BASE_URL/auto-messenger/daily-status" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -w "\n%{http_code}")
  
  http_code=$(echo "$response" | tail -n 1)
  
  if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
    log_pass "Daily status GET succeeds"
  else
    log_fail "Daily status returned status $http_code"
  fi
}

# Test: Set daily status
test_daily_status_set() {
  log_test "Daily Status - POST (set status)"
  
  if [ -z "$JWT_TOKEN" ]; then
    log_info "Skipping auth-required test (no JWT_TOKEN)"
    return
  fi
  
  response=$(curl -s -X POST "$BASE_URL/auto-messenger/daily-status" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"text":"on leave","timezone":"Asia/Kolkata"}' \
    -w "\n%{http_code}")
  
  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" = "200" ] && echo "$body" | grep -q "on leave"; then
    log_pass "Daily status set succeeds"
  else
    log_fail "Daily status set returned status $http_code"
  fi
}

# Test: Clear daily status
test_daily_status_clear() {
  log_test "Daily Status - DELETE (clear)"
  
  if [ -z "$JWT_TOKEN" ]; then
    log_info "Skipping auth-required test (no JWT_TOKEN)"
    return
  fi
  
  response=$(curl -s -X DELETE "$BASE_URL/auto-messenger/daily-status" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -w "\n%{http_code}")
  
  http_code=$(echo "$response" | tail -n 1)
  
  if [ "$http_code" = "200" ]; then
    log_pass "Daily status delete succeeds"
  else
    log_fail "Daily status delete returned status $http_code"
  fi
}

# Test: TypeScript compilation
test_typescript() {
  log_test "TypeScript Compilation"
  
  if npm run build > /tmp/build.log 2>&1; then
    log_pass "TypeScript compiles with no errors"
  else
    log_fail "TypeScript compilation failed"
    cat /tmp/build.log | head -20
  fi
}

# Test: Database connectivity
test_database() {
  log_test "Database Connectivity"
  
  if [ -z "$DATABASE_URL" ]; then
    log_info "Skipping database test (no DATABASE_URL)"
    return
  fi
  
  if psql "$DATABASE_URL" -c "\dt" > /tmp/db.log 2>&1; then
    log_pass "Database connection successful"
  else
    log_fail "Database connection failed"
  fi
}

# Test: Prisma schema
test_prisma_schema() {
  log_test "Prisma Schema Validation"
  
  if npx prisma validate > /tmp/prisma.log 2>&1; then
    log_pass "Prisma schema is valid"
  else
    log_fail "Prisma schema validation failed"
    cat /tmp/prisma.log
  fi
}

# Test: Check new tables exist
test_new_tables() {
  log_test "New Database Tables"
  
  if [ -z "$DATABASE_URL" ]; then
    log_info "Skipping database test (no DATABASE_URL)"
    return
  fi
  
  # Check for PendingChatReply table
  if psql "$DATABASE_URL" -tc "SELECT 1 FROM information_schema.tables WHERE table_name='PendingChatReply'" | grep -q 1; then
    log_pass "PendingChatReply table exists"
  else
    log_fail "PendingChatReply table not found"
  fi
  
  # Check for DailyStatus table
  if psql "$DATABASE_URL" -tc "SELECT 1 FROM information_schema.tables WHERE table_name='DailyStatus'" | grep -q 1; then
    log_pass "DailyStatus table exists"
  else
    log_fail "DailyStatus table not found"
  fi
}

# Test: Check vipContacts field
test_vip_contacts_field() {
  log_test "VIP Contacts Field"
  
  if [ -z "$DATABASE_URL" ]; then
    log_info "Skipping database test (no DATABASE_URL)"
    return
  fi
  
  if psql "$DATABASE_URL" -tc "SELECT column_name FROM information_schema.columns WHERE table_name='AutoMessengerConfig' AND column_name='vipContacts'" | grep -q vipContacts; then
    log_pass "vipContacts field exists on AutoMessengerConfig"
  else
    log_fail "vipContacts field not found"
  fi
}

# Report results
report_results() {
  echo ""
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}Test Results Summary${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  
  total=$((PASSED + FAILED))
  echo "Total Tests: $total"
  echo -e "Passed: ${GREEN}$PASSED${NC}"
  echo -e "Failed: ${RED}$FAILED${NC}"
  
  if [ $FAILED -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed Tests:${NC}"
    for test in "${TEST_RESULTS[@]}"; do
      echo "  - $test"
    done
    return 1
  else
    echo ""
    echo -e "${GREEN}All tests passed!${NC}"
    return 0
  fi
}

# Main test execution
main() {
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}Revised AI Features - Test Suite${NC}"
  echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
  echo ""
  
  # Phase 1: Build & Schema
  log_info "Phase 1: Build & Schema Tests"
  test_typescript
  test_prisma_schema
  test_database
  test_new_tables
  test_vip_contacts_field
  
  echo ""
  
  # Phase 2: Health & API
  log_info "Phase 2: API Health Tests"
  test_health_check
  
  echo ""
  
  # Phase 3: Feature Tests
  log_info "Phase 3: Feature API Tests"
  test_pending_reply_get
  test_pending_reply_update
  test_daily_status_get
  test_daily_status_set
  test_daily_status_clear
  
  echo ""
  
  # Report
  report_results
}

# Run main function
main
