# Echo VN Engine — 项目文档

> 基于 React + TypeScript + Vite 构建的视觉小说引擎，集成 LLM 对话、PWA 支持与私有后端存储。

---

## 目录

0. [快速开始](#0-快速开始)
1. [项目概览](#1-项目概览)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [核心功能](#4-核心功能)
5. [存储与后端](#5-存储与后端)
6. [配置说明](#6-配置说明)
7. [状态栏系统](#7-状态栏系统)
8. [开发指南](#8-开发指南)

---

## 0. 快速开始

Echo 是**私有部署**应用，必须配合后端服务使用。支持三种部署方式：

---

### 方式零：GitHub 自动部署到 Cloudflare（推荐小白）

**一次配置，之后 push 代码自动更新，无需任何命令行操作。**

前端部署到 Cloudflare Pages，后端部署到 Cloudflare Workers + KV + D1，全程免费额度内免费。

#### 第一步：Fork 仓库

在 GitHub 点击 Fork，将仓库复制到自己账号下。

#### 第二步：填写两个 GitHub Secrets

进入你的 Fork → Settings → Secrets and variables → Actions → New repository secret：

| Secret 名称 | 获取方式 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token（模板选 Edit Cloudflare Workers，**注意：使用生成的 `cfut_` 开头的 token**） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard 右侧边栏 → Account ID |

#### 第三步：运行 Setup workflow（只做一次）

进入你的 Fork → Actions → **🚀 Setup (First Time)** → Run workflow：

- `AUTH_TOKEN` 输入框：留空自动生成随机密码，或填入你想要的密码

等待约 2 分钟，workflow 完成后在 Summary 页面查看：
- 你的 Worker URL（即网站地址）
- **AUTH_TOKEN（请立即保存，这是进入网站的唯一密码）**

#### 完成！

之后每次 push 到 `main`，前后端自动一起重新部署。

---

### 方式一：Docker 自托管（推荐有服务器的用户）

前后端一起启动，数据存储在本地服务器，完全私有。

**前置要求**：Docker + Docker Compose

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/echo.git
cd echo

# 2. 设置访问密码（必须修改！）
cp .env.example .env
# 编辑 .env，将 AUTH_TOKEN 改为随机字符串
# 生成方法：openssl rand -hex 32

# 3. 启动
docker-compose up -d

# 访问 http://localhost:8888，输入 AUTH_TOKEN 进入
```

数据持久化到 Docker volume `echo-data`，重启不丢失。

**生产部署**（构建静态文件，由后端统一 serve，只需一个端口）：

```bash
npm install && npm run build

cd echo-storage/node
npm install
AUTH_TOKEN=your_token node server.js
# 访问 http://your-server:3456
```

---

### 方式二：Cloudflare 手动部署

参考 `echo-storage/cloudflare/README.md`，手动执行 wrangler 命令部署 Worker，然后将前端 `dist/` 上传到 Cloudflare Pages，并设置环境变量 `VITE_API_URL`。

---

### 三种方式对比

| | GitHub + Cloudflare | Docker 自托管 | Cloudflare 手动 |
|---|---|---|---|
| 难度 | ⭐ 最低 | ⭐⭐ 低 | ⭐⭐⭐ 中 |
| 数据位置 | Cloudflare 全球节点 | 本地服务器 | Cloudflare 全球节点 |
| 费用 | 免费额度内免费 | 服务器成本 | 免费额度内免费 |
| 后续更新 | push 自动部署 | 手动 pull + restart | 手动 wrangler deploy |

---

## 1. 项目概览

Echo 是一个运行在浏览器中的视觉小说引擎，核心特性：

- **私有部署**：需要配合后端服务，通过 `AUTH_TOKEN` 控制访问，数据不对外公开
- **LLM 驱动**：对话内容由 AI 实时生成，支持 OpenAI / Anthropic / 兼容接口
- **角色卡系统**：兼容 SillyTavern PNG 格式角色卡，支持导入
- **PWA**：可安装到桌面/手机
- **后端存储**：所有数据（配置、对话、图片）存储在私有后端，支持多设备同步

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
| 存储（云端） | Cloudflare R2 + D1 |
| 存储（自托管） | Node.js + SQLite (better-sqlite3) |

---

## 3. 项目结构

```
echo/
├── src/
│   ├── App.tsx                  # 根组件，视图路由
│   ├── main.tsx                 # 入口：认证网关 + PWA 注册
│   ├── store/
│   │   ├── useAppStore.ts       # 全局状态（Zustand）
│   │   └── constants.ts        # 默认角色、Provider、格式规则
│   ├── storage/
│   │   ├── types.ts             # StorageAdapter 接口
│   │   ├── index.ts             # 认证 + 适配器工厂
│   │   └── adapters/
│   │       └── remote.ts       # 远程 HTTP 适配器
│   ├── components/
│   │   ├── GateScreen.tsx       # 访问密码输入页
│   │   ├── Config/
│   │   │   ├── ProviderManager.tsx
│   │   │   ├── ProviderEditor.tsx
│   │   │   ├── PersonaManager.tsx
│   │   │   ├── WorldBookEditor.tsx
│   │   │   ├── DirectiveManager.tsx
│   │   │   ├── SkillArsenal.tsx
│   │   │   └── DebugConsole.tsx
│   │   ├── DialogueBox.tsx
│   │   ├── CharacterSelection.tsx
│   │   ├── ChatInput.tsx
│   │   ├── Header.tsx
│   │   ├── MainMenu.tsx
│   │   ├── SaveScreen.tsx
│   │   └── LoadScreen.tsx
│   ├── engine/
│   │   ├── Stage.tsx
│   │   ├── Character.tsx
│   │   └── Atmosphere.tsx
│   ├── logic/
│   │   └── promptEngine.ts
│   ├── skills/
│   │   ├── index.ts
│   │   ├── core/
│   │   └── quests/
│   └── utils/
│       ├── tagParser.ts
│       ├── novelParser.ts
│       ├── streamProcessor.ts
│       ├── statusParser.ts
│       └── pngParser.ts
├── echo-storage/
│   ├── cloudflare/              # Cloudflare Worker 后端
│   │   ├── worker.ts
│   │   ├── wrangler.toml
│   │   └── schema.sql
│   └── node/                   # Node.js 自托管后端
│       ├── server.js
│       └── package.json
├── .github/workflows/
│   ├── deploy-worker.yml        # 自动部署 Worker
│   └── deploy-pages.yml        # 自动部署 Pages
├── docker-compose.yml
├── .env.example
└── vite.config.ts
```

---

## 4. 核心功能

### 4.1 访问控制

Echo 采用单 Token 访问控制：

- 首次访问显示密码输入页（`GateScreen`）
- 输入正确的 `AUTH_TOKEN` 后，token 存入 `localStorage`，后续自动登录
- 所有后端 API 请求均携带 `Authorization: Bearer <token>`
- 清除浏览器数据或换设备需重新输入密码

### 4.2 LLM 对话

支持三种 API 格式，在配置面板的「API 参数」中设置：

| 格式 | 适用 |
|---|---|
| `openai` | OpenAI、所有兼容接口（本地 Ollama、第三方中转等） |
| `anthropic` | Anthropic Claude 系列 |
| `novelai` | NovelAI |

支持流式（SSE）和非流式两种模式。

### 4.3 角色卡系统

- 支持导入 SillyTavern 标准 PNG 角色卡（元数据嵌入图片）
- 角色卡包含：系统提示词、开场白、世界书条目、任务列表、自定义正则解析器、属性模板
- 角色头像存储在后端 `/api/images`

### 4.4 存档系统

- **自动存档**：每次对话后自动保存
- **手动存档**：支持命名存档槽
- 存档内容：完整消息历史、任务状态、碎片收集记录

### 4.5 技能系统

可扩展的 Function Calling 技能模块，当前内置：

- `manage_quest_state`：任务状态管理（AI 可主动更新任务进度）

### 4.6 世界书

- **全局世界书**：跨角色共享的背景设定
- **角色私有世界书**：绑定到特定角色的记忆/设定
- **用户人格世界书**：用户角色的私有背景

### 4.7 Prompt 构建顺序

1. 核心格式规则（不可覆盖）
2. 角色系统提示词
3. 用户人格描述
4. 全局指令（Directive）
5. 世界书条目（关键词触发）
6. 技能专属指令

---

## 5. 存储与后端

### 5.1 存储架构

所有持久化数据通过统一的 `StorageAdapter` 接口读写：

```typescript
interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  saveImage(id: string, base64: string): Promise<void>
  getImage(id: string): Promise<string | null>
  removeImage(id: string): Promise<void>
}
```

Zustand persist 通过该接口读写所有状态（store key: `echo-storage-v16`）。图片单独走 `saveImage/getImage`。

**认证流程：**

1. 应用启动时检查 `localStorage` 是否有 token
2. 有 token → 直接初始化 adapter，进入应用
3. 无 token → 显示 `GateScreen`，用户输入密码
4. 密码验证：POST `/api/auth` → 返回 token → 存入 `localStorage` → 进入应用

### 5.2 后端 API 规范

两种后端均实现以下接口：

```
# 认证（无需 token）
POST   /api/auth              ← { "password": "..." } → { "token": "..." }

# 数据存储（需要 Authorization: Bearer <token>）
GET    /api/storage/:key      → { "value": "..." | null }
PUT    /api/storage/:key      ← { "value": "..." }
DELETE /api/storage/:key

GET    /api/images/:id        → { "base64": "..." | null }
PUT    /api/images/:id        ← { "base64": "..." }
DELETE /api/images/:id

GET    /api/ping              → { "ok": true }
```

### 5.3 后端部署：Cloudflare Worker

源码位于 `echo-storage/cloudflare/`。

```bash
cd echo-storage/cloudflare

wrangler r2 bucket create echo-storage        # 自动创建 R2 存储桶
wrangler d1 create echo-images                # 填入 wrangler.toml
wrangler d1 execute echo-images --file=schema.sql --remote
wrangler secret put AUTH_TOKEN                # 设置访问密码
wrangler deploy
```

### 5.4 后端部署：Node.js 自托管

源码位于 `echo-storage/node/`，SQLite 存储。

```bash
cd echo-storage/node
npm install
AUTH_TOKEN="your_token" node server.js
```

环境变量：

| 变量 | 必须 | 默认值 | 说明 |
|---|---|---|---|
| `AUTH_TOKEN` | ✅ | — | 访问密码，无此变量直接报错退出 |
| `PORT` | | `3456` | 监听端口 |
| `DB_PATH` | | `./echo.db` | SQLite 文件路径 |
| `ALLOWED_ORIGIN` | | `*` | CORS 允许来源 |
| `STATIC_DIR` | | `../../dist` | 静态文件目录（生产模式） |

### 5.5 存档机制

存档数据结构（存储在 Zustand state 内，随 persist 一起落盘）：

```typescript
interface SaveSlot {
  id: string          // 'auto_<timestamp>' 或 'manual_<timestamp>'
  name?: string
  timestamp: number
  characterId: string
  messages: Message[]
  summary: string
  missions: Mission[]
  fragments: string[]
}
```

---

## 6. 配置说明

### 6.1 API Provider 配置

配置面板 → 「API 参数」：

| 字段 | 说明 |
|---|---|
| Endpoint | API 地址（如 `https://api.openai.com/v1`） |
| 模型 | 模型名称（如 `gpt-4o`） |
| API 格式 | `openai` / `anthropic` / `novelai` |
| 温度 | 0.0 - 2.0 |
| 上下文窗口 | 携带的历史消息条数 |
| 流式输出 | 开启后实时显示生成内容（SSE） |

### 6.2 环境变量（前端构建时）

| 变量 | 说明 |
|---|---|
| `VITE_API_URL` | 后端 URL（Cloudflare 等跨域部署时设置）。同域部署（Node.js serve dist/）留空 |

---

## 7. 状态栏系统

状态栏允许 AI 在对话中输出结构化的角色状态信息，以可视化组件渲染在对话框内。

### 7.1 工作原理

**阶段一：提取（tagParser.ts）**

AI 回复后，`extractAndSyncTags` 扫描原始文本，按优先级提取状态数据：

1. 用户自定义正则解析器
2. 容器标签内表格（`<status>`, `<details>`, `<html>`, `<card>`）
3. `<status-container>` 嵌套标签
4. 启发式解析器（兜底）
5. 角色卡正则模板（兼容旧格式）

提取到的键值对写入角色的 `attributes` 字段。

**阶段二：渲染（StatusBars/）**

`novelParser.ts` 识别特殊标签，转换为 `<StatusBar type="..." />` 组件：

| type | 渲染器 | 适用场景 |
|---|---|---|
| `status` | `DataLinkBar` | 结构化数据矩阵 |
| `status-container` | `StatusContainerBar` | 嵌套 XML 标签 |
| `状态栏` / `characterCard` | `LegacyCSVBar` | 兼容旧格式 CSV |
| `details` / `html` / `card` | `IframeBar` | 完整 HTML 界面（沙箱 iframe） |

### 7.2 DataLinkBar 语法（`type="status"`）

```
<status>
<-基础信息->
|姓名|艾拉|
|职业|魔法师|
<-战斗属性->
|HP|85/100|
|MP|60/80|
</status>
```

- `<-标题->` → 创建分节
- `|A|B|` → 表格行

---

## 8. 开发指南

### 8.1 本地开发

```bash
# 启动后端（需要先有 AUTH_TOKEN）
cd echo-storage/node && npm install
AUTH_TOKEN=dev_token node server.js

# 启动前端（proxy 自动转发 /api 到 :3456）
npm install && npm run dev
# 访问 http://localhost:8888，输入 dev_token
```

### 8.2 Docker 开发环境

```bash
cp .env.example .env  # 设置 AUTH_TOKEN
docker-compose up
```

### 8.3 添加新技能

1. 在 `src/skills/` 下创建新目录
2. 实现 `Skill` 接口（参考 `src/skills/core/types.ts`）
3. 在 `src/skills/index.ts` 注册

### 8.4 添加新状态栏渲染器

1. 在 `src/components/StatusBars/renderers/` 创建组件
2. 在 `src/components/StatusBars/registry.tsx` 注册 type 映射
