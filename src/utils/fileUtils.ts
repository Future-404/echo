import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/**
 * 通用文件操作工具
 */

/** 生成帶前綴的唯一 ID */
export const genId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

/** 讀取文件為文本（Promise 包裝） */
export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })

/** 讀取文件為 DataURL（Promise 包裝） */
export const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

/** 將 Blob 轉換為 Base64 (用於 Capacitor Filesystem) */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1]
      resolve(base64String)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** 
 * 核心下載函數：智能兼容 Web 和 App (Android/iOS)
 */
export const downloadFile = async (blob: Blob, filename: string) => {
  // 檢測是否在原生 App 環境 (Android/iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob)
      
      // 1. 先寫入臨時目錄
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      })

      // 2. 調起系統分享菜單 (在安卓上用戶可以選擇 "儲存到下載")
      await Share.share({
        title: `保存文件: ${filename}`,
        text: `導出文件 ${filename}`,
        url: result.uri,
        dialogTitle: '下載文件'
      })
    } catch (error) {
      console.error('App 下載失敗:', error)
      alert('保存文件失敗，請檢查權限')
    }
  } else {
    // 瀏覽器環境：使用傳統的 <a> 標籤下載
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

/** 觸發 JSON 文件下載 */
export const downloadJson = (data: unknown, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  void downloadFile(blob, filename)
}
