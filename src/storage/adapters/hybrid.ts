import type { StorageAdapter } from '../types'

/**
 * 本地优先混合适配器
 * - 读：只走本地
 * - 写：本地完成后 fire-and-forget 异步备份到远端
 * - 远端不可用时静默失败，不影响主流程
 */
export function createHybridAdapter(
  local: StorageAdapter,
  remote: StorageAdapter,
): StorageAdapter {
  function backup(fn: () => Promise<void>) {
    fn().catch(err => console.warn('[echo] R2 backup failed:', err))
  }

  return {
    getItem: (key) => local.getItem(key),
    setItem: (key, value) => {
      const p = local.setItem(key, value)
      p.then(() => backup(() => remote.setItem(key, value)))
      return p
    },
    removeItem: (key) => {
      const p = local.removeItem(key)
      p.then(() => backup(() => remote.removeItem(key)))
      return p
    },
    getImage: (id) => local.getImage(id),
    saveImage: (id, base64) => {
      const p = local.saveImage(id, base64)
      p.then(() => backup(() => remote.saveImage(id, base64)))
      return p
    },
    removeImage: (id) => {
      const p = local.removeImage(id)
      p.then(() => backup(() => remote.removeImage(id)))
      return p
    },
  }
}
