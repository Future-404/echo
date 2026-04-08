import type { IChatProvider, ChatRequestOptions, ChatResponse } from './base';
import { processChatStream } from '../../utils/streamProcessor';

export class AnthropicProvider implements IChatProvider {
  async request(options: ChatRequestOptions): Promise<ChatResponse> {
    const { messages, provider, stopSequences, prefill, isStreaming, onChunk, signal } = options;

    const fetchUrl = `${provider.endpoint.replace(/\/chat\/completions$/, '')}/messages`;
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
    const nonSystemMsgs = messages.filter(m => m.role !== 'system').map(m => {
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
        if (m.content?.trim()) {
          content.push({ type: 'text', text: m.content });
        }
        return { role: m.role === 'assistant' ? 'assistant' : 'user', content };
      }
      return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
    });

    const fetchBody = {
      model: provider.model,
      system: systemMsg,
      messages: prefill ? [...nonSystemMsgs, { role: 'assistant', content: prefill }] : nonSystemMsgs,
      max_tokens: 4096,
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
          onFinish: (fullText, toolCalls, usage) => resolve({ content: fullText, toolCalls, usage }),
          onError: (err) => reject(err)
        }, 'anthropic');
      });
    } else {
      const data = await response.json();
      return {
        content: data.content?.[0]?.text || '',
        usage: data.usage
      };
    }
  }
}
