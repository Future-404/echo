# 生产环境部署安全评估报告

**项目**: Echo VN Engine  
**评估日期**: 2026-03-27  
**评估范围**: 前端应用 + 后端存储服务  

---

## 🔴 严重风险 (Critical)

### 1. API Key 明文存储在 localStorage
**位置**: `src/store/configSlice.ts` (通过 zustand persist)  
**风险等级**: 🔴 严重  
**影响**:
- XSS 攻击可直接窃取所有 API Key
- 浏览器扩展可读取
- 开发者工具可见
- 用户的 OpenAI/Anthropic API Key 完全暴露

**当前缓解措施**:
- ✅ 已实现 AES-GCM 加密存储 (`src/utils/crypto.ts`)
- ✅ 已实现主密码保护机制
- ⚠️ 但加密功能未强制启用，用户可能仍在使用明文存储

**修复建议**:
```typescript
// 强制要求用户设置主密码
if (!config.masterPasswordHash && config.providers.length > 0) {
  return <SetPasswordScreen />
}
```

**优先级**: P0 - 部署前必须修复

---

### 2. 依赖包高危漏洞
**漏洞**: serialize-javascript RCE (CVE-2024-XXXXX)  
**风险等级**: 🔴 严重 (CVSS 8.1)  
**影响路径**: `vite-plugin-pwa@1.2.0` → `workbox-build` → `@rollup/plugin-terser` → `serialize-javascript@<=7.0.2`

**修复方案**:
```bash
npm install vite-plugin-pwa@0.19.8 --save-dev
```

**优先级**: P0 - 立即修复

---

### 3. XSS 风险：未净化的 HTML 渲染
**位置**: `src/components/StatusBars/renderers/HtmlBar.tsx:27`  
**代码**:
```typescript
dangerouslySetInnerHTML={renderedContent}
```

**风险**:
- AI 输出的 HTML 直接渲染，可能包含恶意脚本
- 如果 AI 被 prompt injection 攻击，可执行任意 JavaScript

**修复建议**:
```typescript
import DOMPurify from 'dompurify'

const sanitized = useMemo(() => {
  return { __html: DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'details', 'summary', 'style'],
    ALLOWED_ATTR: ['class', 'style'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick']
  })}
}, [rawHtml])
```

**安装依赖**:
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

**优先级**: P0 - 部署前必须修复

---

## 🟡 高风险 (High)

### 4. 缺少 Content Security Policy (CSP)
**位置**: `index.html` 缺少 CSP meta 标签  
**风险**: 无法防御 XSS、数据注入、点击劫持

**修复建议**:
在 `index.html` 的 `<head>` 中添加:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob:;
  connect-src 'self' https://api.openai.com https://api.anthropic.com;
  media-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

**注意**: 需要根据实际使用的 API 端点调整 `connect-src`

**优先级**: P1 - 强烈建议

---

### 5. 后端存储服务缺少速率限制
**位置**: `echo-storage/node/server.js`, `echo-storage/cloudflare/worker.ts`  
**风险**: 
- 单个 token 可无限调用
- 可能被滥用进行 DoS 攻击
- 存储空间可能被恶意填满

**修复建议**:
```javascript
// Node.js 版本 - 添加简单的内存速率限制
const rateLimiter = new Map() // token -> { count, resetTime }

function checkRateLimit(token) {
  const now = Date.now()
  const limit = rateLimiter.get(token)
  
  if (!limit || now > limit.resetTime) {
    rateLimiter.set(token, { count: 1, resetTime: now + 60000 }) // 1分钟窗口
    return true
  }
  
  if (limit.count >= 100) return false // 每分钟最多 100 次请求
  limit.count++
  return true
}

// 在认证后添加
if (!checkRateLimit(TOKEN)) return send(res, 429, { error: 'Rate limit exceeded' })
```

**优先级**: P1 - 强烈建议

---

### 6. CORS 配置过于宽松
**位置**: `echo-storage/node/server.js:6`  
**代码**: `ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'`

**风险**: 允许任何域名访问后端 API

**修复建议**:
```bash
# 生产环境必须设置具体域名
ALLOWED_ORIGIN=https://your-production-domain.com
```

**优先级**: P1 - 部署前必须配置

---

## 🟢 中风险 (Medium)

### 7. 敏感信息可能泄露到日志
**位置**: 多处 `console.error` 输出  
**风险**: 生产环境日志可能包含用户数据或 API 响应

**修复建议**:
```typescript
// vite.config.ts - 生产构建时移除 console
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,
      drop_debugger: true
    }
  }
}
```

**优先级**: P2 - 建议修复

---

### 8. 缺少 HTTPS 强制跳转
**位置**: 前端应用未检测 HTTP 访问  
**风险**: Web Crypto API 在 HTTP 下不可用，加密功能失效

**修复建议**:
```typescript
// src/main.tsx - 添加 HTTPS 检测
if (location.protocol === 'http:' && location.hostname !== 'localhost') {
  location.replace(`https://${location.host}${location.pathname}`)
}
```

**优先级**: P2 - 建议修复

---

### 9. 后端存储无数据大小限制（单条记录）
**位置**: `echo-storage/node/server.js`, `echo-storage/cloudflare/worker.ts`  
**风险**: 虽然有总请求体限制 (20MB)，但单条 KV 记录无大小验证

**修复建议**:
```javascript
// 在 PUT 操作中添加
if (value.length > 5 * 1024 * 1024) { // 单条记录最大 5MB
  return send(res, 413, { error: 'Value too large' })
}
```

**优先级**: P2 - 建议修复

---

### 10. 缺少输入验证和清理
**位置**: `echo-storage` 后端服务  
**风险**: 虽然使用了参数化查询（防 SQL 注入），但未验证 key/id 格式

**修复建议**:
```javascript
function validateKey(key) {
  if (typeof key !== 'string' || key.length === 0 || key.length > 256) {
    throw new Error('Invalid key format')
  }
  // 可选：限制字符集
  if (!/^[a-zA-Z0-9_\-:.]+$/.test(key)) {
    throw new Error('Key contains invalid characters')
  }
}
```

**优先级**: P2 - 建议修复

---

## 🔵 低风险 (Low)

### 11. 缺少 Subresource Integrity (SRI)
**位置**: `index.html` 引用外部字体  
**风险**: Google Fonts CDN 被劫持可能导致恶意代码注入

**修复建议**:
- 使用 SRI 哈希验证外部资源
- 或将字体文件本地化

**优先级**: P3 - 可选优化

---

### 12. 缺少安全响应头
**位置**: Vite 开发服务器配置  
**风险**: 缺少 X-Frame-Options, X-Content-Type-Options 等

**修复建议**:
在部署平台（Netlify/Vercel/Nginx）配置响应头:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**优先级**: P3 - 建议配置

---

### 13. PWA 缓存策略可能缓存敏感数据
**位置**: `vite.config.ts` - VitePWA 配置  
**风险**: Service Worker 可能缓存包含 API Key 的页面状态

**修复建议**:
```typescript
VitePWA({
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.(openai|anthropic)\.com\/.*/,
        handler: 'NetworkOnly', // 永不缓存 API 请求
      }
    ]
  }
})
```

**优先级**: P3 - 建议配置

---

## ✅ 已实施的安全措施

1. ✅ **加密存储实现**: AES-GCM 256 位加密 + PBKDF2 密钥派生
2. ✅ **主密码保护**: 用户可选择启用加密
3. ✅ **后端认证**: Bearer Token 认证机制
4. ✅ **SQL 注入防护**: 使用参数化查询
5. ✅ **请求体大小限制**: 20MB 上限
6. ✅ **错误边界**: React ErrorBoundary 捕获崩溃
7. ✅ **CORS 配置**: 可配置允许的源
8. ✅ **.gitignore**: 正确排除 .env 和敏感文件

---

## 🚀 部署前检查清单

### 必须完成 (P0)
- [ ] 修复 `vite-plugin-pwa` 漏洞: `npm install vite-plugin-pwa@0.19.8 --save-dev`
- [ ] 为 `HtmlBar.tsx` 添加 DOMPurify 净化
- [ ] 强制用户启用主密码加密（或移除明文存储选项）
- [ ] 配置后端 `ALLOWED_ORIGIN` 为生产域名（不使用 `*`）

### 强烈建议 (P1)
- [ ] 添加 CSP meta 标签到 `index.html`
- [ ] 为后端存储服务添加速率限制
- [ ] 生产构建时移除 console 日志
- [ ] 添加 HTTPS 强制跳转检测

### 建议优化 (P2-P3)
- [ ] 添加单条记录大小限制
- [ ] 添加 key/id 格式验证
- [ ] 配置安全响应头（在部署平台）
- [ ] 优化 PWA 缓存策略，排除敏感请求

---

## 🔧 快速修复脚本

```bash
# 1. 修复依赖漏洞
npm install vite-plugin-pwa@0.19.8 --save-dev

# 2. 安装 DOMPurify
npm install dompurify
npm install --save-dev @types/dompurify

# 3. 运行安全审计
npm audit fix

# 4. 检查剩余漏洞
npm audit
```

---

## 📋 环境变量配置检查

### 后端存储服务 (必需)
```bash
# echo-storage/node/.env
AUTH_TOKEN=<生成强随机 token，至少 32 字符>
ALLOWED_ORIGIN=https://your-production-domain.com
DB_PATH=./echo.db
PORT=3456
```

### Cloudflare Worker (必需)
```bash
# 通过 wrangler secret 设置
wrangler secret put AUTH_TOKEN
wrangler secret put ALLOWED_ORIGIN
```

---

## 🎯 架构建议

### 当前架构风险
```
用户浏览器 → 直接调用 OpenAI/Anthropic API (使用用户提供的 API Key)
     ↓
  localStorage 存储 API Key (即使加密，仍有 XSS 风险)
```

### 推荐生产架构
```
用户浏览器 → 你的后端代理 → OpenAI/Anthropic API
     ↓              ↓                    ↓
  JWT Token    验证 + 计费          服务端环境变量
              (Rate Limit)         (真实 API Key)
```

**优势**:
- API Key 永不暴露给前端
- 可实现用量计费和限流
- 可添加内容审核层
- 统一管理多用户访问

**实施成本**: 需要开发用户认证系统和代理服务

---

## 🔐 安全最佳实践建议

### 1. 代码层面
- 所有用户输入必须验证和净化
- 使用 TypeScript 严格模式
- 启用 ESLint 安全规则

### 2. 部署层面
- 使用 HTTPS (Let's Encrypt)
- 配置 CDN (Cloudflare/Vercel)
- 启用 DDoS 防护
- 定期备份数据库

### 3. 监控层面
- 设置错误监控 (Sentry)
- 记录异常 API 调用
- 监控存储使用量

### 4. 用户教育
- 在配置界面显著提示 API Key 风险
- 建议用户使用 API Key 限额功能
- 提供安全使用指南

---

## 📊 风险评分

| 类别 | 评分 | 说明 |
|------|------|------|
| 代码安全 | 6/10 | 有加密机制但未强制，存在 XSS 风险 |
| 依赖安全 | 4/10 | 存在高危漏洞，需立即修复 |
| 架构安全 | 5/10 | 客户端存储 API Key 架构存在根本性风险 |
| 部署安全 | 7/10 | 基础配置良好，缺少 CSP 和速率限制 |
| **总体评分** | **5.5/10** | **需要修复 P0 问题后才能部署** |

---

## ✅ 部署批准条件

**最低要求** (必须全部满足):
1. ✅ 修复 `vite-plugin-pwa` 高危漏洞
2. ✅ 为 `HtmlBar` 添加 DOMPurify 净化
3. ✅ 强制启用主密码加密或移除 API Key 存储功能
4. ✅ 配置后端 `ALLOWED_ORIGIN` 为具体域名
5. ✅ 添加 CSP 策略

**推荐配置** (强烈建议):
1. 添加速率限制
2. 移除生产环境 console 日志
3. 配置安全响应头
4. 设置错误监控

---

## 📞 后续行动

1. **立即执行**: 运行快速修复脚本
2. **代码审查**: 重点检查所有用户输入处理点
3. **渗透测试**: 部署到测试环境后进行安全测试
4. **文档更新**: 更新部署文档，包含安全配置步骤

---

**评估人**: Kiro AI Security Audit  
**下次评估**: 重大功能更新后或每季度
