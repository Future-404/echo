# Echo VN Engine — 项目文档

> 基于 React + TypeScript + Vite 构建的下一代视觉小说引擎，集成 LLM 对话、PWA 支持与多后端存储架构。

---

## 目录

1. [项目概览](#1-项目概览)
2. [技术栈](#2-技术栈)
3. [项目结构](#3-项目结构)
4. [核心功能](#4-核心功能)
5. [存储、存档与后端部署](#5-存储存档与后端部署)
6. [配置说明](#6-配置说明)
7. [状态栏系统](#7-状态栏系统)
8. [开发指南](#8-开发指南)

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

## 5. 存储、存档与后端部署

### 5.1 存储架构

所有持久化数据通过统一的 `StorageAdapter` 接口读写（`src/storage/types.ts`）：

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

Zustand persist 中间件通过该接口读写所有状态（store key: `echo-storage-v16`）。图片（角色头像）单独走 `saveImage` / `getImage`，不占用 KV 配额。

"用哪个后端"这一 bootstrap 配置本身存储在 `localStorage`（key: `echo-storage-config`），体积极小，不受 5MB 限制影响。

| 后端 | 适用场景 | KV 存储 | 图片存储 |
|---|---|---|---|
| `local`（默认） | 单设备 | IndexedDB (`EchoAppDB`) | IndexedDB |
| `remote` | 多设备 / 云端 | 远程服务 `/api/storage` | 远程服务 `/api/images` |

切换后端：配置面板 → 「存储后端」→ 保存后**刷新页面**生效。切换不会自动迁移数据。

### 5.2 存档机制

存档数据结构（`SaveSlot`，存储在 Zustand state 内，随 persist 一起落盘）：

```typescript
interface SaveSlot {
  id: string          // 'auto_<timestamp>' 或 'manual_<timestamp>'
  name?: string       // 用户命名（可选）
  timestamp: number
  characterId: string
  messages: Message[]
  summary: string     // 最后一条消息前 50 字
  missions: Mission[]
  fragments: string[]
}
```

**自动存档**：每次 AI 回复后，以 `auto_<timestamp>` 为 id 调用 `saveGame`，并将 id 写入 `currentAutoSlotId`。存档界面只展示当前会话的自动档（`currentAutoSlotId` 对应的那一条）。

**手动存档**：用户在存档界面点击「建立新存档」，生成 `manual_<timestamp>` id；点击已有手动档可覆盖写入。

**读档**：`loadGame(slotId)` 从 `saveSlots` 中找到对应 slot，恢复 `messages`、`missions`、`fragments`、`selectedCharacter`，并跳转到 `main` 视图。

### 5.3 远程存储 API 规范

两种开源后端（Cloudflare Worker 和 Node.js）均实现以下接口：

```
Authorization: Bearer <AUTH_TOKEN>

GET    /api/storage/:key     → { "value": "..." | null }
PUT    /api/storage/:key     ← { "value": "..." }
DELETE /api/storage/:key

GET    /api/images/:id       → { "base64": "..." | null }
PUT    /api/images/:id       ← { "base64": "..." }
DELETE /api/images/:id
```

客户端写入有串行队列保护（`remote.ts` 中的 `writeQueues`），同一 key 的并发写入自动排队，失败后最多重试 2 次（间隔 300ms）。

### 5.4 前端部署（Cloudflare Pages）

**方式 A：Git 自动部署（推荐）**

1. 将项目推送到 GitHub / GitLab
2. Cloudflare Dashboard → Pages → Create a project → Connect to Git
3. 构建配置：Framework preset = Vite，Build command = `npm run build`，Output = `dist`，Node.js = 20
4. 后续每次 `git push` 自动触发重新部署

**方式 B：手动上传**

```bash
npm run build
npx wrangler login
npx wrangler pages deploy dist --project-name echo
```

`public/_redirects` 已配置 SPA 路由规则，PWA Service Worker 在 HTTPS 下自动注册。

### 5.5 后端部署：Cloudflare Worker（方案 A）

源码位于 `echo-storage/cloudflare/`。KV 存储用 Cloudflare KV，图片存储用 D1（SQLite）。

```bash
cd echo-storage/cloudflare

# 1. 创建 KV 命名空间，将返回的 id 填入 wrangler.toml
wrangler kv:namespace create ECHO_KV

# 2. 创建 D1 数据库，将返回的 database_id 填入 wrangler.toml
wrangler d1 create echo-images

# 3. 初始化表结构
wrangler d1 execute echo-images --file=schema.sql

# 4. 设置 Token（不会明文出现在代码中）
wrangler secret put AUTH_TOKEN

# 5. 部署
wrangler deploy
```

部署后输出 Worker URL：`https://echo-storage.<子域>.workers.dev`

如需限制来源，将 `worker.ts` 中 `Access-Control-Allow-Origin: *` 改为具体域名。

### 5.6 后端部署：Node.js 自托管（方案 B）

源码位于 `echo-storage/node/`，使用 `better-sqlite3`，单文件 SQLite 存储 KV 和图片。

```bash
cd echo-storage/node
npm install

# 启动（PORT 默认 3456，DB_PATH 默认 ./echo.db）
AUTH_TOKEN="你的Token" node server.js
```

**PM2 后台运行：**

```bash
npm install -g pm2
AUTH_TOKEN="你的Token" pm2 start server.js --name echo-storage
pm2 save && pm2 startup
```

**Nginx 反向代理：**

```nginx
location / {
    proxy_pass http://127.0.0.1:3456;
    proxy_set_header Host $host;
}
```

---

## 6. 配置说明

### 6.1 API Provider 配置

在配置面板 → 「API 参数」中管理：

| 字段 | 说明 |
|---|---|
| Endpoint | API 地址（如 `https://api.openai.com/v1`） |
| 模型 | 模型名称（如 `gpt-4o`） |
| API 格式 | `openai` / `anthropic` / `gemini` |
| 温度 | 0.0 - 2.0 |
| 上下文窗口 | 携带的历史消息条数 |
| 流式输出 | 开启后实时显示生成内容（SSE） |

### 6.2 存储后端配置

在配置面板 → 「存储后端」中设置：

| 字段 | 说明 |
|---|---|
| 后端类型 | `本地 IndexedDB` 或 `远程服务` |
| 服务地址 | 远程模式下的 Worker / Node 服务 URL |
| 访问 Token | 与服务端 `AUTH_TOKEN` 一致 |

---

## 7. 状态栏系统

状态栏是 Echo 的核心特性之一，允许 AI 在对话中输出结构化的角色状态信息，并以可视化组件的形式渲染在对话框内。

### 9.1 工作原理

整个流程分为两个阶段：

**阶段一：提取（tagParser.ts）**

AI 每次回复后，`extractAndSyncTags` 函数扫描原始文本，按以下优先级提取状态数据：

1. **自定义解析器**（最高优先级）：用户在「数据提取规则」面板中定义的正则表达式
2. **容器标签内表格**：`<status>`, `<details>`, `<html>`, `<card>` 内的 Markdown 表格或键值对
3. **`<status-container>` 嵌套标签**：逐一提取内部所有子标签
4. **启发式解析器**：对已识别容器内容运行 `parseUniversalStatus`，兜底提取
5. **角色卡正则模板**（兼容旧格式）：角色卡内置的 `tagTemplates`

提取到的键值对通过 `updateAttributes` 写入角色的 `attributes` 字段（Zustand store）。

**阶段二：渲染（StatusBars/）**

`novelParser.ts` 在解析 AI 输出时，识别特殊标签并将其转换为 `<StatusBar type="..." />` 组件。`StatusBar` 根据 `type` 查询注册表（`registry.tsx`），分发到对应渲染器：

| type 值 | 渲染器 | 适用场景 |
|---|---|---|
| `status` | `DataLinkBar` | 结构化数据矩阵，支持 `<-标题->` 分节和 `\|表格行\|` |
| `status-container` | `StatusContainerBar` | 嵌套 XML 标签，自动分类为元数据/进度条/叙事块 |
| `状态栏` / `characterCard` | `LegacyCSVBar` | 兼容旧格式，逗号分隔的 CSV 值列表 |
| `details` / `html` / `card` | `IframeBar` | 完整 HTML 界面，沙箱 iframe 隔离渲染 |

未匹配到注册表的 type 会使用内联回退渲染器显示原始内容。

### 9.2 渲染器详解

#### DataLinkBar（`type="status"`）

解析规则：
- `<-标题->` → 创建新分节（section）
- `|A|B|C|` → 表格行，每个单元格渲染为独立标签
- 普通文本行 → 归入当前分节

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

#### StatusContainerBar（`type="status-container"`）

解析规则：提取所有 `<key>value</key>` 子标签，按以下规则自动分类：
- **元数据栏**（顶部）：值长度 < 15 且非纯数字 → 显示为图标+文字
- **进度条网格**：值为纯数字或 `数字/数字` 格式 → 渲染为动画进度条
- **叙事块**：值长度 ≥ 15 → 渲染为文本卡片（`comment` 标签红色，`thought` 标签蓝色斜体）

内置图标映射：`time`→时钟、`location`→地图针、`weather`→云、`love`→心、`hate`→火焰、`thought`→闪电

内置颜色映射：`love`→玫瑰红、`hate`→紫色、`hp`→红色、`mana`→蓝色

#### IframeBar（`type="html"` / `"details"` / `"card"`）

将 AI 输出的 HTML 内容写入沙箱 iframe，自动调整高度。若内容不含 `<html>` 标签，自动包裹基础结构并注入透明背景样式。

沙箱权限：`allow-scripts allow-popups allow-forms allow-modals`（不允许 same-origin，防止访问父页面）

#### LegacyCSVBar（`type="状态栏"` / `"characterCard"`）

兼容旧版角色卡格式，`metadata` 为字符串数组，以 `|` 分隔显示。

### 9.3 进度条组件（StatProgressBar）

`StatusContainerBar` 内部使用，支持三种值格式：

| 格式 | 示例 | 说明 |
|---|---|---|
| 纯数字 | `75` | 以 100 为满值，显示 75% |
| 百分比 | `75%` | 同上 |
| 分数 | `75/100` | 以分母为满值 |

### 9.4 自定义解析器

在配置面板 → 「数据提取规则」中为当前角色添加正则解析器：

| 字段 | 说明 |
|---|---|
| 规则名称 | 仅用于显示 |
| 匹配正则 | 标准 JS 正则，捕获组对应字段值 |
| 从对话中隐藏 | 开启后匹配内容不显示在对话框 |
| 字段映射 | 捕获组索引（1-based）→ 属性名 |

示例：提取 `[好感度: 85]` 格式

```
正则：\[好感度[:：]\s*(\d+)\]
字段：$1 → 好感度
```

### 9.5 推荐状态栏格式

以下是经过验证、渲染效果最佳的格式，可直接写入角色卡的系统提示词中指导 AI 输出。

---

#### 格式一：status-container（推荐，功能最完整）

适合需要同时展示元数据、数值属性和内心独白的场景。

**System Prompt 指令示例：**
```
每次回复结尾，输出以下状态块（不要省略标签）：
<status-container>
<time>当前时间</time>
<location>当前地点</location>
<weather>天气</weather>
<love>好感度数值(0-100)</love>
<hp>生命值(格式: 当前/最大)</hp>
<thought>角色此刻的内心独白，一句话</thought>
<comment>对玩家行为的简短评价</comment>
</status-container>
```

**AI 输出示例：**
```xml
<status-container>
<time>傍晚 18:30</time>
<location>魔法学院图书馆</location>
<weather>晴</weather>
<love>72</love>
<hp>85/100</hp>
<thought>他今天主动来找我……难道是为了昨天的事？</thought>
<comment>玩家表现出了真诚的关心，好感度小幅提升。</comment>
</status-container>
```

渲染效果：顶部显示时间/地点/天气元数据，中部显示好感度和HP进度条，底部显示内心独白和评价文本块。

---

#### 格式二：status（数据矩阵风格）

适合信息密度高、需要分类展示多个属性的场景。

**System Prompt 指令示例：**
```
每次回复后附加状态矩阵：
<status>
<-角色状态->
|姓名|[角色名]|
|心情|[当前心情]|
|好感|[0-100的数值]|
<-环境信息->
|时间|[时间]|
|地点|[地点]|
</status>
```

**AI 输出示例：**
```
<status>
<-角色状态->
|姓名|艾拉·斯塔尔|
|心情|有些紧张|
|好感|72|
<-环境信息->
|时间|傍晚 18:30|
|地点|魔法学院图书馆|
</status>
```

---

#### 格式三：html（完全自定义界面）

适合有 HTML/CSS 能力的高级用户，或希望 AI 生成完全自定义 UI 的场景。

**System Prompt 指令示例：**
```
每次回复后，输出一个美观的状态卡片：
<html>
<!-- 在此输出完整的 HTML+CSS 状态卡片 -->
</html>
```

**AI 输出示例：**
```html
<html>
<div style="font-family:sans-serif;padding:12px;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#eee;border-radius:12px">
  <div style="font-size:10px;opacity:0.5;margin-bottom:8px">STATUS</div>
  <div style="display:flex;gap:16px;align-items:center">
    <div>
      <div style="font-size:18px;font-weight:bold">艾拉</div>
      <div style="font-size:11px;opacity:0.7">魔法学院 · 图书馆</div>
    </div>
    <div style="margin-left:auto;text-align:right">
      <div style="font-size:11px;color:#f43f5e">好感度 ❤️ 72</div>
      <div style="font-size:11px;color:#3b82f6">HP 85/100</div>
    </div>
  </div>
</div>
</html>
```

---

#### 格式四：纯键值对（最简单，兼容性最强）

适合对格式要求不高、只需提取数据到属性槽的场景。配合自定义解析器使用。

**System Prompt 指令示例：**
```
每次回复结尾用以下格式输出状态（用[]包裹，不要换行）：
[好感度: 数值, 心情: 描述, 地点: 描述]
```

**AI 输出示例：**
```
[好感度: 72, 心情: 有些紧张, 地点: 图书馆]
```

配合自定义解析器正则 `\[([^\]]+)\]` 提取，或直接依赖启发式解析器自动识别。

---

### 9.6 格式选择建议

| 需求 | 推荐格式 |
|---|---|
| 需要进度条 + 内心独白 | `status-container` |
| 信息分类展示 | `status`（DataLinkBar） |
| 完全自定义 UI | `html`（IframeBar） |
| 只需数据提取，不需渲染 | 键值对 + 自定义解析器 |
| 兼容旧版角色卡 | `状态栏` / `characterCard` |

> 💡 **提示**：`status-container` 格式的进度条颜色可通过标签名自动映射（`love`→红、`hate`→紫、`hp`→红、`mana`→蓝），其他标签默认为灰色。如需自定义颜色，请使用 `html` 格式。

---

## 8. 开发指南

### 8.1 本地开发

```bash
npm install
npm run dev
# 默认运行在 http://localhost:8888
```

### 8.2 构建

```bash
npm run build
# 产物在 dist/
```

### 8.3 添加新技能

在 `src/skills/` 下创建新模块，实现 `SkillModule` 接口，然后在 `src/skills/index.ts` 中注册：

```typescript
import { mySkill } from './mySkill'

export const registeredSkills = {
  [questSkill.name]: questSkill,
  [mySkill.name]: mySkill,  // 注册新技能
}
```

### 8.4 存储版本升级

修改 `useAppStore.ts` 中的 `name` 字段（如 `echo-storage-v17`）可触发存储迁移，旧数据将被清空。升级前请确保做好数据迁移逻辑或提示用户导出数据。

### 8.5 环境变量

Vite 支持 `.env` 文件，目前项目未使用环境变量，所有配置均在运行时通过 UI 设置。
