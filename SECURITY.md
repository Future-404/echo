# 安全说明

## 架构概述

Echo 采用私有部署架构，网站本身受 `AUTH_TOKEN` 保护，未授权用户无法访问任何内容或数据。

```
用户 → GateScreen（输入 AUTH_TOKEN）→ 应用
                                        ↓
                              所有 API 请求携带 Bearer Token
                                        ↓
                              后端验证 → 读写 KV/D1/SQLite
```

---

## API Key 风险说明

用户在配置面板填入的 LLM API Key（OpenAI/Anthropic 等）**以明文存储在后端数据库**（Cloudflare KV 或 SQLite）。

**这意味着：**
- 后端数据库的安全 = API Key 的安全
- 拥有 `AUTH_TOKEN` 的人可以通过 API 读取所有存储数据
- Cloudflare 部署时，Cloudflare 员工理论上可访问 KV 数据

**缓解措施：**
- `AUTH_TOKEN` 是唯一访问凭证，强随机字符串可有效防止暴力破解
- 建议在 OpenAI/Anthropic 控制台设置**每月消费限额**，即使 Key 泄露也能限制损失
- Node.js 自托管时，数据库文件在你自己的服务器上，安全性更高

---

## AUTH_TOKEN 安全建议

```bash
# 生成强随机 token（推荐）
openssl rand -hex 32

# 不要使用
# - 简单词语（password、123456）
# - 默认值（please_change_this_token）
# - 与其他服务相同的密码
```

| 场景 | 建议 |
|---|---|
| Token 泄露 | 立即在后端重新设置 `AUTH_TOKEN`，旧 token 立即失效 |
| 公共设备使用 | 使用后清除浏览器 localStorage（或开无痕模式） |
| 多人共用 | 不建议，Echo 设计为单用户私有部署 |

---

## 网络传输安全

- Cloudflare Workers 自动提供 HTTPS，无需额外配置
- Node.js 自托管建议配置 Nginx/Caddy 反向代理并启用 HTTPS
- HTTP 环境下 token 会明文传输，**生产环境必须使用 HTTPS**

---

## CORS 配置

后端默认 `ALLOWED_ORIGIN: *`，生产环境建议设为具体域名：

```bash
# Cloudflare
wrangler secret put ALLOWED_ORIGIN
# 输入：https://your-app.workers.dev

# Node.js
ALLOWED_ORIGIN=https://your-domain.com node server.js
```

---

## 当前安全状态

| 项目 | 状态 |
|---|---|
| 网站访问控制 | ✅ AUTH_TOKEN 网关 |
| 传输加密 | ✅ HTTPS（Cloudflare 自动） |
| API Key 存储 | ⚠️ 后端明文（受 AUTH_TOKEN 保护） |
| 多用户隔离 | ➖ 不适用（单用户设计） |
