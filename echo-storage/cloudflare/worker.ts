import type { Env } from './env'

const MAX_BODY_BYTES = 20 * 1024 * 1024 // 20MB

function auth(req: Request, env: Env): boolean {
  return req.headers.get('Authorization') === `Bearer ${env.AUTH_TOKEN}`
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
    const origin = env.ALLOWED_ORIGIN || '*'

    if (req.method === 'OPTIONS') return json(null, 204, origin)
    if (!auth(req, env)) return json({ error: 'Unauthorized' }, 401, origin)

    const url = new URL(req.url)
    const [, , resource, rawId] = url.pathname.split('/')

    try {
      // ── /api/ping ──────────────────────────────────────────────────────────
      if (resource === 'ping') return json({ ok: true }, 200, origin)

      if (!rawId) return json({ error: 'Missing resource id' }, 400, origin)
      const id = decodeURIComponent(rawId)
      if (resource === 'storage') {
        if (req.method === 'GET') {
          const value = await env.ECHO_KV.get(id)
          return json({ value }, 200, origin)
        }
        if (req.method === 'PUT') {
          const body = await parseBody<{ value: string }>(req)
          if (!body || typeof body.value !== 'string') return json({ error: 'Invalid body' }, 400, origin)
          await env.ECHO_KV.put(id, body.value)
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
      return json({ error: 'Internal Server Error' }, 500, origin)
    }
  },
}
