import type { IChatProvider, ChatRequestOptions, ChatResponse } from './base';
import { processChatStream } from '../../utils/streamProcessor';

export class OpenAIProvider implements IChatProvider {
  async request(options: ChatRequestOptions): Promise<ChatResponse> {
    const { messages, provider, stopSequences, prefill, isStreaming, tools, onChunk, signal } = options;

    let fetchHeaders: any = { 
      'Content-Type': 'application/json', 
      'Authorization': `Bearer ${provider.apiKey}` 
    };
    
    if (provider.customHeaders) {
      try {
        const extraHeaders = JSON.parse(provider.customHeaders);
        fetchHeaders = { ...fetchHeaders, ...extraHeaders };
      } catch (e) { console.error('Failed to parse custom headers:', e) }
    }

    const mappedMessages = messages.map(m => {
      if (m.images && m.images.length > 0) {
        const content: any[] = m.images.map((img: string) => ({ type: 'image_url', image_url: { url: img } }));
        if (m.content?.trim()) {
          content.unshift({ type: 'text', text: m.content });
        }
        return { role: m.role, ...(m.name ? { name: m.name } : {}), content };
      }
      return { role: m.role, ...(m.name ? { name: m.name } : {}), content: m.content };
    });

    const body = {
      model: provider.model,
      messages: prefill ? [...mappedMessages, { role: 'assistant', content: prefill }] : mappedMessages,
      ...(tools && tools.length > 0 && { tools }),
      ...(stopSequences && stopSequences.length > 0 && { stop: stopSequences }),
      stream: isStreaming,
      ...(isStreaming && { stream_options: { "include_usage": true } }),
      temperature: provider.temperature ?? 0.7,
      ...(provider.topP != null && provider.topP !== 1.0 && { top_p: provider.topP }),
      ...(provider.frequencyPenalty != null && provider.frequencyPenalty !== 0 && { frequency_penalty: provider.frequencyPenalty }),
      ...(provider.presencePenalty != null && provider.presencePenalty !== 0 && { presence_penalty: provider.presencePenalty }),
    };

    const base = provider.endpoint.replace(/\/+$/, '');
    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`[OpenAI] HTTP ${response.status}${err?.error?.message ? ': ' + err.error.message : ''}`);
    }

    if (isStreaming) {
      return new Promise((resolve, reject) => {
        processChatStream(response, {
          onChunk: (chunk) => onChunk?.(chunk),
          onFinish: (fullText, toolCalls, usage) => resolve({ content: fullText, toolCalls: toolCalls ?? undefined, usage }),
          onError: (err) => reject(err)
        }, 'openai');
      });
    } else {
      const data = await response.json();
      return {
        content: data.choices?.[0]?.message?.content ?? '',
        toolCalls: data.choices?.[0]?.message?.tool_calls ?? undefined,
        usage: data.usage
      };
    }
  }
}
