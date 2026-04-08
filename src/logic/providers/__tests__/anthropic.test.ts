import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../anthropic';
import { createMockProvider, createMockMessage } from '../../../__tests__/factories';

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider();
    vi.clearAllMocks();
  });

  const mockOk = (content: string) =>
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: content }], usage: { input_tokens: 5, output_tokens: 3 } })
    });

  it('builds correct URL from plain endpoint', async () => {
    const fetch = mockOk('hi');
    global.fetch = fetch;
    await provider.request({ messages: [], provider: createMockProvider({ apiFormat: 'anthropic', endpoint: 'https://api.anthropic.com/v1' }), isStreaming: false });
    expect(fetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
  });

  it('strips trailing slash from endpoint', async () => {
    const fetch = mockOk('hi');
    global.fetch = fetch;
    await provider.request({ messages: [], provider: createMockProvider({ apiFormat: 'anthropic', endpoint: 'https://api.anthropic.com/v1/' }), isStreaming: false });
    expect(fetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
  });

  it('strips /chat/completions suffix from endpoint', async () => {
    const fetch = mockOk('hi');
    global.fetch = fetch;
    await provider.request({ messages: [], provider: createMockProvider({ apiFormat: 'anthropic', endpoint: 'https://api.anthropic.com/v1/chat/completions' }), isStreaming: false });
    expect(fetch.mock.calls[0][0]).toBe('https://api.anthropic.com/v1/messages');
  });

  it('merges consecutive same-role messages', async () => {
    const fetch = mockOk('ok');
    global.fetch = fetch;
    const messages = [
      createMockMessage({ role: 'user', content: 'Hello' }),
      createMockMessage({ role: 'user', content: 'World' }),
      createMockMessage({ role: 'assistant', content: 'Hi' }),
    ];
    await provider.request({ messages, provider: createMockProvider({ apiFormat: 'anthropic' }), isStreaming: false });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.messages[0].role).toBe('user');
    expect(body.messages[0].content).toContain('Hello');
    expect(body.messages[0].content).toContain('World');
    expect(body.messages).toHaveLength(2);
  });

  it('omits system field when no system message', async () => {
    const fetch = mockOk('ok');
    global.fetch = fetch;
    await provider.request({ messages: [createMockMessage({ role: 'user' })], provider: createMockProvider({ apiFormat: 'anthropic' }), isStreaming: false });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.system).toBeUndefined();
  });

  it('uses provider.maxTokens when set', async () => {
    const fetch = mockOk('ok');
    global.fetch = fetch;
    await provider.request({ messages: [], provider: createMockProvider({ apiFormat: 'anthropic', maxTokens: 4096 }), isStreaming: false });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(4096);
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: () => Promise.resolve({ error: { message: 'Unauthorized' } }) });
    await expect(provider.request({ messages: [], provider: createMockProvider({ apiFormat: 'anthropic' }), isStreaming: false })).rejects.toThrow('HTTP 401');
  });
});
