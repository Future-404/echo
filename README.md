# Echo VN Engine

> 基于 React + TypeScript 构建的视觉小说引擎，集成 LLM 对话、PWA 支持与私有后端存储。

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Vite](https://img.shields.io/badge/Vite-8-purple) ![License](https://img.shields.io/badge/License-MIT-green)

---

## 特性

- **LLM 驱动对话** — 支持 OpenAI / Anthropic / 兼容接口，流式输出
- **角色卡系统** — 兼容 SillyTavern V1/V2 PNG 格式角色卡
- **私有部署** — 单 Token 访问控制，数据完全私有
- **双角色模式** — 三方对话，Router 智能调度
- **状态栏系统** — AI 输出结构化状态，实时可视化渲染
- **PWA** — 可安装到桌面/手机

---

## 快速部署

### 方式一：GitHub + Cloudflare（推荐，全自动）

1. **Fork** 本仓库
2. 在 Fork → Settings → Secrets 添加：
   - `CLOUDFLARE_API_TOKEN`（需要 Workers、KV、D1 权限）
   - `CLOUDFLARE_ACCOUNT_ID`
3. Actions → **🚀 Setup (First Time)** → Run workflow（AUTH_TOKEN 留空自动生成）
4. 等约 2 分钟，在 workflow Summary 查看网站地址和访问密码

之后每次 push 自动重新部署。

### 方式二：Docker 自托管

```bash
git clone https://github.com/your-username/echo.git && cd echo
cp .env.example .env        # 修改 AUTH_TOKEN
docker-compose up -d
# 访问 http://localhost:8888
```

### 方式三：Node.js 生产部署

```bash
npm install && npm run build
cd echo-storage/node && npm install
AUTH_TOKEN=your_token node server.js
# 访问 http://your-server:3456
```

---

## 技术栈

| | |
|---|---|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS v4 |
| 渲染 | PixiJS 7 (WebGL) + Framer Motion |
| 状态 | Zustand v5 + Persist |
| 后端（Cloudflare） | Workers + KV + D1 |
| 后端（自托管） | Node.js + SQLite |

---

## 文档

- [完整文档 DOCS.md](./DOCS.md)
- [部署指南 DEPLOYMENT.md](./DEPLOYMENT.md)
- [安全说明 SECURITY.md](./SECURITY.md)
