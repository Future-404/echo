import type { IChatProvider, ChatRequestOptions, ChatResponse } from './base';
import { processChatStream } from '../../utils/streamProcessor';

export class GeminiProvider implements IChatProvider {
  async request(options: ChatRequestOptions): Promise<ChatResponse> {
    const { messages, provider, stopSequences, prefill, isStreaming, onChunk, signal } = options;

    const base = provider.endpoint.replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
    const suffix = isStreaming ? 'streamGenerateContent?alt=sse&' : 'generateContent?';
    const fetchUrl = `${base}/models/${provider.model}:${suffix}key=${provider.apiKey}`;

    const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (provider.customHeaders) {
      try {
        const extraHeaders = JSON.parse(provider.customHeaders);
        fetchHeaders = { ...fetchHeaders, ...extraHeaders };
      } catch (e) { console.error('Failed to parse custom headers:', e) }
    }

    const systemMsg = messages.find(m => m.role === 'system')?.content || '';

    const rawContents = messages.filter(m => m.role !== 'system').map(m => {
      const parts: Array<Record<string, unknown>> = [];
      if (m.images && m.images.length > 0) {
        m.images.forEach((img: string) => {
          const match = img.match(/^data:(image\/\w+);base64,(.*)$/);
          if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        });
      }
      if (m.content?.trim() || parts.length === 0) {
        parts.push({ text: m.content || ' ' });
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });

    // Gemini 要求 user/model 严格交替，合并相邻同 role 消息
    const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];
    for (const msg of rawContents) {
      const last = contents[contents.length - 1];
      if (last && last.role === msg.role) {
        last.parts.push(...msg.parts);
      } else {
        contents.push({ ...msg, parts: [...msg.parts] });
      }
    }

    if (prefill) {
      contents.push({ role: 'model', parts: [{ text: prefill }] });
    }

    const fetchBody: Record<string, unknown> = {
      contents,
      ...(systemMsg ? { system_instruction: { parts: [{ text: systemMsg }] } } : {}),
      generationConfig: {
        temperature: provider.temperature ?? 0.7,
        topP: provider.topP ?? 1.0,
        maxOutputTokens: provider.maxTokens || 8192,
        ...(provider.frequencyPenalty != null && provider.frequencyPenalty !== 0 && { frequencyPenalty: provider.frequencyPenalty }),
        ...(provider.presencePenalty != null && provider.presencePenalty !== 0 && { presencePenalty: provider.presencePenalty }),
        ...(stopSequences && stopSequences.length > 0 ? { stopSequences } : {}),
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
          onFinish: (fullText, toolCalls, usage) => resolve({ content: fullText, toolCalls: toolCalls ?? undefined, usage }),
          onError: (err) => reject(err)
        }, 'gemini');
      });
    } else {
      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const usage = data.usageMetadata ? {
        prompt_tokens: data.usageMetadata.promptTokenCount,
        completion_tokens: data.usageMetadata.candidatesTokenCount,
        total_tokens: data.usageMetadata.totalTokenCount
      } : undefined;
      return { content, usage };
    }
  }
}
