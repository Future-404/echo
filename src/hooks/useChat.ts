import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import type { Message } from '../store/useAppStore'
import { getEnabledSkills, executeSkill } from '../skills'
import { buildSystemPrompt, replaceMacros } from '../logic/promptEngine'
import { processChatStream } from '../utils/streamProcessor'
import { CORE_FORMATTING_RULES } from '../store/constants'
import { extractAndSyncTags, applyCharacterRegexScripts } from '../utils/tagParser'

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
    updateAttributes, isGreetingSession
  } = useAppStore()

  const [displayText, setDisplayText] = useState('')
  const lastGreetingKey = useRef<string | null>(null)

  // 获取当前激活的用户人格
  const activePersona = config.personas?.find(p => p.id === config.activePersonaId) || config.personas?.[0]

  const greetingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const greetingFullTextRef = useRef<string>('')

  // 跳过开场白打字机，立即显示完整文本
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

  // 开场白打字机效果
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


  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isTyping) return
    
    const userMsg: Message = { role: 'user', content }
    addMessage(userMsg)
    setIsTyping(true)
    setDisplayText('') // 清空打字机缓冲区

    const activeProvider = config.providers.find(p => p.id === config.activeProviderId) || config.providers[0]
    if (!activeProvider || !activeProvider.apiKey) {
      addMessage({ role: 'assistant', content: `Demo Mode: 您当前身份为 ${activePersona?.name}。请在配置面板设置 API Key 启用对话。` })
      setIsTyping(false)
      return
    }

    const format = activeProvider.apiFormat || 'openai'
    const isStreaming = activeProvider.stream !== false
    const contextWindow = activeProvider.contextWindow ?? 10
    const enabledTools = getEnabledSkills(config.enabledSkillIds);

    try {
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

      // --- 协议适配器逻辑 ---

      if (format === 'openai' || format === 'novelai') {
        if (activeProvider.apiKey) {
          fetchHeaders['Authorization'] = `Bearer ${activeProvider.apiKey}`
        }

        const postHistory = selectedCharacter.postHistoryInstructions
          ? [{ role: 'system', content: replaceMacros(selectedCharacter.postHistoryInstructions, activePersona?.name || 'User', selectedCharacter.name) }]
          : []

        fetchBody = {
          model: activeProvider.model,
          messages: [
            { role: 'system', content: systemContext }, 
            ...messages.slice(-contextWindow),
            ...postHistory,
            { role: 'user', content: userMsg.content }
          ],
          ...(enabledTools.length > 0 && { tools: enabledTools }),
          stream: isStreaming,
          temperature: activeProvider.temperature ?? 0.7,
          top_p: activeProvider.topP ?? 1,
        }
      } else if (format === 'anthropic') {
        fetchUrl = `${activeProvider.endpoint.replace(/\/chat\/completions$/, '')}/messages`
        fetchHeaders['x-api-key'] = activeProvider.apiKey
        fetchHeaders['anthropic-version'] = '2023-06-01'
        fetchHeaders['anthropic-dangerous-direct-browser-access'] = 'true'
        
        const postHistory = selectedCharacter.postHistoryInstructions
          ? [{ role: 'user', content: replaceMacros(selectedCharacter.postHistoryInstructions, activePersona?.name || 'User', selectedCharacter.name) }, { role: 'assistant', content: 'Understood.' }]
          : []

        fetchBody = {
          model: activeProvider.model,
          system: systemContext,
          messages: [
            ...messages.slice(-contextWindow).filter(m => m.role !== 'system'),
            ...postHistory,
            { role: 'user', content: userMsg.content }
          ],
          max_tokens: 4096,
          // Anthropic tools 格式与 OpenAI 不同，需要转换
          ...(enabledTools.length > 0 && { tools: enabledTools.map((t: any) => ({
            name: t.function.name,
            description: t.function.description,
            input_schema: t.function.parameters,
          })) }),
          stream: isStreaming,
          temperature: activeProvider.temperature ?? 0.7
        }
      } else if (format === 'gemini') {
        // Gemini 格式尚未实现，提示用户
        addMessage({ role: 'assistant', content: '错误：Gemini API 格式暂未支持，请改用 OpenAI 兼容模式（通过 Google AI Studio 的 OpenAI 兼容端点）。' })
        setIsTyping(false)
        return
      }
      if (config.isDebugEnabled) {
        addDebugLog({
          direction: 'OUT',
          label: `API Request (${format})`,
          data: { url: fetchUrl, headers: { ...fetchHeaders, 'x-api-key': '***', 'Authorization': 'Bearer ***' }, body: fetchBody }
        });
      }

      const response = await fetch(fetchUrl, {        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify(fetchBody)
      })

      if (!response.ok) {
        let errorDetail = `HTTP Error: ${response.status}`;
        try {
          const errorJson = await response.json();
          if (errorJson.error && errorJson.error.message) {
            errorDetail += ` - ${errorJson.error.message}`;
          }
        } catch (e) {}
        throw new Error(errorDetail);
      }

      const handleResponseFinish = async (fullText: string, toolCalls?: any[]) => {
        // 调试日志：记录接收完成
        if (config.isDebugEnabled) {
          addDebugLog({
            direction: 'IN',
            label: 'API Response Finished',
            data: { text: fullText, tool_calls: toolCalls }
          });
        }

        // 解析并同步标签状态
        extractAndSyncTags(fullText, selectedCharacter, updateAttributes, selectedCharacter.extensions?.customParsers);

        // 应用角色卡自定义正则转换
        const transformedText = applyCharacterRegexScripts(fullText, selectedCharacter, selectedCharacter.extensions?.customParsers);

        if (toolCalls && toolCalls.length > 0) {
          const assistantMessage: Message = { 
            role: 'assistant', 
            content: transformedText || "*正在根据局势的变化做出决策...*",
            tool_calls: toolCalls
          };
          addMessage(assistantMessage);

          const toolResults: Message[] = [];
          for (const tc of toolCalls) {
            try {
              const args = JSON.parse(cleanJson(tc.function.arguments));
              const result = executeSkill(tc.function.name, args);
              const toolMsg: Message = { role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: result.message };
              addMessage(toolMsg);
              toolResults.push(toolMsg);
            } catch (e) { console.error('Failed to execute skill:', e); }
          }

          // 将 tool results 回传 AI，获取最终叙事回复
          if (toolResults.length > 0) {
            try {
              const currentMessages = useAppStore.getState().messages;
              let followUpBody: any;
              if (format === 'anthropic') {
                followUpBody = {
                  ...fetchBody,
                  messages: [
                    ...fetchBody.messages,
                    { role: 'assistant', content: toolCalls.map((tc: any) => ({ type: 'tool_use', id: tc.id, name: tc.function.name, input: JSON.parse(cleanJson(tc.function.arguments)) })) },
                    { role: 'user', content: toolResults.map(r => ({ type: 'tool_result', tool_use_id: r.tool_call_id, content: r.content })) }
                  ]
                };
              } else {
                followUpBody = {
                  ...fetchBody,
                  messages: [
                    ...fetchBody.messages,
                    assistantMessage,
                    ...toolResults
                  ],
                  stream: false,
                };
              }
              const followUpRes = await fetch(fetchUrl, { method: 'POST', headers: fetchHeaders, body: JSON.stringify(followUpBody) });
              if (followUpRes.ok) {
                const followUpData = await followUpRes.json();
                const followUpText = format === 'anthropic'
                  ? followUpData.content?.[0]?.text
                  : followUpData.choices?.[0]?.message?.content;
                if (followUpText) {
                  extractAndSyncTags(followUpText, selectedCharacter, updateAttributes, selectedCharacter.extensions?.customParsers);
                  const finalText = applyCharacterRegexScripts(followUpText, selectedCharacter, selectedCharacter.extensions?.customParsers);
                  addMessage({ role: 'assistant', content: finalText });
                }
              }
            } catch (e) { console.error('Failed to get tool follow-up:', e); }
          }
        } else {
          addMessage({ role: 'assistant', content: transformedText });
        }
        setIsTyping(false);
      };

      if (isStreaming) {
        await processChatStream(response, {
          onChunk: (chunk) => setDisplayText(prev => prev + chunk),
          onFinish: handleResponseFinish,
          onError: (err) => {
            console.error('Stream Error:', err);
            addMessage({ role: 'assistant', content: "错误：网络连接失败或模型响应中断，请点击菜单中的“重试”按钮。" });
            setIsTyping(false);
          }
        }, format);
      } else {
        const data = await response.json();
        // Anthropic 和 OpenAI 的非流式返回结构不同
        const content = format === 'anthropic' ? data.content?.[0]?.text : data.choices?.[0]?.message?.content;
        const toolCalls = format === 'openai' ? data.choices?.[0]?.message?.tool_calls : undefined;
        // setDisplayText(content || ''); // 移除这行，由 handleResponseFinish 处理
        handleResponseFinish(content || '', toolCalls);
      }

    } catch (err: any) {
      console.error('Chat Error:', err)
      // 调试日志：记录错误
      if (config.isDebugEnabled) {
        addDebugLog({
          direction: 'ERR',
          label: 'Fetch Error',
          data: { message: err.message, stack: err.stack }
        });
      }
      addMessage({ role: 'assistant', content: `错误: ${err.message || '未知网络错误'}` })
      setIsTyping(false)
    }
  }, [addMessage, config, isTyping, messages, selectedCharacter, missions, setIsTyping, activePersona, addDebugLog])

  return { displayText, sendMessage, isTyping, skipGreeting }
}
