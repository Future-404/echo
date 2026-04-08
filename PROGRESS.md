# Echo 重构进度笔记
> 最后更新：2026-04-09

## 当前分支
- `main` — 稳定版，所有 bug 修复已合并
- `feat/shell-ui` — 重构进行中，基于 main

---

## 已完成（main 分支）

### Bug 修复
- **tagParser.ts**
  - `extractAndSyncTags` 属性提取改为对原始 text 执行（而非替换后的文本）
  - `/s` 修饰符替换不再污染字符类内部的 `.`
  - `inferFieldNamesFromRegex` 字符类转义修正（`[^\\s...]` → `[^\s...]`）
- **regexEngine / useChat**
  - 全局正则 `ai` 范围现在作用于 AI 回复，而非发送给 AI 的历史消息
- **providers（openai/anthropic/gemini）**
  - endpoint trailing slash 处理
  - Anthropic：同 role 消息合并、空 system 不发送、maxTokens 读配置
  - Gemini：同 role 消息合并、空 system_instruction 不发送
  - OpenAI：`name` 字段只在有值时传
- **streamProcessor**
  - 流结束时处理 buffer 残留最后一行
  - Anthropic `message_stop` 事件触发 `onFinish`
- **promptEngine**
  - 世界书扫描使用完整历史
  - `activeEmbeddingProviderId` 路径修正
  - world book position 逻辑修正（移除错误的 position=4）
  - depth injection 插入位置偏移修复
  - 空 PROTOCOLS 段不输出
  - 多角色模式调用 `buildContextForChar`
- **characterExporter**
  - 导出 tagTemplates（regex_scripts）、depth_prompt、luminescence
  - worldBook 条目补 id 字段
- **CharacterSelection 导入**
  - 兼容 `extensions.echo.missions` 路径
  - JSON 导入补 missions、luminescence
- **ProviderEditor**
  - 新增连通性测试按钮（支持 OpenAI/Anthropic/Gemini）
- **types/store**
  - Provider 新增 `maxTokens?: number`

### 测试
- 62 → 96 个测试全部通过
- 新增：anthropic.test / gemini.test / tagParser.test / promptEngine.test（含 multiChar）/ streamProcessor.test

---

## 进行中（feat/shell-ui 分支）

### 已完成
- `AppShell.tsx` — 手机壳容器，支持 launcher/vn/chat 三个 App 切换，带动画
- `HomeScreen.tsx` — iOS 风格桌面，3列 App Grid + 底部 Dock
- `ChatApp/ChatApp.tsx` — 占位符
- `uiSlice.ts` — 新增 `currentApp` 状态 + `setCurrentApp` action
- `main.tsx` — 入口改为渲染 AppShell
- `MainMenu.tsx` — 新增"← 桌面"返回按钮
- `globals.css` — 新增 Shell/Launcher/Chat 全套 CSS 变量

### 桌面 App 布局
**Grid（3列）**：图鉴 · 世界书 · 记忆 · 身份 · API · 外观 · 语音 · 指令 · 正则 · 存档 · 手册 · 调试
**Dock**：剧场 · 聊天 · 图鉴 · API

---

## 待办（按优先级）

### P0 — 聊天 App 核心
- [ ] `ChatApp/ChatList.tsx` — 联系人列表（从 VN characters 读取）
- [ ] `ChatApp/ChatRoom.tsx` — 仿微信气泡聊天界面
- [ ] `store/chatAppSlice.ts` — 独立消息历史（localStorage，不用 Dexie）
- [ ] 极简 prompt 函数：`名字 + 人设 + 硬编码格式 + 滑动窗口历史`，无世界书/正则/指令

### P1 — Store 拆分
- [ ] 新建 `globalSlice.ts`，从 configSlice 抽出共享数据：
  - providers / activeProviderId
  - theme / fontFamily / fontSize / customCss / customBg
  - appLock
  - personas / activePersonaId
- [ ] 聊天 App 和 VN App 都从 globalSlice 读 providers

### P2 — 桌面完善
- [ ] 状态栏时钟实时更新（现在是静态渲染）
- [ ] 桌面壁纸可配置（接 AppearanceEditor 的 customBg）
- [ ] App 图标支持用户自定义（名称/颜色/emoji）
- [ ] 锁屏从 AppShell 层处理（现在在 App.tsx 里）

### P3 — 体验优化
- [ ] 懒加载优化：ConfigPanel(112KB) / HelpScreen(70KB) 按需加载
- [ ] VN App 内部加"返回桌面"悬浮按钮（不只在 MainMenu）
- [ ] 手机壳圆角/阴影可通过 CSS 变量 DIY

---

## 架构决策记录

| 决策 | 结论 | 原因 |
|---|---|---|
| 1900UwU 合并方式 | 方案B：合并进 Echo，单一 PWA | iframe 跨域/PWA 跳出问题 |
| VN 引擎处理 | 零改动，作为独立 App 挂载 | 避免回归风险 |
| 聊天 App 数据 | 独立 slice，不共享 VN 消息历史 | 两套产品逻辑完全不同 |
| 聊天 App prompt | 极简：名字+人设+硬编码格式 | 不需要复杂上下文编排 |
| 多角色模式 | 仅在 VN App，聊天 App 不支持 | 聊天 App 定位是轻量 1v1 |
| 全局共享数据 | providers/theme/font/persona/appLock | 用户不应维护两套 API 配置 |

---

## CSS 变量体系（DIY 入口）

```css
/* 手机壳 */
--shell-bg          /* 桌面背景渐变 */
--shell-width       /* 手机宽度，默认 420px */
--shell-radius      /* 手机圆角，默认 0px，改 40px 变圆角手机 */

/* 聊天气泡 */
--chat-bubble-out   /* 发出气泡颜色 */
--chat-bubble-in    /* 收到气泡颜色 */

/* 桌面图标 */
--launcher-icon-radius
--launcher-icon-size
--launcher-label-color

/* 品牌色 */
--echo-accent       /* 主强调色 */
```
