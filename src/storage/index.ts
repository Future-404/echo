import type { StorageAdapter } from './types'
import { createRemoteAdapter } from './adapters/remote'
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
  // 如果有 token 且有 API 地址，则使用远程适配器（或混合适配器）
  if (token && API_BASE) {
    _adapter = createRemoteAdapter(API_BASE, token)
  } else {
    // 否则默认使用本地存储
    _adapter = localAdapter
  }
  
  return _adapter
}

export function resetStorageAdapter() {
  _adapter = null
}

// 啟動時：本地模式總是 ready，除非用户想同步
export function initStorage(): 'ready' | 'need-auth' {
  const token = getSavedToken()
  // 即使没有 token，我们也返回 ready，因为可以使用本地存储
  return 'ready'
}

// GateScreen 驗證成功後調用
export async function authenticateWithPassword(password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) throw new Error('密碼錯誤')
  const { token } = await res.json() as { token: string }
  saveToken(token)
  _adapter = createRemoteAdapter(API_BASE, token)
}
