#!/bin/bash

# ================= 配置区 =================
# 请不要在此处硬编码敏感信息
# 建议使用: TOKEN=$(echo $CF_TOKEN) ACCOUNT_ID=$(echo $CF_ACCOUNT_ID)
TOKEN=""
ACCOUNT_ID=""
# ==========================================

echo "=== 🛡️ Cloudflare 权限深度检测开始 ==="

# 1. 验证 Token 基本有效性
verify=$(curl -s -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type:application/json")

if [[ $verify == *"active"* ]]; then
    echo "✅ [1/5] Token 状态: 有效 (Active)"
else
    echo "❌ [1/5] Token 状态: 无效"
    echo "   原因: $verify"
    exit 1
fi

# 2. 验证账户 ID 是否能匹配
accounts=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type:application/json")

if [[ $accounts == *"$ACCOUNT_ID"* ]]; then
    echo "✅ [2/5] 账户 ID 匹配: 成功"
else
    echo "❌ [2/5] 账户 ID 匹配: 失败 (Token 没权访问该 ID，请检查 Token 的 Account Resources 是否包含该账号)"
    exit 1
fi

# 3. 验证 Workers 脚本操作权限 (部署核心)
# 对应权限：Account > Workers Scripts > Edit
workers=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type:application/json")

if [[ $workers == *"\"success\":true"* ]]; then
    echo "✅ [3/5] Workers 脚本权限: 正常"
else
    echo "❌ [3/5] Workers 脚本权限: 缺失 (Wrangler 部署代码必须需要此项)"
fi

# 4. 验证 KV 存储权限
# 对应权限：Account > Workers KV Storage > Edit
kv=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/storage/kv/namespaces" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type:application/json")

if [[ $kv == *"\"success\":true"* ]]; then
    echo "✅ [4/5] KV 存储权限: 正常"
else
    echo "❌ [4/5] KV 存储权限: 缺失 (Echo 存储配置需要此项)"
fi

# 5. 验证 D1 数据库权限
# 对应权限：Account > D1 > Edit
d1=$(curl -s -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/d1/database" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type:application/json")

if [[ $d1 == *"\"success\":true"* ]]; then
    echo "✅ [5/5] D1 数据库权限: 正常"
else
    echo "❌ [5/5] D1 数据库权限: 缺失 (Echo 存储图片需要此项)"
fi

echo "=== 🏁 检测完成 ==="
