import type { Provider } from '../../types/store'
import type { AgentOutput, AppFiles, ManifestData } from './types'

const SYSTEM_PROMPT = (manifest: ManifestData, files: AppFiles) => `你是一个 Echo 应用开发助手。Echo 是一个 AI 沉浸式对话应用（视觉小说引擎），支持安装第三方应用包。

【应用基本信息（用户已填写，不要修改）】
id: ${manifest.id}
name: ${manifest.name}
description: ${manifest.description}
hasSkill: ${manifest.hasSkill}
permissions: ${manifest.permissions.join(', ') || '无'}

【当前代码状态】
--- skill.js ---
${files.skill || '（尚未生成）'}
--- index.html ---
${files.html || '（尚未生成）'}

【输出规则】
必须输出合法 JSON，格式如下：

需要澄清需求时：
{ "phase": "clarify", "message": "问题或说明" }

首次生成或重写整个文件时：
{ "phase": "generate", "message": "说明", "files": { "skill": "...", "html": "..." } }

修改已有代码时（优先使用 patch，减少 token 消耗）：
{ "phase": "patch", "message": "说明", "patches": [{ "file": "skill"|"html", "ops": [{ "op": "replace"|"insert_after"|"delete", "search": "原文", "content": "新内容" }] }] }

⚠️ patch 的 search 字段必须是源码中的精确子串，包括缩进和换行，一字不差。如果不确定，使用 generate 重写整个文件。

【skill.js 完整结构模板】
skill.js 在沙箱中通过 new Function('exports', 'ctx_api', code) 执行。
可用全局对象：exports, ctx_api, Math, JSON, Date, parseInt, parseFloat, isNaN, Array, Object, String, Number, Boolean, Promise, setTimeout, clearTimeout。
不可用：window, document, localStorage, fetch, XMLHttpRequest, console（不报错但无输出）。

必须导出以下结构（exports.default）：
\`\`\`js
exports.default = {
  name: "${manifest.id.replace(/-/g, '_')}",          // 必须与 manifest.id 的下划线形式完全一致
  displayName: "${manifest.name}",                     // 显示名，用于 UI
  description: "${manifest.description}",              // 功能描述
  schema: {                                            // OpenAI function calling 格式
    type: "function",
    function: {
      name: "${manifest.id.replace(/-/g, '_')}",       // 必须与 name 相同
      description: "...",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  systemPrompt: "...",                                 // 可选：注入到主对话系统提示，告诉 AI 何时调用此 skill
  execute: async (args, ctx) => {
    // ctx 字段由权限控制：
    // ctx.messages        需要 chat_history 权限
    // ctx.characterName   需要 character_info 权限
    // ctx.userName        需要 character_info 权限
    // ctx.attributes      需要 attributes 权限
    // ctx_api.addFragment(msg)  显示浮动提示气泡
    return {
      success: true,
      message: "返回给 AI 的结果文本",
      data: {
        writeAttrs: { key: value }  // 写入 char.attributes，index.html 可通过 __echo__.get() 读取
      },
      suppressFollowUp: false,  // true: AI 不再生成 follow-up 回复，对话静默
      suppressDisplay: false,   // true: 隐藏触发此 skill 的 assistant 消息（不在对话框显示）
      injectContext: "",        // 注入隐藏用户消息到上下文，AI 有记忆但对话框不显示
    }
  }
}
\`\`\`

【index.html 完整 API】
index.html 运行在 iframe 沙箱中，__echo__ 对象在页面加载后由宿主注入，务必在 DOMContentLoaded 或之后使用。

\`\`\`js
// 读写 char.attributes（与 skill.js 的 writeAttrs 共享同一数据源）
const val = await __echo__.get('key')
await __echo__.set({ key: value })

// 私有存储（仅此应用可读写，不进 AI 上下文）
const val = await __echo__.getPrivate('key')
await __echo__.setPrivate({ key: value })

// 监听事件
__echo__.on('ON_MESSAGE', (msg) => { /* msg: { role, content } */ })
__echo__.on('ON_CHARACTER_SWITCH', (char) => { /* char: { name, ... } */ })

// 触发 AI 对话（显示在主对话框）
window.triggerSlash('用户消息文本')

// 触发隐藏 AI 对话（不显示在对话框，但 AI 有记忆）
window.triggerHidden('隐藏消息')

// 向 AI 上下文注入信息（不触发新请求）
__echo__.injectContext('注入的上下文文本')

// 独立调用 AI（不占主对话，不显示在对话框）
const res = await __echo__.chat([{ role: 'user', content: '...' }])
// res: { role: 'assistant', content: '...' }

// UI 通知
window.toastr.info('提示信息')
window.toastr.error('错误信息')
\`\`\`

【skill.js 与 index.html 的数据通信】
唯一的实时通信桥梁是 char.attributes：
1. skill.js execute() 返回 data.writeAttrs: { key: value }
2. 底层自动写入数据库
3. index.html 通过 __echo__.get('key') 读取，或监听 ON_MESSAGE 事件后读取`

export async function callCreatorAI(
  history: Array<{ role: string; content: string }>,
  manifest: ManifestData,
  files: AppFiles,
  provider: Provider,
  signal?: AbortSignal,
  extraDocs?: string,
): Promise<AgentOutput> {
  const messages = [
    { 
      role: 'system', 
      content: SYSTEM_PROMPT(manifest, files) + (extraDocs ? `\n\n【最新开发参考文档（API 规范）】\n${extraDocs}` : '') 
    },
    ...history,
  ]

  const baseUrl = provider.endpoint.replace(/\/+$/, '')
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
      ...(provider.customHeaders ? (() => { try { return JSON.parse(provider.customHeaders) } catch { return {} } })() : {}),
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: provider.temperature ?? 0.7,
      max_tokens: provider.maxTokens ?? 4096,
      response_format: { type: 'json_object' },
    }),
    signal,
  })

  if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`)
  const data = await res.json() as any
  const raw = (data.choices?.[0]?.message?.content || '')
    .replace(/<think>[\s\S]*?<\/think>/g, '').trim()

  try {
    return JSON.parse(raw) as AgentOutput
  } catch {
    throw new Error(`AI 输出非合法 JSON：${raw.slice(0, 200)}`)
  }
}
