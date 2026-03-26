import type { StorageAdapter } from '../types'

const DB_NAME = 'EchoAppDB'
const DB_VERSION = 2
const KV_STORE = 'kv'
const IMAGE_STORE = 'images'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE)
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

let _db: IDBDatabase | null = null
async function getDb() {
  if (!_db) _db = await openDb()
  // 监听其他标签页触发的版本升级，及时关闭连接避免死锁
  _db.onversionchange = () => { _db?.close(); _db = null }
  return _db
}

function kvOp<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>, retries = 2): Promise<T> {
  return getDb().then(db => new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(store, mode)
      const req = fn(tx.objectStore(store))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } catch (err: any) {
      if ((err.name === 'InvalidStateError' || err.name === 'TransactionInactiveError') && retries > 0) {
        _db = null
        setTimeout(() => kvOp<T>(store, mode, fn, retries - 1).then(resolve, reject), 100)
      } else {
        reject(err)
      }
    }
  }))
}

export const indexedDbAdapter: StorageAdapter = {
  getItem: (key) => kvOp<string | undefined>(KV_STORE, 'readonly', s => s.get(key)).then(v => v ?? null),
  setItem: (key, value) => kvOp<IDBValidKey>(KV_STORE, 'readwrite', s => s.put(value, key)).then(() => {}),
  removeItem: (key) => kvOp<undefined>(KV_STORE, 'readwrite', s => s.delete(key)).then(() => {}),

  saveImage: (id, base64) => kvOp<IDBValidKey>(IMAGE_STORE, 'readwrite', s => s.put(base64, id)).then(() => {}),
  getImage: (id) => kvOp<string | undefined>(IMAGE_STORE, 'readonly', s => s.get(id)).then(v => v ?? null),
  removeImage: (id) => kvOp<undefined>(IMAGE_STORE, 'readwrite', s => s.delete(id)).then(() => {}),
}
