# Echo Storage // 存储后端系统

Echo Storage 是为 **Echo Visual Novel Engine** 量身打造的高性能存储后端。它支持两种主流部署模式，以适配从个人本地开发到全球分布式的生产环境。

---

## 🏗️ 核心架构

本项目包含两个独立的后端实现，它们共享一套 API 协议：

- **`cloudflare/` (生产级推荐)**: 
  - 基于 **Cloudflare Workers** 运行。
  - 使用 **D1** (关系型数据库) 存储静态元数据与对话记录。
  - 使用 **KV** (键值存储) 提供高速缓存与会话状态同步。
- **`node/` (本地/私有部署)**:
  - 基于 **Node.js** 运行。
  - 使用 **SQLite3** 存储所有数据。
  - 适合本地开发、家用 NAS、树莓派等私有环境。

---

## 🚀 快速开始

### 方案 A：部署到 Cloudflare (分布式)

1. **环境准备**: 确保已安装 `wrangler` 并登录：
   ```bash
   npx wrangler login
   ```
2. **初始化数据库**:
   ```bash
   npx wrangler d1 create echo-images
   # 记录下返回的 database_id 并填入 cloudflare/wrangler.toml
   npx wrangler d1 execute echo-images --file=schema.sql --remote
   ```
3. **部署 Worker**:
   ```bash
   cd cloudflare && npx wrangler deploy
   ```

### 方案 B：本地 Node.js 运行 (极速私有)

1. **安装依赖**:
   ```bash
   cd node && npm install
   ```
2. **启动服务**:
   ```bash
   node server.js
   ```
   默认运行在 `http://localhost:3456`。

---

## 🔒 安全配置 (可选但推荐)

为了防止未授权访问，你可以设置 `AUTH_TOKEN`：

- **Cloudflare**: 运行 `npx wrangler secret put AUTH_TOKEN` 并输入你的密钥。
- **Node.js**: 在启动前设置环境变量 `export AUTH_TOKEN=your_secret_key`。
- **前端配置**: 在 Echo 引擎的 **Storage Config** 面板中填入相同的 Token。

---

## 🛠️ 数据库结构

存储系统主要管理以下三个表：
- `images`: 存储角色头像、背景等图片的元数据。
- `characters`: 存储角色卡片的 JSON 数据。
- `history`: 存储对话历史记录。

详情见根目录下的 `schema.sql`。

---

## 📄 开源协议

[MIT](LICENSE)
