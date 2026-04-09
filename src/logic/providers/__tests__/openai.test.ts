import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIProvider } from '../openai';
import { createMockProvider, createMockMessage } from '../../../__tests__/factories';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider();
    vi.clearAllMocks();
  });

  it('should send a correctly formatted non-streaming request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Hello back!' } }],
        usage: { total_tokens: 10 }
      })
    });
    global.fetch = mockFetch;

    const options = {
      messages: [createMockMessage({ content: 'Hello' })],
      provider: createMockProvider(),
      isStreaming: false
    };

    const result = await provider.request(options);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/chat/completions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer sk-test-key'
        })
      })
    );
    
    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.messages[0].content).toBe('Hello');
    expect(result.content).toBe('Hello back!');
  });

  it('sends frequency_penalty and presence_penalty when non-zero', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }], usage: {} })
    });
    global.fetch = mockFetch;
    await provider.request({
      messages: [],
      provider: createMockProvider({ frequencyPenalty: 0.6, presencePenalty: 0.5 }),
      isStreaming: false
    });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.frequency_penalty).toBe(0.6);
    expect(body.presence_penalty).toBe(0.5);
  });

  it('omits frequency_penalty and presence_penalty when zero', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }], usage: {} })
    });
    global.fetch = mockFetch;
    await provider.request({
      messages: [],
      provider: createMockProvider({ frequencyPenalty: 0, presencePenalty: 0 }),
      isStreaming: false
    });
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.frequency_penalty).toBeUndefined();
    expect(body.presence_penalty).toBeUndefined();
  });

  it('should throw error when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Invalid Key' } })
    });

    const options = {
      messages: [],
      provider: createMockProvider(),
      isStreaming: false
    };

    await expect(provider.request(options)).rejects.toThrow('HTTP 401: Invalid Key');
  });
});
