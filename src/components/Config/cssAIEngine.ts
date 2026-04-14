import type { Provider } from '../../types/store'
import { buildCssVarsPrompt } from '../../styles/cssVariables'

const SYSTEM_PROMPT = (currentCss: string) => `你是一个 Echo 应用的 CSS 样式助手。Echo 是一个 AI 沉浸式对话应用（视觉小说引擎）。

【当前 CSS 包内容】
${currentCss || '（空）'}

【Echo 可用 CSS 变量与语义类】
${buildCssVarsPrompt()}

【输出规则】
- 只输出纯 CSS 代码，不要任何解释、markdown 代码块标记
- 优先使用 CSS 变量（--echo-* / --dialogue-* 等）而非硬编码颜色
- 不要修改布局结构，只做视觉样式
- 如果当前 CSS 已有内容，生成的代码应与其风格一致`

export async function callCssAI(
  prompt: string,
  currentCss: string,
  provider: Provider,
  signal?: AbortSignal,
): Promise<string> {
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
      messages: [
        { role: 'system', content: SYSTEM_PROMPT(currentCss) },
        { role: 'user', content: prompt },
      ],
      temperature: provider.temperature ?? 0.7,
      max_tokens: provider.maxTokens ?? 2048,
    }),
    signal,
  })

  if (!res.ok) throw new Error(`API Error ${res.status}: ${await res.text()}`)
  const data = await res.json() as any
  return (data.choices?.[0]?.message?.content || '')
    .replace(/```css\n?/g, '').replace(/```\n?/g, '').trim()
}
