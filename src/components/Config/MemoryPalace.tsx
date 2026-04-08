import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Trash2, Edit3, Save, X, ChevronDown, ChevronUp, Search, Info, Zap, Check } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { db } from '../../storage/db'
import type { DBMemoryEpisode } from '../../storage/db'
import { memoryDistiller } from '../../logic/memoryDistiller'
import { useDialog } from '../GlobalDialog'

const MemoryPalace: React.FC = () => {
  const { currentAutoSlotId, config, activeEmbeddingProviderId, setActiveEmbeddingProviderId } = useAppStore()
  const { confirm } = useDialog()
  const [episodes, setEpisodes] = useState<DBMemoryEpisode[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditEditContent] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 加载碎片数据
  const loadData = async () => {
    if (!currentAutoSlotId) return
    const data = await db.memoryEpisodes
      .where('slotId')
      .equals(currentAutoSlotId)
      .sortBy('timestamp')
    setEpisodes(data.reverse())
    setIsLoading(false)
  }

  useEffect(() => { loadData() }, [currentAutoSlotId])

  const handleDelete = async (id: number) => {
    const ok = await confirm('确定要删除这段记忆碎片吗？此操作不可撤销。', {
      title: '确认删除记忆？',
      confirmText: '确认删除',
      danger: true
    })
    if (ok) {
      await db.memoryEpisodes.delete(id)
      loadData()
    }
  }

  const handleStartEdit = (ep: DBMemoryEpisode) => {
    setEditingId(ep.id!)
    setEditEditContent(ep.narrative)
  }

  const handleSaveEdit = async (ep: DBMemoryEpisode) => {
    const embProvider = config.providers.find(p => p.id === config.activeEmbeddingProviderId)
    if (!embProvider) return alert('请先配置默认嵌入模型')

    try {
      // 重新生成向量
      const newVector = await memoryDistiller.callEmbeddingAPI(embProvider, editContent)
      await db.memoryEpisodes.update(ep.id!, {
        narrative: editContent,
        narrativeVector: vectorMath.ensureFloat32(newVector)
      })
      setEditingId(null)
      loadData()
    } catch (e) {
      alert('同步记忆失败，请检查网络或配置')
    }
  }

  const filteredEpisodes = episodes.filter(ep => 
    ep.narrative.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ep.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const embeddingProviders = config.providers.filter(p => p.type === 'embedding')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full bg-transparent">
      {/* 顶部统计与搜索 */}
      <div className="p-6 space-y-4">
        <div className="bg-blue-500/5 dark:bg-white/5 rounded-[2.5rem] p-6 border-0.5 border-blue-100 dark:border-white/5 flex flex-col gap-5 shadow-sm">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner">
              <Brain size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-serif tracking-wide text-gray-700 dark:text-gray-200 font-bold italic">意识存档馆 // PALACE</h3>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase mt-1 tracking-widest font-mono">
                S-{currentAutoSlotId?.slice(0, 8)} // {episodes.length} SHARDS STORED
              </p>
            </div>
          </div>

          {/* 引擎绑定选择器 */}
          <div className="pt-4 border-t-0.5 border-gray-100 dark:border-white/5">
            <div className="flex justify-between items-center mb-3 px-1">
              <label className="text-[8px] uppercase tracking-[0.2em] text-gray-400 font-bold">Memory Engine // 记忆引擎绑定</label>
              <Zap size={10} className={activeEmbeddingProviderId ? 'text-blue-400' : 'text-gray-300'} />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {embeddingProviders.length === 0 ? (
                <div className="text-[8px] text-gray-400 uppercase italic py-2">请先在 API 参数中添加 Embedding 节点</div>
              ) : (
                embeddingProviders.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveEmbeddingProviderId(p.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] uppercase tracking-wider transition-all whitespace-nowrap border-0.5 ${activeEmbeddingProviderId === p.id ? 'bg-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/20' : 'bg-white/50 dark:bg-black/20 text-gray-400 border-gray-100 dark:border-white/5 hover:border-gray-200'}`}
                  >
                    {activeEmbeddingProviderId === p.id && <Check size={10} />}
                    {p.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="relative group px-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={14} />
          <input
            type="text"
            placeholder="搜索语义或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/50 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-2xl py-3 pl-12 pr-4 text-xs text-gray-600 dark:text-gray-300 focus:outline-none focus:border-blue-300 dark:focus:border-blue-900 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* 碎片列表 */}
      <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-4 no-scrollbar">
        {isLoading ? (
          <div className="flex justify-center py-20 animate-pulse text-gray-400 font-mono text-[10px] uppercase tracking-widest">Constructing Palace...</div>
        ) : filteredEpisodes.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-300 dark:text-gray-700">
            <Brain size={48} strokeWidth={0.5} className="mb-4 opacity-20" />
            <p className="text-[10px] uppercase tracking-widest">尚未产生远期记忆结晶</p>
          </div>
        ) : (
          filteredEpisodes.map((ep) => (
            <motion.div
              layout
              key={ep.id}
              className="group bg-white/60 dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-3xl p-5 hover:border-gray-300 dark:hover:border-white/10 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-wrap gap-1.5">
                  {ep.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 text-[8px] text-gray-400 dark:text-gray-500 rounded-full uppercase tracking-tighter">#{tag}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {editingId === ep.id ? (
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-red-400"><X size={14} /></button>
                  ) : (
                    <>
                      <button onClick={() => handleStartEdit(ep)} className="p-1.5 text-gray-400 hover:text-blue-400"><Edit3 size={14} /></button>
                      <button onClick={() => handleDelete(ep.id!)} className="p-1.5 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>

              {editingId === ep.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditEditContent(e.target.value)}
                    className="w-full bg-white dark:bg-black/20 border-0.5 border-blue-200 dark:border-blue-900 rounded-xl p-3 text-xs text-gray-600 dark:text-gray-300 focus:outline-none min-h-[80px] resize-none font-serif leading-relaxed"
                  />
                  <button
                    onClick={() => handleSaveEdit(ep)}
                    className="w-full py-2 bg-blue-500 text-white rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Save size={12} /> Sync to Memory
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-serif leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                    {ep.narrative}
                  </p>
                  
                  {/* 原子命题详情 */}
                  <div className="pt-2 border-t-0.5 border-gray-100 dark:border-white/5">
                    <button 
                      onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id!)}
                      className="flex items-center gap-2 text-[8px] uppercase tracking-widest text-gray-400 hover:text-gray-600"
                    >
                      {expandedId === ep.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      {expandedId === ep.id ? 'Hide Atomic Facts' : 'Reveal Atomic Facts'}
                    </button>
                    
                    <AnimatePresence>
                      {expandedId === ep.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-2 mt-3"
                        >
                          {ep.atomic.map((at, idx) => (
                            <div key={idx} className="flex items-start gap-3 bg-gray-50/50 dark:bg-white/5 p-3 rounded-xl border-0.5 border-gray-100 dark:border-transparent">
                              <span className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${at.importance === '高' ? 'bg-amber-400' : at.importance === '中' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                              <div className="flex-1">
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">{at.text}</p>
                                <span className="text-[7px] uppercase text-gray-400 mt-1 block opacity-50">Priority: {at.importance}</span>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              <div className="mt-4 text-[7px] text-gray-300 dark:text-gray-600 uppercase tracking-[0.2em] font-mono flex justify-between">
                <span>Stored: {new Date(ep.timestamp).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Info size={8} /> Semantic crystallized</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}

export default MemoryPalace
