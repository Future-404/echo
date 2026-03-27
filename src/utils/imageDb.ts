import { getStorageAdapter } from '../storage'

export const imageDb = {
  async save(id: string, base64: string) {
    await getStorageAdapter().saveImage(id, base64)
  },
  async get(id: string): Promise<string | null> {
    return getStorageAdapter().getImage(id)
  },
  async remove(id: string) {
    await getStorageAdapter().removeImage(id)
  }
}
