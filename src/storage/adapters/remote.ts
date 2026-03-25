import type { StorageAdapter } from '../types'

export function createRemoteAdapter(baseUrl: string, token: string): StorageAdapter {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }

  // 写入队列：同一 key 的写入串行化，防止乱序覆盖
  const writeQueues = new Map<string, Promise<void>>()

  async function req(method: string, path: string, body?: unknown, retries = 2): Promise<Response> {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) throw new Error(`Storage API error: ${res.status}`)
      return res
    } catch (err) {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, 300))
        return req(method, path, body, retries - 1)
      }
      throw err
    }
  }

  function enqueue(key: string, fn: () => Promise<void>) {
    const prev = writeQueues.get(key) ?? Promise.resolve()
    const next = prev.then(fn).catch(() => {}) // 失败不阻断队列
    writeQueues.set(key, next)
    // 队列完成后清理，避免内存泄漏
    next.then(() => { if (writeQueues.get(key) === next) writeQueues.delete(key) })
    return next
  }

  return {
    getItem: async (key) => {
      const res = await req('GET', `/api/storage/${encodeURIComponent(key)}`)
      const data = await res.json()
      return data.value ?? null
    },
    setItem: (key, value) => enqueue(key, async () => {
      await req('PUT', `/api/storage/${encodeURIComponent(key)}`, { value })
    }),
    removeItem: async (key) => {
      await req('DELETE', `/api/storage/${encodeURIComponent(key)}`)
    },

    saveImage: async (id, base64) => {
      await req('PUT', `/api/images/${encodeURIComponent(id)}`, { base64 })
    },
    getImage: async (id) => {
      const res = await req('GET', `/api/images/${encodeURIComponent(id)}`)
      const data = await res.json()
      return data.base64 ?? null
    },
    removeImage: async (id) => {
      await req('DELETE', `/api/images/${encodeURIComponent(id)}`)
    },
  }
}
