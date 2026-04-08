import { getStorageAdapter } from '../storage'
import { db } from '../storage/db'
import { imageOptimizer } from './imageOptimizer'

export const imageDb = {
  async save(id: string, base64: string) {
    let optimizedData = base64;
    if (base64.length > 50000) {
      try {
        optimizedData = await imageOptimizer.compressToWebP(base64, 0.8);
      } catch (e) {
        console.warn('[imageDb] 压缩失败，回退到原图', e);
      }
    }
    await getStorageAdapter().saveImage(id, optimizedData)
  },
  async get(id: string): Promise<string | null> {
    return getStorageAdapter().getImage(id)
  },
  async remove(id: string) {
    await getStorageAdapter().removeImage(id)
  },
  // 直接读取原始 base64，不经过 StorageAdapter 压缩层（用于备份）
  async getRaw(id: string): Promise<string | null> {
    const record = await db.kvStore.get(`img-${id}`)
    return record?.value ?? null
  },
  // 直接写入（用于恢复，跳过压缩）
  async set(id: string, base64: string): Promise<void> {
    await db.kvStore.put({ key: `img-${id}`, value: base64 })
  },
  // 获取所有图片 {id, base64}（用于全量备份）
  async getAll(): Promise<{ id: string; base64: string }[]> {
    const records = await db.kvStore.filter(r => r.key.startsWith('img-')).toArray()
    return records.map(r => ({ id: r.key.slice(4), base64: r.value }))
  },
  async clear(): Promise<void> {
    const keys = (await db.kvStore.filter(r => r.key.startsWith('img-')).toArray()).map(r => r.key)
    await db.kvStore.bulkDelete(keys)
  },
}
