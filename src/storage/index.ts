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
  if (token && API_BASE) {
    // 有远端配置：本地优先 + R2 异步备份
    _adapter = createHybridAdapter(localAdapter, createRemoteAdapter(API_BASE, token))
  } else {
    // 无远端配置：纯本地，R2 未配置时也能正常使用
    _adapter = localAdapter
  }

  return _adapter
}

export function resetStorageAdapter() {
  _adapter = null
}

export function initStorage(): 'ready' | 'need-auth' {
  return 'ready'
}

// GateScreen 验证成功后调用
export async function authenticateWithPassword(password: string): Promise<void> {
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
