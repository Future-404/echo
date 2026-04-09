import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

const UpdatePrompt: React.FC = () => {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  if (!needRefresh) return null

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

export default UpdatePrompt
