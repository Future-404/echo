import http from 'node:http'
import Database from 'better-sqlite3'

const PORT = process.env.PORT || 3456
const TOKEN = process.env.AUTH_TOKEN
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'
const MAX_BODY_BYTES = 20 * 1024 * 1024 // 20MB
const MAX_VALUE_BYTES = 5 * 1024 * 1024 // 单条记录 5MB

if (!TOKEN) {
  console.error('[echo-storage] AUTH_TOKEN environment variable is required.\n  Example: AUTH_TOKEN=your_secret node server.js')
  process.exit(1)
}

const db = new Database(process.env.DB_PATH || './echo.db')
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, base64 TEXT NOT NULL);
`)

const CORS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
}

function validateKey(key) {
  if (typeof key !== 'string' || key.length === 0 || key.length > 256) {
    throw new Error('Invalid key: must be 1-256 characters')
  }
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS })
  res.end(JSON.stringify(data))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) { req.destroy(); reject(new Error('Request body too large')); return }
      body += chunk
    })
    req.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve({}) } })
    req.on('error', reject)
  })
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, null)
  if (req.headers['authorization'] !== `Bearer ${TOKEN}`) return send(res, 401, { error: 'Unauthorized' })

  const parts = req.url.split('/').filter(Boolean) // ['api', resource, id?]
  const resource = parts[1]

  // ── /api/ping ─────────────────────────────────────────────────────────────
  if (resource === 'ping') return send(res, 200, { ok: true })

  const rawId = parts[2]
  if (!rawId) return send(res, 400, { error: 'Missing resource id' })
  const id = decodeURIComponent(rawId)

  try {
    if (resource === 'storage') {
      validateKey(id)
      if (req.method === 'GET') {
        const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(id)
        return send(res, 200, { value: row?.value ?? null })
      }
      if (req.method === 'PUT') {
        const { value } = await readBody(req)
        if (typeof value !== 'string') return send(res, 400, { error: 'value must be a string' })
        if (value.length > MAX_VALUE_BYTES) return send(res, 413, { error: 'Value too large (max 5MB)' })
        db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(id, value)
        return send(res, 200, { ok: true })
      }
      if (req.method === 'DELETE') {
        db.prepare('DELETE FROM kv WHERE key = ?').run(id)
        return send(res, 200, { ok: true })
      }
      return send(res, 405, { error: 'Method Not Allowed' })
    }

    if (resource === 'images') {
      validateKey(id)
      if (req.method === 'GET') {
        const row = db.prepare('SELECT base64 FROM images WHERE id = ?').get(id)
        return send(res, 200, { base64: row?.base64 ?? null })
      }
      if (req.method === 'PUT') {
        const { base64 } = await readBody(req)
        if (typeof base64 !== 'string') return send(res, 400, { error: 'base64 must be a string' })
        if (base64.length > MAX_VALUE_BYTES) return send(res, 413, { error: 'Image too large (max 5MB)' })
        db.prepare('INSERT INTO images (id, base64) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET base64 = excluded.base64').run(id, base64)
        return send(res, 200, { ok: true })
      }
      if (req.method === 'DELETE') {
        db.prepare('DELETE FROM images WHERE id = ?').run(id)
        return send(res, 200, { ok: true })
      }
      return send(res, 405, { error: 'Method Not Allowed' })
    }

    send(res, 404, { error: 'Not Found' })
  } catch (err) {
    console.error('[echo-storage] Error:', err)
    send(res, 500, { error: 'Internal Server Error' })
  }
}).listen(PORT, () => console.log(`[echo-storage] Running on :${PORT}`))
