import { VERSION } from '../version'
import { Capacitor } from '@capacitor/core'

export interface GitHubRelease {
  tag_name: string
  html_url: string
  body: string
  assets: Array<{
    name: string
    browser_download_url: string
  }>
}

/**
 * 版本号对比函数 (semantic versioning)
 * @returns 1: new > old, -1: new < old, 0: equal
 */
export const compareVersions = (newVer: string, oldVer: string): number => {
  const n = newVer.replace(/^v/, '').split('.').map(Number)
  const o = oldVer.replace(/^v/, '').split('.').map(Number)
  
  for (let i = 0; i < Math.max(n.length, o.length); i++) {
    const nv = n[i] || 0
    const ov = o[i] || 0
    if (nv > ov) return 1
    if (nv < ov) return -1
  }
  return 0
}

/**
 * 检查 GitHub 上的最新版本
 */
export const checkNewVersion = async (repo: string = 'Future-404/echo'): Promise<GitHubRelease | null> => {
  try {
    // 只有在原生应用中或者显式需要时才检查 GitHub (PWA 本身有自己的更新机制)
    if (!Capacitor.isNativePlatform()) return null

    const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`)
    if (!response.ok) return null
    
    const latest: GitHubRelease = await response.json()
    
    // 对比版本号
    if (compareVersions(latest.tag_name, VERSION) === 1) {
      return latest
    }
    
    return null
  } catch (error) {
    console.error('[UpdateService] Check failed:', error)
    return null
  }
}
