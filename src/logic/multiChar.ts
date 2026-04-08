import type { Message } from '../types/chat'

export interface ApiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string
}

/**
 * 上下文折叠合并法：为目标角色动态重构 API 消息历史
 *
 * 规则：
 * - 目标角色自己的发言 → assistant role
 * - 其他所有人（user / 其他角色 / narrator）的发言 →
 *   折叠合并为一条 user 消息，加 [名字]: 前缀
 * - 连续的"他人发言"合并为一条，避免 role 交替问题（兼容 Anthropic）
 *
 * @param messages     原始消息历史
 * @param targetCharId 当前请求的角色 id
 * @param charNames    id → 显示名称映射（含 user、narrator）
 * @param contextWindow 最多取最近 N 条可见消息
 */
export function buildContextForChar(
  messages: Message[],
  targetCharId: string,
  charNames: Record<string, string>,
  contextWindow = 20
): ApiMessage[] {
  // 只处理 user/assistant 可见消息，排除 system/tool 以及纯 tool_calls 中间消息
  const visible = messages
    .filter(m => (m.role === 'user' || m.role === 'assistant') && !m.tool_calls)
    .slice(-contextWindow)

  const result: ApiMessage[] = []

  for (const msg of visible) {
    // 无 speakerId 的旧消息：user → 'user'，assistant → 第一个 key（主角色）
    const fallbackAssistantId = Object.keys(charNames).find(id => id !== 'user' && id !== 'narrator') ?? 'unknown'
    const speakerId = msg.speakerId ?? (msg.role === 'user' ? 'user' : fallbackAssistantId)
    const isTarget = speakerId === targetCharId

    if (isTarget) {
      // 目标角色自己的发言 → assistant
      result.push({ role: 'assistant', content: msg.content })
    } else {
      // 他人发言 → 加名字前缀，尝试合并到上一条 user 消息
      const speakerName = charNames[speakerId] ?? speakerId
      const line = `[${speakerName}]: ${msg.content}`

      const last = result[result.length - 1]
      if (last?.role === 'user') {
        // 合并：追加到上一条 user 消息
        last.content += `\n${line}`
      } else {
        result.push({
          role: 'user',
          content: line,
          // OpenAI name 字段：去除空格，符合 API 规范
          name: speakerName.replace(/\s+/g, '_'),
        })
      }
    }
  }

  return result
}

/**
 * 生成 stop sequence：防止模型替他人发言
 * 返回所有非目标角色的名字前缀作为停止词
 */
export function buildStopSequences(
  targetCharId: string,
  charNames: Record<string, string>
): string[] {
  return Object.entries(charNames)
    .filter(([id]) => id !== targetCharId && id !== 'narrator')
    .map(([, name]) => `\n[${name}]:`)
}
