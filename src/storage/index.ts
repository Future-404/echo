import type { StorageAdapter } from './types'
import { indexedDbAdapter } from './adapters/indexeddb'
import { createRemoteAdapter } from './adapters/remote'

export type StorageBackend = 'local' | 'remote'

// bootstrap 配置：这3个字段极小，允许放 localStorage
export interface StorageConfig {
  backend: StorageBackend
  remoteUrl?: string
  remoteToken?: string
}

const BOOTSTRAP_KEY = 'echo-storage-config'

export function getStorageConfig(): StorageConfig {
  try {
    const raw = localStorage.getItem(BOOTSTRAP_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { backend: 'local' }
}

export function setStorageConfig(config: StorageConfig) {
  localStorage.setItem(BOOTSTRAP_KEY, JSON.stringify(config))
}

let _adapter: StorageAdapter | null = null

export function getStorageAdapter(): StorageAdapter {
  if (_adapter) return _adapter
  const config = getStorageConfig()
  if (config.backend === 'remote' && config.remoteUrl && config.remoteToken) {
    _adapter = createRemoteAdapter(config.remoteUrl, config.remoteToken)
  } else {
    _adapter = indexedDbAdapter
  }
  return _adapter
}

// 切换后端时重置适配器实例（需要刷新页面生效）
export function resetStorageAdapter() {
  _adapter = null
}
