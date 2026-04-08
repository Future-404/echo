import type { IChatProvider, ChatRequestOptions, ChatResponse } from './base';
import { processChatStream } from '../../utils/streamProcessor';

export class GeminiProvider implements IChatProvider {
  async request(options: ChatRequestOptions): Promise<ChatResponse> {
    const { messages, provider, stopSequences, prefill, isStreaming, onChunk, signal } = options;

    const isStreamSuffix = isStreaming ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
    const fetchUrl = `${provider.endpoint.replace(/\/chat\/completions$/, '')}/models/${provider.model}:${isStreamSuffix}key=${provider.apiKey}`;
    let fetchHeaders: any = { 'Content-Type': 'application/json' };
    
    if (provider.customHeaders) {
      try {
        const extraHeaders = JSON.parse(provider.customHeaders);
        fetchHeaders = { ...fetchHeaders, ...extraHeaders };
      } catch (e) { console.error('Failed to parse custom headers:', e) }
    }

    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const contents = messages.filter(m => m.role !== 'system').map(m => {
      const parts: any[] = [];
      if (m.images && m.images.length > 0) {
        m.images.forEach((img: string) => {
          const match = img.match(/^data:(image\/\w+);base64,(.*)$/);
          if (match) {
            parts.push({
              inlineData: { mimeType: match[1], data: match[2] }
            });
          }
        });
      }
      if (m.content?.trim() || parts.length === 0) {
        parts.push({ text: m.content || " " });
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    if (prefill) {
      contents.push({
        role: 'model',
        parts: [{ text: prefill }]
      })
    }

    const fetchBody = {
      contents,
      system_instruction: { parts: [{ text: systemMsg }] },
      generationConfig: {
        temperature: provider.temperature ?? 0.7,
        topP: provider.topP ?? 1.0,
        maxOutputTokens: 4096,
        stopSequences: (stopSequences && stopSequences.length > 0) ? stopSequences : undefined,
      }
    };

    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: fetchHeaders,
      body: JSON.stringify(fetchBody),
      signal
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`[Gemini] HTTP ${response.status}${err?.error?.message ? ': ' + err.error.message : ''}`);
    }

    if (isStreaming) {
      return new Promise((resolve, reject) => {
        processChatStream(response, {
          onChunk: (chunk) => onChunk?.(chunk),
          onFinish: (fullText, toolCalls, usage) => resolve({ content: fullText, toolCalls, usage }),
          onError: (err) => reject(err)
        }, 'gemini');
      });
    } else {
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usage = data.usageMetadata ? {
        prompt_tokens: data.usageMetadata.promptTokenCount,
        completion_tokens: data.usageMetadata.candidatesTokenCount,
        total_tokens: data.usageMetadata.totalTokenCount
      } : undefined;
      return { content, usage };
    }
  }
}
