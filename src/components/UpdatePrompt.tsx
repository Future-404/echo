import React, { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, Download } from 'lucide-react'
import { checkNewVersion } from '../utils/updateService'
import type { GitHubRelease } from '../utils/updateService'

const UpdatePrompt: React.FC = () => {
  // 1. PWA Service Worker 更新 (Web 环境)
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  // 2. GitHub Release 更新 (Native App 环境)
  const [newRelease, setNewRelease] = useState<GitHubRelease | null>(null)

  useEffect(() => {
    // 组件挂载时检查 GitHub 上的最新版本
    checkNewVersion().then(release => {
      if (release) setNewRelease(release)
    })
  }, [])

  // 如果都没有更新，不渲染
  if (!needRefresh && !newRelease) return null

  // PWA 更新 UI
  if (needRefresh) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/80 backdrop-blur border border-white/10 text-xs text-white shadow-xl">
        <span className="opacity-70">发现新版本</span>
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 border border-blue-500/20 transition-colors font-semibold"
        >
          <RefreshCw size={12} />
          立即更新
        </button>
      </div>
    )
  }

  // GitHub Release (Native APK) 更新 UI
  if (newRelease) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 px-4 py-3 rounded-2xl bg-black/80 backdrop-blur border border-blue-500/30 text-xs text-white shadow-xl min-w-[240px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-blue-500 text-[10px] font-bold">NEW</span>
            <span className="font-bold">发现新版本 {newRelease.tag_name}</span>
          </div>
          <button onClick={() => setNewRelease(null)} className="text-gray-400 hover:text-white">✕</button>
        </div>
        
        <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 italic">
          {newRelease.body?.split('\n')[0] || '点击下载最新安装包以获取更好的体验。'}
        </p>

        <div className="flex items-center gap-2 mt-2">
          <a
            href={newRelease.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors font-semibold"
          >
            <Download size={14} />
            前往下载
          </a>
          <button
            onClick={() => setNewRelease(null)}
            className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
          >
            稍后
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default UpdatePrompt
