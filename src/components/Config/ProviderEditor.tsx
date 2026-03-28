import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface ProviderEditorProps {
  id: string
  onClose: () => void
}

const ProviderEditor: React.FC<ProviderEditorProps> = ({ id, onClose }) => {
  const { config, updateProvider } = useAppStore()
  const provider = config?.providers?.find(p => p.id === id)
  
  const [isFetching, setIsFetching] = useState(false)
  const [modelList, setModelList] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!provider) return null

  // 拉取模型列表逻辑
  const handleFetchModels = async () => {
    if (!provider.apiKey || !provider.endpoint) {
      setError("请先填写 API Key 和 Endpoint")
      return
    }

    setIsFetching(true)
    setError(null)
    
    try {
      // 适配标准 OpenAI /v1/models 路径
      const baseUrl = provider.endpoint.replace(/\/+$/, '')
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`)
      
      const data = await response.json()
      // 提取模型 ID (兼容 OpenAI 格式)
      const models = data.data?.map((m: any) => m.id) || []
      setModelList(models.sort())
      setShowDropdown(true)
      if (models.length === 0) setError("未发现可用模型")
    } catch (err: any) {
      setError(err.message || "拉取失败，请检查网络或配置")
    } finally {
      setIsFetching(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} 
      className="p-8 space-y-10"
    >
      <div className="group">
        <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase mb-3 block italic underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Node Name // 节点名称</label>
        <input 
          type="text" 
          value={provider.name} 
          onChange={(e) => updateProvider(id, { name: e.target.value })} 
          className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-2 text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors" 
        />
      </div>

      <div className="group">
        <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase mb-3 block italic">API Format // 协议格式</label>
        <select 
          value={provider.apiFormat || 'openai'} 
          onChange={(e) => updateProvider(id, { apiFormat: e.target.value as any })}
          className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-2 text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:border-gray-400 cursor-pointer appearance-none"
        >
          <option value="openai" className="bg-white dark:bg-[#121212]">OpenAI Standard</option>
          <option value="anthropic" className="bg-white dark:bg-[#121212]">Anthropic Native</option>
          <option value="gemini" className="bg-white dark:bg-[#121212]">Google Gemini Native</option>
        </select>
      </div>

      <div className="group">
        <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase mb-3 block italic">Endpoint URL // 接口地址</label>
        <input 
          type="text" 
          value={provider.endpoint} 
          onChange={(e) => updateProvider(id, { endpoint: e.target.value })} 
          placeholder="https://api.openai.com/v1" 
          className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-2 text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors" 
        />
      </div>

      <div className="group">
        <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase mb-3 block italic">Neural Token // API Key</label>
        <input 
          type="password" 
          value={provider.apiKey} 
          onChange={(e) => updateProvider(id, { apiKey: e.target.value })} 
          placeholder="sk-..." 
          className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-2 text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors" 
        />
      </div>

      <div className="group">
        <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase mb-3 block italic">Custom Headers // 自定义请求头 (JSON)</label>
        <textarea 
          value={provider.customHeaders || ''} 
          onChange={(e) => updateProvider(id, { customHeaders: e.target.value })} 
          placeholder='{ "HTTP-Referer": "https://echo.ai", "X-Title": "Echo" }' 
          className="w-full bg-white/30 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-xl p-4 text-[10px] text-gray-500 dark:text-gray-400 font-mono focus:outline-none focus:border-gray-300 min-h-[60px] resize-none no-scrollbar"
        />
      </div>

      <div className="group">
        <div className="flex justify-between items-center mb-3">
            <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase italic">Model Identifier // 模型选择</label>
            <button 
                onClick={handleFetchModels}
                disabled={isFetching}
                className="flex items-center gap-1 text-[8px] uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-30"
            >
                <RefreshCw size={10} className={isFetching ? 'animate-spin' : ''} />
                {isFetching ? 'Scanning...' : 'Fetch List'}
            </button>
        </div>
        
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={provider.model}
                onChange={(e) => {
                  updateProvider(id, { model: e.target.value })
                  setShowDropdown(true)
                }}
                onFocus={() => modelList.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="gpt-4o, claude-3..."
                className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-2 text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors"
            />

            {/* 模糊搜索下拉 */}
            {showDropdown && modelList.length > 0 && (() => {
              const q = provider.model.toLowerCase()
              const filtered = q
                ? modelList.filter(m => m.toLowerCase().includes(q))
                : modelList
              if (filtered.length === 0) return null
              return (
                <div className="absolute top-full left-0 right-0 z-20 mt-2 max-h-48 overflow-y-auto no-scrollbar glass-morphism rounded-2xl shadow-xl border-0.5 border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-black/80">
                  {filtered.map(m => {
                    // 高亮匹配部分
                    const idx = m.toLowerCase().indexOf(q)
                    const before = m.slice(0, idx)
                    const match = m.slice(idx, idx + q.length)
                    const after = m.slice(idx + q.length)
                    return (
                      <div
                        key={m}
                        onMouseDown={() => { updateProvider(id, { model: m }); setShowDropdown(false); }}
                        className={`px-5 py-3 text-[10px] cursor-pointer transition-colors border-b-0.5 border-gray-50 dark:border-gray-900 last:border-none uppercase tracking-widest ${m === provider.model ? 'text-gray-700 dark:text-gray-200 bg-gray-50/80 dark:bg-white/5' : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}
                      >
                        {q && idx >= 0 ? (
                          <>{before}<span className="text-blue-500 dark:text-blue-400">{match}</span>{after}</>
                        ) : m}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
        </div>

        {error && (
            <div className="mt-2 flex items-center gap-2 text-[8px] text-red-300 uppercase tracking-widest italic">
                <AlertCircle size={10} /> {error}
            </div>
        )}
      </div>

      {/* Advanced Parameters */}
      <div className="space-y-6 pt-4 border-t-0.5 border-gray-100 dark:border-gray-800/50">
        <div className="flex justify-between items-center group cursor-pointer" onClick={() => updateProvider(id, { stream: provider.stream !== false ? false : true })}>
          <div className="flex flex-col">
            <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase italic cursor-pointer">Streaming // 流式传输</label>
            <span className="text-[7px] text-gray-400 mt-1">关闭后将等待完整响应</span>
          </div>
          <div className={`w-8 h-4 rounded-full flex items-center transition-colors px-0.5 ${provider.stream !== false ? 'bg-green-400/50' : 'bg-gray-300 dark:bg-gray-700'}`}>
            <motion.div layout className="w-3 h-3 rounded-full bg-white shadow-sm" animate={{ x: provider.stream !== false ? 16 : 0 }} />
          </div>
        </div>

        <div className="group">
          <div className="flex justify-between items-center mb-2">
            <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase italic">Temperature // 发散度</label>
            <span className="text-[10px] text-gray-500 font-mono">{provider.temperature ?? 0.7}</span>
          </div>
          <input 
            type="range" 
            min="0" max="2" step="0.1" 
            value={provider.temperature ?? 0.7} 
            onChange={(e) => updateProvider(id, { temperature: parseFloat(e.target.value) })}
            className="w-full accent-gray-500"
          />
        </div>

        <details className="group">
          <summary className="text-[9px] tracking-wide text-gray-500 dark:text-gray-600 uppercase italic cursor-pointer select-none list-none flex items-center gap-1">
            <span>▶</span><span>高级参数</span>
          </summary>
          <div className="mt-3 space-y-4 pl-2 border-l border-white/10">
            <div className="group">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase italic">Top P // 核采样</label>
                <span className="text-[10px] text-gray-500 font-mono">{provider.topP ?? 1.0}</span>
              </div>
              <input 
                type="range" 
                min="0" max="1" step="0.1" 
                value={provider.topP ?? 1.0} 
                onChange={(e) => updateProvider(id, { topP: parseFloat(e.target.value) })}
                className="w-full accent-gray-500"
              />
            </div>

            <div className="group">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase italic">Context Capacity (Tokens) // 上下文容量</label>
                <span className="text-[10px] text-gray-500 font-mono">{provider.contextWindow ? (provider.contextWindow >= 1000 ? (provider.contextWindow / 1000).toFixed(0) + 'k' : provider.contextWindow) : '32k'}</span>
              </div>
              <input
                type="range"
                min="4096" max="256000" step="4096"
                value={provider.contextWindow || 32000}
                onChange={(e) => updateProvider(id, { contextWindow: parseInt(e.target.value, 10) })}
                className="w-full accent-gray-500"
              />
              <p className="text-[7px] text-gray-400 mt-1 uppercase tracking-widest">限制发送给模型的最大 Token 总数（包含历史与设定）</p>
            </div>

            <div className="group">
              <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase italic mb-2 block">Assistant Prefill // 引导语</label>
              <input
                type="text"
                value={provider.assistantPrefill ?? ''}
                onChange={(e) => updateProvider(id, { assistantPrefill: e.target.value || undefined })}
                placeholder='例如：" 或 *我'
                className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 py-1.5 text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:border-gray-400 transition-colors font-mono"
              />
              <p className="text-[7px] text-gray-400 mt-1 uppercase tracking-widest">注入为最后一条 assistant 消息，引导模型输出格式</p>
            </div>
          </div>
        </details>

      </div>

      <button 
        onClick={onClose} 
        className="w-full py-4 border-0.5 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 rounded-full text-[10px] tracking-[0.4em] text-gray-400 uppercase hover:bg-white dark:hover:bg-gray-900 transition-all mt-10 shadow-sm"
      >
        Done // Save
      </button>
    </motion.div>
  )
}

export default ProviderEditor
