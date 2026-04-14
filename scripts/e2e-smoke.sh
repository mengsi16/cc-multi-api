#!/bin/bash
# cc-multi-api E2E Smoke Test
# Usage: bash scripts/e2e-smoke.sh

BASE_URL="${BASE_URL:-http://localhost:3456}"
PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }

echo "=== cc-multi-api E2E Smoke ==="
echo ""

# 1. Server is running
echo "[1] Server running check"
STATUS=$(curl -s "$BASE_URL/api/status" 2>/dev/null || echo '{}')
if echo "$STATUS" | grep -q '"running":true'; then
  pass "Server is running"
else
  fail "Server not running at $BASE_URL"
fi

# 2. UI is accessible
echo ""
echo "[2] UI accessibility check"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/ui/" 2>/dev/null || echo "000")
if [ "$CODE" = "200" ]; then
  pass "UI /ui/ returns 200"
else
  fail "UI /ui/ returns $CODE (expected 200)"
fi

# 3. Root redirects to /ui/
echo ""
echo "[3] Root redirect check"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE_URL/" 2>/dev/null || echo "000")
if [ "$CODE" = "200" ]; then
  pass "Root redirects to UI"
else
  fail "Root redirect returns $CODE (expected 200)"
fi

# 4. API config endpoint
echo ""
echo "[4] API config endpoint"
RESP=$(curl -s "$BASE_URL/api/config" 2>/dev/null || echo '{}')
if echo "$RESP" | grep -q '"port"'; then
  pass "/api/config returns port"
else
  fail "/api/config returned unexpected response"
fi

# 5. API status endpoint
echo ""
echo "[5] API status endpoint"
RESP=$(curl -s "$BASE_URL/api/status" 2>/dev/null || echo '{}')
if echo "$RESP" | grep -q '"running":true'; then
  pass "/api/status shows running"
else
  fail "/api/status returned unexpected response"
fi

# 6. Logs endpoint
echo ""
echo "[6] Logs endpoint"
RESP=$(curl -s "$BASE_URL/api/logs" 2>/dev/null || echo '[]')
if echo "$RESP" | grep -q '\[' 2>/dev/null; then
  pass "/api/logs returns array"
else
  fail "/api/logs returned unexpected response"
fi

# 7. UI assets bundled
echo ""
echo "[7] UI assets bundled"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/ui/assets/" 2>/dev/null || echo "000")
if [ "$CODE" = "404" ]; then
  pass "Assets path not directly accessible (correct)"
else
  JS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/ui/assets/index-Db9jtI49.js" 2>/dev/null || echo "000")
  if [ "$JS_CODE" = "200" ]; then
    pass "UI JS bundle accessible"
  else
    fail "UI assets not bundled correctly"
  fi
fi

# 8. Proxy endpoint (unauthenticated, expect Anthropic error)
echo ""
echo "[8] Proxy endpoint responds"
PROXY_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: test" \
  -d '{"model":"test","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}' 2>/dev/null || echo '')
HTTP_CODE=$(echo "$PROXY_RESP" | tail -1)
BODY=$(echo "$PROXY_RESP" | sed '$d')
if echo "$BODY" | grep -q '"type"'; then
  pass "Proxy returns JSON (Anthropic error format)"
else
  fail "Proxy returned unexpected body: $BODY"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
test "$FAIL" -eq 0
