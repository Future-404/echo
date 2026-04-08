import type { CharacterAsset } from '../types/chat'

// 從 V3 角色卡提取 assets
export const extractAssetsFromV3 = (data: any): CharacterAsset[] => {
  if (!data?.assets || !Array.isArray(data.assets)) return []
  
  return data.assets.map((asset: any) => ({
    type: asset.type || 'unknown',
    uri: asset.uri || '',
    name: asset.name || 'unnamed',
    ext: asset.ext || 'unknown'
  }))
}

// 解析 embedded:// URI (用於 .charx 格式)
export const resolveAssetUri = (uri: string, baseUrl?: string): string => {
  if (uri === 'ccdefault:') return ''
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri
  if (uri.startsWith('data:')) return uri
  if (uri.startsWith('embedded://') && baseUrl) {
    return `${baseUrl}/${uri.replace('embedded://', '')}`
  }
  return uri
}
