#!/bin/bash
# 测试 Cloudflare API Token 权限
# 用法: bash test-cf-token.sh <ACCOUNT_ID> <API_TOKEN>

ACCOUNT_ID=$1
API_TOKEN=$2

if [ -z "$ACCOUNT_ID" ] || [ -z "$API_TOKEN" ]; then
  echo "用法: bash test-cf-token.sh <ACCOUNT_ID> <API_TOKEN>"
  exit 1
fi

H="Authorization: Bearer $API_TOKEN"
OK="✅"
FAIL="❌"

echo "=== Cloudflare API Token 权限测试 ==="
echo ""

# 1. 验证 token 本身
echo -n "Token 有效性... "
R=$(curl -s "https://api.cloudflare.com/client/v4/user/tokens/verify" -H "$H")
if echo "$R" | grep -q '"active"'; then
  echo "$OK 有效"
else
  echo "$FAIL 无效或已撤销"
  echo "$R"
  exit 1
fi

# 2. 账户访问
echo -n "账户访问... "
R=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID" -H "$H")
if echo "$R" | grep -q '"success":true'; then
  echo "$OK"
else
  echo "$FAIL"
  echo "$R" | grep -o '"message":"[^"]*"'
fi

# 3. Workers Scripts
echo -n "Workers Scripts 权限... "
R=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts" -H "$H")
if echo "$R" | grep -q '"success":true'; then
  echo "$OK"
else
  echo "$FAIL"
  echo "$R" | grep -o '"message":"[^"]*"'
fi

# 4. KV
echo -n "Workers KV 权限... "
R=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/storage/kv/namespaces" -H "$H")
if echo "$R" | grep -q '"success":true'; then
  echo "$OK"
else
  echo "$FAIL"
  echo "$R" | grep -o '"message":"[^"]*"'
fi

# 5. D1
echo -n "D1 权限... "
R=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database" -H "$H")
if echo "$R" | grep -q '"success":true'; then
  echo "$OK"
else
  echo "$FAIL"
  echo "$R" | grep -o '"message":"[^"]*"'
fi

echo ""
echo "=== 测试完成 ==="
