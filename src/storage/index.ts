import type { StorageAdapter } from './types'
import { createRemoteAdapter } from './adapters/remote'

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
  if (!token) throw new Error('[echo] 未認證，無法訪問存儲')
  _adapter = createRemoteAdapter(API_BASE, token)
  return _adapter
}

export function resetStorageAdapter() {
  _adapter = null
}

// 啟動時：有 token 直接用，沒有則需要 GateScreen
export function initStorage(): 'ready' | 'need-auth' {
  return getSavedToken() ? 'ready' : 'need-auth'
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
