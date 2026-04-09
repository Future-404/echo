import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock speechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  value: { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] },
  writable: true,
})

// mock useAppStore
vi.mock('../../store/useAppStore', () => ({
  useAppStore: {
    getState: () => ({
      setActiveAudioId: vi.fn(),
      config: {
        providers: [
          {
            id: 'p1',
            apiKey: 'test-key',
            endpoint: 'https://api.openai.com/v1',
            model: 'tts-1',
            ttsVoice: 'nova',
            ttsFormat: 'opus',
          },
        ],
        modelConfig: { ttsProviderId: 'p1' },
      },
    }),
  },
}))

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

import { ttsService } from '../ttsService'

describe('ttsService OpenAI payload', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['audio'], { type: 'audio/mpeg' }),
    })
    // mock URL.createObjectURL / revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
    globalThis.URL.revokeObjectURL = vi.fn()
  })

  it('sends response_format from provider.ttsFormat', async () => {
    const settings = {
      enabled: true,
      provider: 'openai' as const,
      globalSettings: { speed: 1, pitch: 1 },
    }
    await ttsService.speak('hello', settings as any)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.response_format).toBe('opus')
    expect(body.voice).toBe('nova')
  })
})
