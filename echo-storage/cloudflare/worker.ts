import type { Env } from './env'

const MAX_BODY_BYTES = 20 * 1024 * 1024 // 20MB
const MAX_VALUE_BYTES = 10 * 1024 * 1024 // 10MB (Cloudflare KV free limit)

function auth(req: Request, env: Env): boolean {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !env.AUTH_TOKEN) return false
  return authHeader === `Bearer ${env.AUTH_TOKEN}`
}

function validateKey(key: string): void {
  if (!key || key.length === 0 || key.length > 256) {
    throw new Error('Invalid key: must be 1-256 characters')
  }
}

function json(data: unknown, status = 200, allowedOrigin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    },
  })
}

async function parseBody<T>(req: Request): Promise<T | null> {
  try {
    const contentLength = Number(req.headers.get('content-length') ?? 0)
    if (contentLength > MAX_BODY_BYTES) return null
    return await req.json() as T
  } catch {
    return null
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    // 非 /api 路径交给 Workers Assets（前端静态文件 + SPA fallback）
    if (!url.pathname.startsWith('/api')) {
      if (env.ASSETS) return env.ASSETS.fetch(req)
      return new Response('Not Found', { status: 404 })
    }

    const origin = env.ALLOWED_ORIGIN || '*'

    if (req.method === 'OPTIONS') return json(null, 204, origin)

    const [, , resource, rawId] = url.pathname.split('/')

    try {
      // ── /api/auth（無需鑒權，驗證密碼後返回 token）────────────────────────
      if (resource === 'auth') {
        if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405, origin)
        if (!env.AUTH_TOKEN) return json({ error: 'Server misconfigured: AUTH_TOKEN not set' }, 500, origin)
        const body = await parseBody<{ password: string }>(req)
        if (!body || body.password !== env.AUTH_TOKEN) return json({ error: 'Invalid password' }, 401, origin)
        return json({ token: env.AUTH_TOKEN }, 200, origin)
      }

      if (!auth(req, env)) return json({ error: 'Unauthorized' }, 401, origin)

      // ── /api/ping ──────────────────────────────────────────────────────────
      if (resource === 'ping') return json({ ok: true }, 200, origin)

      if (!rawId) return json({ error: 'Missing resource id' }, 400, origin)
      const id = decodeURIComponent(rawId)
      validateKey(id)
      
      if (resource === 'storage') {
        if (req.method === 'GET') {
          const value = await env.ECHO_KV.get(id)
          return json({ value }, 200, origin)
        }
        if (req.method === 'PUT') {
          const contentType = req.headers.get('content-type') || ''
          let value: string

          if (contentType.includes('application/json')) {
            const body = await parseBody<{ value: string }>(req)
            if (!body || typeof body.value !== 'string') return json({ error: 'Invalid body' }, 400, origin)
            value = body.value
          } else {
            value = await req.text()
          }
          
          const sizeBytes = new TextEncoder().encode(value).length
          if (sizeBytes > MAX_VALUE_BYTES) {
            return json({ error: `Value too large (${(sizeBytes / 1024 / 1024).toFixed(2)}MB, max 10MB)` }, 413, origin)
          }

          if (!env.ECHO_KV) return json({ error: 'Server misconfigured: ECHO_KV not bound' }, 500, origin)
          await env.ECHO_KV.put(id, value)
          return json({ ok: true }, 200, origin)
        }
        if (req.method === 'DELETE') {
          await env.ECHO_KV.delete(id)
          return json({ ok: true }, 200, origin)
        }
        return json({ error: 'Method Not Allowed' }, 405, origin)
      }

      // ── D1: /api/images/:id ──────────────────────────────────────────────
      if (resource === 'images') {
        if (req.method === 'GET') {
          const row = await env.ECHO_DB.prepare('SELECT base64 FROM images WHERE id = ?').bind(id).first<{ base64: string }>()
          return json({ base64: row?.base64 ?? null }, 200, origin)
        }
        if (req.method === 'PUT') {
          const body = await parseBody<{ base64: string }>(req)
          if (!body || typeof body.base64 !== 'string') return json({ error: 'Invalid body' }, 400, origin)
          if (body.base64.length > MAX_VALUE_BYTES) return json({ error: 'Image too large (max 5MB)' }, 413, origin)
          await env.ECHO_DB.prepare(
            'INSERT INTO images (id, base64) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET base64 = excluded.base64'
          ).bind(id, body.base64).run()
          return json({ ok: true }, 200, origin)
        }
        if (req.method === 'DELETE') {
          await env.ECHO_DB.prepare('DELETE FROM images WHERE id = ?').bind(id).run()
          return json({ ok: true }, 200, origin)
        }
        return json({ error: 'Method Not Allowed' }, 405, origin)
      }

      return json({ error: 'Not Found' }, 404, origin)
    } catch (err) {
      console.error('[echo-storage] Error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      return json({ error: 'Internal Server Error', message: msg }, 500, origin)
    }
  },
}
