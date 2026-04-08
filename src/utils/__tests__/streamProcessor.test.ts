import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── streamProcessor ──────────────────────────────────────────────────────────
import { processChatStream } from '../streamProcessor';

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe('streamProcessor', () => {
  it('parses OpenAI SSE chunks and calls onChunk', async () => {
    const lines = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    const response = new Response(makeStream(lines));
    const chunks: string[] = [];
    let finished = '';

    await processChatStream(response, {
      onChunk: (c) => chunks.push(c),
      onFinish: (full) => { finished = full; },
      onError: (e) => { throw e; },
    });

    expect(chunks).toEqual(['Hello', ' world']);
    expect(finished).toBe('Hello world');
  });

  it('does not throw when [DONE] is received (no double releaseLock)', async () => {
    const lines = ['data: [DONE]\n\n'];
    const response = new Response(makeStream(lines));
    await expect(
      processChatStream(response, {
        onChunk: vi.fn(),
        onFinish: vi.fn(),
        onError: (e) => { throw e; },
      })
    ).resolves.not.toThrow();
  });

  it('collects tool_calls across delta chunks', async () => {
    const lines = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"tc1","type":"function","function":{"name":"my_tool","arguments":""}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"k\\":"}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"v\\"}"}}]}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    const response = new Response(makeStream(lines));
    let toolCalls: any;

    await processChatStream(response, {
      onChunk: vi.fn(),
      onFinish: (_, tc) => { toolCalls = tc; },
      onError: (e) => { throw e; },
    });

    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].function.name).toBe('my_tool');
    expect(toolCalls[0].function.arguments).toBe('{"k":"v"}');
  });

  it('calls onError when response body is null', async () => {
    const response = { body: null } as unknown as Response;
    const onError = vi.fn();
    await processChatStream(response, { onChunk: vi.fn(), onFinish: vi.fn(), onError });
    expect(onError).toHaveBeenCalledWith('Response body is null');
  });
});
