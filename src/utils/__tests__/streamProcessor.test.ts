import { describe, it, expect, vi } from 'vitest';
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
    const chunks: string[] = [];
    let finished = '';
    await processChatStream(new Response(makeStream(lines)), {
      onChunk: (c) => chunks.push(c),
      onFinish: (full) => { finished = full; },
      onError: (e) => { throw e; },
    });
    expect(chunks).toEqual(['Hello', ' world']);
    expect(finished).toBe('Hello world');
  });

  it('does not throw when [DONE] is received', async () => {
    await expect(processChatStream(new Response(makeStream(['data: [DONE]\n\n'])), {
      onChunk: vi.fn(), onFinish: vi.fn(), onError: (e) => { throw e; },
    })).resolves.not.toThrow();
  });

  it('collects tool_calls across delta chunks', async () => {
    const lines = [
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"tc1","type":"function","function":{"name":"my_tool","arguments":""}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"k\\":"}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"v\\"}"}}]}}]}\n\n',
      'data: [DONE]\n\n',
    ];
    let toolCalls: any;
    await processChatStream(new Response(makeStream(lines)), {
      onChunk: vi.fn(),
      onFinish: (_, tc) => { toolCalls = tc; },
      onError: (e) => { throw e; },
    });
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].function.name).toBe('my_tool');
    expect(toolCalls[0].function.arguments).toBe('{"k":"v"}');
  });

  it('calls onError when response body is null', async () => {
    const onError = vi.fn();
    await processChatStream({ body: null } as unknown as Response, { onChunk: vi.fn(), onFinish: vi.fn(), onError });
    expect(onError).toHaveBeenCalledWith('Response body is null');
  });

  // ── Anthropic format ──────────────────────────────────────────────────────
  it('parses Anthropic SSE and triggers onFinish on message_stop', async () => {
    const lines = [
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" there"}}\n\n',
      'data: {"type":"message_stop"}\n\n',
    ];
    let finished = '';
    await processChatStream(new Response(makeStream(lines)), {
      onChunk: vi.fn(),
      onFinish: (full) => { finished = full; },
      onError: (e) => { throw e; },
    }, 'anthropic');
    expect(finished).toBe('Hi there');
  });

  // ── Buffer residual ───────────────────────────────────────────────────────
  it('handles last chunk without trailing newline', async () => {
    // Simulate stream ending without a final \n after [DONE]
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"end"}}]}\n\ndata: [DONE]'));
        controller.close();
      }
    });
    const chunks: string[] = [];
    await processChatStream(new Response(stream), {
      onChunk: (c) => chunks.push(c),
      onFinish: vi.fn(),
      onError: (e) => { throw e; },
    });
    expect(chunks).toContain('end');
  });
});
