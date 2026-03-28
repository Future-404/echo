# Echo Storage // 存储后端系统

Echo Storage 是为 **Echo Visual Novel Engine** 提供的轻量级存储后端。支持两种部署模式：

- **Cloudflare Workers**（全球分布式，推荐生产环境）
- **Node.js**（本地/私有部署，适合个人使用）

> **存储策略**：前端优先使用本地 IndexedDB，后端仅作**可选的云端备份**。未配置后端时应用完全可用，数据存本地。

---

## 🚀 快速部署

### 方案 A：Cloudflare Workers（推荐）

**1. 安装 Wrangler**：
```bash
npm install -g wrangler
wrangler login
```

**2. 设置认证 Token**：
```bash
cd cloudflare
wrangler secret put AUTH_TOKEN
# 输入强随机字符串：openssl rand -hex 32

# 可选：限制 CORS
wrangler secret put ALLOWED_ORIGIN
# 输入：https://your-frontend-domain.com
```

**3. 部署**：
```bash
wrangler deploy
```

**4. 可选：启用 R2 云端备份**：
```bash
wrangler r2 bucket create echo-storage
```
然后取消 `cloudflare/wrangler.toml` 中 `[[r2_buckets]]` 的注释，填入 `bucket_name`，重新 `wrangler deploy`。

---

### 方案 B：Node.js 本地部署

**1. 安装依赖**：
```bash
cd node
npm install
```

**2. 配置环境变量**：
```bash
cat > .env << 'EOF'
AUTH_TOKEN=<openssl rand -hex 32 生成的 token>
ALLOWED_ORIGIN=*
DB_PATH=./echo.db
PORT=3456
EOF
```

**3. 启动服务**：
```bash
# 生产模式
node server.js

# 使用 PM2（推荐）
pm2 start server.js --name echo-storage
```

---

## 📡 API 端点

```
POST   /api/auth              ← { "password": "..." } → { "token": "..." }

GET    /api/storage/:key      → { "value": "..." | null }
PUT    /api/storage/:key      ← { "value": "..." }
DELETE /api/storage/:key

GET    /api/images/:id        → { "base64": "..." | null }
PUT    /api/images/:id        ← { "base64": "..." }
DELETE /api/images/:id

GET    /api/ping              → { "ok": true }
```

所有 `/api/storage` 和 `/api/images` 请求需携带 `Authorization: Bearer <token>`。

---

## 🔒 安全特性

- Bearer Token 认证
- CORS 跨域保护
- 请求体大小限制（20MB）
- 单条记录大小限制（Node.js 5MB / Cloudflare R2 10MB）
- Key 格式验证（1-256 字符）
- SQL 注入防护（参数化查询）

---

## 📊 性能对比

| 指标 | Cloudflare Workers + R2 | Node.js + SQLite |
|---|---|---|
| 响应延迟 | 10-50ms | 5-20ms |
| 存储限制 | R2 免费 10GB | 取决于磁盘 |
| 成本 | 免费额度内免费 | 服务器成本 |

---

## 🛠️ 故障排查

| 问题 | 原因 | 解决 |
|---|---|---|
| 401 Unauthorized | Token 不匹配 | 确认前端 token 与后端 `AUTH_TOKEN` 一致 |
| CORS 错误 | `ALLOWED_ORIGIN` 配置错误 | 开发环境设 `*`，生产环境设前端域名 |
| 413 Payload Too Large | 数据超过大小限制 | 检查是否存储了过大的图片或历史记录 |

---

## 📄 开源协议

MIT License - 详见 [LICENSE](LICENSE)
