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
  } = useAppStore()

  const [displayText, setDisplayText] = useState('')
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | undefined>(undefined)
  const lastGreetingKey = useRef<string | null>(null)
  const activePersona = config.personas?.find(p => p.id === config.activePersonaId) || config.personas?.[0]
  const greetingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const greetingFullTextRef = useRef<string>('')

  const skipGreeting = useCallback(() => {
    if (greetingTimerRef.current) {
      clearInterval(greetingTimerRef.current)
      greetingTimerRef.current = null
      setDisplayText(greetingFullTextRef.current)
      setIsTyping(false)
      const firstMsg = messages[0]
      if (firstMsg) extractAndSyncTags(firstMsg.content, selectedCharacter, updateAttributes, selectedCharacter.extensions?.customParsers)
    }
  }, [messages, selectedCharacter, updateAttributes, setIsTyping])

  useEffect(() => {
    const firstMsg = messages.length === 1 ? messages[0] : null;
    const greetingKey = `${selectedCharacter.id}-${firstMsg?.content}`;
    if (isGreetingSession && firstMsg && firstMsg.role === 'assistant' && lastGreetingKey.current !== greetingKey) {
      const fullText = applyCharacterRegexScripts(firstMsg.content, selectedCharacter, selectedCharacter.extensions?.customParsers);
      greetingFullTextRef.current = fullText
      setDisplayText('')
      setIsTyping(true)
      lastGreetingKey.current = greetingKey
      let i = 0
      const timer = setInterval(() => {
        if (i < fullText.length) {
          setDisplayText(prev => prev + fullText.charAt(i))
          i++
        } else {
          setIsTyping(false)
          clearInterval(timer)
          greetingTimerRef.current = null
          extractAndSyncTags(firstMsg.content, selectedCharacter, updateAttributes, selectedCharacter.extensions?.customParsers);
        }
      }, 16)
      greetingTimerRef.current = timer
      return () => { clearInterval(timer); greetingTimerRef.current = null }
    } else if (!isGreetingSession && firstMsg && lastGreetingKey.current !== greetingKey) {
      lastGreetingKey.current = greetingKey;
    }
  }, [selectedCharacter.id, messages, setIsTyping, isGreetingSession, updateAttributes])

  // ─── 单角色请求核心（可复用） ────────────────────────────────────────────────
  const requestChar = useCallback(async (
    charId: string,
    currentMessages: Message[],
    userContent: string,
  ) => {
    const char = charId === selectedCharacter.id ? selectedCharacter : secondaryCharacter!
    const provider = config.providers.find(p => p.id === char.providerId) || config.providers.find(p => p.id === config.activeProviderId) || config.providers[0]
    if (!provider?.apiKey) return

    const format = provider.apiFormat || 'openai'
    const isStreaming = provider.stream !== false
    const contextWindow = provider.contextWindow ?? 10
    const enabledTools = getEnabledSkills(config.enabledSkillIds)

    // 构建 system prompt
    const systemContext = buildSystemPrompt({
      character: char,
      persona: activePersona,
      directives: config.directives || [],
      worldBookLibrary: config.worldBookLibrary || [],
      missions,
      userName: config.userName || 'Observer',
      enabledSkillIds: config.enabledSkillIds,
      recentMessages: currentMessages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-10),
      isMultiChar: !!secondaryCharacter,
      otherCharName: secondaryCharacter ? (charId === selectedCharacter.id ? secondaryCharacter.name : selectedCharacter.name) : undefined,
    })

    // 多角色模式：折叠合并历史；单角色模式：直接切片
    const charNames: Record<string, string> = {
      user: activePersona?.name || 'User',
      [selectedCharacter.id]: selectedCharacter.name,
      ...(secondaryCharacter ? { [secondaryCharacter.id]: secondaryCharacter.name } : {}),
      narrator: 'Narrator',
    }
    const stopSeqs = secondaryCharacter ? buildStopSequences(charId, charNames) : []

    const apiMessages = multiCharMode && secondaryCharacter
      ? buildContextForChar(currentMessages, charId, charNames, contextWindow)
      : currentMessages.slice(-contextWindow).map(m => ({ role: m.role as any, content: m.content }))

    let fetchUrl = `${provider.endpoint}/chat/completions`
    let fetchHeaders: any = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` }
    let fetchBody: any = {}

    if (format === 'openai') {
      const postHistory = char.postHistoryInstructions
        ? [{ role: 'system', content: replaceMacros(char.postHistoryInstructions, activePersona?.name || 'User', char.name) }]
        : []
      fetchBody = {
        model: provider.model,
        messages: [{ role: 'system', content: systemContext }, ...apiMessages, ...postHistory, { role: 'user', content: userContent, name: charNames['user'] }],
        ...(enabledTools.length > 0 && { tools: enabledTools }),
        ...(stopSeqs.length > 0 && { stop: stopSeqs }),
        stream: isStreaming,
        temperature: provider.temperature ?? 0.7,
        top_p: provider.topP ?? 1,
      }
    } else if (format === 'anthropic') {
      fetchUrl = `${provider.endpoint.replace(/\/chat\/completions$/, '')}/messages`
      fetchHeaders = { 'Content-Type': 'application/json', 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
      fetchBody = {
        model: provider.model,
        system: systemContext,
        messages: [...apiMessages.filter(m => m.role !== 'system'), { role: 'user', content: userContent }],
        max_tokens: 4096,
        ...(stopSeqs.length > 0 && { stop_sequences: stopSeqs }),
        stream: isStreaming,
        temperature: provider.temperature ?? 0.7,
      }
    } else {
      addMessage({ role: 'assistant', content: '错误：Gemini 格式暂不支持，请使用 OpenAI 兼容端点。', speakerId: charId })
      return
    }

    if (config.isDebugEnabled) addDebugLog({ direction: 'OUT', label: `[${char.name}] API Request`, data: { url: fetchUrl, body: fetchBody } })

    const response = await fetch(fetchUrl, { method: 'POST', headers: fetchHeaders, body: JSON.stringify(fetchBody) })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`[${char.name}] HTTP ${response.status}${err?.error?.message ? ': ' + err.error.message : ''}`)
    }

    const handleFinish = async (fullText: string, toolCalls?: any[]) => {
      if (config.isDebugEnabled) addDebugLog({ direction: 'IN', label: `[${char.name}] Response`, data: { text: fullText } })
      extractAndSyncTags(fullText, char, updateAttributes, char.extensions?.customParsers)
      const transformed = applyCharacterRegexScripts(fullText, char, char.extensions?.customParsers)

      if (toolCalls?.length) {
        const assistantMsg: Message = { role: 'assistant', content: transformed || '*…*', tool_calls: toolCalls, speakerId: charId }
        addMessage(assistantMsg)
        const toolResults: Message[] = []
        for (const tc of toolCalls) {
          try {
            const args = JSON.parse(cleanJson(tc.function.arguments))
            const result = executeSkill(tc.function.name, args, useAppStore)
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
              const followUpData = await followUpRes.json()
              const followUpText = format === 'anthropic' ? followUpData.content?.[0]?.text : followUpData.choices?.[0]?.message?.content
              if (followUpText) {
                extractAndSyncTags(followUpText, char, updateAttributes, char.extensions?.customParsers)
                addMessage({ role: 'assistant', content: applyCharacterRegexScripts(followUpText, char, char.extensions?.customParsers), speakerId: charId })
              }
            }
          } catch (e) { console.error('Tool follow-up error:', e) }
        }
      } else {
        addMessage({ role: 'assistant', content: transformed, speakerId: charId })
      }
    }

    if (isStreaming) {
      await processChatStream(response, {
        onChunk: (chunk) => setDisplayText(prev => prev + chunk),
        onFinish: handleFinish,
        onError: (err) => { throw new Error(err) }
      }, format)
    } else {
      const data = await response.json()
      const content = format === 'anthropic' ? data.content?.[0]?.text : data.choices?.[0]?.message?.content
      const tcs = format === 'openai' ? data.choices?.[0]?.message?.tool_calls : undefined
      await handleFinish(content || '', tcs)
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
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isTyping) return

    const userMsg: Message = { role: 'user', content, speakerId: 'user' }
    addMessage(userMsg)
    setIsTyping(true)
    setDisplayText('')

    const activeProvider = config.providers.find(p => p.id === config.activeProviderId) || config.providers[0]
    if (!activeProvider?.apiKey) {
      addMessage({ role: 'assistant', content: `Demo Mode: 请在配置面板设置 API Key。` })
      setIsTyping(false)
      return
    }

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

      // ── 单角色模式（原有逻辑） ───────────────────────────────────────────────
      const format = activeProvider.apiFormat || 'openai'
      const isStreaming = activeProvider.stream !== false
      const contextWindow = activeProvider.contextWindow ?? 10
      const enabledTools = getEnabledSkills(config.enabledSkillIds)

      const systemContext = buildSystemPrompt({
        character: selectedCharacter,
        persona: activePersona,
        directives: config.directives || [],
        worldBookLibrary: config.worldBookLibrary || [],
        missions,
        userName: config.userName || 'Observer',
        enabledSkillIds: config.enabledSkillIds,
        recentMessages: messages.slice(-10)
      })

      let fetchUrl = `${activeProvider.endpoint}/chat/completions`
      let fetchHeaders: any = { 'Content-Type': 'application/json' }
      let fetchBody: any = {}

      if (format === 'openai') {
        if (activeProvider.apiKey) fetchHeaders['Authorization'] = `Bearer ${activeProvider.apiKey}`
        const postHistory = selectedCharacter.postHistoryInstructions
          ? [{ role: 'system', content: replaceMacros(selectedCharacter.postHistoryInstructions, activePersona?.name || 'User', selectedCharacter.name) }]
          : []
        fetchBody = {
          model: activeProvider.model,
          messages: [{ role: 'system', content: systemContext }, ...messages.slice(-contextWindow), ...postHistory, { role: 'user', content: userMsg.content }],
          ...(enabledTools.length > 0 && { tools: enabledTools }),
          stream: isStreaming,
          temperature: activeProvider.temperature ?? 0.7,
          top_p: activeProvider.topP ?? 1,
        }
      } else if (format === 'anthropic') {
        fetchUrl = `${activeProvider.endpoint.replace(/\/chat\/completions$/, '')}/messages`
        fetchHeaders = { 'Content-Type': 'application/json', 'x-api-key': activeProvider.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
        const postHistory = selectedCharacter.postHistoryInstructions
          ? [{ role: 'user', content: replaceMacros(selectedCharacter.postHistoryInstructions, activePersona?.name || 'User', selectedCharacter.name) }, { role: 'assistant', content: 'Understood.' }]
          : []
        fetchBody = {
          model: activeProvider.model,
          system: systemContext,
          messages: [...messages.slice(-contextWindow).filter(m => m.role !== 'system'), ...postHistory, { role: 'user', content: userMsg.content }],
          max_tokens: 4096,
          ...(enabledTools.length > 0 && { tools: enabledTools.map((t: any) => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters })) }),
          stream: isStreaming,
          temperature: activeProvider.temperature ?? 0.7,
        }
      } else {
        addMessage({ role: 'assistant', content: '错误：Gemini 格式暂不支持。' })
        setIsTyping(false)
        return
      }

      if (config.isDebugEnabled) addDebugLog({ direction: 'OUT', label: `API Request (${format})`, data: { url: fetchUrl, body: fetchBody } })

      const response = await fetch(fetchUrl, { method: 'POST', headers: fetchHeaders, body: JSON.stringify(fetchBody) })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(`HTTP ${response.status}${errData?.error?.message ? ': ' + errData.error.message : ''}`)
      }

      const handleResponseFinish = async (fullText: string, toolCalls?: any[]) => {
        if (config.isDebugEnabled) addDebugLog({ direction: 'IN', label: 'API Response Finished', data: { text: fullText, tool_calls: toolCalls } })
        extractAndSyncTags(fullText, selectedCharacter, updateAttributes, selectedCharacter.extensions?.customParsers)
        const transformedText = applyCharacterRegexScripts(fullText, selectedCharacter, selectedCharacter.extensions?.customParsers)

        if (toolCalls?.length) {
          const assistantMessage: Message = { role: 'assistant', content: transformedText || '*…*', tool_calls: toolCalls }
          addMessage(assistantMessage)
          const toolResults: Message[] = []
          for (const tc of toolCalls) {
            try {
              const args = JSON.parse(cleanJson(tc.function.arguments))
              const result = executeSkill(tc.function.name, args, useAppStore)
              const toolMsg: Message = { role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: result.message }
              addMessage(toolMsg)
              toolResults.push(toolMsg)
            } catch (e) { console.error('Skill error:', e) }
          }
          if (toolResults.length > 0) {
            try {
              let followUpBody: any
              if (format === 'anthropic') {
                followUpBody = { ...fetchBody, messages: [...fetchBody.messages, { role: 'assistant', content: toolCalls.map((tc: any) => ({ type: 'tool_use', id: tc.id, name: tc.function.name, input: JSON.parse(cleanJson(tc.function.arguments)) })) }, { role: 'user', content: toolResults.map(r => ({ type: 'tool_result', tool_use_id: r.tool_call_id, content: r.content })) }] }
              } else {
                followUpBody = { ...fetchBody, messages: [...fetchBody.messages, assistantMessage, ...toolResults], stream: false }
              }
              const followUpRes = await fetch(fetchUrl, { method: 'POST', headers: fetchHeaders, body: JSON.stringify(followUpBody) })
              if (followUpRes.ok) {
                const followUpData = await followUpRes.json()
                const followUpText = format === 'anthropic' ? followUpData.content?.[0]?.text : followUpData.choices?.[0]?.message?.content
                if (followUpText) {
                  extractAndSyncTags(followUpText, selectedCharacter, updateAttributes, selectedCharacter.extensions?.customParsers)
                  addMessage({ role: 'assistant', content: applyCharacterRegexScripts(followUpText, selectedCharacter, selectedCharacter.extensions?.customParsers) })
                }
              }
            } catch (e) { console.error('Tool follow-up error:', e) }
          }
        } else {
          addMessage({ role: 'assistant', content: transformedText })
        }
        setIsTyping(false)
      }

      if (isStreaming) {
        await processChatStream(response, {
          onChunk: (chunk) => setDisplayText(prev => prev + chunk),
          onFinish: handleResponseFinish,
          onError: (err) => { addMessage({ role: 'assistant', content: '错误：流式响应中断，请重试。' }); setIsTyping(false) }
        }, format)
      } else {
        const data = await response.json()
        const content = format === 'anthropic' ? data.content?.[0]?.text : data.choices?.[0]?.message?.content
        const tcs = format === 'openai' ? data.choices?.[0]?.message?.tool_calls : undefined
        await handleResponseFinish(content || '', tcs)
      }

    } catch (err: any) {
      console.error('Chat Error:', err)
      if (config.isDebugEnabled) addDebugLog({ direction: 'ERR', label: 'Fetch Error', data: { message: err.message } })
      addMessage({ role: 'assistant', content: `错误: ${err.message || '未知错误'}` })
      setIsTyping(false)
    }
  }, [addMessage, config, isTyping, messages, selectedCharacter, secondaryCharacter, multiCharMode, missions, setIsTyping, activePersona, addDebugLog, requestChar, requestRouter])

  return { displayText, sendMessage, isTyping, skipGreeting, activeSpeakerId }
}
