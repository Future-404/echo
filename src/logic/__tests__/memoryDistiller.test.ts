import { describe, it, expect, vi } from 'vitest'
import { memoryDistiller } from '../memoryDistiller'

describe('memoryDistiller.callEmbeddingAPI', () => {
  it('uses Gemini endpoint for generativelanguage.googleapis URLs', async () => {
    const fetchSpy = vi.spyOn(memoryDistiller, 'robustFetch').mockResolvedValue({
      json: async () => ({ embedding: { values: [0.1, 0.2] } }),
    } as any)

    const provider = {
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'text-embedding-004',
      apiKey: 'key',
    }
    const result = await memoryDistiller.callEmbeddingAPI(provider, 'hello')

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis'),
      expect.any(Object)
    )
    expect(result).toEqual([0.1, 0.2])
    fetchSpy.mockRestore()
  })

  it('uses OpenAI-compatible endpoint for non-Gemini URLs', async () => {
    const fetchSpy = vi.spyOn(memoryDistiller, 'robustFetch').mockResolvedValue({
      json: async () => ({ data: [{ embedding: [0.3, 0.4] }] }),
    } as any)

    const provider = {
      endpoint: 'https://api.openai.com/v1',
      model: 'text-embedding-3-small', // no 'embedding' keyword that triggers Gemini path
      apiKey: 'key',
      embeddingDimensions: 512,
    }
    const result = await memoryDistiller.callEmbeddingAPI(provider, 'hello')

    const [url, opts] = fetchSpy.mock.calls[0]
    expect(url).toContain('/embeddings')
    expect(JSON.parse(opts.body)).toMatchObject({ dimensions: 512 })
    expect(result).toEqual([0.3, 0.4])
    fetchSpy.mockRestore()
  })

  it('calculateGlobalImportance averages correctly', () => {
    const atomic = [
      { importance: '高' },
      { importance: '低' },
    ]
    // (1.0 + 0.2) / 2 = 0.6
    expect(memoryDistiller.calculateGlobalImportance(atomic)).toBeCloseTo(0.6)
  })
})
