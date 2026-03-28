import type { StorageAdapter } from './types'
import { createRemoteAdapter } from './adapters/remote'
import { createHybridAdapter } from './adapters/hybrid'
import { localAdapter } from './adapters/local'

const BOOTSTRAP_KEY = 'echo-storage-token'
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? ''

export function getSavedToken(): string {
  return localStorage.getItem(BOOTSTRAP_KEY) ?? ''
}

function saveToken(token: string) {
  localStorage.setItem(BOOTSTRAP_KEY, token)
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
  return getSavedToken() ? 'ready' : 'need-auth'
}

// GateScreen 验证成功后调用
export async function authenticateWithPassword(password: string): Promise<void> {
  // 没有配置后端时，直接用输入的 token 作为本地密码跳过验证
  if (!API_BASE) {
    saveToken(password)
    _adapter = localAdapter
    return
  }
  const res = await fetch(`${API_BASE}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) throw new Error('密碼錯誤')
  const { token } = await res.json() as { token: string }
  saveToken(token)
  _adapter = createHybridAdapter(localAdapter, createRemoteAdapter(API_BASE, token))
}
