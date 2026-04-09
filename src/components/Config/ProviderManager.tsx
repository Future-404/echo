import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit3, Trash2, Check, MessageSquare, Brain, Volume2, ChevronRight, ChevronDown, Cpu } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useDialog } from '../GlobalDialog'

interface ProviderManagerProps {
  onEdit: (id: string) => void
}

// 模型分配行
const AssignRow: React.FC<{
  label: string
  sub: string
  value: string
  options: { id: string; name: string; model: string }[]
  onChange: (id: string) => void
}> = ({ label, sub, value, options, onChange }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="w-20 shrink-0">
      <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-[7px] text-gray-300 dark:text-gray-600 uppercase tracking-widest">{sub}</p>
    </div>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="flex-1 bg-white/60 dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-xl px-3 py-1.5 text-[10px] text-gray-600 dark:text-gray-300 focus:outline-none focus:border-blue-400/50 transition-colors"
    >
      <option value="">— 未指定 —</option>
      {options.map(p => (
        <option key={p.id} value={p.id}>{p.name} · {p.model || 'default'}</option>
      ))}
    </select>
  </div>
)

const ProviderManager: React.FC<ProviderManagerProps> = ({ onEdit }) => {
  const { confirm } = useDialog()
  const { 
    config, setActiveProvider, removeProvider,
    setModelConfig, addProvider
  } = useAppStore()
  
  const [activeTab, setActiveTab] = useState<'chat' | 'embedding' | 'tts'>('chat')
  const [assignOpen, setAssignOpen] = useState(true)
  const providers = (config?.providers || []).filter(p => p.type === activeTab || (!p.type && activeTab === 'chat'))

  const mc = config.modelConfig
  const chatProviders = (config.providers || []).filter(p => p.type === 'chat' || !p.type)
  const embProviders = (config.providers || []).filter(p => p.type === 'embedding')
  const ttsProviders = (config.providers || []).filter(p => p.type === 'tts')

  const getActiveId = () => {
    if (activeTab === 'chat') return mc?.chatProviderId || config.activeProviderId
    if (activeTab === 'embedding') return mc?.embeddingProviderId
    return mc?.ttsProviderId
  }

  const handleSetActive = (id: string) => {
    if (activeTab === 'chat') { setActiveProvider(id); setModelConfig({ chatProviderId: id }) }
    else if (activeTab === 'embedding') setModelConfig({ embeddingProviderId: id })
    else setModelConfig({ ttsProviderId: id })
  }

  const tabs = [
    { id: 'chat', label: 'LLM', icon: <MessageSquare size={12} /> },
    { id: 'embedding', label: 'Embed', icon: <Brain size={12} /> },
    { id: 'tts', label: 'TTS', icon: <Volume2 size={12} /> },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-transparent">

      {/* ── 模型分配 ── */}
      <div className="px-6 pt-5 pb-3 border-b-0.5 border-gray-100 dark:border-white/5">
        <button
          onClick={() => setAssignOpen(v => !v)}
          className="w-full flex items-center justify-between mb-1"
        >
          <div className="flex items-center gap-2">
            <Cpu size={11} className="text-blue-400" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">模型分配</span>
          </div>
          {assignOpen ? <ChevronDown size={12} className="text-gray-300" /> : <ChevronRight size={12} className="text-gray-300" />}
        </button>

        <AnimatePresence initial={false}>
          {assignOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-1 divide-y-0.5 divide-gray-50 dark:divide-white/5">
                <AssignRow label="主对话" sub="Chat" value={mc?.chatProviderId || ''} options={chatProviders} onChange={id => { setActiveProvider(id); setModelConfig({ chatProviderId: id }) }} />
                <AssignRow label="摘要" sub="Summary" value={mc?.summaryProviderId || ''} options={chatProviders} onChange={id => setModelConfig({ summaryProviderId: id })} />
                <AssignRow label="路由" sub="Router" value={mc?.routerProviderId || ''} options={chatProviders} onChange={id => setModelConfig({ routerProviderId: id })} />
                <AssignRow label="嵌入" sub="Embedding" value={mc?.embeddingProviderId || ''} options={embProviders} onChange={id => setModelConfig({ embeddingProviderId: id })} />
                <AssignRow label="语音" sub="TTS" value={mc?.ttsProviderId || ''} options={ttsProviders} onChange={id => setModelConfig({ ttsProviderId: id })} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 页签 ── */}
      <div className="px-6 pt-4 pb-2 flex gap-3 overflow-x-auto no-scrollbar border-b-0.5 border-gray-100 dark:border-white/5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 px-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all relative ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`}
          >
            <span className="flex items-center gap-2">{tab.icon} {tab.label}</span>
            {activeTab === tab.id && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center px-2">
          <label className="text-[8px] font-mono tracking-widest text-gray-400 uppercase italic">Nodes // {activeTab}</label>
          <button 
            onClick={() => {
              const newId = `provider-${Date.now()}`;
              addProvider({ 
                id: newId, 
                name: 'New Node', 
                apiKey: '', 
                endpoint: 'https://api.openai.com/v1', 
                model: activeTab === 'embedding' ? 'text-embedding-3-small' : 'gpt-4o',
                type: activeTab
              });
              onEdit(newId);
            }} 
            className="w-7 h-7 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-sm"
          >
            <Plus size={14} strokeWidth={2.5} />
          </button>
        </div>

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {providers.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 opacity-20">
                <Plus size={32} strokeWidth={0.5} />
                <p className="text-[8px] uppercase tracking-widest">点击上方 + 号添加节点</p>
              </div>
            ) : (
              providers.map(p => (
                <motion.div 
                  layout key={p.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  className={`group relative p-4 rounded-2xl border transition-all flex items-center gap-4 ${getActiveId() === p.id ? 'border-blue-400/50 bg-blue-500/5 dark:bg-white/5' : 'border-gray-100 dark:border-white/5 bg-white/30 dark:bg-transparent hover:border-gray-200'}`}
                >
                  <div onClick={() => handleSetActive(p.id)} className="flex-1 cursor-pointer min-w-0">
                    <h4 className="text-xs font-serif text-gray-700 dark:text-gray-200 flex items-center gap-2 truncate">
                      {p.name}
                      {getActiveId() === p.id && <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />}
                    </h4>
                    <p className="text-[7px] text-gray-400 uppercase mt-0.5 tracking-tighter truncate font-mono">{p.model || 'DEFAULT'}</p>
                  </div>
                  <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(p.id)} className="p-2 text-gray-500 hover:text-blue-500 transition-colors"><Edit3 size={12} /></button>
                    <button onClick={async () => { 
                      const ok = await confirm('确定要删除该 API 配置节点吗？这将导致关联模型失效。', { 
                        title: '确认删除节点？', 
                        confirmText: '确认删除', 
                        danger: true 
                      });
                      if(ok) removeProvider(p.id) 
                    }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={12} /></button>
                  </div>
                  <ChevronRight size={10} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default ProviderManager
