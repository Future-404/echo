import { describe, it, expect, vi } from 'vitest'
import { processChatStream } from './streamProcessor'

describe('streamProcessor (流处理器) 测试', () => {
  it('应该能正确处理 OpenAI 格式的文本流', async () => {
    const mockOnChunk = vi.fn()
    const mockOnFinish = vi.fn()
    const mockOnError = vi.fn()

    // 模拟 OpenAI 响应流
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'))
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":" World"}}]}\n\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    })

    const response = {
      body: stream
    } as unknown as Response

    await processChatStream(response, {
      onChunk: mockOnChunk,
      onFinish: mockOnFinish,
      onError: mockOnError
    }, 'openai')

    expect(mockOnChunk).toHaveBeenCalledTimes(2)
    expect(mockOnChunk).toHaveBeenNthCalledWith(1, 'Hello')
    expect(mockOnChunk).toHaveBeenNthCalledWith(2, ' World')
    expect(mockOnFinish).toHaveBeenCalledWith('Hello World', undefined)
    expect(mockOnError).not.toHaveBeenCalled()
  })

  it('应该能处理 SSE 碎片 (Chunked Buffers)', async () => {
    const mockOnChunk = vi.fn()
    const mockOnFinish = vi.fn()

    // 模拟一个被切断的 JSON 行
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"con'))
        controller.enqueue(encoder.encode('tent":"Hello"}}]}\n\ndata: [DONE]\n\n'))
        controller.close()
      }
    })

    const response = { body: stream } as unknown as Response

    await processChatStream(response, {
      onChunk: mockOnChunk,
      onFinish: mockOnFinish,
      onError: vi.fn()
    }, 'openai')

    expect(mockOnChunk).toHaveBeenCalledWith('Hello')
    expect(mockOnFinish).toHaveBeenCalledWith('Hello', undefined)
  })

  it('应该能提取 Anthropic 格式的 Tool Calls', async () => {
    const mockOnFinish = vi.fn()

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        controller.enqueue(encoder.encode('data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tc1","name":"get_weather"}}\n\n'))
        controller.enqueue(encoder.encode('data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"city\\":\\"Sha"}} \n\n'))
        controller.enqueue(encoder.encode('data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"nghai\\"}"}}\n\n'))
        controller.close()
      }
    })

    const response = { body: stream } as unknown as Response

    await processChatStream(response, {
      onChunk: vi.fn(),
      onFinish: mockOnFinish,
      onError: vi.fn()
    }, 'anthropic')

    expect(mockOnFinish).toHaveBeenCalledWith('', [
      expect.objectContaining({
        id: 'tc1',
        function: { name: 'get_weather', arguments: '{"city":"Shanghai"}' }
      })
    ])
  })
})
