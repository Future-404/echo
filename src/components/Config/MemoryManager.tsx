import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, Search, Info } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { db } from '../../storage/db'
import type { DBMemoryEpisode } from '../../storage/db'
import { memoryDistiller } from '../../logic/memoryDistiller'
import { vectorMath } from '../../utils/vectorMath'
import { useDialog } from '../GlobalDialog'

const MemoryManager: React.FC = () => {
  const { currentAutoSlotId, config } = useAppStore()
  const { confirm, alert } = useDialog()
  const [episodes, setEpisodes] = useState<DBMemoryEpisode[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editContent, setEditContent] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    const ok = await confirm('确定要删除这段记忆片段吗？此操作不可撤销。', {
      title: '确认删除',
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
    setEditContent(ep.narrative)
  }

  const handleSaveEdit = async (ep: DBMemoryEpisode) => {
    const embProvider = config.providers.find(p => p.id === config.modelConfig?.embeddingProviderId)
    if (!embProvider) { alert('请先配置并选择 Embedding 模型'); return }

    try {
      const newVector = await memoryDistiller.callEmbeddingAPI(embProvider, editContent)
      await db.memoryEpisodes.update(ep.id!, {
        narrative: editContent,
        narrativeVector: vectorMath.ensureFloat32(newVector)
      })
      setEditingId(null)
      loadData()
    } catch (e) {
      alert('更新失败，请检查网络或配置')
    }
  }

  const filteredEpisodes = episodes.filter(ep =>
    ep.narrative.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ep.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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
              <h3 className="text-sm font-serif tracking-wide text-echo-text-primary font-bold italic">记忆管理 // MEMORY</h3>
              <p className="text-[9px] text-echo-text-subtle uppercase mt-1 tracking-widest font-mono">
                S-{currentAutoSlotId?.slice(0, 8)} // {episodes.length} EPISODES
              </p>
            </div>
          </div>
        </div>

        <div className="relative group px-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={14} />
          <input
            type="text"
            placeholder="搜索内容或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/50 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-2xl py-3 pl-12 pr-4 text-xs text-echo-text-base focus:outline-none focus:border-blue-300 dark:focus:border-blue-900 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* 片段列表 */}
      <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-4 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
        {isLoading ? (
          <div className="flex justify-center py-20 animate-pulse text-gray-400 font-mono text-[10px] uppercase tracking-widest">Loading...</div>
        ) : filteredEpisodes.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-300 dark:text-gray-700">
            <Brain size={48} strokeWidth={0.5} className="mb-4 opacity-20" />
            <p className="text-[10px] uppercase tracking-widest">暂无记忆片段</p>
          </div>
        ) : (
          filteredEpisodes.map((ep) => (
            <motion.div
              layout
              key={ep.id}
              className="group bg-white/60 dark:bg-white/5 border-0.5 border-echo-border rounded-3xl p-5 hover:border-gray-300 dark:hover:border-white/10 transition-all"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-wrap gap-1.5">
                  {ep.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-echo-surface text-[8px] text-echo-text-subtle rounded-full uppercase tracking-tighter">#{tag}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  {editingId === ep.id ? (
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-red-400"><X size={14} /></button>
                  ) : (
                    <>
                      <button onClick={() => handleStartEdit(ep)} className="p-1.5 text-gray-400 hover:text-blue-400"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(ep.id!)} className="p-1.5 text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                    </>
                  )}
                </div>
              </div>

              {editingId === ep.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-white dark:bg-black/20 border-0.5 border-blue-200 dark:border-blue-900 rounded-xl p-3 text-xs text-echo-text-base focus:outline-none min-h-[80px] resize-none font-serif leading-relaxed"
                  />
                  <button
                    onClick={() => handleSaveEdit(ep)}
                    className="w-full py-2 bg-blue-500 text-white rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Save size={12} /> 保存并重新向量化
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-echo-text-base font-serif leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">
                    {ep.narrative}
                  </p>

                  {/* 原子命题详情 */}
                  <div className="pt-2 border-t-0.5 border-echo-border">
                    <button
                      onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id!)}
                      className="flex items-center gap-2 text-[8px] uppercase tracking-widest text-gray-400 hover:text-gray-600"
                    >
                      {expandedId === ep.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                      {expandedId === ep.id ? '收起原子命题' : '展开原子命题'}
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
                                <p className="text-[10px] text-echo-text-muted leading-normal">{at.text}</p>
                                <span className="text-[7px] uppercase text-gray-400 mt-1 block opacity-50">重要性: {at.importance}</span>
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
                <span>{new Date(ep.timestamp).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Info size={8} /> 已向量化</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}

export default MemoryManager
