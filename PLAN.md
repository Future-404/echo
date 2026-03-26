# Echo // 开发计划

## 当前版本状态

核心功能已稳定：单角色对话、世界书、Directive、技能系统、自定义 CSS/背景、远程存储、存档系统。

---

## 下一阶段：三人聊天系统（Multi-Char）

### 架构概述

```
用户发言
   │
   ▼
┌─────────────────────────────────────────┐
│  Router（前置路由模型）                   │
│  - 独立 Provider 配置（建议小模型）        │
│  - 不输出内容，只调用 route_response 工具  │
│  - 决定：谁发言 / 顺序 / 是否插旁白        │
│  - 失败时 fallback：固定 CharA → CharB    │
└─────────────────────────────────────────┘
   │  输出 actions 队列
   ▼
┌─────────────────────────────────────────┐
│  调度器（Dispatcher）                    │
│  按 actions 顺序串行执行                  │
│  每个 action：speak / narrate / remove   │
└─────────────────────────────────────────┘
   │
   ├── speak(charA)  → CharA 独立 Provider → 流式输出
   ├── speak(charB)  → CharB 独立 Provider → 流式输出
   └── narrate       → Router 直接输出旁白内容（无额外请求）
```

### 消息历史策略：上下文折叠合并法

每次向某个角色发请求时，动态重构消息历史：
- 该角色自己的历史发言 → `assistant` role
- 其他所有人（User + 其他角色）的发言 → 折叠合并为一条 `user` 消息，加 `[名字]:` 前缀
- OpenAI 格式额外带 `name` 字段，文本前缀作为所有模型的保底兼容

```
// CharB 视角的消息历史示例
{ role: "user", name: "User",  content: "[User]: 你们好" }
{ role: "assistant",           content: "你好，我是 CharB" }
{ role: "user",                content: "[User]: 今天去哪？\n[CharA]: 我想去图书馆" }
// ↑ User 和 CharA 的发言折叠为一条
```

### Stop Sequence 防止多重扮演

API 请求加 `stop: ['\n[CharA]:', '\n[CharB]:', '\n[User]:']`，阻断模型替他人发言。

---

## 实施计划

### Phase 1 — 数据层（无 UI 变更，可独立测试）

- [ ] `Message` interface 加 `speakerId?: string`
- [ ] store 加 `secondaryCharacter: CharacterCard | null`、`routerProviderId: string`
- [ ] `buildContextForChar(messages, targetCharId)` — 折叠合并函数（纯函数）
- [ ] Router skill 定义：`route_response` tool schema

### Phase 2 — Router + 调度器

- [ ] Router 请求逻辑：使用独立 Provider，强制 tool call，解析 actions 队列
- [ ] Dispatcher：按 actions 串行执行，每步调用现有的单角色请求逻辑
- [ ] Fallback：Router 失败/超时时退化为固定 CharA → CharB
- [ ] `speakerId` 写入每条 `addMessage`

### Phase 3 — System Prompt 强化

- [ ] `buildSystemPrompt` 加 `multiCharContext` 可选参数
- [ ] 多人场景说明段落：明确角色边界、禁止生成他人前缀
- [ ] 旁白 prompt：Router 的 system prompt 设计

### Phase 4 — UI 适配

- [ ] `CharacterSelection` 改为支持选主角色 + 可选副角色
- [ ] `DialogueBox` 名字栏按 `speakerId` 渲染不同颜色/名字
- [ ] 旁白消息特殊渲染（居中斜体，区别于角色发言）
- [ ] 每条消息独立重试按钮（CharA/CharB 各自重试，互不影响）
- [ ] 头像区：双角色时显示两个小头像，发言时高亮当前说话者

### Phase 5 — Provider 配置扩展

- [ ] Provider 配置支持为 CharA、CharB、Router 分别指定不同 Provider/模型
- [ ] UI：角色编辑页加"绑定 Provider"选项

---

## 风险与缓解

| 风险 | 缓解方案 |
|------|---------|
| Router 输出格式不稳定 | 强制 `response_format: json_object` + schema 校验 + fallback |
| 延迟叠加（3次串行请求） | Router 用小模型；CharA 完成后立即开始 CharB 流式输出 |
| Anthropic role 交替约束 | 折叠合并法天然规避，无需特殊处理 |
| 模型多重扮演 | Stop sequence 阻断 |
| 旧存档兼容 | `speakerId` 为可选字段，旧数据反序列化不报错 |

---

## 已完成功能（当前稳定）

- 单角色对话、流式输出、打字机效果
- 世界书系统（公共书库 + 角色私设）
- Directive / Prompt 注入
- 技能系统（任务追踪）
- 自定义状态栏解析器
- 自定义 CSS（变量覆盖 + 任意选择器 + 导入/导出）
- 自定义背景图
- 深色/浅色主题（class 策略）
- 远程存储（Cloudflare Workers / Node.js）+ 连通性测试
- 存档/读档/分支回溯
- PWA 支持
