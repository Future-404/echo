import React, { useState } from 'react'
import { getStorageConfig, setStorageConfig, resetStorageAdapter } from '../../storage'

const StorageConfig: React.FC = () => {
  const [cfg, setCfg] = useState(getStorageConfig)
  const [saved, setSaved] = useState(false)

  function save() {
    setStorageConfig(cfg)
    resetStorageAdapter()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-[9px] tracking-widest text-gray-400 uppercase">存储后端</label>
        <div className="flex gap-3">
          {(['local', 'remote'] as const).map(b => (
            <button key={b} onClick={() => setCfg(c => ({ ...c, backend: b }))}
              className={`flex-1 py-3 rounded-2xl text-[10px] tracking-widest uppercase border-0.5 transition-all ${cfg.backend === b ? 'border-gray-400 text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-white/10' : 'border-gray-100 dark:border-gray-800 text-gray-300 dark:text-gray-600'}`}>
              {b === 'local' ? '本地 IndexedDB' : '远程服务'}
            </button>
          ))}
        </div>
      </div>

      {cfg.backend === 'remote' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] tracking-widest text-gray-400 uppercase">服务地址</label>
            <input value={cfg.remoteUrl || ''} onChange={e => setCfg(c => ({ ...c, remoteUrl: e.target.value }))}
              placeholder="https://your-worker.workers.dev"
              className="w-full bg-transparent border-0.5 border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs text-gray-600 dark:text-gray-300 outline-none focus:border-gray-400" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] tracking-widest text-gray-400 uppercase">访问 Token</label>
            <input type="password" value={cfg.remoteToken || ''} onChange={e => setCfg(c => ({ ...c, remoteToken: e.target.value }))}
              placeholder="Bearer Token"
              className="w-full bg-transparent border-0.5 border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-xs text-gray-600 dark:text-gray-300 outline-none focus:border-gray-400" />
          </div>
        </div>
      )}

      <button onClick={save}
        className="w-full py-3 rounded-2xl text-[10px] tracking-widest uppercase border-0.5 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400 transition-all">
        {saved ? '已保存（刷新页面生效）' : '保存配置'}
      </button>
    </div>
  )
}

export default StorageConfig
