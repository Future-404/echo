import type { StorageAdapter } from './types'
import { createRemoteAdapter } from './adapters/remote'
import { createHybridAdapter } from './adapters/hybrid'
import { localAdapter } from './adapters/local'

const BOOTSTRAP_KEY = 'echo-storage-token'
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? ''
const STATIC_AUTH_TOKEN = (import.meta.env.VITE_AUTH_TOKEN as string | undefined) ?? ''

export function getSavedToken(): string {
  return localStorage.getItem(BOOTSTRAP_KEY) ?? ''
}

export function isCloudConnected(): boolean {
  return !!API_BASE && !!getSavedToken()
}

function saveToken(token: string) {
  localStorage.setItem(BOOTSTRAP_KEY, token)
}

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

let _adapter: StorageAdapter | null = null

export function getStorageAdapter(): StorageAdapter {
  if (_adapter) return _adapter

  const token = getSavedToken()
  // 只有明确配置了 API_BASE 才启用远端同步，否则纯本地
  if (token && API_BASE) {
    _adapter = createHybridAdapter(localAdapter, createRemoteAdapter(API_BASE, token))
  } else {
    _adapter = localAdapter
  }

  return _adapter
}

export function resetStorageAdapter() {
  _adapter = null
}

export function initStorage(): 'ready' | 'need-auth' {
  if (!API_BASE) {
    if (!STATIC_AUTH_TOKEN) return 'ready'
    return localStorage.getItem(BOOTSTRAP_KEY) === 'local-authenticated' ? 'ready' : 'need-auth'
  }
  return getSavedToken() ? 'ready' : 'need-auth'
}

// GateScreen 验证成功后调用
export async function authenticateWithPassword(password: string): Promise<void> {
  if (STATIC_AUTH_TOKEN) {
    const [inputHash, storedHash] = await Promise.all([
      sha256hex(password),
      sha256hex(STATIC_AUTH_TOKEN),
    ])
    if (inputHash !== storedHash) throw new Error('密码错误')
    saveToken('local-authenticated')
    _adapter = localAdapter
    return
  }
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) throw new Error('密码错误')
    const { token } = await res.json() as { token: string }
    saveToken(token)
    _adapter = createHybridAdapter(localAdapter, createRemoteAdapter(API_BASE, token))
    return
  }
  // 不应到达此处：无认证配置时 initStorage 返回 ready，GateScreen 不会显示
  throw new Error('未配置认证方式')
}
