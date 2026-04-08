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
