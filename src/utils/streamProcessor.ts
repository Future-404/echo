/**
 * 极致模块化：流式处理器 (Stream Processor)
 * 单一功能：解析 HTTP ReadableStream 并通过回调返回文本片段及 Tool Calls
 */

import type { ToolCall, UsageInfo } from '../logic/providers/base';

export type { ToolCall };

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onFinish: (fullText: string, toolCalls?: ToolCall[], usage?: UsageInfo) => void;
  onError: (error: unknown) => void;
}

export const processChatStream = async (
  response: Response,
  callbacks: StreamCallbacks,
  format: 'openai' | 'anthropic' | 'gemini' = 'openai'
) => {
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError('Response body is null');
    return;
  }

  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = ''; // 处理 SSE 碎片
  let lastUsage: UsageInfo | null = null;
  
  // 用于收集流式的 tool_calls
  const toolCallsMap: Record<number, ToolCall> = {};

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // 处理 buffer 中可能残留的最后一行
        if (buffer.trim()) {
          const cleanedLine = buffer.trim();
          if (format === 'openai' && cleanedLine.startsWith('data: ')) {
            const dataStr = cleanedLine.slice(6);
            if (dataStr !== '[DONE]') {
              try {
                const json = JSON.parse(dataStr);
                if (json.usage) lastUsage = json.usage;
                const delta = json.choices?.[0]?.delta;
                if (delta?.content) { fullText += delta.content; callbacks.onChunk(delta.content); }
              } catch { /* incomplete chunk, ignore */ }
            }
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; 

      for (const line of lines) {
        const cleanedLine = line.trim();
        if (!cleanedLine) continue;
        
        // --- OpenAI 格式解析 ---
        if (format === 'openai' && cleanedLine.startsWith('data: ')) {
          const dataStr = cleanedLine.slice(6);
          if (dataStr === '[DONE]') {
            callbacks.onFinish(fullText, Object.values(toolCallsMap).length > 0 ? Object.values(toolCallsMap) : undefined, lastUsage);
            return;
          }
          try {
            const json = JSON.parse(dataStr);
            if (json.usage) lastUsage = json.usage;
            const delta = json.choices?.[0]?.delta;
            if (!delta) continue;
            if (delta.content) {
              fullText += delta.content;
              callbacks.onChunk(delta.content);
            }
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index;
                if (!toolCallsMap[index]) {
                  toolCallsMap[index] = {
                    id: tc.id || '',
                    type: tc.type || 'function',
                    function: { name: tc.function?.name || '', arguments: '' }
                  };
                }
                if (tc.function?.arguments) toolCallsMap[index].function.arguments += tc.function.arguments;
              }
            }
          } catch (e) { console.warn('Incomplete OpenAI chunk', e); }
        }

        // --- Anthropic (Claude) 格式解析 ---
        else if (format === 'anthropic' && cleanedLine.startsWith('data: ')) {
          const dataStr = cleanedLine.slice(6);
          try {
            const json = JSON.parse(dataStr);
            if (json.message?.usage) lastUsage = json.message.usage;
            if (json.usage) lastUsage = json.usage; // message_delta contains usage
            if (json.type === 'content_block_delta') {
              if (json.delta?.type === 'text_delta' && json.delta.text) {
                fullText += json.delta.text;
                callbacks.onChunk(json.delta.text);
              }
              if (json.delta?.type === 'input_json_delta' && json.delta.partial_json) {
                const idx = json.index ?? 0;
                if (toolCallsMap[idx]) toolCallsMap[idx].function.arguments += json.delta.partial_json;
              }
            }
            if (json.type === 'content_block_start' && json.content_block?.type === 'tool_use') {
              const idx = json.index ?? 0;
              toolCallsMap[idx] = {
                id: json.content_block.id || `tool_${idx}`,
                type: 'function',
                function: { name: json.content_block.name || '', arguments: '' }
              };
            }
            if (json.type === 'message_stop') {
              callbacks.onFinish(fullText, Object.values(toolCallsMap).length > 0 ? Object.values(toolCallsMap) : undefined, lastUsage);
              return;
            }
          } catch (e) { console.warn('Incomplete Anthropic chunk', e); }
        }

        // --- Gemini (Google) 格式解析 ---
        else if (format === 'gemini' && cleanedLine.startsWith('data: ')) {
          const dataStr = cleanedLine.slice(6);
          try {
            const json = JSON.parse(dataStr);
            if (json.usageMetadata) {
              lastUsage = {
                prompt_tokens: json.usageMetadata.promptTokenCount,
                completion_tokens: json.usageMetadata.candidatesTokenCount,
                total_tokens: json.usageMetadata.totalTokenCount
              };
            }
            const part = json.candidates?.[0]?.content?.parts?.[0];
            if (part?.text) {
              fullText += part.text;
              callbacks.onChunk(part.text);
            }
          } catch (e) { console.warn('Incomplete Gemini chunk', e); }
        }
      }
    }
    
    const finalToolCalls = Object.values(toolCallsMap);
    callbacks.onFinish(fullText, finalToolCalls.length > 0 ? finalToolCalls : undefined, lastUsage);
    
  } catch (error) {
    callbacks.onError(error);
  } finally {
    reader.releaseLock();
  }
};
