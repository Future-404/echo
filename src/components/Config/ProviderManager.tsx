import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, Trash2, MessageSquare, Brain, Volume2, ChevronRight, Cpu, Activity, FileText, Shuffle, Puzzle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { useDialog } from '../GlobalDialog'

interface ProviderManagerProps {
  onEdit: (id: string) => void
}

// 核心分配卡片
const AssignCard: React.FC<{
  label: string
  sub: string
  description: string
  value: string
  icon: React.ReactNode
  options: { id: string; name: string; model: string }[]
  onChange: (id: string) => void
  colorClass: string
}> = ({ label, sub, description, value, icon, options, onChange, colorClass }) => {
  const activeNode = options.find(o => o.id === value)
  const activeName = activeNode?.name || '未指定'
  
  return (
    <div className="relative group overflow-hidden p-4 rounded-2xl border border-echo-border bg-white/40 dark:bg-white/[0.03] hover:bg-white/60 dark:hover:bg-white/5 transition-all">
      <div className={`absolute top-0 right-0 w-16 h-16 -mr-4 -mt-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity ${colorClass}`}>
        {icon}
      </div>
      
      <div className="flex flex-col gap-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-current opacity-20 ${colorClass}`} />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-echo-text-primary tracking-wide">{label}</span>
            <span className="text-[7px] text-echo-text-muted uppercase font-mono">{description}</span>
          </div>
        </div>

        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-transparent border-none p-0 text-[11px] font-serif text-echo-text-base focus:outline-none cursor-pointer appearance-none"
        >
          <option value="">— 点击分配 —</option>
          {options.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        
        <p className="text-[8px] font-mono text-blue-500/60 truncate uppercase tracking-tighter">
          Current: {activeName}
        </p>
      </div>
    </div>
  )
}

const ProviderManager: React.FC<ProviderManagerProps> = ({ onEdit }) => {
  const { confirm } = useDialog()
  const { 
    config, setActiveProvider, removeProvider,
    setModelConfig, addProvider
  } = useAppStore()
  
  const [activeTab, setActiveTab] = useState<'chat' | 'embedding' | 'tts'>('chat')
  
  const mc = config.modelConfig
  const chatProviders = (config.providers || []).filter(p => p.type === 'chat' || !p.type)
  const embProviders = (config.providers || []).filter(p => p.type === 'embedding')
  const ttsProviders = (config.providers || []).filter(p => p.type === 'tts')

  const providers = (config?.providers || []).filter(p => p.type === activeTab || (!p.type && activeTab === 'chat'))

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-transparent px-6 pb-10">
      
      {/* ── 模型分配 ── */}
      <section className="mt-4 mb-8">
        <div className="flex items-center gap-2 mb-4 px-2">
          <Activity size={12} className="text-echo-text-dim" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-echo-text-muted">模型映射 // ALLOCATION</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <AssignCard 
            label="对话" sub="Chat" description="默认对话模型建议高级模型" colorClass="text-blue-500"
            icon={<MessageSquare size={48} />}
            value={mc?.chatProviderId || ''} options={chatProviders}
            onChange={id => { setActiveProvider(id); setModelConfig({ chatProviderId: id }) }}
          />
          <AssignCard 
            label="摘要 " sub="Summary" description="RAG分段模型建议轻量模型" colorClass="text-emerald-500"
            icon={<FileText size={48} />}
            value={mc?.summaryProviderId || ''} options={chatProviders}
            onChange={id => setModelConfig({ summaryProviderId: id })}
          />
          <AssignCard 
            label="路由 " sub="Router" description="多角色路由建议轻量模型" colorClass="text-amber-500"
            icon={<Shuffle size={48} />}
            value={mc?.routerProviderId || ''} options={chatProviders}
            onChange={id => setModelConfig({ routerProviderId: id })}
          />
          <AssignCard 
            label="工具" sub="Tool" description="AI 协助创作、角色卡生成" colorClass="text-pink-500"
            icon={<Cpu size={48} />}
            value={mc?.toolProviderId || ''} options={chatProviders}
            onChange={id => setModelConfig({ toolProviderId: id })}
          />
          <AssignCard 
            label="扩展" sub="Extension" description="扩展应用独立请求（查手机等），不占主对话 Token" colorClass="text-orange-500"
            icon={<Puzzle size={48} />}
            value={mc?.extensionProviderId || ''} options={chatProviders}
            onChange={id => setModelConfig({ extensionProviderId: id })}
          />
          <AssignCard 
            label="嵌入" sub="Embed" description="长效记忆与知识库搜索" colorClass="text-purple-500"
            icon={<Brain size={48} />}
            value={mc?.embeddingProviderId || ''} options={embProviders}
            onChange={id => setModelConfig({ embeddingProviderId: id })}
          />
          <AssignCard 
            label="语音" sub="" description="角色语音合成与朗读" colorClass="text-orange-500"
            icon={<Volume2 size={48} />}
            value={mc?.ttsProviderId || ''} options={ttsProviders}
            onChange={id => setModelConfig({ ttsProviderId: id })}
          />
        </div>
      </section>

      {/* ── 节点列表 ── */}
      <section className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-4 px-2 border-t border-echo-border pt-6">
          <div className="flex gap-4">
            {(['chat', 'embedding', 'tts'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`text-[9px] uppercase tracking-widest font-bold transition-all ${activeTab === tab ? 'text-echo-text-primary underline underline-offset-8 decoration-2 decoration-blue-500' : 'text-echo-text-dim'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => {
              const newId = `provider-${Date.now()}`;
              addProvider({ 
                id: newId, 
                name: '新 API 节点', 
                apiKey: '', 
                endpoint: 'https://api.openai.com/v1', 
                model: activeTab === 'embedding' ? 'text-embedding-3-small' : 'gpt-4o',
                type: activeTab
              });
              onEdit(newId);
            }} 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500 text-white text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
          >
            <Plus size={12} strokeWidth={3} /> 添加节点
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-8">
          <AnimatePresence mode="popLayout">
            {providers.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-echo-border rounded-[2rem] flex flex-col items-center justify-center gap-3 opacity-20">
                <Cpu size={32} strokeWidth={1} />
                <p className="text-[10px] font-serif italic tracking-widest">请点击右上角添加 API 节点</p>
              </div>
            ) : (
              providers.map(p => (
                <motion.div 
                  layout key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className={`group relative p-5 rounded-2xl border transition-all flex items-center gap-4 ${getActiveId() === p.id ? 'border-blue-500/30 bg-blue-500/[0.03]' : 'border-echo-border bg-white/20 dark:bg-white/[0.01] hover:border-gray-300 dark:hover:border-gray-700'}`}
                >
                  <div onClick={() => handleSetActive(p.id)} className="flex-1 cursor-pointer min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-serif text-echo-text-base truncate">{p.name}</h4>
                      {getActiveId() === p.id && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[7px] font-bold uppercase tracking-tighter">
                          <Activity size={8} className="animate-pulse" /> In Use
                        </div>
                      )}
                    </div>
                    <p className="text-[8px] font-mono text-echo-text-muted uppercase tracking-widest truncate">{p.model || 'DEFAULT_MODEL'}</p>
                  </div>

                  <div className="flex gap-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(p.id)} className="p-2.5 rounded-full bg-white dark:bg-white/5 border border-echo-border text-gray-500 hover:text-blue-500 transition-all"><Edit2 size={12} /></button>
                    <button onClick={async () => { 
                      const ok = await confirm('确定要删除该 API 节点吗？', { 
                        title: '删除节点', 
                        confirmText: '删除', 
                        danger: true 
                      });
                      if(ok) removeProvider(p.id) 
                    }} className="p-2.5 rounded-full bg-white dark:bg-white/5 border border-echo-border text-gray-400 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </section>
    </motion.div>
  )
}

export default ProviderManager
