# Echo Storage // 存储后端系统

Echo Storage 是为 **Echo Visual Novel Engine** 提供的轻量级存储后端。支持两种部署模式：

- **Cloudflare Workers** (全球分布式，推荐生产环境)
- **Node.js** (本地/私有部署，适合个人使用)

---

## 🚀 快速部署

### 方案 A：Cloudflare Workers (推荐)

**1. 安装 Wrangler**:
```bash
npm install -g wrangler
wrangler login
```

**2. 创建 KV 命名空间**:
```bash
wrangler kv:namespace create ECHO_KV
# 记录返回的 id，填入 cloudflare/wrangler.toml
```

**3. 创建 D1 数据库**:
```bash
wrangler d1 create echo-images
# 记录返回的 database_id，填入 cloudflare/wrangler.toml

# 初始化表结构
wrangler d1 execute echo-images --file=cloudflare/schema.sql --remote
```

**4. 配置 wrangler.toml**:
```toml
# cloudflare/wrangler.toml
[[kv_namespaces]]
binding = "ECHO_KV"
id = "<步骤2的id>"

[[d1_databases]]
binding = "ECHO_DB"
database_name = "echo-images"
database_id = "<步骤3的database_id>"
```

**5. 设置认证 Token**:
```bash
cd cloudflare
wrangler secret put AUTH_TOKEN
# 输入强随机字符串（至少32字符）: openssl rand -hex 32

# 可选：限制 CORS
wrangler secret put ALLOWED_ORIGIN
# 输入: https://your-frontend-domain.com
```

**6. 部署**:
```bash
wrangler deploy
# 记录返回的 Worker URL: https://echo-storage.your-subdomain.workers.dev
```

---

### 方案 B：Node.js 本地部署

**1. 安装依赖**:
```bash
cd node
npm install
```

**2. 配置环境变量**:
```bash
# 生成强随机 token
openssl rand -hex 32

# 创建 .env 文件
cat > .env << 'EOF'
AUTH_TOKEN=<粘贴上面生成的token>
ALLOWED_ORIGIN=*
DB_PATH=./echo.db
PORT=3456
EOF
```

**3. 启动服务**:
```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start

# 使用 PM2（推荐）
npm install -g pm2
pm2 start server.js --name echo-storage
pm2 save
```

**4. 使用 Docker**:
```bash
docker run -d \
  --name echo-storage \
  -p 3456:3456 \
  -v $(pwd)/data:/data \
  -e AUTH_TOKEN=your_strong_token \
  -e ALLOWED_ORIGIN=* \
  -e DB_PATH=/data/echo.db \
  node:24-alpine \
  sh -c "npm install better-sqlite3 && node /app/server.js"
```

---

## 🔗 前端配置

部署完成后，在 Echo 应用中配置：

1. 打开 **设置 → 存储配置**
2. 选择 **远程存储**
3. 填入：
   - **后端 URL**: `https://echo-storage.xxx.workers.dev` 或 `http://localhost:3456`
   - **认证 Token**: 与后端 `AUTH_TOKEN` 相同
4. 点击 **测试连接**

---

## 🔒 安全特性

- ✅ Bearer Token 认证
- ✅ CORS 跨域保护
- ✅ 请求体大小限制 (20MB)
- ✅ 单条记录大小限制 (5MB)
- ✅ Key 格式验证 (1-256 字符)
- ✅ SQL 注入防护（参数化查询）
- ✅ 错误信息脱敏

---

## 📡 API 端点

### 健康检查
```bash
GET /api/ping
Authorization: Bearer <token>

Response: { "ok": true }
```

### KV 存储
```bash
# 读取
GET /api/storage/<key>
Authorization: Bearer <token>

# 写入
PUT /api/storage/<key>
Authorization: Bearer <token>
Content-Type: application/json
{ "value": "..." }

# 删除
DELETE /api/storage/<key>
Authorization: Bearer <token>
```

### 图片存储
```bash
# 读取
GET /api/images/<id>
Authorization: Bearer <token>

# 写入
PUT /api/images/<id>
Authorization: Bearer <token>
Content-Type: application/json
{ "base64": "data:image/png;base64,..." }

# 删除
DELETE /api/images/<id>
Authorization: Bearer <token>
```

---

## 🧪 测试

```bash
# 测试连接
curl -X GET http://localhost:3456/api/ping \
  -H "Authorization: Bearer your_token"

# 测试写入
curl -X PUT http://localhost:3456/api/storage/test \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"value":"hello"}'

# 测试读取
curl -X GET http://localhost:3456/api/storage/test \
  -H "Authorization: Bearer your_token"
```

---

## 📊 性能指标

| 指标 | Cloudflare | Node.js |
|------|-----------|---------|
| 冷启动 | ~50ms | N/A |
| 响应延迟 | 10-50ms | 5-20ms |
| 并发能力 | 无限 | 取决于服务器 |
| 存储限制 | KV: 25MB/key<br>D1: 10GB | 取决于磁盘 |
| 成本 | 免费额度充足 | 服务器成本 |

---

## 🛠️ 故障排查

### 问题: 401 Unauthorized
**原因**: Token 不匹配  
**解决**: 确保前端配置的 token 与后端 `AUTH_TOKEN` 一致

### 问题: CORS 错误
**原因**: `ALLOWED_ORIGIN` 配置错误  
**解决**: 
- 开发环境: 设置为 `*`
- 生产环境: 设置为前端域名 `https://your-domain.com`

### 问题: 413 Payload Too Large
**原因**: 单条记录超过 5MB  
**解决**: 压缩数据或分片存储

---

## 📄 开源协议

MIT License - 详见 [LICENSE](LICENSE)
