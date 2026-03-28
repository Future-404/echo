import type { StorageAdapter } from '../types'

export function createRemoteAdapter(baseUrl: string, token: string): StorageAdapter {
  const base = baseUrl.replace(/\/+$/, '') // 空字符串時走相對路徑 /api/...
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }

  // 写入队列：同一 key 的写入/删除串行化，防止乱序覆盖
  const writeQueues = new Map<string, Promise<void>>()

  async function req(method: string, path: string, body?: unknown): Promise<Response> {
    const isRaw = typeof body === 'string'
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { ...headers, ...(isRaw ? { 'Content-Type': 'text/plain' } : {}) },
      body: isRaw ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    })
    if (!res.ok) throw new Error(`Storage ${res.status}: ${path}`)
    return res
  }

  async function safeJson<T>(res: Response): Promise<T> {
    try {
      return await res.json() as T
    } catch {
      throw new Error('Storage API: invalid JSON response')
    }
  }

  function enqueue(key: string, fn: () => Promise<void>) {
    const prev = writeQueues.get(key) ?? Promise.resolve()
    const next = prev.then(fn).catch(() => {}) // 失败不阻断队列
    writeQueues.set(key, next)
    next.then(() => { if (writeQueues.get(key) === next) writeQueues.delete(key) })
    return next
  }

  return {
    getItem: async (key) => {
      const res = await req('GET', `/api/storage/${encodeURIComponent(key)}`)
      const data = await safeJson<{ value: string | null }>(res)
      return data.value ?? null
    },
    setItem: (key, value) => enqueue(key, async () => {
      await req('PUT', `/api/storage/${encodeURIComponent(key)}`, value)
    }),
    removeItem: (key) => enqueue(key, async () => {
      await req('DELETE', `/api/storage/${encodeURIComponent(key)}`)
    }),

    saveImage: async (id, base64) => {
      await req('PUT', `/api/images/${encodeURIComponent(id)}`, { base64 })
    },
    getImage: async (id) => {
      const res = await req('GET', `/api/images/${encodeURIComponent(id)}`)
      const data = await safeJson<{ base64: string | null }>(res)
      return data.base64 ?? null
    },
    removeImage: async (id) => {
      await req('DELETE', `/api/images/${encodeURIComponent(id)}`)
    },
  }
}
