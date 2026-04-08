import { describe, it, expect, beforeEach } from 'vitest'
import { DexieStorageAdapter } from '../adapters/local'

describe('DexieStorageAdapter LRU', () => {
  let adapter: DexieStorageAdapter

  beforeEach(() => {
    adapter = new DexieStorageAdapter()
    ;(adapter as any).MAX_CACHE_SIZE = 3
  })

  it('touch moves key to most-recently-used position', () => {
    ;(adapter as any).touch('a', 1)
    ;(adapter as any).touch('b', 2)
    ;(adapter as any).touch('c', 3)
    ;(adapter as any).touch('a', 1) // re-touch a → moves to end
    const keys = [...(adapter as any).cache.keys()]
    expect(keys).toEqual(['b', 'c', 'a'])
  })

  it('evicts LRU entry when over capacity', () => {
    ;(adapter as any).touch('a', 1)
    ;(adapter as any).touch('b', 2)
    ;(adapter as any).touch('c', 3)
    ;(adapter as any).touch('d', 4) // evicts 'a'
    const cache: Map<string, any> = (adapter as any).cache
    expect(cache.has('a')).toBe(false)
    expect(cache.size).toBe(3)
  })
})
