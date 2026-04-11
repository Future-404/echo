import type { CharacterCard, WorldBookEntry } from '../types/chat'
import type { AIAssistChange, AIAssistFieldName, AIAssistResponse } from '../types/aiAssist'
import type { Provider } from '../types/store'

const MAX_ROUNDS = 6

// ── 角色卡注入格式 ────────────────────────────────────────────────
export function formatCharacterForPrompt(char: CharacterCard): string {
  const lines: string[] = []

  const scalar: Array<[string, AIAssistFieldName]> = [
    ['name', 'name'],
    ['description', 'description'],
    ['systemPrompt', 'systemPrompt'],
    ['scenario', 'scenario'],
    ['greeting', 'greeting'],
    ['postHistoryInstructions', 'postHistoryInstructions'],
  ]
  for (const [key, field] of scalar) {
    const val = (char as any)[key]
    if (val) lines.push(`【${field}】\n${val}`)
  }

  if (char.alternateGreetings?.length) {
    lines.push(`【alternateGreetings】\n` +
      char.alternateGreetings.map((g, i) => `[${i}] ${g}`).join('\n'))
  }

  const wb = char.extensions?.worldBook || []
  if (wb.length) {
    lines.push(`【worldBook】\n` +
      wb.map((e, i) => `[${i}] keys: [${e.keys.join(', ')}] | ${e.content}`).join('\n'))
  }

  if (char.attributes && Object.keys(char.attributes).length) {
    lines.push(`【attributes】\n${JSON.stringify(char.attributes, null, 2)}`)
  }

  return lines.join('\n\n')
}

// ── 系統 Prompt ───────────────────────────────────────────────────
export function buildSystemPrompt(char: CharacterCard): string {
  return `你是一個角色卡創作助手，服務於一個 AI 沉浸式對話應用。

【輸出規則】
必須輸出合法 JSON，格式如下：
{
  "reasoning": "簡短說明本輪做了什麼",
  "changes": [
    { "field": "欄位名", "op": "set|append|update|delete", "index": 數字(陣列時), "value": 新值 }
  ],
  "status": "done 或 continue",
  "next_intent": "若 continue，說明下一步要做什麼"
}

【可操作欄位】（括號內為用戶可能使用的自然語言說法）
- name（角色名）：字串，op=set
- description（簡介/描述）：字串，op=set
- systemPrompt（人設/角色設定/性格/核心設定）：字串，op=set
- scenario（場景/世界觀/背景）：字串，op=set
- greeting（開場白/第一句話）：字串，op=set
- postHistoryInstructions（後置指令）：字串，op=set
- alternateGreetings（備用開場白/多個開場白）：字串陣列，可用 append/update[index]/delete[index]/set
- worldBook（私設/世界書/知識庫/背景知識/角色私設條目）：條目陣列 {keys:string[], content:string, enabled:boolean}，可用 append/update[index]/delete[index]/set
- attributes（狀態屬性/數值）：物件，op=set

【寫作規範】
- systemPrompt 使用第二人稱「你」，沉浸式描述
- greeting 符合角色人設風格，自然口語
- worldBook 每條 keys 為觸發詞陣列，content 為知識內容

【當前角色卡】
${formatCharacterForPrompt(char)}`
}

// ── 應用單條 change 到角色卡 ──────────────────────────────────────
export function applyChange(char: CharacterCard, change: AIAssistChange): CharacterCard {
  const { field, op, index, value } = change

  // 陣列欄位
  if (field === 'alternateGreetings') {
    const arr = [...(char.alternateGreetings || [])]
    if (op === 'append') arr.push(value)
    else if (op === 'update' && index !== undefined) arr[index] = value
    else if (op === 'delete' && index !== undefined) arr.splice(index, 1)
    else if (op === 'set') return { ...char, alternateGreetings: value }
    return { ...char, alternateGreetings: arr }
  }

  if (field === 'worldBook') {
    const arr: WorldBookEntry[] = [...(char.extensions?.worldBook || [])]
    if (op === 'append') arr.push({ id: `wb-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`, enabled: true, keys: [], content: '', ...value })
    else if (op === 'update' && index !== undefined) arr[index] = { ...arr[index], ...value }
    else if (op === 'delete' && index !== undefined) arr.splice(index, 1)
    else if (op === 'set') return { ...char, extensions: { ...char.extensions, worldBook: value } }
    return { ...char, extensions: { ...char.extensions, worldBook: arr } }
  }

  // 純字串 / 物件欄位
  if (op === 'set') return { ...char, [field]: value }

  return char
}

// ── 批量應用 changes ──────────────────────────────────────────────
export function applyChanges(char: CharacterCard, changes: AIAssistChange[]): CharacterCard {
  return changes.reduce((c, change) => applyChange(c, change), char)
}

// ── 取得欄位原始值（用於 undoStack）──────────────────────────────
export function getFieldValue(char: CharacterCard, field: AIAssistFieldName): any {
  if (field === 'worldBook') return char.extensions?.worldBook
  return (char as any)[field]
}

// ── 調用 AI ──────────────────────────────────────────────────────
export async function callAIAssist(
  messages: Array<{ role: string; content: string }>,
  provider: Provider,
  signal?: AbortSignal,
): Promise<AIAssistResponse> {
  const baseUrl = provider.endpoint.replace(/\/+$/, '')
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
      ...(provider.customHeaders ? JSON.parse(provider.customHeaders) : {}),
    },
    body: JSON.stringify({
      model: provider.model,
      messages,
      temperature: provider.temperature ?? 0.7,
      max_tokens: provider.maxTokens ?? 2048,
      response_format: { type: 'json_object' },
    }),
    signal,
  })

  if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`)
  const data = await res.json() as any
  const raw = (data.choices?.[0]?.message?.content || '')
    .replace(/<think>[\s\S]*?<\/think>/g, '').trim()

  try {
    return JSON.parse(raw) as AIAssistResponse
  } catch {
    throw new Error(`AI 輸出非合法 JSON：${raw.slice(0, 200)}`)
  }
}

export { MAX_ROUNDS }
