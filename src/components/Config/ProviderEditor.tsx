import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Check, MessageSquare, Brain, Volume2, ChevronLeft, Trash2, Settings2, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useDialog } from '../GlobalDialog'
import type { Provider } from '../../types/store'

interface ProviderEditorProps {
  id: string
  onClose: () => void
}

const ProviderEditor: React.FC<ProviderEditorProps> = ({ id, onClose }) => {
  const { confirm } = useDialog()
  const { config, updateProvider, removeProvider } = useAppStore()
  const provider = config?.providers?.find(p => p.id === id)
  
  const [isFetching, setIsFetching] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [modelList, setModelList] = useState<string[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!provider) return null

  const isChat = provider.type === 'chat' || !provider.type
  const isEmbedding = provider.type === 'embedding'
  const isTts = provider.type === 'tts'

  // 拉取模型列表逻辑
  const handleFetchModels = async () => {
    if (!provider.apiKey || !provider.endpoint) {
      setError("请先填写 API Key 和 Endpoint")
      return
    }
    setIsFetching(true)
    setError(null)
    try {
      const baseUrl = provider.endpoint.replace(/\/+$/, '')
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      const models = data.data?.map((m: { id: string }) => m.id) || []
      setModelList(models.sort())
      setShowDropdown(true)
    } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
    finally { setIsFetching(false) }
  }

  const handleTestConnection = async () => {
    if (!provider.apiKey || !provider.endpoint) {
      setTestResult({ ok: false, msg: '请先填写 API Key 和 Endpoint' })
      return
    }
    setIsTesting(true)
    setTestResult(null)
    const base = provider.endpoint.replace(/\/+$/, '')
    const fmt = provider.apiFormat || 'openai'
    try {
      let res: Response
      if (fmt === 'anthropic') {
        res = await fetch(`${base}/messages`, {
          method: 'POST',
          headers: { 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model: provider.model || 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] })
        })
      } else if (fmt === 'gemini') {
        const model = provider.model || 'gemini-1.5-flash'
        res = await fetch(`${base}/models/${model}:generateContent?key=${provider.apiKey}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }], generationConfig: { maxOutputTokens: 1 } })
        })
      } else {
        res = await fetch(`${base}/chat/completions`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${provider.apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: provider.model || 'gpt-4o-mini', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] })
        })
      }
      if (res.ok || res.status === 400) {
        // 400 通常是参数问题但鉴权通过，视为连通
        setTestResult({ ok: true, msg: `Connected · HTTP ${res.status}` })
      } else {
        const body = await res.json().catch(() => ({}))
        const errMsg = body?.error?.message || body?.message || `HTTP ${res.status}`
        setTestResult({ ok: false, msg: errMsg })
      }
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : String(err) })
    } finally {
      setIsTesting(false)
    }
  }

  const handleJsonChange = (val: string) => {
    if (!val.trim()) {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : String(e));
    }
  }

  const roleTabs = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={10} /> },
    { id: 'embedding', label: 'Embed', icon: <Brain size={10} /> },
    { id: 'tts', label: 'TTS', icon: <Volume2 size={10} /> },
  ]

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full bg-transparent">
      <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar pb-32">

        <div className="flex items-center justify-between">
          <div className="flex gap-1 p-1 bg-gray-50 dark:bg-white/5 rounded-2xl border-0.5 border-gray-100 dark:border-white/5 w-fit">
            {roleTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => updateProvider(id, { type: t.id as Provider['type'] })}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[9px] uppercase tracking-widest transition-all ${provider.type === t.id || (!provider.type && t.id === 'chat') ? 'bg-blue-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          
          <button onClick={async () => { 
            const ok = await confirm('确定要删除该 API 配置节点吗？所有的绑定关系将失效。', {
              title: '确认删除节点？',
              confirmText: '确认删除',
              danger: true
            });
            if(ok) { removeProvider(id); onClose(); } 
          }} className="p-3 bg-red-500/5 hover:bg-red-500/10 text-red-400/60 hover:text-red-500 rounded-2xl border-0.5 border-transparent hover:border-red-500/20 transition-all">
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* 基础字段 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
          <div className="space-y-2">
            <label className="text-[8px] uppercase tracking-widest text-gray-400 font-bold ml-1 italic">Node Identifier // 名称</label>
            <input type="text" value={provider.name} onChange={(e) => updateProvider(id, { name: e.target.value })} 
              className="w-full bg-white dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-blue-400 transition-all shadow-sm" />
          </div>

          <div className="space-y-2">
            <label className="text-[8px] uppercase tracking-widest text-gray-400 font-bold ml-1 italic">API Protocol // 协议</label>
            <select value={provider.apiFormat || 'openai'} onChange={(e) => updateProvider(id, { apiFormat: e.target.value as Provider['apiFormat'] })}
              className="w-full bg-white dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-xs focus:outline-none appearance-none cursor-pointer shadow-sm">
              <option value="openai">OpenAI Standard</option>
              <option value="anthropic">Anthropic Native</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[8px] uppercase tracking-widest text-gray-400 font-bold ml-1 italic">Access Endpoint // 地址</label>
            <input type="text" value={provider.endpoint} onChange={(e) => updateProvider(id, { endpoint: e.target.value })}
              placeholder="https://api.openai.com/v1" 
              className="w-full bg-white dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-blue-400 transition-all shadow-sm" />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[8px] uppercase tracking-widest text-gray-400 font-bold ml-1 italic">Neural Token // API Key</label>
            <input type="password" value={provider.apiKey} onChange={(e) => updateProvider(id, { apiKey: e.target.value })}
              placeholder="sk-..." 
              className="w-full bg-white dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-blue-400 transition-all shadow-sm" />
          </div>

          <div className="md:col-span-2 space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[8px] uppercase tracking-widest text-gray-400 font-bold italic">Model ID // 模型名称</label>
              <div className="flex items-center gap-3">
                <button onClick={handleTestConnection} disabled={isTesting} className="text-[8px] uppercase tracking-widest text-purple-500 hover:opacity-70 transition-opacity flex items-center gap-1">
                  <Zap size={10} className={isTesting ? 'animate-pulse' : ''} /> {isTesting ? 'Testing...' : 'Test'}
                </button>
                <button onClick={handleFetchModels} disabled={isFetching} className="text-[8px] uppercase tracking-widest text-blue-500 hover:opacity-70 transition-opacity flex items-center gap-1">
                  <RefreshCw size={10} className={isFetching ? 'animate-spin' : ''} /> {isFetching ? 'Scanning...' : 'Fetch List'}
                </button>
              </div>
            </div>
            {testResult && (
              <p className={`text-[7px] uppercase font-bold tracking-tighter ml-1 ${testResult.ok ? 'text-green-500' : 'text-red-400 animate-pulse'}`}>
                {testResult.ok ? '✓' : '✗'} {testResult.msg}
              </p>
            )}
            <div className="relative">
              <input ref={inputRef} type="text" value={provider.model} 
                onChange={(e) => { updateProvider(id, { model: e.target.value }); setShowDropdown(true); }}
                onFocus={() => modelList.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="gpt-4o, tts-1, etc..."
                className={`w-full bg-white dark:bg-white/5 border-0.5 ${error ? 'border-red-400' : 'border-gray-100 dark:border-white/5'} rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-blue-400 transition-all shadow-sm`} />
              
              {error && <p className="text-[7px] text-red-400 mt-1 ml-1 uppercase font-bold tracking-tighter italic animate-pulse">Error: {error}</p>}

              {showDropdown && modelList.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-48 overflow-y-auto no-scrollbar glass-morphism rounded-2xl shadow-xl border-0.5 border-gray-100 dark:border-white/5 bg-white/95 dark:bg-black/90">
                  {modelList.map(m => (
                    <div key={m} onMouseDown={() => { updateProvider(id, { model: m }); setShowDropdown(false); }}
                      className={`px-5 py-3 text-[10px] cursor-pointer transition-colors border-b-0.5 border-gray-50 dark:border-gray-900 last:border-none uppercase tracking-widest ${m === provider.model ? 'text-blue-500 bg-blue-50/10' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}>{m}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 动态常规参数 */}
        {isChat && (
          <div className="pt-6 border-t-0.5 border-gray-100 dark:border-white/5 space-y-6">
            <div className="flex justify-between items-center group cursor-pointer" onClick={() => updateProvider(id, { stream: provider.stream !== false ? false : true })}>
              <label className="text-[9px] tracking-wide text-gray-400 uppercase italic cursor-pointer">Streaming // 流式传输</label>
              <div className={`w-8 h-4 rounded-full flex items-center transition-colors px-0.5 ${provider.stream !== false ? 'bg-green-400/50' : 'bg-gray-300 dark:bg-gray-700'}`}>
                <motion.div layout className="w-3 h-3 rounded-full bg-white shadow-sm" animate={{ x: provider.stream !== false ? 16 : 0 }} />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[9px] tracking-wide text-gray-400 uppercase italic">Temperature // 发散度</label>
                <span className="text-[10px] text-gray-500 font-mono">{provider.temperature ?? 0.7}</span>
              </div>
              <input type="range" min="0" max="2" step="0.1" value={provider.temperature ?? 0.7} onChange={(e) => updateProvider(id, { temperature: parseFloat(e.target.value) })} className="w-full accent-blue-500" />
            </div>
          </div>
        )}

        {/* 核心高级设置入口 (找回消失的功能) */}
        {isChat && (
          <div className="pt-4">
            <button 
              onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
              className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-gray-400 hover:text-blue-400 transition-colors px-1"
            >
              <Settings2 size={12} />
              Advanced Settings // 高级参数
              {isAdvancedExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>

            <AnimatePresence>
              {isAdvancedExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-8 mt-6 px-1"
                >
                  {/* Top-P */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] text-gray-400 uppercase italic">Top-P // 核采样</label>
                      <span className="text-[10px] text-gray-500 font-mono">{provider.topP ?? 1.0}</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={provider.topP ?? 1.0} onChange={(e) => updateProvider(id, { topP: parseFloat(e.target.value) })} className="w-full accent-blue-400" />
                  </div>

                  {/* Frequency Penalty */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] text-gray-400 uppercase italic">Frequency Penalty // 频率惩罚</label>
                      <span className="text-[10px] text-gray-500 font-mono">{provider.frequencyPenalty ?? 0}</span>
                    </div>
                    <input type="range" min="-2" max="2" step="0.05" value={provider.frequencyPenalty ?? 0} onChange={(e) => updateProvider(id, { frequencyPenalty: parseFloat(e.target.value) })} className="w-full accent-purple-400" />
                  </div>

                  {/* Presence Penalty */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[9px] text-gray-400 uppercase italic">Presence Penalty // 存在惩罚</label>
                      <span className="text-[10px] text-gray-500 font-mono">{provider.presencePenalty ?? 0}</span>
                    </div>
                    <input type="range" min="-2" max="2" step="0.05" value={provider.presencePenalty ?? 0} onChange={(e) => updateProvider(id, { presencePenalty: parseFloat(e.target.value) })} className="w-full accent-pink-400" />
                  </div>

                  {/* Context Window */}
                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-400 uppercase italic">Context Tokens // 上下文上限</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="number" 
                        value={provider.contextWindow ?? 128000} 
                        onChange={(e) => updateProvider(id, { contextWindow: parseInt(e.target.value) || 0 })}
                        className="flex-1 bg-white dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blue-400"
                      />
                      <span className="text-[8px] text-gray-400 uppercase font-mono">Tokens</span>
                    </div>
                  </div>

                  {/* Assistant Prefill */}
                  <div className="space-y-2">
                    <label className="text-[9px] text-gray-400 uppercase italic">Assistant Prefill // 助手引导语</label>
                    <textarea 
                      value={provider.assistantPrefill || ''} 
                      onChange={(e) => updateProvider(id, { assistantPrefill: e.target.value })}
                      placeholder="e.g. {char} 微微点头，轻声说道："
                      className="w-full bg-white dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-2xl p-4 text-xs font-serif leading-relaxed focus:outline-none focus:border-blue-400 min-h-[80px] resize-none"
                    />
                  </div>

                  {/* Custom Headers */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] text-gray-400 uppercase italic">Custom Headers // 自定义请求头 (JSON)</label>
                      {jsonError && <span className="text-[7px] text-red-400 font-bold uppercase animate-pulse">Invalid JSON Format</span>}
                    </div>
                    <textarea 
                      value={provider.customHeaders || ''} 
                      onChange={(e) => handleJsonChange(e.target.value)}
                      placeholder='{"HTTP-Referer": "https://echo.vn"}'
                      className={`w-full bg-white dark:bg-white/5 border-0.5 ${jsonError ? 'border-red-400/50' : 'border-gray-100 dark:border-white/5'} rounded-2xl p-4 text-[10px] font-mono leading-relaxed focus:outline-none focus:border-blue-400 min-h-[80px] resize-none transition-all shadow-sm`}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* TTS 专用参数 */}
        {isTts && (
          <div className="pt-6 border-t-0.5 border-gray-100 dark:border-white/5 space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] text-gray-400 uppercase italic">Default Voice // 默认音色 ID</label>
              <input
                type="text"
                value={provider.ttsVoice || ''}
                onChange={(e) => updateProvider(id, { ttsVoice: e.target.value })}
                placeholder="alloy / nova / shimmer ..."
                className="w-full bg-white dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-blue-400 transition-all shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] text-gray-400 uppercase italic">Audio Format // 音频格式</label>
              <select
                value={provider.ttsFormat || 'mp3'}
                onChange={(e) => updateProvider(id, { ttsFormat: e.target.value as Provider['ttsFormat'] })}
                className="w-full bg-white dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-2xl px-4 py-3 text-xs focus:outline-none appearance-none cursor-pointer shadow-sm"
              >
                <option value="mp3">MP3</option>
                <option value="opus">Opus</option>
                <option value="aac">AAC</option>
                <option value="flac">FLAC</option>
              </select>
            </div>
          </div>
        )}

        {/* Embedding 专用参数 */}
        {isEmbedding && (
          <div className="pt-6 border-t-0.5 border-gray-100 dark:border-white/5 space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] text-gray-400 uppercase italic">Dimensions // 向量维度（留空使用模型默认）</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={provider.embeddingDimensions ?? ''}
                  onChange={(e) => updateProvider(id, { embeddingDimensions: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="1536"
                  className="flex-1 bg-white dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-blue-400"
                />
                <span className="text-[8px] text-gray-400 uppercase font-mono">Dims</span>
              </div>
              <p className="text-[8px] text-gray-400 italic ml-1">text-embedding-3 系列支持降维以节省存储</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default ProviderEditor
