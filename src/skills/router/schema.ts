export const routerSchema = {
  type: "function",
  function: {
    name: "route_response",
    description: "决定本轮对话中各角色的发言顺序与行为。必须且只能调用一次，不得输出任何对话内容。",
    parameters: {
      type: "object",
      required: ["actions"],
      properties: {
        actions: {
          type: "array",
          minItems: 1,
          description: "按顺序执行的动作列表",
          items: {
            type: "object",
            required: ["type", "speakerId"],
            properties: {
              type: {
                type: "string",
                enum: ["speak", "narrate"],
                description: "speak: 让指定角色发言；narrate: 插入旁白（speakerId 填 narrator）"
              },
              speakerId: {
                type: "string",
                description: "发言者 id。角色填其 id，旁白填 'narrator'"
              },
              narrateContent: {
                type: "string",
                description: "仅 type=narrate 时填写，旁白的具体内容"
              }
            }
          }
        }
      }
    }
  }
}

export interface RouterAction {
  type: 'speak' | 'narrate'
  speakerId: string
  narrateContent?: string
}

export interface RouterResult {
  actions: RouterAction[]
}

/**
 * 解析 Router 的 tool call 输出，失败时返回 fallback
 */
export function parseRouterResult(
  toolCallArgs: string,
  charAId: string,
  charBId: string
): RouterResult {
  try {
    const parsed = JSON.parse(toolCallArgs) as RouterResult
    if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
      // 校验每个 action 的 speakerId 合法
      const validIds = new Set([charAId, charBId, 'narrator'])
      const valid = parsed.actions.every(a =>
        (a.type === 'speak' || a.type === 'narrate') && validIds.has(a.speakerId)
      )
      if (valid) return parsed
    }
  } catch {}
  // fallback：固定 charA → charB 顺序
  return {
    actions: [
      { type: 'speak', speakerId: charAId },
      { type: 'speak', speakerId: charBId },
    ]
  }
}
