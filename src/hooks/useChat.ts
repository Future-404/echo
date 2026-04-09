import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { Message } from '../types/store'
import { getEnabledSkills, executeSkill, registeredSkills } from '../skills'
import { buildSystemPrompt, buildPromptMessages } from '../logic/promptEngine'
import { buildContextForChar, buildStopSequences } from '../logic/multiChar'
import { replaceMacros } from '../logic/promptEngine'
import { ProviderFactory, type ProviderFormat } from '../logic/providers'
import { extractAndSyncTags, applyCharacterRegexScripts } from '../utils/tagParser'
import { applyRegexRules } from '../utils/regexEngine'
import { routerSchema, parseRouterResult } from '../skills/router/schema'
import { buildRouterPrompt } from '../skills/router/prompt'
import type { RouterAction } from '../skills/router/schema'
import { iframeBus } from '../utils/iframeBus'
import { ttsService } from '../utils/ttsService'
import { vectorService } from '../utils/vectorService'
import { db } from '../storage/db'

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
    secondaryCharacter, multiCharMode,
    ttsSettings, setAbortController,
  } = useAppStore()

  const [displayText, setDisplayText] = useState('')
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | undefined>(undefined)
  const lastGreetingKey = useRef<string | null>(null)
  const activePersona = config.personas?.find(p => p.id === config.activePersonaId) || config.personas?.[0]

  // 始终持有最新 state 的 ref，供 useCallback 内部读取，避免闭包旧值问题
  const stateRef = useRef({ config, selectedCharacter, secondaryCharacter, activePersona, missions, ttsSettings, multiCharMode })
  stateRef.current = { config, selectedCharacter, secondaryCharacter, activePersona, missions, ttsSettings, multiCharMode }

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
    // 始终从 ref 读取最新 state，彻底避免闭包旧值
    const { config, selectedCharacter, secondaryCharacter, activePersona, missions, ttsSettings } = stateRef.current

    // 关键：捕获请求发起时的 slotId
    const requestSlotId = useAppStore.getState().currentAutoSlotId;
    
    const char = charId === selectedCharacter.id ? selectedCharacter : secondaryCharacter
    if (!char) throw new Error(`[requestChar] 找不到角色 ${charId}`)
    const provider = config.providers.find(p => p.id === char.providerId) || config.providers.find(p => p.id === config.modelConfig?.chatProviderId || config.activeProviderId) || config.providers[0]
    if (!provider?.apiKey) {
      throw new Error(`[${char.name}] 未配置 API Key`)
    }

    const format = (provider.apiFormat || 'openai') as ProviderFormat;
    const isStreaming = provider.stream !== false
    const contextWindow = provider.contextWindow ?? 10
    const enabledTools = getEnabledSkills(config.enabledSkillIds)

    // 预处理引导语 (Assistant Prefill)
    const rawPrefill = provider.assistantPrefill?.trim()
    const actualUserName = activePersona?.name || config.userName || 'User'
    const prefill = rawPrefill ? replaceMacros(rawPrefill, actualUserName, char.name, {
      otherName: secondaryCharacter ? (charId === selectedCharacter.id ? secondaryCharacter.name : selectedCharacter.name) : undefined,
      currentQuest: (missions || []).find(m => m.status === 'ACTIVE' && m.type === 'MAIN')?.title,
    }) : undefined

    // 组装完整的 API 消息数组 (ST 1:1 复刻逻辑)
    const apiMessages = await buildPromptMessages({
      character: char,
      persona: activePersona,
      directives: config.directives || [],
      worldBookLibrary: config.worldBookLibrary || [],
      missions,
      userName: config.userName || 'Observer',
      enabledSkillIds: config.enabledSkillIds,
      slotId: requestSlotId, // 告知引擎从哪个存档拉取 AI 上下文
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

    const controller = new AbortController();
    setAbortController(controller);

    if (config.isDebugEnabled) addDebugLog({ direction: 'OUT', label: `[${char.name}] API Request (${format})`, data: { provider, messages: apiMessages } })

    try {
      const providerImpl = ProviderFactory.getProvider(format);
      
      let ttsBuffer = '';
      const voiceId = ttsSettings.enabled && ttsSettings.autoSpeak ? ttsSettings.voiceMap[charId] : null;

      const result = await providerImpl.request({
        messages: apiMessages,
        provider,
        stopSequences: stopSeqs,
        prefill,
        isStreaming,
        tools: enabledTools,
        signal: controller.signal,
        onChunk: (chunk) => {
          setDisplayText(prev => prev + chunk);
          if (voiceId !== null) {
            ttsBuffer += chunk;
            const sentenceEnd = /[。！？!?.]+/.exec(ttsBuffer);
            if (sentenceEnd) {
              const sentence = ttsBuffer.slice(0, sentenceEnd.index + sentenceEnd[0].length).trim();
              ttsBuffer = ttsBuffer.slice(sentenceEnd.index + sentenceEnd[0].length);
              if (sentence) ttsService.speak(sentence, ttsSettings, voiceId);
            }
          }
        }
      });

      const { content: fullText, toolCalls, usage } = result;
      setDisplayText(fullText);

      setAbortController(null);
      if (usage) {
        useAppStore.getState().setTokenStats(usage.total_tokens || (usage.prompt_tokens + (usage.completion_tokens || 0)), provider.contextWindow || 128000);
      } else {
        const estTokens = Math.ceil(fullText.length / 3.5) + (apiMessages.reduce((acc, m) => {
          const len = typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length;
          return acc + len;
        }, 0) / 3.5);
        useAppStore.getState().setTokenStats(Math.ceil(estTokens), provider.contextWindow || 128000);
      }

      if (config.isDebugEnabled) addDebugLog({ direction: 'IN', label: `[${char.name}] Response`, data: { text: fullText, usage } });
      extractAndSyncTags(fullText, char, updateAttributes);
      // 先应用全局正则（ai 范围），再应用角色卡正则脚本
      const globalProcessed = applyRegexRules(fullText, config.regexRules || [], 'ai');
      const transformed = applyCharacterRegexScripts(globalProcessed, char, 1);

      if (toolCalls?.length) {
        const assistantMsg: Message = { role: 'assistant', content: transformed, tool_calls: toolCalls, speakerId: charId };
        await addMessage(assistantMsg, requestSlotId);
        const toolResults: Message[] = [];
        for (const tc of toolCalls) {
          try {
            const skillName = tc.function.name;
            const displayName = registeredSkills[skillName]?.displayName || skillName;
            useAppStore.getState().addFragment(`✨ 正在激活 [${displayName}]...`);
            const args = JSON.parse(cleanJson(tc.function.arguments));
            const skillResult = await executeSkill(skillName, args);
            if (skillResult.success) {
              useAppStore.getState().addFragment(`✅ [${displayName}] 感知同步完成`);
            }
            const toolMsg: Message = { role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: skillResult.message };
            await addMessage(toolMsg, requestSlotId);
            toolResults.push(toolMsg);
          } catch (e) { console.error('Skill error:', e); }
        }

        if (toolResults.length > 0) {
          try {
            const followUpController = new AbortController();
            const followUpMessages = [...apiMessages, { role: 'assistant', content: transformed, tool_calls: toolCalls }, ...toolResults];
            const followUpResult = await providerImpl.request({
              messages: followUpMessages as Message[],
              provider,
              isStreaming: false,
              signal: followUpController.signal
            });
            if (followUpResult.content) {
              extractAndSyncTags(followUpResult.content, char, updateAttributes);
              const followUpGlobal = applyRegexRules(followUpResult.content, config.regexRules || [], 'ai');
              await addMessage({ role: 'assistant', content: applyCharacterRegexScripts(followUpGlobal, char, 1), speakerId: charId }, requestSlotId);
            }
          } catch (e) { console.error('Tool follow-up error:', e); }
        }
      } else {
        await addMessage({ role: 'assistant', content: transformed, speakerId: charId }, requestSlotId);
      }

      const embeddingProvider = config.providers.find(p => p.id === config.modelConfig?.embeddingProviderId);
      if (embeddingProvider && embeddingProvider.apiKey) {
        const chatProvider = config.providers.find(p => p.id === char.providerId) || provider;
        const summaryProvider = config.providers.find(p => p.id === config.modelConfig?.summaryProviderId) || chatProvider;
        db.messages.where('slotId').equals(requestSlotId!).sortBy('timestamp').then(history => {
          const lastMsg = history[history.length - 1];
          if (lastMsg) {
            vectorService.onMessageAdded(requestSlotId!, lastMsg, char.name, summaryProvider, embeddingProvider);
          }
        });
      }

      if (ttsSettings.enabled && ttsSettings.autoSpeak && !isStreaming) {
        const voiceId = ttsSettings.voiceMap[charId];
        ttsService.speak(transformed, ttsSettings, voiceId);
      }

    } catch (err: any) {
      setAbortController(null);
      if (err.name === 'AbortError') {
        console.log(`[${char.name}] 用户中断了生成`);
        return;
      }
      throw err;
    }
  }, [addMessage, addDebugLog, updateAttributes, setAbortController])

  // ─── Router 请求 ─────────────────────────────────────────────────────────────
  const requestRouter = useCallback(async (
    userContent: string,
    currentMessages: Message[],
    images?: string[],
  ): Promise<RouterAction[]> => {
    const { config, selectedCharacter, secondaryCharacter, activePersona } = stateRef.current
    const routerProvider = config.providers.find(p => p.id === config.modelConfig?.routerProviderId) || config.providers.find(p => p.id === config.modelConfig?.chatProviderId || config.activeProviderId) || config.providers[0]
    if (!routerProvider?.apiKey || !secondaryCharacter) {
      // fallback
      return [{ type: 'speak', speakerId: selectedCharacter.id }, { type: 'speak', speakerId: secondaryCharacter!.id }]
    }

    const systemPrompt = buildRouterPrompt(selectedCharacter.name, secondaryCharacter.name, activePersona?.name || 'User')
    // 排除最后一条（即当前用户发送的）消息，因为它会被手动加在末尾
    const historyMsgs = currentMessages.slice(0, -1);
    const recentCtx = historyMsgs.slice(-6).map(m => {
      const name = m.speakerId === selectedCharacter.id ? selectedCharacter.name
        : m.speakerId === secondaryCharacter.id ? secondaryCharacter.name
        : activePersona?.name || 'User'
      const imageTag = m.images?.length ? ` [Attached ${m.images.length} images]` : ''
      return { role: m.role as any, content: `[${name}]: ${m.content}${imageTag}` }
    })

    const fetchUrl = `${routerProvider.endpoint}/chat/completions`
    const imageTag = (images?.length || 0) > 0 ? ` [Attached ${images?.length} images]` : ''
    const fetchBody = {
      model: routerProvider.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentCtx,
        { role: 'user', content: `[${activePersona?.name || 'User'}]: ${userContent}${imageTag}` }
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
  }, [addDebugLog])

  // ─── 主入口 ──────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (content: string, images?: string[]) => {
    if ((!content.trim() && (!images || images.length === 0)) || isTyping) return

    const { config, selectedCharacter, secondaryCharacter, multiCharMode } = stateRef.current

    // 应用全局正则 (用户输入范围)
    const processedContent = applyRegexRules(content, config.regexRules || [], 'user');

    const userMsg: Message = { role: 'user', content: processedContent, speakerId: 'user', ...(images && images.length > 0 ? { images } : {}) }
    addMessage(userMsg)
    setIsTyping(true)
    setDisplayText('')

    const activeProvider = config.providers.find(p => p.id === (config.modelConfig?.chatProviderId || config.activeProviderId)) || config.providers[0]
    if (!activeProvider?.apiKey) {
      addMessage({ role: 'assistant', content: `Demo Mode: 请在配置面板设置 API Key。` })
      setIsTyping(false)
      return
    }

    // addMessage 是异步写入，必须从 getState() 读取包含新消息的最新列表
    const currentMessages = [...useAppStore.getState().messages]

    try {
      // ── 多角色模式 ──────────────────────────────────────────────────────────
      if (multiCharMode && secondaryCharacter) {
        setActiveSpeakerId(undefined)
        let actions: RouterAction[]
        try {
          actions = await requestRouter(content, currentMessages, images)
        } catch (routerErr: any) {
          addMessage({ role: 'assistant', content: `错误（Router）: ${routerErr.message}。请重试。` })
          setIsTyping(false)
          return
        }

        for (const action of actions) {
          if (action.type === 'narrate') {
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

      // ── 单角色模式 ─────────────────────────────────────────────────────────
      await requestChar(selectedCharacter.id, currentMessages, content)
      setIsTyping(false)

    } catch (err: any) {
      console.error('Chat Error:', err)
      if (config.isDebugEnabled) addDebugLog({ direction: 'ERR', label: 'Fetch Error', data: { message: err.message } })
      addMessage({ role: 'assistant', content: `错误: ${err.message || '未知错误'}` })
      setIsTyping(false)
    }
  }, [isTyping, addMessage, setIsTyping, addDebugLog, requestChar, requestRouter])

  // 注册 iframe triggerSlash 的消息处理
  useEffect(() => {
    iframeBus.setHandler((text) => sendMessage(text))
    return () => iframeBus.setHandler(null)
  }, [sendMessage])

  return { displayText, sendMessage, isTyping, skipGreeting, activeSpeakerId }
}
