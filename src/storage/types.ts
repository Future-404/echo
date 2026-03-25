export interface StorageAdapter {
  // KV：结构化数据（zustand persist）
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>

  // Blob：图片/文件
  saveImage(id: string, base64: string): Promise<void>
  getImage(id: string): Promise<string | null>
  removeImage(id: string): Promise<void>
}
