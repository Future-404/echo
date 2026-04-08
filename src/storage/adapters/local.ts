import type { StorageAdapter } from '../types';
import { db } from '../db';

/**
 * 带有 LRU 缓存的高性能存储适配器
 */
export class DexieStorageAdapter implements StorageAdapter {
  private cache = new Map<string, any>();
  private readonly MAX_CACHE_SIZE = 50;

  private touch(key: string, value: any) {
    this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      this.cache.delete(this.cache.keys().next().value!);
    }
  }

  async getItem(key: string): Promise<string | null> {
    if (this.cache.has(key)) {
      const val = this.cache.get(key);
      this.touch(key, val);
      return typeof val === 'string' ? val : JSON.stringify(val);
    }
    try {
      const record = await db.kvStore.get(key);
      if (!record) return null;
      this.touch(key, record.value);
      return typeof record.value === 'string' ? record.value : JSON.stringify(record.value);
    } catch (e) {
      console.error(`[DexieAdapter] GetItem Error (${key}):`, e);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      let valToStore: any = value;
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try { valToStore = JSON.parse(value); } catch {}
      }
      this.touch(key, valToStore);
      await db.kvStore.put({ key, value: valToStore });
    } catch (e) {
      console.error(`[DexieAdapter] SetItem Error (${key}):`, e);
    }
  }

  async removeItem(key: string): Promise<void> {
    this.cache.delete(key);
    await db.kvStore.delete(key);
  }

  async saveImage(id: string, base64: string): Promise<void> {
    // 图片数据较大，不进入通用 LRU 缓存，直接存 DB 以免撑爆内存
    try {
      await db.kvStore.put({ key: `img-${id}`, value: base64 });
    } catch (e) {
       console.error(`[DexieAdapter] SaveImage Error:`, e);
    }
  }

  async getImage(id: string): Promise<string | null> {
    const record = await db.kvStore.get(`img-${id}`);
    return record?.value || null;
  }

  async removeImage(id: string): Promise<void> {
    await db.kvStore.delete(`img-${id}`);
  }
}

export const localAdapter = new DexieStorageAdapter();

if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}
