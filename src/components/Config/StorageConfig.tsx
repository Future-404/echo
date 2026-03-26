import React, { useState } from 'react'
import { getStorageConfig, setStorageConfig, resetStorageAdapter } from '../../storage'

type PingState = 'idle' | 'testing' | 'ok' | 'fail'

const StorageConfig: React.FC = () => {
  const [cfg, setCfg] = useState(getStorageConfig)
  const [saved, setSaved] = useState(false)
  const [ping, setPing] = useState<PingState>('idle')
  const [pingMsg, setPingMsg] = useState('')

  function save() {
    setStorageConfig(cfg)
    resetStorageAdapter()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function testConnection() {
    if (!cfg.remoteUrl || !cfg.remoteToken) return
    setPing('testing')
    setPingMsg('')
    try {
      const base = cfg.remoteUrl.replace(/\/+$/, '')
      const start = Date.now()
      const res = await fetch(`${base}/api/ping`, {
        headers: { Authorization: `Bearer ${cfg.remoteToken}` },
        signal: AbortSignal.timeout(8000),
      })
      const ms = Date.now() - start
      if (res.ok) {
        setPing('ok')
        setPingMsg(`连接成功 · ${ms}ms`)
      } else {
        setPing('fail')
        setPingMsg(`服务器返回 ${res.status}`)
      }
    } catch (e: any) {
      setPing('fail')
      setPingMsg(e?.name === 'TimeoutError' ? '连接超时（8s）' : (e?.message || '无法连接'))
    }
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

          {/* 连通性测试 */}
          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={!cfg.remoteUrl || !cfg.remoteToken || ping === 'testing'}
              className="px-4 py-2.5 rounded-2xl text-[10px] tracking-widest uppercase border-0.5 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {ping === 'testing' ? '测试中…' : '连通性测试'}
            </button>
            {ping !== 'idle' && ping !== 'testing' && (
              <span className={`text-[10px] font-mono ${ping === 'ok' ? 'text-green-500' : 'text-red-400'}`}>
                {ping === 'ok' ? '✓' : '✗'} {pingMsg}
              </span>
            )}
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
