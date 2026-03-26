import type { StorageAdapter } from '../types'

const DB_NAME = 'EchoAppDB'
const DB_VERSION = 2
const KV_STORE = 'kv'
const IMAGE_STORE = 'images'

const DB_TIMEOUT = 5000 // 5秒超时

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`[Storage] IndexedDB Timeout: ${label}`)), DB_TIMEOUT))
  ])
}

function openDb(): Promise<IDBDatabase> {
  console.log('[Storage] Opening IndexedDB...');
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE)
      if (!db.objectStoreNames.contains(IMAGE_STORE)) db.createObjectStore(IMAGE_STORE)
    }
    req.onblocked = () => {
      console.warn('[Storage] IndexedDB open blocked! Please close other tabs.');
    }
    req.onsuccess = () => {
      console.log('[Storage] IndexedDB opened successfully');
      resolve(req.result);
    }
    req.onerror = () => reject(req.error)
  })
}

let _db: IDBDatabase | null = null
async function getDb() {
  if (!_db) _db = await withTimeout(openDb(), 'openDb');
  _db.onversionchange = () => { 
    console.warn('[Storage] DB version change detected, closing...');
    _db?.close(); 
    _db = null; 
  }
  return _db
}

function kvOp<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const promise = getDb().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const req = fn(tx.objectStore(store))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
  return withTimeout(promise, `kvOp:${store}:${mode}`);
}

export const indexedDbAdapter: StorageAdapter = {
  getItem: (key) => kvOp<string | undefined>(KV_STORE, 'readonly', s => s.get(key)).then(v => v ?? null),
  setItem: (key, value) => kvOp<IDBValidKey>(KV_STORE, 'readwrite', s => s.put(value, key)).then(() => {}),
  removeItem: (key) => kvOp<undefined>(KV_STORE, 'readwrite', s => s.delete(key)).then(() => {}),

  saveImage: (id, base64) => kvOp<IDBValidKey>(IMAGE_STORE, 'readwrite', s => s.put(base64, id)).then(() => {}),
  getImage: (id) => kvOp<string | undefined>(IMAGE_STORE, 'readonly', s => s.get(id)).then(v => v ?? null),
  removeImage: (id) => kvOp<undefined>(IMAGE_STORE, 'readwrite', s => s.delete(id)).then(() => {}),
}
