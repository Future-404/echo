import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiProvider } from '../gemini';
import { createMockProvider, createMockMessage } from '../../../__tests__/factories';

describe('GeminiProvider', () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    provider = new GeminiProvider();
    vi.clearAllMocks();
  });

  const mockOk = (text = 'hello') =>
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text }] } }] })
    });

  it('builds correct non-streaming URL', async () => {
    const fetch = mockOk();
    global.fetch = fetch;
    await provider.request({ messages: [], provider: createMockProvider({ apiFormat: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-1.5-flash', apiKey: 'key123' }), isStreaming: false });
    expect(fetch.mock.calls[0][0]).toContain('generateContent?key=key123');
    expect(fetch.mock.calls[0][0]).toContain('gemini-1.5-flash');
  });

  it('strips trailing slash from endpoint', async () => {
    const fetch = mockOk();
    global.fetch = fetch;
    await provider.request({ messages: [], provider: createMockProvider({ apiFormat: 'gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/', model: 'gemini-pro', apiKey: 'k' }), isStreaming: false });
    expect(fetch.mock.calls[0][0]).not.toContain('//models');
  });

  it('merges consecutive same-role messages', async () => {
    const fetch = mockOk();
    global.fetch = fetch;
    const messages = [
      createMockMessage({ role: 'user', content: 'A' }),
      createMockMessage({ role: 'user', content: 'B' }),
      createMockMessage({ role: 'assistant', content: 'C' }),
    ];
    await provider.request({ messages, provider: createMockProvider({ apiFormat: 'gemini', model: 'gemini-pro', apiKey: 'k' }), isStreaming: false });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.contents[0].role).toBe('user');
    expect(body.contents[0].parts).toHaveLength(2);
    expect(body.contents).toHaveLength(2);
  });

  it('omits system_instruction when no system message', async () => {
    const fetch = mockOk();
    global.fetch = fetch;
    await provider.request({ messages: [createMockMessage({ role: 'user' })], provider: createMockProvider({ apiFormat: 'gemini', model: 'gemini-pro', apiKey: 'k' }), isStreaming: false });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.system_instruction).toBeUndefined();
  });

  it('returns content from response', async () => {
    global.fetch = mockOk('Gemini says hi');
    const result = await provider.request({ messages: [], provider: createMockProvider({ apiFormat: 'gemini', model: 'gemini-pro', apiKey: 'k' }), isStreaming: false });
    expect(result.content).toBe('Gemini says hi');
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, json: () => Promise.resolve({ error: { message: 'Forbidden' } }) });
    await expect(provider.request({ messages: [], provider: createMockProvider({ apiFormat: 'gemini', model: 'gemini-pro', apiKey: 'k' }), isStreaming: false })).rejects.toThrow('HTTP 403');
  });

  it('sends frequencyPenalty and presencePenalty in generationConfig when non-zero', async () => {
    const fetch = mockOk();
    global.fetch = fetch;
    await provider.request({
      messages: [],
      provider: createMockProvider({ apiFormat: 'gemini', model: 'gemini-pro', apiKey: 'k', frequencyPenalty: 0.6, presencePenalty: 0.5 }),
      isStreaming: false
    });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.generationConfig.frequencyPenalty).toBe(0.6);
    expect(body.generationConfig.presencePenalty).toBe(0.5);
  });

  it('omits frequencyPenalty and presencePenalty when zero', async () => {
    const fetch = mockOk();
    global.fetch = fetch;
    await provider.request({
      messages: [],
      provider: createMockProvider({ apiFormat: 'gemini', model: 'gemini-pro', apiKey: 'k', frequencyPenalty: 0, presencePenalty: 0 }),
      isStreaming: false
    });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.generationConfig.frequencyPenalty).toBeUndefined();
    expect(body.generationConfig.presencePenalty).toBeUndefined();
  });
});
