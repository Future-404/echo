import type { IChatProvider, ChatRequestOptions, ChatResponse } from './base';
import { processChatStream } from '../../utils/streamProcessor';

export class AnthropicProvider implements IChatProvider {
  async request(options: ChatRequestOptions): Promise<ChatResponse> {
    const { messages, provider, stopSequences, prefill, isStreaming, onChunk, signal } = options;

    const base = provider.endpoint.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
    const fetchUrl = `${base}/messages`;
    let fetchHeaders: any = { 
      'Content-Type': 'application/json', 
      'x-api-key': provider.apiKey, 
      'anthropic-version': '2023-06-01', 
      'anthropic-dangerous-direct-browser-access': 'true' 
    };

    if (provider.customHeaders) {
      try {
        const extraHeaders = JSON.parse(provider.customHeaders);
        fetchHeaders = { ...fetchHeaders, ...extraHeaders };
      } catch (e) { console.error('Failed to parse custom headers:', e) }
    }

    const systemMsg = messages.find(m => m.role === 'system')?.content || '';

    // Anthropic 要求 user/assistant 严格交替，且不支持 tool role（转为 user）
    const nonSystemMsgs = messages.filter(m => m.role !== 'system').map(m => {
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      if (m.images && m.images.length > 0) {
        const content: any[] = m.images.map((img: string) => {
          const match = img.match(/^data:(image\/\w+);base64,(.*)$/);
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: match ? match[1] : 'image/jpeg',
              data: match ? match[2] : img
            }
          };
        });
        if (m.content?.trim()) content.push({ type: 'text', text: m.content });
        return { role, content };
      }
      return { role, content: m.content };
    });

    // 合并相邻同 role 消息，避免 Anthropic 报 "roles must alternate" 错误
    const mergedMsgs: { role: string; content: any }[] = [];
    for (const msg of nonSystemMsgs) {
      const last = mergedMsgs[mergedMsgs.length - 1];
      if (last && last.role === msg.role) {
        if (typeof last.content === 'string' && typeof msg.content === 'string') {
          last.content += '\n' + msg.content;
        } else {
          // 数组内容：追加
          const lastArr = Array.isArray(last.content) ? last.content : [{ type: 'text', text: last.content }];
          const msgArr = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }];
          last.content = [...lastArr, ...msgArr];
        }
      } else {
        mergedMsgs.push({ ...msg });
      }
    }

    const fetchBody: any = {
      model: provider.model,
      ...(systemMsg ? { system: systemMsg } : {}),
      messages: prefill ? [...mergedMsgs, { role: 'assistant', content: prefill }] : mergedMsgs,
      max_tokens: provider.maxTokens || 8192,
      ...(stopSequences && stopSequences.length > 0 && { stop_sequences: stopSequences }),
      stream: isStreaming,
      temperature: provider.temperature ?? 0.7,
    };

    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(fetchBody),
      signal
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`[Anthropic] HTTP ${response.status}${err?.error?.message ? ': ' + err.error.message : ''}`);
    }

    if (isStreaming) {
      return new Promise((resolve, reject) => {
        processChatStream(response, {
          onChunk: (chunk) => onChunk?.(chunk),
          onFinish: (fullText, toolCalls, usage) => resolve({ content: fullText, toolCalls: toolCalls ?? undefined, usage }),
          onError: (err) => reject(err)
        }, 'anthropic');
      });
    } else {
      const data = await response.json();
      return {
        content: data.content?.[0]?.text ?? '',
        usage: data.usage
      };
    }
  }
}
