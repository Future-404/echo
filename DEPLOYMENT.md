# Echo — 部署指南

Echo 是私有部署应用，**必须设置 `AUTH_TOKEN`**，无此变量后端直接报错退出。

详细的分步部署教程见 [DOCS.md — 第 0 章：快速开始](./DOCS.md#0-快速开始)。

---

## 部署方式速查

| 方式 | 适合人群 | 文档 |
|---|---|---|
| GitHub + Cloudflare 自动部署 | 小白，无服务器 | [DOCS.md §0 方式零](./DOCS.md#方式零github-自动部署到-cloudflare推荐小白) |
| Docker 自托管 | 有服务器 | [DOCS.md §0 方式一](./DOCS.md#方式一docker-自托管推荐有服务器的用户) |
| Cloudflare 手动部署 | 熟悉 wrangler | [DOCS.md §0 方式二](./DOCS.md#方式二cloudflare-手动部署) |

---

## 环境变量

### 后端（必须）

```bash
# 生成随机 token
openssl rand -hex 32
```

| 变量 | 必须 | 说明 |
|---|---|---|
| `AUTH_TOKEN` | ✅ | 网站访问密码，无此变量直接退出 |
| `ALLOWED_ORIGIN` | | CORS 来源，生产环境建议设为具体域名 |
| `DB_PATH` | | SQLite 路径（Node.js），默认 `./echo.db` |
| `PORT` | | 端口，默认 `3456` |

### 前端（构建时）

| 变量 | 说明 |
|---|---|
| `VITE_API_URL` | 后端 URL。同域部署（Node.js serve dist/）留空；Cloudflare 等跨域部署必须设置 |

---

## 生产构建

```bash
# 同域部署（Node.js serve 静态文件）
npm run build
cd echo-storage/node && npm install
AUTH_TOKEN=your_token node server.js
# 访问 http://your-server:3456

# 跨域部署（前端单独托管）
VITE_API_URL=https://your-worker.workers.dev npm run build
# 将 dist/ 上传到 Cloudflare Pages / Nginx 等
```

---

## 部署后验证

```bash
# 1. 测试后端连通性
curl -X POST https://your-backend/api/auth \
  -H "Content-Type: application/json" \
  -d '{"password":"your_token"}'
# 应返回 {"token":"..."}

# 2. 测试数据读写
curl https://your-backend/api/ping \
  -H "Authorization: Bearer your_token"
# 应返回 {"ok":true}
```

---

## 故障排查

| 问题 | 原因 | 解决 |
|---|---|---|
| 后端启动报错退出 | 未设置 `AUTH_TOKEN` | 设置环境变量 |
| 前端显示密码页但无法登录 | token 不匹配 | 确认前端访问的后端地址和 token 正确 |
| CORS 错误 | `ALLOWED_ORIGIN` 配置错误 | 设为前端域名或 `*` |
| `VITE_API_URL` 无效 | 构建时未注入 | 确认构建命令包含该环境变量 |
| Web Crypto API 不可用 | 使用 HTTP 访问 | 使用 HTTPS 或 localhost |
