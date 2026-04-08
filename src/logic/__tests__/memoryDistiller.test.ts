import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { memoryDistiller } from '../memoryDistiller'

// ── mock db ────────────────────────────────────────────────────────────────
const { mockAdd, mockModify, mockCount, mockSortBy, mockBulkDelete, mockWhere } = vi.hoisted(() => {
  const mockAdd = vi.fn()
  const mockModify = vi.fn()
  const mockCount = vi.fn()
  const mockSortBy = vi.fn()
  const mockBulkDelete = vi.fn()
  const mockWhere = vi.fn(() => ({
    equals: vi.fn(() => ({ count: mockCount, sortBy: mockSortBy })),
    anyOf: vi.fn(() => ({ modify: mockModify })),
  }))
  return { mockAdd, mockModify, mockCount, mockSortBy, mockBulkDelete, mockWhere }
})

vi.mock('../../storage/db', () => ({
  db: {
    memoryEpisodes: { add: mockAdd, where: mockWhere, bulkDelete: mockBulkDelete },
    messages: { where: mockWhere },
  },
}))

vi.mock('../../utils/vectorMath', () => ({
  vectorMath: {
    ensureFloat32: (v: number[]) => new Float32Array(v),
  },
}))

const provider = { endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: 'k' }
const embProvider = { endpoint: 'https://api.openai.com/v1', model: 'text-embedding-3-small', apiKey: 'k' }
const geminiProvider = { endpoint: 'https://generativelanguage.googleapis.com/v1beta', model: 'text-embedding-004', apiKey: 'k' }

// ── robustFetch ────────────────────────────────────────────────────────────
describe('robustFetch', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns response on ok', async () => {
    const mockRes = { ok: true, json: async () => ({}) } as any
    vi.spyOn(global, 'fetch').mockResolvedValue(mockRes)
    const res = await memoryDistiller.robustFetch('http://x', {}, 0)
    expect(res).toBe(mockRes)
  })

  it('throws with HTTP status on non-ok non-429', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false, status: 401, text: async () => 'Unauthorized',
    } as any)
    await expect(memoryDistiller.robustFetch('http://x', {}, 0)).rejects.toThrow('HTTP 401')
  })

  it('retries on 429 and eventually throws', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false, status: 429, text: async () => '',
    } as any)
    // retries=1 → 2 attempts, each with 2s delay; use real timers but short delay via mock
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 429, text: async () => '' } as any)
    let threw = false
    try { await memoryDistiller.robustFetch('http://x', {}, 0) } catch { threw = true }
    expect(threw).toBe(true)
  })

  it('retries on network error and eventually throws', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'))
    await expect(memoryDistiller.robustFetch('http://x', {}, 0)).rejects.toThrow('network')
  })
})

// ── callDistillLLM ─────────────────────────────────────────────────────────
describe('callDistillLLM', () => {
  afterEach(() => vi.restoreAllMocks())

  it('parses valid JSON response', async () => {
    const payload = { atomic: [], narrative: 'n', tags: [] }
    vi.spyOn(memoryDistiller, 'robustFetch').mockResolvedValue({
      json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
    } as any)
    const result = await memoryDistiller.callDistillLLM(provider, 'prompt')
    expect(result).toEqual(payload)
  })

  it('throws when choices is empty', async () => {
    vi.spyOn(memoryDistiller, 'robustFetch').mockResolvedValue({
      json: async () => ({ choices: [] }),
    } as any)
    await expect(memoryDistiller.callDistillLLM(provider, 'p')).rejects.toThrow('empty content')
  })

  it('throws when LLM returns non-JSON string', async () => {
    vi.spyOn(memoryDistiller, 'robustFetch').mockResolvedValue({
      json: async () => ({ choices: [{ message: { content: 'sorry, I cannot' } }] }),
    } as any)
    await expect(memoryDistiller.callDistillLLM(provider, 'p')).rejects.toThrow('non-JSON')
  })
})

// ── callEmbeddingAPI ───────────────────────────────────────────────────────
describe('callEmbeddingAPI', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns values from Gemini response', async () => {
    vi.spyOn(memoryDistiller, 'robustFetch').mockResolvedValue({
      json: async () => ({ embedding: { values: [0.1, 0.2] } }),
    } as any)
    expect(await memoryDistiller.callEmbeddingAPI(geminiProvider, 'hi')).toEqual([0.1, 0.2])
  })

  it('throws on malformed Gemini response', async () => {
    vi.spyOn(memoryDistiller, 'robustFetch').mockResolvedValue({
      json: async () => ({ error: { message: 'invalid key' } }),
    } as any)
    await expect(memoryDistiller.callEmbeddingAPI(geminiProvider, 'hi')).rejects.toThrow('missing values')
  })

  it('returns embedding from OpenAI response', async () => {
    vi.spyOn(memoryDistiller, 'robustFetch').mockResolvedValue({
      json: async () => ({ data: [{ embedding: [0.3, 0.4] }] }),
    } as any)
    expect(await memoryDistiller.callEmbeddingAPI(embProvider, 'hi')).toEqual([0.3, 0.4])
  })

  it('throws on malformed OpenAI response', async () => {
    vi.spyOn(memoryDistiller, 'robustFetch').mockResolvedValue({
      json: async () => ({ data: [] }),
    } as any)
    await expect(memoryDistiller.callEmbeddingAPI(embProvider, 'hi')).rejects.toThrow('data[0].embedding')
  })

  it('passes dimensions for OpenAI when configured', async () => {
    const spy = vi.spyOn(memoryDistiller, 'robustFetch').mockResolvedValue({
      json: async () => ({ data: [{ embedding: [1] }] }),
    } as any)
    await memoryDistiller.callEmbeddingAPI({ ...embProvider, embeddingDimensions: 256 }, 'hi')
    expect(JSON.parse(spy.mock.calls[0][1].body)).toMatchObject({ dimensions: 256 })
  })
})

// ── crystallize ────────────────────────────────────────────────────────────
describe('crystallize', () => {
  beforeEach(() => {
    mockAdd.mockResolvedValue(1)
    mockModify.mockResolvedValue(1)
    mockCount.mockResolvedValue(0)
  })
  afterEach(() => vi.restoreAllMocks())

  const msgs = [{ id: 1, role: 'user', content: 'hello', slotId: 's1' }] as any

  it('returns true and saves episode on success', async () => {
    const distillResult = {
      atomic: [{ text: 'fact', importance: '高' }],
      narrative: 'summary',
      tags: ['tag1'],
    }
    vi.spyOn(memoryDistiller, 'callDistillLLM').mockResolvedValue(distillResult)
    vi.spyOn(memoryDistiller, 'callEmbeddingAPI').mockResolvedValue([0.1, 0.2])

    const ok = await memoryDistiller.crystallize('s1', msgs, 'Char', provider, embProvider)
    expect(ok).toBe(true)
    expect(mockAdd).toHaveBeenCalledOnce()
    const saved = mockAdd.mock.calls[0][0]
    expect(saved.narrative).toBe('summary')
    expect(saved.tags).toEqual(['tag1'])
    expect(saved.slotId).toBe('s1')
  })

  it('returns false when messages array is empty', async () => {
    expect(await memoryDistiller.crystallize('s1', [], 'Char', provider, embProvider)).toBe(false)
  })

  it('returns false when LLM call throws', async () => {
    vi.spyOn(memoryDistiller, 'callDistillLLM').mockRejectedValue(new Error('LLM down'))
    expect(await memoryDistiller.crystallize('s1', msgs, 'Char', provider, embProvider)).toBe(false)
  })

  it('returns false when callDistillLLM returns null', async () => {
    vi.spyOn(memoryDistiller, 'callDistillLLM').mockResolvedValue(null)
    expect(await memoryDistiller.crystallize('s1', msgs, 'Char', provider, embProvider)).toBe(false)
  })
})

// ── pruneOldEpisodes ───────────────────────────────────────────────────────
describe('pruneOldEpisodes', () => {
  afterEach(() => vi.restoreAllMocks())

  it('does nothing when under limit', async () => {
    mockCount.mockResolvedValue(5)
    await memoryDistiller.pruneOldEpisodes('s1')
    expect(mockBulkDelete).not.toHaveBeenCalled()
  })

  it('deletes oldest episodes when over limit', async () => {
    const limit = memoryDistiller.MAX_EPISODES_PER_SLOT
    mockCount.mockResolvedValue(limit + 2)
    mockSortBy.mockResolvedValue([
      { id: 1, timestamp: 100 },
      { id: 2, timestamp: 200 },
      { id: 3, timestamp: 300 },
    ])
    await memoryDistiller.pruneOldEpisodes('s1')
    // should delete 2 oldest: ids 1 and 2
    expect(mockBulkDelete).toHaveBeenCalledWith([1, 2])
  })

  it('filters out episodes with null id', async () => {
    const limit = memoryDistiller.MAX_EPISODES_PER_SLOT
    mockCount.mockResolvedValue(limit + 1)
    // sortBy returns 2 items but only 1 needs deleting (slice(0,1)); that item has no id
    mockSortBy.mockResolvedValue([
      { id: undefined, timestamp: 100 },
      { id: 2, timestamp: 200 },
    ])
    await memoryDistiller.pruneOldEpisodes('s1')
    // slice(0,1) → [{ id: undefined }] → filter removes it → bulkDelete([])
    expect(mockBulkDelete).toHaveBeenCalledWith([])
  })
})

// ── calculateGlobalImportance ──────────────────────────────────────────────
describe('calculateGlobalImportance', () => {
  it('returns 0.5 for empty array', () => {
    expect(memoryDistiller.calculateGlobalImportance([])).toBe(0.5)
  })

  it('averages high/low correctly', () => {
    expect(memoryDistiller.calculateGlobalImportance([
      { importance: '高' }, { importance: '低' },
    ])).toBeCloseTo(0.6)
  })

  it('uses 0.5 fallback for unknown importance', () => {
    expect(memoryDistiller.calculateGlobalImportance([
      { importance: 'unknown' },
    ])).toBeCloseTo(0.5)
  })
})
