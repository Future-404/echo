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
  // 有后端 token 或静态 auth token 已验证过，均视为 ready
  return getSavedToken() ? 'ready' : 'need-auth'
}

// GateScreen 验证成功后调用
export async function authenticateWithPassword(password: string): Promise<void> {
  // 优先：有静态 AUTH_TOKEN 时，纯前端本地校验
  if (STATIC_AUTH_TOKEN) {
    if (password !== STATIC_AUTH_TOKEN) throw new Error('密码错误')
    saveToken(password)
    _adapter = localAdapter
    return
  }
  // 有后端时走远端验证
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
  // 两者都没有：任意密码通过（开发模式）
  saveToken(password)
  _adapter = localAdapter
}
