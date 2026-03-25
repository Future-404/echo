const DB_NAME = 'EchoImageDB'
const STORE_NAME = 'images'

export const imageDb = {
  db: null as IDBDatabase | null,

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME)
      }
      request.onsuccess = () => {
        this.db = request.result
        resolve(true)
      }
      request.onerror = () => reject(request.error)
    })
  },

  async save(id: string, base64: string) {
    if (!this.db) await this.init()
    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(base64, id)
      tx.oncomplete = () => resolve(true)
    })
  },

  async get(id: string): Promise<string | null> {
    if (!this.db) await this.init()
    return new Promise((resolve) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => resolve(null)
    })
  },

  async remove(id: string) {
    if (!this.db) await this.init()
    const tx = this.db!.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
  }
}
