# 生产环境部署指南

## 🔒 部署前安全检查清单

### 必须完成 ✅
- [x] 修复 `vite-plugin-pwa` 高危漏洞
- [x] 添加 DOMPurify XSS 防护
- [x] 添加 CSP 安全策略
- [x] 添加 HTTPS 强制跳转
- [x] 后端添加输入验证和大小限制
- [ ] **配置后端 `ALLOWED_ORIGIN` 为生产域名**
- [ ] **生成强随机 `AUTH_TOKEN`**
- [ ] **提醒用户启用主密码加密**

---

## 📦 构建步骤

```bash
# 1. 安装依赖
npm install

# 2. 运行安全审计
npm audit

# 3. 生产构建
npm run build

# 4. 预览构建结果
npm run preview
```

---

## 🚀 部署选项

### 选项 1: Vercel / Netlify (推荐)

**Vercel**:
```bash
npm install -g vercel
vercel --prod
```

**Netlify**:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**配置响应头** (netlify.toml):
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
```

---

### 选项 2: Docker 部署

**Dockerfile**:
```dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:
```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # 安全响应头
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**构建和运行**:
```bash
docker build -t echo-app .
docker run -d -p 80:80 echo-app
```

---

## 🔧 后端存储服务部署

### Node.js 版本

**1. 配置环境变量**:
```bash
cd echo-storage/node

# 生成强随机 token
openssl rand -hex 32

# 创建 .env
cat > .env << EOF
AUTH_TOKEN=<上面生成的 token>
ALLOWED_ORIGIN=https://your-production-domain.com
DB_PATH=/data/echo.db
PORT=3456
EOF
```

**2. 使用 PM2 运行**:
```bash
npm install -g pm2
pm2 start server.js --name echo-storage
pm2 save
pm2 startup
```

**3. 使用 Docker**:
```bash
docker run -d \
  --name echo-storage \
  -p 3456:3456 \
  -v $(pwd)/data:/data \
  -e AUTH_TOKEN=your_token \
  -e ALLOWED_ORIGIN=https://your-domain.com \
  -e DB_PATH=/data/echo.db \
  node:24-alpine \
  node /app/server.js
```

---

### Cloudflare Worker 版本

```bash
cd echo-storage/cloudflare

# 设置 secrets
wrangler secret put AUTH_TOKEN
# 输入: <强随机 token>

wrangler secret put ALLOWED_ORIGIN
# 输入: https://your-production-domain.com

# 部署
wrangler deploy
```

---

## 🔐 生产环境配置

### 1. 前端环境变量
前端应用不需要 .env 文件（所有配置由用户在界面设置）

### 2. 后端环境变量（必需）
```bash
# echo-storage/node/.env
AUTH_TOKEN=<至少 32 字符的强随机字符串>
ALLOWED_ORIGIN=https://your-production-domain.com
DB_PATH=/data/echo.db
PORT=3456
```

### 3. 前端连接后端
用户需要在应用的"存储配置"中填入:
- **后端 URL**: `https://your-storage-api.com`
- **认证 Token**: 与后端 `AUTH_TOKEN` 相同

---

## 🛡️ 安全加固建议

### 强制启用主密码
在 `src/App.tsx` 添加检查:
```typescript
// 如果有 providers 但没有设置主密码，强制设置
if (config.providers.length > 0 && !config.masterPasswordHash) {
  return <SetPasswordScreen />
}
```

### 添加安全警告
在配置界面显示:
```
⚠️ 安全提示：API Key 将加密存储在本地。
请设置强密码并妥善保管，忘记密码将无法恢复数据。
```

---

## 📊 监控和日志

### 推荐工具
- **错误监控**: Sentry
- **性能监控**: Vercel Analytics / Cloudflare Web Analytics
- **日志聚合**: Cloudflare Logs / PM2 logs

### 设置 Sentry (可选)
```bash
npm install @sentry/react

# src/main.tsx
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
  tracesSampleRate: 0.1,
})
```

---

## 🧪 部署后验证

```bash
# 1. 检查 HTTPS
curl -I https://your-domain.com

# 2. 检查 CSP 头
curl -I https://your-domain.com | grep -i content-security

# 3. 测试后端存储
curl -X GET https://your-storage-api.com/api/ping \
  -H "Authorization: Bearer your_token"

# 4. 检查 PWA manifest
curl https://your-domain.com/manifest.webmanifest
```

---

## 🔄 更新流程

```bash
# 1. 拉取最新代码
git pull

# 2. 安装依赖
npm install

# 3. 运行测试
npm run test  # 如果有测试

# 4. 构建
npm run build

# 5. 部署
vercel --prod  # 或其他部署命令
```

---

## 📞 故障排查

### 问题: Web Crypto API 不可用
**原因**: 使用 HTTP 访问  
**解决**: 确保使用 HTTPS 或 localhost

### 问题: CORS 错误
**原因**: 后端 `ALLOWED_ORIGIN` 配置错误  
**解决**: 检查环境变量是否匹配前端域名

### 问题: 存储 API 401 错误
**原因**: `AUTH_TOKEN` 不匹配  
**解决**: 确保前端配置的 token 与后端环境变量一致

---

## 📚 相关文档
- [SECURITY.md](./SECURITY.md) - API Key 存储风险说明
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) - 完整安全评估报告
- [README.md](./README.md) - 项目概述
