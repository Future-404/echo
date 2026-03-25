import http from 'node:http'
import Database from 'better-sqlite3'

const PORT = process.env.PORT || 3456
const TOKEN = process.env.AUTH_TOKEN
if (!TOKEN) { console.error('AUTH_TOKEN env var required'); process.exit(1) }

// SQLite: 一个 DB 文件搞定 KV + 图片
const db = new Database(process.env.DB_PATH || './echo.db')
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS images (id TEXT PRIMARY KEY, base64 TEXT NOT NULL);
`)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS })
  res.end(JSON.stringify(data))
}

async function readBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve({}) } })
  })
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, null)
  if (req.headers['authorization'] !== `Bearer ${TOKEN}`) return send(res, 401, { error: 'Unauthorized' })

  const parts = req.url.split('/').filter(Boolean) // ['api', resource, id]
  const resource = parts[1]
  const id = parts[2] ? decodeURIComponent(parts[2]) : ''

  if (resource === 'storage') {
    if (req.method === 'GET') {
      const row = db.prepare('SELECT value FROM kv WHERE key = ?').get(id)
      return send(res, 200, { value: row?.value ?? null })
    }
    if (req.method === 'PUT') {
      const { value } = await readBody(req)
      db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(id, value)
      return send(res, 200, { ok: true })
    }
    if (req.method === 'DELETE') {
      db.prepare('DELETE FROM kv WHERE key = ?').run(id)
      return send(res, 200, { ok: true })
    }
  }

  if (resource === 'images') {
    if (req.method === 'GET') {
      const row = db.prepare('SELECT base64 FROM images WHERE id = ?').get(id)
      return send(res, 200, { base64: row?.base64 ?? null })
    }
    if (req.method === 'PUT') {
      const { base64 } = await readBody(req)
      db.prepare('INSERT INTO images (id, base64) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET base64 = excluded.base64').run(id, base64)
      return send(res, 200, { ok: true })
    }
    if (req.method === 'DELETE') {
      db.prepare('DELETE FROM images WHERE id = ?').run(id)
      return send(res, 200, { ok: true })
    }
  }

  send(res, 404, { error: 'Not Found' })
}).listen(PORT, () => console.log(`Echo storage server running on :${PORT}`))
