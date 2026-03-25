import type { Env } from './env'

function auth(req: Request, env: Env): boolean {
  return req.headers.get('Authorization') === `Bearer ${env.AUTH_TOKEN}`
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    },
  })
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (req.method === 'OPTIONS') return json(null, 204)

    if (!auth(req, env)) return json({ error: 'Unauthorized' }, 401)

    const url = new URL(req.url)
    const [, , resource, rawId] = url.pathname.split('/')  // /api/{resource}/{id}
    const id = rawId ? decodeURIComponent(rawId) : ''

    // ── KV: /api/storage/:key ──────────────────────────────────────────────
    if (resource === 'storage') {
      if (req.method === 'GET') {
        const value = await env.ECHO_KV.get(id)
        return json({ value })
      }
      if (req.method === 'PUT') {
        const { value } = await req.json<{ value: string }>()
        await env.ECHO_KV.put(id, value)
        return json({ ok: true })
      }
      if (req.method === 'DELETE') {
        await env.ECHO_KV.delete(id)
        return json({ ok: true })
      }
    }

    // ── D1: /api/images/:id ────────────────────────────────────────────────
    if (resource === 'images') {
      if (req.method === 'GET') {
        const row = await env.ECHO_DB.prepare('SELECT base64 FROM images WHERE id = ?').bind(id).first<{ base64: string }>()
        return json({ base64: row?.base64 ?? null })
      }
      if (req.method === 'PUT') {
        const { base64 } = await req.json<{ base64: string }>()
        await env.ECHO_DB.prepare('INSERT INTO images (id, base64) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET base64 = excluded.base64')
          .bind(id, base64).run()
        return json({ ok: true })
      }
      if (req.method === 'DELETE') {
        await env.ECHO_DB.prepare('DELETE FROM images WHERE id = ?').bind(id).run()
        return json({ ok: true })
      }
    }

    return json({ error: 'Not Found' }, 404)
  },
}
