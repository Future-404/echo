import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { Message } from '../store/useAppStore'
import { getEnabledSkills, executeSkill } from '../skills'
import { buildSystemPrompt } from '../logic/promptEngine'
import { buildContextForChar, buildStopSequences } from '../logic/multiChar'
import { replaceMacros } from '../logic/promptEngine'
import { processChatStream } from '../utils/streamProcessor'
import { CORE_FORMATTING_RULES } from '../store/constants'
import { extractAndSyncTags, applyCharacterRegexScripts } from '../utils/tagParser'
import { routerSchema, parseRouterResult } from '../skills/router/schema'
import { buildRouterPrompt } from '../skills/router/prompt'
import type { RouterAction } from '../skills/router/schema'
import { iframeBus } from '../utils/iframeBus'
import { ttsService } from '../utils/ttsService'

const cleanJson = (str: string) => {
  let cleaned = str.trim();
  if (cleaned.endsWith(']') && !cleaned.startsWith('[')) cleaned = cleaned.slice(0, -1) + '}';
  const openBraces = (cleaned.match(/\{/g) || []).length;
  const closeBraces = (cleaned.match(/\}/g) || []).length;
  if (openBraces > closeBraces) cleaned += '}'.repeat(openBraces - closeBraces);
  return cleaned;
};

export const useChat = () => {
  const { 
    config, selectedCharacter, messages, missions,
    addMessage, isTyping, setIsTyping, addDebugLog,
    updateAttributes, isGreetingSession,
    secondaryCharacter, multiCharMode, routerProviderId,
    ttsSettings,
  } = useAppStore()

  const [displayText, setDisplayText] = useState('')
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | undefined>(undefined)
  const lastGreetingKey = useRef<string | null>(null)
  const activePersona = config.personas?.find(p => p.id === config.activePersonaId) || config.personas?.[0]

  const skipGreeting = useCallback(() => {
    const firstMsg = messages[0]
    if (firstMsg) extractAndSyncTags(firstMsg.content, selectedCharacter, updateAttributes)
    setIsTyping(false)
  }, [messages, selectedCharacter, updateAttributes, setIsTyping])

  useEffect(() => {
    const firstMsg = messages.length === 1 ? messages[0] : null;
    const greetingKey = `${selectedCharacter.id}-${firstMsg?.content}`;
    if (isGreetingSession && firstMsg && firstMsg.role === 'assistant' && lastGreetingKey.current !== greetingKey) {
      lastGreetingKey.current = greetingKey
      const fullText = applyCharacterRegexScripts(firstMsg.content, selectedCharacter, 1);
      setDisplayText(fullText)
      setIsTyping(false)
      extractAndSyncTags(firstMsg.content, selectedCharacter, updateAttributes);
    } else if (!isGreetingSession && firstMsg && lastGreetingKey.current !== greetingKey) {
      lastGreetingKey.current = greetingKey;
    }
  }, [selectedCharacter.id, messages, isGreetingSession, updateAttributes])

  // ─── 单角色请求核心（可复用） ────────────────────────────────────────────────
  const requestChar = useCallback(async (
    charId: string,
    currentMessages: Message[],
    userContent: string,
  ) => {
    const char = charId === selectedCharacter.id ? selectedCharacter : secondaryCharacter!
    const provider = config.providers.find(p => p.id === char.providerId) || config.providers.find(p => p.id === config.activeProviderId) || config.providers[0]
    if (!provider?.apiKey) {
      throw new Error(`[${char.name}] 未配置 API Key`)
    }

    const format = provider.apiFormat || 'openai'
    const isStreaming = provider.stream !== false
    const contextWindow = provider.contextWindow ?? 10
    const enabledTools = getEnabledSkills(config.enabledSkillIds)

    // 组装完整的 API 消息数组 (ST 1:1 复刻逻辑)
    const apiMessages = buildPromptMessages({
      character: char,
      persona: activePersona,
      directives: config.directives || [],
      worldBookLibrary: config.worldBookLibrary || [],
      missions,
      userName: config.userName || 'Observer',
      enabledSkillIds: config.enabledSkillIds,
      recentMessages: currentMessages,
      isMultiChar: !!secondaryCharacter,
      otherCharName: secondaryCharacter ? (charId === selectedCharacter.id ? secondaryCharacter.name : selectedCharacter.name) : undefined,
    }, contextWindow)

    // 多角色模式：处理发言者前缀（如果需要）
    const charNames: Record<string, string> = {
      user: activePersona?.name || 'User',
      [selectedCharacter.id]: selectedCharacter.name,
      ...(secondaryCharacter ? { [secondaryCharacter.id]: secondaryCharacter.name } : {}),
      narrator: 'Narrator',
    }
    const stopSeqs = secondaryCharacter ? buildStopSequences(charId, charNames) : []

    let fetchUrl = `${provider.endpoint}/chat/completions`
    let fetchHeaders: any = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` }
    
    // 合并自定义 Headers
    if (provider.customHeaders) {
      try {
        const extraHeaders = JSON.parse(provider.customHeaders);
        fetchHeaders = { ...fetchHeaders, ...extraHeaders };
      } catch (e) { console.error('Failed to parse custom headers:', e) }
    }

    let fetchBody: any = {}

    if (format === 'openai') {
      const mappedMessages = apiMessages.map(m => {
        if (m.images && m.images.length > 0) {
          return {
            role: m.role,
            content: [
              { type: 'text', text: m.content },
              ...m.images.map((img: string) => ({ type: 'image_url', image_url: { url: img } }))
            ]
          }
        }
        return { role: m.role, content: m.content }
      })

      const prefill = provider.assistantPrefill?.trim()
      fetchBody = {
        model: provider.model,
        messages: prefill ? [...mappedMessages, { role: 'assistant', content: prefill }] : mappedMessages,
        ...(enabledTools.length > 0 && { tools: enabledTools }),
        ...(stopSeqs.length > 0 && { stop: stopSeqs }),
        stream: isStreaming,
        ...(isStreaming && { stream_options: { "include_usage": true } }),
        temperature: provider.temperature ?? 0.7,
        ...(provider.topP != null && provider.topP !== 1.0 && { top_p: provider.topP }),
      }
    } else if (format === 'anthropic') {
      fetchUrl = `${provider.endpoint.replace(/\/chat\/completions$/, '')}/messages`
      fetchHeaders = { 'Content-Type': 'application/json', 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
      
      const systemMsg = apiMessages.find(m => m.role === 'system')?.content || ''
      const nonSystemMsgs = apiMessages.filter(m => m.role !== 'system').map(m => {
        if (m.images && m.images.length > 0) {
          return {
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: [
              ...m.images.map((img: string) => {
                const match = img.match(/^data:(image\/\w+);base64,(.*)$/)
                return {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: match ? match[1] : 'image/jpeg',
                    data: match ? match[2] : img
                  }
                }
              }),
              { type: 'text', text: m.content }
            ]
          }
        }
        return {
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }
      })

      fetchBody = {
        model: provider.model,
        system: systemMsg,
        messages: prefill ? [...nonSystemMsgs, { role: 'assistant', content: prefill }] : nonSystemMsgs,
        max_tokens: 4096,
        ...(stopSeqs.length > 0 && { stop_sequences: stopSeqs }),
        stream: isStreaming,
        temperature: provider.temperature ?? 0.7,
      }
    } else if (format === 'gemini') {
      // Gemini 原生接口支持
      const isStreamSuffix = isStreaming ? 'streamGenerateContent?alt=sse&' : 'generateContent?'
      fetchUrl = `${provider.endpoint.replace(/\/chat\/completions$/, '')}/models/${provider.model}:${isStreamSuffix}key=${provider.apiKey}`
      fetchHeaders = { 'Content-Type': 'application/json' }
      
      const systemMsg = apiMessages.find(m => m.role === 'system')?.content || ''
      const contents = apiMessages.filter(m => m.role !== 'system').map(m => {
        const parts: any[] = []
        if (m.images && m.images.length > 0) {
          m.images.forEach((img: string) => {
            const match = img.match(/^data:(image\/\w+);base64,(.*)$/)
            if (match) {
              parts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2]
                }
              })
            }
          })
        }
        parts.push({ text: m.content })
        return {
          role: m.role === 'assistant' ? 'model' : 'user',
          parts
        }
      })

      fetchBody = {
        contents,
        system_instruction: { parts: [{ text: systemMsg }] },
        generationConfig: {
          temperature: provider.temperature ?? 0.7,
          topP: provider.topP ?? 1.0,
          maxOutputTokens: 4096,
          stopSequences: stopSeqs,
        }
      }
    } else {
      addMessage({ role: 'assistant', content: '错误：不支持的接口格式。', speakerId: charId })
      return
    }

    if (config.isDebugEnabled) addDebugLog({ direction: 'OUT', label: `[${char.name}] API Request`, data: { url: fetchUrl, body: fetchBody } })

    const response = await fetch(fetchUrl, { method: 'POST', headers: fetchHeaders, body: JSON.stringify(fetchBody) })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`[${char.name}] HTTP ${response.status}${err?.error?.message ? ': ' + err.error.message : ''}`)
    }

    const handleFinish = async (fullText: string, toolCalls?: any[], usage?: any) => {
      if (usage) {
        useAppStore.getState().setTokenStats(usage.total_tokens || (usage.prompt_tokens + (usage.completion_tokens || 0)), provider.contextWindow || 32000);
      } else {
        // 估算逻辑
        const estTokens = Math.ceil(fullText.length / 3.5) + (apiMessages.reduce((acc, m) => acc + m.content.length, 0) / 3.5);
        useAppStore.getState().setTokenStats(Math.ceil(estTokens), provider.contextWindow || 32000);
      }

      if (config.isDebugEnabled) addDebugLog({ direction: 'IN', label: `[${char.name}] Response`, data: { text: fullText } })
      extractAndSyncTags(fullText, char, updateAttributes)
      const transformed = applyCharacterRegexScripts(fullText, char, 1)

      if (toolCalls?.length) {
        const assistantMsg: Message = { role: 'assistant', content: transformed || '*…*', tool_calls: toolCalls, speakerId: charId }
        addMessage(assistantMsg)
        const toolResults: Message[] = []
        for (const tc of toolCalls) {
          try {
            const args = JSON.parse(cleanJson(tc.function.arguments))
            const result = executeSkill(tc.function.name, args)
            const toolMsg: Message = { role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: result.message }
            addMessage(toolMsg)
            toolResults.push(toolMsg)
          } catch (e) { console.error('Skill error:', e) }
        }
        // follow-up：把 tool results 回传，获取最终叙事回复
        if (toolResults.length > 0) {
          try {
            const followUpBody = format === 'anthropic'
              ? { ...fetchBody, messages: [...fetchBody.messages, { role: 'assistant', content: toolCalls.map((tc: any) => ({ type: 'tool_use', id: tc.id, name: tc.function.name, input: JSON.parse(cleanJson(tc.function.arguments)) })) }, { role: 'user', content: toolResults.map(r => ({ type: 'tool_result', tool_use_id: r.tool_call_id, content: r.content })) }] }
              : { ...fetchBody, messages: [...fetchBody.messages, assistantMsg, ...toolResults], stream: false }
            const followUpRes = await fetch(fetchUrl, { method: 'POST', headers: fetchHeaders, body: JSON.stringify(followUpBody) })
            if (followUpRes.ok) {
              const followUpData = await followUpRes.ok ? await followUpRes.json() : {}
              const followUpText = format === 'anthropic' ? followUpData.content?.[0]?.text : followUpData.choices?.[0]?.message?.content
              if (followUpText) {
                extractAndSyncTags(followUpText, char, updateAttributes)
                addMessage({ role: 'assistant', content: applyCharacterRegexScripts(followUpText, char, 1), speakerId: charId })
              }
            }
          } catch (e) { console.error('Tool follow-up error:', e) }
        }
      } else {
        addMessage({ role: 'assistant', content: transformed, speakerId: charId })
      }

      // 触发 TTS
      if (ttsSettings.enabled && ttsSettings.autoSpeak) {
        const voiceId = ttsSettings.voiceMap[charId];
        ttsService.speak(transformed, ttsSettings, voiceId);
      }
    }

    if (isStreaming) {
      let ttsBuffer = ''
      const voiceId = ttsSettings.enabled && ttsSettings.autoSpeak ? ttsSettings.voiceMap[charId] : null
      await processChatStream(response, {
        onChunk: (chunk) => {
          setDisplayText(prev => prev + chunk)
          if (voiceId !== null) {
            ttsBuffer += chunk
            // 检测句子边界（中英文标点）
            const sentenceEnd = /[。！？!?.]+/.exec(ttsBuffer)
            if (sentenceEnd) {
              const sentence = ttsBuffer.slice(0, sentenceEnd.index + sentenceEnd[0].length).trim()
              ttsBuffer = ttsBuffer.slice(sentenceEnd.index + sentenceEnd[0].length)
              if (sentence) ttsService.speak(sentence, ttsSettings, voiceId)
            }
          }
        },
        onFinish: handleFinish,
        onError: (err) => { throw new Error(err) }
      }, format)
    } else {
      const data = await response.json()
      let content = ''
      let tcs = undefined
      let usage = data.usage

      if (format === 'anthropic') {
        content = data.content?.[0]?.text
      } else if (format === 'gemini') {
        content = data.candidates?.[0]?.content?.parts?.[0]?.text
        usage = data.usageMetadata ? {
          prompt_tokens: data.usageMetadata.promptTokenCount,
          completion_tokens: data.usageMetadata.candidatesTokenCount,
          total_tokens: data.usageMetadata.totalTokenCount
        } : undefined
      } else {
        content = data.choices?.[0]?.message?.content
        tcs = data.choices?.[0]?.message?.tool_calls
      }
      
      await handleFinish(content || '', tcs, usage)
    }
  }, [config, selectedCharacter, secondaryCharacter, activePersona, missions, multiCharMode, addMessage, addDebugLog, updateAttributes])

  // ─── Router 请求 ─────────────────────────────────────────────────────────────
  const requestRouter = useCallback(async (
    userContent: string,
    currentMessages: Message[],
  ): Promise<RouterAction[]> => {
    const routerProvider = config.providers.find(p => p.id === routerProviderId) || config.providers.find(p => p.id === config.activeProviderId) || config.providers[0]
    if (!routerProvider?.apiKey || !secondaryCharacter) {
      // fallback
      return [{ type: 'speak', speakerId: selectedCharacter.id }, { type: 'speak', speakerId: secondaryCharacter!.id }]
    }

    const systemPrompt = buildRouterPrompt(selectedCharacter.name, secondaryCharacter.name, activePersona?.name || 'User')
    const recentCtx = currentMessages.slice(-6).map(m => {
      const name = m.speakerId === selectedCharacter.id ? selectedCharacter.name
        : m.speakerId === secondaryCharacter.id ? secondaryCharacter.name
        : activePersona?.name || 'User'
      return { role: m.role as any, content: `[${name}]: ${m.content}` }
    })

    const fetchUrl = `${routerProvider.endpoint}/chat/completions`
    const fetchBody = {
      model: routerProvider.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentCtx,
        { role: 'user', content: `[${activePersona?.name || 'User'}]: ${userContent}` }
      ],
      tools: [routerSchema],
      tool_choice: { type: 'function', function: { name: 'route_response' } },
      stream: false,
      temperature: 0.3,
    }

    if (config.isDebugEnabled) addDebugLog({ direction: 'OUT', label: '[Router] Request', data: fetchBody })

    const res = await fetch(fetchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${routerProvider.apiKey}` },
      body: JSON.stringify(fetchBody),
    })
    if (!res.ok) throw new Error(`Router HTTP ${res.status}`)

    const data = await res.json()
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
    if (!toolCall) throw new Error('Router returned no tool call')

    if (config.isDebugEnabled) addDebugLog({ direction: 'IN', label: '[Router] Result', data: toolCall })

    const result = parseRouterResult(toolCall.function.arguments, selectedCharacter.id, secondaryCharacter.id)
    return result.actions
  }, [config, selectedCharacter, secondaryCharacter, activePersona, routerProviderId, addDebugLog])

  // ─── 主入口 ──────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (content: string, images?: string[]) => {
    if ((!content.trim() && (!images || images.length === 0)) || isTyping) return

    const userMsg: Message = { role: 'user', content, speakerId: 'user', ...(images && images.length > 0 ? { images } : {}) }
    addMessage(userMsg)
    setIsTyping(true)
    setDisplayText('')

    const activeProvider = config.providers.find(p => p.id === config.activeProviderId) || config.providers[0]
    if (!activeProvider?.apiKey) {
      addMessage({ role: 'assistant', content: `Demo Mode: 请在配置面板设置 API Key。` })
      setIsTyping(false)
      return
    }

    // 这里需要获取包含新消息在内的最新状态，否则 currentMessages 会少一条
    const currentMessages = [...useAppStore.getState().messages]

    try {
      // ── 多角色模式 ──────────────────────────────────────────────────────────
      if (multiCharMode && secondaryCharacter) {
        // 1. Router 决策（呼吸灯此时为 yellow，activeSpeakerId=undefined）
        setActiveSpeakerId(undefined)
        let actions: RouterAction[]
        try {
          actions = await requestRouter(content, currentMessages)
        } catch (routerErr: any) {
          addMessage({ role: 'assistant', content: `错误（Router）: ${routerErr.message}。请重试。` })
          setIsTyping(false)
          return
        }

        // 2. 按 actions 串行执行
        for (const action of actions) {
          if (action.type === 'narrate') {
            // 旁白静默，不发送到对话框（仅调试日志）
            if (config.isDebugEnabled) addDebugLog({ direction: 'IN', label: '[Router] Narrate (silent)', data: { content: action.narrateContent } })
            continue
          }
          if (action.type === 'speak') {
            setActiveSpeakerId(action.speakerId)
            setDisplayText('')
            const latestMessages = [...useAppStore.getState().messages]
            await requestChar(action.speakerId, latestMessages, content)
          }
        }

        setActiveSpeakerId(undefined)
        setIsTyping(false)
        return
      }

      // ── 单角色模式：复用 requestChar ───────────────────────────────────────
      await requestChar(selectedCharacter.id, currentMessages, content)
      setIsTyping(false)

    } catch (err: any) {
      console.error('Chat Error:', err)
      if (config.isDebugEnabled) addDebugLog({ direction: 'ERR', label: 'Fetch Error', data: { message: err.message } })
      addMessage({ role: 'assistant', content: `错误: ${err.message || '未知错误'}` })
      setIsTyping(false)
    }
  }, [addMessage, config, isTyping, messages, selectedCharacter, secondaryCharacter, multiCharMode, missions, setIsTyping, activePersona, addDebugLog, requestChar, requestRouter])

  // 注册 iframe triggerSlash 的消息处理
  useEffect(() => {
    iframeBus.setHandler((text) => sendMessage(text))
    return () => iframeBus.setHandler(null)
  }, [sendMessage])

  return { displayText, sendMessage, isTyping, skipGreeting, activeSpeakerId }
}
