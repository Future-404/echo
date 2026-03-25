# Echo VN Engine — 项目文档

> 基于 React + TypeScript + Vite 构建的下一代视觉小说引擎，集成 LLM 对话、PWA 支持与多后端存储架构。

---

## 目录

1. [项目概览](#1-项目概览)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [核心功能](#4-核心功能)
5. [存储架构](#5-存储架构)
6. [前端部署（Cloudflare Pages）](#6-前端部署cloudflare-pages)
7. [存储服务部署](#7-存储服务部署)
   - [方案 A：Cloudflare Worker + KV + D1](#方案-a-cloudflare-worker--kv--d1)
   - [方案 B：Node.js 自托管](#方案-b-nodejs-自托管)
8. [配置说明](#8-配置说明)
9. [开发指南](#9-开发指南)

---

## 1. 项目概览

Echo 是一个运行在浏览器中的视觉小说引擎，核心特性：

- **纯前端**：所有逻辑在浏览器执行，无需传统后端
- **LLM 驱动**：对话内容由 AI 实时生成，支持 OpenAI / Anthropic / 兼容接口
- **角色卡系统**：兼容 SillyTavern PNG 格式角色卡，支持导入
- **PWA**：可安装到桌面/手机，支持离线访问
- **多后端存储**：本地 IndexedDB、自托管服务、Cloudflare 云存储三选一

---

## 2. 技术栈

| 层级 | 技术 |
|---|---|
| UI 框架 | React 18 + TypeScript |
| 构建工具 | Vite 8 |
| 样式 | Tailwind CSS v4 |
| 动画 | Framer Motion |
| 渲染引擎 | PixiJS v7 + @pixi/react |
| 状态管理 | Zustand v5 + persist |
| PWA | vite-plugin-pwa |
| 存储（本地） | IndexedDB |
| 存储（云端） | Cloudflare KV + D1 |
| 存储（自托管） | Node.js + SQLite (better-sqlite3) |

---

## 3. 项目结构

```
echo/
├── src/
│   ├── App.tsx                  # 根组件，视图路由
│   ├── main.tsx                 # 入口，PWA 注册
│   ├── store/
│   │   ├── useAppStore.ts       # 全局状态（Zustand）
│   │   └── constants.ts        # 默认角色、Provider、格式规则
│   ├── storage/                 # 存储适配器层
│   │   ├── types.ts             # StorageAdapter 接口
│   │   ├── index.ts             # 适配器工厂 + bootstrap 配置
│   │   └── adapters/
│   │       ├── indexeddb.ts     # 本地 IndexedDB 适配器
│   │       └── remote.ts       # 远程 HTTP 适配器（通用）
│   ├── hooks/
│   │   ├── useChat.ts           # 对话核心逻辑（流式/非流式）
│   │   ├── useTheme.ts          # 主题切换
│   │   ├── useFont.ts           # 字体加载
│   │   ├── useInteraction.ts    # 背景交互
│   │   └── useWindowSize.ts
│   ├── components/
│   │   ├── Config/              # 配置面板子组件
│   │   │   ├── StorageConfig.tsx    # 存储后端配置
│   │   │   ├── ProviderManager.tsx  # API Provider 管理
│   │   │   ├── ProviderEditor.tsx
│   │   │   ├── PersonaManager.tsx   # 用户人格管理
│   │   │   ├── WorldBookEditor.tsx  # 世界书编辑
│   │   │   ├── DirectiveManager.tsx # Prompt 指令管理
│   │   │   ├── SkillArsenal.tsx     # 技能开关
│   │   │   ├── StatusParserEditor.tsx
│   │   │   └── DebugConsole.tsx
│   │   ├── DialogueBox.tsx      # 对话框（打字机效果）
│   │   ├── CharacterSelection.tsx
│   │   ├── CharacterAvatar.tsx
│   │   ├── ChatInput.tsx
│   │   ├── Header.tsx
│   │   ├── MainMenu.tsx
│   │   ├── SaveScreen.tsx
│   │   └── LoadScreen.tsx
│   ├── engine/
│   │   ├── Stage.tsx            # PixiJS 舞台
│   │   ├── Character.tsx        # 角色渲染
│   │   └── Atmosphere.tsx       # 氛围效果
│   ├── logic/
│   │   └── promptEngine.ts      # System Prompt 构建
│   ├── skills/                  # 技能扩展系统
│   │   ├── index.ts             # 技能注册与执行入口
│   │   ├── core/                # 技能基础类型
│   │   └── quests/              # 任务系统技能
│   └── utils/
│       ├── tagParser.ts         # 标签解析（属性同步）
│       ├── novelParser.ts       # 小说格式解析
│       ├── streamProcessor.ts   # 流式响应处理
│       ├── statusParser.ts      # 状态栏解析
│       └── pngParser.ts         # PNG 角色卡解析
├── server/
│   ├── cf/                      # Cloudflare Worker
│   │   ├── worker.ts
│   │   ├── wrangler.toml
│   │   └── schema.sql
│   └── node/                    # Node.js 自托管服务
│       ├── server.js
│       └── package.json
├── public/
│   ├── _redirects               # Cloudflare Pages SPA 路由规则
│   ├── mp3/                     # 背景音乐
│   └── icons/
├── vite.config.ts
└── package.json
```

---

## 4. 核心功能

### 4.1 LLM 对话

支持三种 API 格式，在配置面板的「API 参数」中设置：

| 格式 | 适用 |
|---|---|
| `openai` | OpenAI、所有兼容接口（本地 Ollama、第三方中转等） |
| `anthropic` | Anthropic Claude 系列 |
| `novelai` | NovelAI |

支持流式（SSE）和非流式两种模式，可在 Provider 配置中切换。

### 4.2 角色卡系统

- 支持导入 SillyTavern 标准 PNG 角色卡（元数据嵌入图片）
- 角色卡包含：系统提示词、开场白、世界书条目、任务列表、自定义正则解析器、属性模板
- 角色头像存储在 IndexedDB / 远程存储，不占用 localStorage

### 4.3 存档系统

- **自动存档**：每次对话后自动保存，最多保留 10 个自动档
- **手动存档**：支持命名存档槽
- 存档内容：完整消息历史、任务状态、碎片收集记录

### 4.4 技能系统

可扩展的 Function Calling 技能模块，当前内置：

- `manage_quest_state`：任务状态管理（AI 可主动更新任务进度）

在「技能扩展」面板中启用/禁用。

### 4.5 世界书

- **全局世界书**：跨角色共享的背景设定
- **角色私有世界书**：绑定到特定角色的记忆/设定
- **用户人格世界书**：用户角色的私有背景

### 4.6 Prompt 系统

构建顺序（优先级从高到低）：

1. 核心格式规则（不可覆盖，确保渲染引擎正常工作）
2. 角色系统提示词
3. 用户人格描述
4. 全局指令（Directive）
5. 世界书条目（关键词触发）
6. 技能专属指令

---

## 5. 存储架构

### 5.1 适配器接口

所有存储后端实现统一的 `StorageAdapter` 接口：

```typescript
interface StorageAdapter {
  // 结构化数据（KV）
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  // 图片/文件（Blob）
  saveImage(id: string, base64: string): Promise<void>
  getImage(id: string): Promise<string | null>
  removeImage(id: string): Promise<void>
}
```

### 5.2 三种后端

| 后端 | 适用场景 | KV 存储 | 图片存储 |
|---|---|---|---|
| `local`（默认） | 单设备使用 | IndexedDB | IndexedDB |
| `remote`（自托管） | 家庭服务器、NAS | SQLite | SQLite |
| `remote`（Cloudflare） | 云端多设备 | Cloudflare KV | Cloudflare D1 |

### 5.3 Bootstrap 配置

"用哪个后端"这一配置本身存储在 `localStorage`（key: `echo-storage-config`），体积极小（< 200 字节），不受 5MB 限制影响。其余所有数据均存储在所选后端中。

### 5.4 切换存储后端

在配置面板 → 「存储后端」中设置，保存后**刷新页面**生效。

> ⚠️ 切换后端不会自动迁移数据。如需迁移，请先导出存档（功能待实现），再切换后端。

---

## 6. 前端部署（Cloudflare Pages）

### 6.1 方式 A：Git 自动部署（推荐）

1. 将项目推送到 GitHub 或 GitLab
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages → Create a project → Connect to Git
3. 选择仓库，填写构建配置：

   | 配置项 | 值 |
   |---|---|
   | Framework preset | Vite |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Node.js version | 20 |

4. 点击 Save and Deploy，首次构建约 1-2 分钟
5. 后续每次 `git push` 自动触发重新部署

### 6.2 方式 B：手动上传

```bash
# 构建
npm run build

# 部署（需要先登录 wrangler）
npx wrangler login
npx wrangler pages deploy dist --project-name echo
```

### 6.3 自定义域名

在 Cloudflare Pages 项目设置 → Custom domains 中绑定自己的域名，Cloudflare 自动配置 SSL。

### 6.4 注意事项

- `public/_redirects` 已配置 SPA 路由规则，直接访问任意路径不会 404
- PWA Service Worker 在 HTTPS 下自动注册（Cloudflare Pages 默认 HTTPS）
- 免费版限制：单文件 ≤ 25MB，项目内所有文件均符合要求

---

## 7. 存储服务部署

### 方案 A：Cloudflare Worker + KV + D1

适合已使用 Cloudflare Pages 部署前端的用户，延迟最低，免费额度充足。

#### 7.1 前置准备

```bash
npm install -g wrangler
wrangler login
```

#### 7.2 创建 KV 命名空间

```bash
cd server/cf
wrangler kv:namespace create ECHO_KV
```

将返回的 `id` 填入 `wrangler.toml`：

```toml
[[kv_namespaces]]
binding = "ECHO_KV"
id = "你的KV命名空间ID"
```

#### 7.3 创建 D1 数据库

```bash
wrangler d1 create echo-images
```

将返回的 `database_id` 填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "ECHO_DB"
database_name = "echo-images"
database_id = "你的D1数据库ID"
```

#### 7.4 初始化表结构

```bash
wrangler d1 execute echo-images --file=schema.sql
```

#### 7.5 设置访问 Token

```bash
# Token 通过 secret 设置，不会明文出现在代码或配置文件中
wrangler secret put AUTH_TOKEN
# 输入一个足够随机的字符串，例如：openssl rand -hex 32
```

#### 7.6 部署 Worker

```bash
wrangler deploy
```

部署成功后会输出 Worker URL，格式为：`https://echo-storage.<你的子域>.workers.dev`

#### 7.7 配置 CORS（可选）

如果前端域名固定，建议在 `worker.ts` 中将 `Access-Control-Allow-Origin: *` 改为具体域名以提高安全性。

---

### 方案 B：Node.js 自托管

适合有自己服务器或 NAS 的用户。

#### 7.8 安装依赖

```bash
cd server/node
npm install
```

#### 7.9 启动服务

```bash
# 设置环境变量
export AUTH_TOKEN="你的访问Token"
export PORT=3456           # 可选，默认 3456
export DB_PATH="./echo.db" # 可选，SQLite 文件路径

npm start
```

#### 7.10 使用 PM2 保持后台运行

```bash
npm install -g pm2
AUTH_TOKEN="你的Token" pm2 start server.js --name echo-storage
pm2 save
pm2 startup
```

#### 7.11 Nginx 反向代理（推荐）

```nginx
server {
    listen 443 ssl;
    server_name storage.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3456;
        proxy_set_header Host $host;
    }
}
```

---

## 8. 配置说明

### 8.1 API Provider 配置

在配置面板 → 「API 参数」中管理，每个 Provider 包含：

| 字段 | 说明 |
|---|---|
| 名称 | 显示名称 |
| API Key | 访问密钥 |
| Endpoint | API 地址（如 `https://api.openai.com/v1`） |
| 模型 | 模型名称（如 `gpt-4o`） |
| API 格式 | `openai` / `anthropic` |
| 温度 | 0.0 - 2.0，控制随机性 |
| 上下文窗口 | 携带的历史消息条数 |
| 流式输出 | 开启后实时显示生成内容 |

### 8.2 存储后端配置

在配置面板 → 「存储后端」中设置：

| 字段 | 说明 |
|---|---|
| 后端类型 | `本地 IndexedDB` 或 `远程服务` |
| 服务地址 | 远程模式下的 Worker/服务 URL |
| 访问 Token | 与服务端 `AUTH_TOKEN` 一致 |

### 8.3 存储 API 规范

远程存储服务需实现以下接口（方案 A/B 均已实现）：

```
# 鉴权
Authorization: Bearer <token>

# KV 接口
GET    /api/storage/:key     → { "value": "..." | null }
PUT    /api/storage/:key     ← { "value": "..." }
DELETE /api/storage/:key

# 图片接口
GET    /api/images/:id       → { "base64": "..." | null }
PUT    /api/images/:id       ← { "base64": "..." }
DELETE /api/images/:id
```

---

## 9. 开发指南

### 9.1 本地开发

```bash
npm install
npm run dev
# 默认运行在 http://localhost:8888
```

### 9.2 构建

```bash
npm run build
# 产物在 dist/
```

### 9.3 添加新技能

在 `src/skills/` 下创建新模块，实现 `SkillModule` 接口，然后在 `src/skills/index.ts` 中注册：

```typescript
import { mySkill } from './mySkill'

export const registeredSkills = {
  [questSkill.name]: questSkill,
  [mySkill.name]: mySkill,  // 注册新技能
}
```

### 9.4 存储版本升级

修改 `useAppStore.ts` 中的 `name` 字段（如 `echo-storage-v17`）可触发存储迁移，旧数据将被清空。升级前请确保做好数据迁移逻辑或提示用户导出数据。

### 9.5 环境变量

Vite 支持 `.env` 文件，目前项目未使用环境变量，所有配置均在运行时通过 UI 设置。
