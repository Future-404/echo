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
    ttsSettings, setAbortController, setChatError,
  } = useAppStore()

  const [displayText, setDisplayText] = useState('')
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
      deviceContextEnabled: config.deviceContextEnabled,
      slotId: requestSlotId,
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
      // 剥离 <echo-set> 标签（数据已写入 attributes，不需要显示在对话框）
      const strippedText = fullText.replace(/<echo-set\s+key="[^"]*">[\s\S]*?<\/echo-set>/gi, '').trim();
      // 先应用全局正则（ai 范围），再应用角色卡正则脚本
      const globalProcessed = applyRegexRules(strippedText, config.regexRules || [], 'ai');
      const transformed = applyCharacterRegexScripts(globalProcessed, char, 1);

      if (toolCalls?.length) {
        const assistantMsg: Message = { role: 'assistant', content: transformed, tool_calls: toolCalls, speakerId: charId, ...(!transformed.trim() && { hidden: true }) };
        await addMessage(assistantMsg, requestSlotId);
        const toolResults: Message[] = [];
        // 构建 skill 上下文
        const skillCtx = {
          messages: useAppStore.getState().messages as Array<{ role: string; content: string }>,
          characterName: char.name,
          userName,
          attributes: char.attributes || {},
        };
        for (const tc of toolCalls) {
          try {
            const skillName = tc.function.name;
            const displayName = registeredSkills[skillName]?.displayName || skillName;
            useAppStore.getState().addFragment(`✨ 正在激活 [${displayName}]...`);
            const args = JSON.parse(cleanJson(tc.function.arguments));
            const skillResult = await executeSkill(skillName, args, skillCtx);
            tc._skillResult = skillResult // 存结果供后续判断 suppressFollowUp
            if (skillResult.success) {
              // 增强反馈：显示具体的执行结果消息，而不仅仅是通用提示
              useAppStore.getState().addFragment(`✅ [${displayName}] ${skillResult.message}`);
            } else {
              useAppStore.getState().addFragment(`❌ [${displayName}] 执行失败: ${skillResult.message}`);
            }
            // 支持 skill 通过 data.writeAttrs 写入角色属性
            if (skillResult.data?.writeAttrs && typeof skillResult.data.writeAttrs === 'object') {
              updateAttributes(char.id, skillResult.data.writeAttrs);
            }
            const contentStr = skillResult.data 
              ? JSON.stringify({ message: skillResult.message, data: skillResult.data }) 
              : skillResult.message;
            const toolMsg: Message = { role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: contentStr };
            await addMessage(toolMsg, requestSlotId);
            toolResults.push(toolMsg);
          } catch (e) {
            console.error('Skill error:', e);
            const displayName = registeredSkills[tc.function.name]?.displayName || tc.function.name;
            useAppStore.getState().addFragment(`❌ [${displayName}] 执行异常: ${(e as Error).message}`);
            // 写入 tool 错误结果，保证 API 消息链完整
            const toolMsg: Message = { role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: JSON.stringify({ error: (e as Error).message }) };
            await addMessage(toolMsg, requestSlotId);
            toolResults.push(toolMsg);
          }
        }
        if (toolResults.length > 0) {
          // suppressDisplay：隐藏触发 skill 的 assistant 消息
          const shouldHideAssistant = toolCalls.some(tc => (tc._skillResult as any)?.suppressDisplay === true)
          if (shouldHideAssistant) {
            useAppStore.setState(s => ({
              messages: s.messages.map(m => m.tool_calls === assistantMsg.tool_calls ? { ...m, hidden: true } : m)
            }))
          }

          // injectContext：将 skill 返回的上下文注入为 hidden 消息（不触发 AI）
          for (const tc of toolCalls) {
            const ctx = (tc._skillResult as any)?.injectContext
            if (ctx) {
              await addMessage({ role: 'user', content: ctx, hidden: true, speakerId: 'system' }, requestSlotId)
            }
          }

          const suppress = toolCalls.some(tc => {
            const r = tc._skillResult as any
            return r?.suppressFollowUp === true
          })
          if (!suppress) {
            try {
              // 动态注入正在执行的 skill 的 systemPrompt
              const activeSkillPrompts = toolCalls
                .map(tc => {
                  const sp = registeredSkills[tc.function.name]?.systemPrompt;
                  const ctx = { messages: useAppStore.getState().messages as any, characterName: char.name, userName, attributes: char.attributes || {} };
                  return typeof sp === 'function' ? sp(ctx) : sp;
                })
                .filter(Boolean)
                .join('\n\n');
              
              const followUpController = new AbortController();
              const followUpMessages = [...apiMessages];
              
              // 在上下文头部或尾部注入临时指令
              if (activeSkillPrompts) {
                followUpMessages.push({ 
                  role: 'system', 
                  content: `[MODULE GUIDANCE]\n${activeSkillPrompts.replace(/\[角色名\]/g, char.name)}`,
                  hidden: true // 不显示在 UI 上
                } as any);
              }
              
              followUpMessages.push({ role: 'assistant', content: transformed, tool_calls: toolCalls } as any);
              followUpMessages.push(...toolResults as any[]);

              const followUpResult = await providerImpl.request({
                messages: followUpMessages as Message[],
                provider,
                isStreaming: false,
                signal: followUpController.signal
              });
            if (followUpResult.content) {
              extractAndSyncTags(followUpResult.content, char, updateAttributes);
              const followUpStripped = followUpResult.content.replace(/<echo-set\s+key="[^"]*">[\s\S]*?<\/echo-set>/gi, '').trim();
              const followUpGlobal = applyRegexRules(followUpStripped, config.regexRules || [], 'ai');
              await addMessage({ role: 'assistant', content: applyCharacterRegexScripts(followUpGlobal, char, 1), speakerId: charId }, requestSlotId);
            }
          } catch (e) { console.error('Tool follow-up error:', e); }
          }
        }
      } else {
        await addMessage({ role: 'assistant', content: transformed, speakerId: charId, ...(!transformed.trim() && { hidden: true }) }, requestSlotId);
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

    } catch (err) {
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
      return { role: m.role, content: `[${name}]: ${m.content}${imageTag}` }
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
  const sendMessage = useCallback(async (content: string, images?: string[], hidden?: boolean) => {
    if ((!content.trim() && (!images || images.length === 0)) || isTyping) return

    setChatError(null) // 发新消息时清除上一次错误

    const { config, selectedCharacter, secondaryCharacter, multiCharMode } = stateRef.current

    // 应用全局正则 (用户输入范围)
    const processedContent = applyRegexRules(content, config.regexRules || [], 'user');

    const userMsg: Message = { role: 'user', content: processedContent, speakerId: 'user', hidden, ...(images && images.length > 0 ? { images } : {}) }
    addMessage(userMsg)
    setIsTyping(true)
    setDisplayText('')

    const activeProvider = config.providers.find(p => p.id === (config.modelConfig?.chatProviderId || config.activeProviderId)) || config.providers[0]
    if (!activeProvider?.apiKey) {
      setChatError('⚠️ 未配置 API Key，请前往 设置 → API 管理 添加服务商。')
      iframeBus.emitError('⚠️ 未配置 API Key，请前往 设置 → API 管理 添加服务商。')
      setIsTyping(false)
      return
    }

    // addMessage 是异步写入，必须从 getState() 读取包含新消息的最新列表
    const currentMessages = [...useAppStore.getState().messages]

    try {
      // ── 多角色模式 ──────────────────────────────────────────────────────────
      if (multiCharMode && secondaryCharacter) {
        let actions: RouterAction[]
        try {
          actions = await requestRouter(content, currentMessages, images)
        } catch (routerErr) {
          setChatError(`⚠️ Router 错误：${routerErr.message}`)
          iframeBus.emitError(`⚠️ Router 错误：${routerErr.message}`)
          setIsTyping(false)
          return
        }

        for (const action of actions) {
          if (action.type === 'narrate') {
            if (config.isDebugEnabled) addDebugLog({ direction: 'IN', label: '[Router] Narrate (silent)', data: { content: action.narrateContent } })
            continue
          }
          if (action.type === 'speak') {
            setDisplayText('')
            const latestMessages = [...useAppStore.getState().messages]
            await requestChar(action.speakerId, latestMessages, content)
          }
        }

        setIsTyping(false)
        return
      }

      // ── 单角色模式 ─────────────────────────────────────────────────────────
      await requestChar(selectedCharacter.id, currentMessages, content)
      setIsTyping(false)

    } catch (err) {
      console.error('Chat Error:', err)
      if (config.isDebugEnabled) addDebugLog({ direction: 'ERR', label: 'Fetch Error', data: { message: err.message } })
      
      const msg = err.message || '未知错误'
      // 分类错误，给出明确指引
      let userMsg: string
      if (msg.includes('未配置 API Key') || msg.includes('apiKey')) {
        userMsg = '⚠️ 未配置 API Key，请前往 设置 → API 管理 添加服务商。'
      } else if (msg.includes('401') || msg.includes('Unauthorized')) {
        userMsg = '⚠️ API Key 无效或已过期，请检查 设置 → API 管理。'
      } else if (msg.includes('403')) {
        userMsg = '⚠️ API 访问被拒绝（403），请检查 Key 权限或账户余额。'
      } else if (msg.includes('429')) {
        userMsg = '⚠️ 请求过于频繁（429），请稍后再试。'
      } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ECONNREFUSED')) {
        userMsg = '⚠️ 网络连接失败，请检查 API 地址是否正确，或网络是否可用。'
      } else if (msg.includes('找不到角色')) {
        userMsg = '⚠️ 未选择角色，请先选择一个角色开始对话。'
      } else {
        userMsg = `⚠️ ${msg}`
      }
      
      setChatError(userMsg)
      iframeBus.emitError(userMsg)
      setIsTyping(false)
    }
  }, [isTyping, addMessage, setIsTyping, addDebugLog, requestChar, requestRouter])

  // 注册 iframe triggerSlash 的消息处理
  useEffect(() => {
    iframeBus.setHandler((text, hidden, injectOnly) => {
      if (injectOnly) {
        // 只插入上下文，不觸發 AI 請求
        const { addMessage, currentSlotId } = useAppStore.getState()
        addMessage({ role: 'user', content: text, hidden: true, speakerId: 'system' }, currentSlotId)
        return
      }
      sendMessage(text, undefined, hidden)
    })
    return () => iframeBus.setHandler(null)
  }, [sendMessage])

  return { displayText, sendMessage, isTyping, skipGreeting }
}
