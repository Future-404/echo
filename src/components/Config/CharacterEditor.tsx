import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Check, Globe, Plus, Book, Settings2, Edit2, ChevronDown, ChevronUp, Key } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { WorldBookEntry } from '../../store/useAppStore'
import StatusParserEditor from './StatusParserEditor'

interface CharacterEditorProps {
  charId: string
  onClose: () => void
}

const CharacterEditor: React.FC<CharacterEditorProps> = ({ charId, onClose }) => {
  const { 
    characters, updateCharacter, removeCharacter, config, 
    addPrivateWorldBookEntry, updatePrivateWorldBookEntry, removePrivateWorldBookEntry 
  } = useAppStore()
  
  const char = characters.find(c => c.id === charId)
  if (!char) return null

  const library = config.worldBookLibrary || []
  const boundBookIds = char.extensions?.worldBookIds || []
  const privateEntries = char.extensions?.worldBook || []

  // 1. 公共书库绑定逻辑
  const toggleBookBinding = (bookId: string) => {
    const currentIds = [...boundBookIds]
    const index = currentIds.indexOf(bookId)
    if (index > -1) {
      currentIds.splice(index, 1)
    } else {
      currentIds.push(bookId)
    }
    updateCharacter(charId, { 
      extensions: { ...char.extensions, worldBookIds: currentIds } 
    })
  }

  // 2. 私人记忆编辑逻辑
  const [isAddingPrivate, setIsAddingPrivate] = useState(false)
  const [expandedPrivateId, setExpandedPrivateId] = useState<string | null>(null)
  const [newKeys, setNewKeys] = useState('')
  const [newContent, setNewContent] = useState('')

  const handleAddPrivate = () => {
    if (!newContent.trim()) return
    const entry: WorldBookEntry = {
      id: `private_${Date.now()}`,
      keys: newKeys.split(',').map(k => k.trim()).filter(Boolean),
      content: newContent,
      enabled: true,
      comment: '私人记忆'
    }
    addPrivateWorldBookEntry(entry)
    setNewKeys('')
    setNewContent('')
    setIsAddingPrivate(false)
  }

  const [isParsersExpanded, setIsParsersExpanded] = React.useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-white/20 dark:bg-black/40 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-echo-white dark:bg-[#121212] rounded-[2.5rem] md:rounded-[3rem] border-0.5 border-echo-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh]"
      >
        <header className="p-6 md:p-8 pb-4 flex justify-between items-center border-b-0.5 border-gray-100 dark:border-gray-800">
          <div className="flex flex-col text-left">
            <h2 className="text-[10px] tracking-[0.6em] text-gray-400 uppercase">Core // Identifier</h2>
            <p className="text-[8px] text-gray-300 uppercase mt-1 italic">Rewrite Neural Pattern</p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X size={20} strokeWidth={1} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-10 no-scrollbar text-left pb-32">
          {/* 头像 */}
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-50 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 flex items-center justify-center overflow-hidden p-4 group relative">
              <img src={char.image} alt={char.name} className="w-full h-full object-contain grayscale" />
            </div>
          </div>

          {/* 角色名 */}
          <div className="group text-left">
            <label className="text-[9px] tracking-widest text-gray-300 uppercase mb-3 block italic">Identifier Name // 角色名</label>
            <input 
              type="text" 
              value={char.name} 
              onChange={(e) => updateCharacter(charId, { name: e.target.value })}
              className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-2 text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:border-gray-400"
            />
          </div>

          {/* 开场白 - 恢复此功能 */}
          <div className="group text-left">
            <label className="text-[9px] tracking-widest text-gray-300 uppercase mb-3 block italic underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Neural Greeting // 开场白</label>
            <textarea 
              value={char.greeting || ''} 
              onChange={(e) => updateCharacter(charId, { greeting: e.target.value })}
              placeholder="AI 的第一句话..."
              className="w-full bg-white/30 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-3xl p-6 text-sm text-gray-500 dark:text-gray-400 font-serif leading-relaxed focus:outline-none focus:border-gray-300 min-h-[100px] resize-none no-scrollbar"
            />
          </div>

          {/* 人格设定 */}
          <div className="group text-left">
            <label className="text-[9px] tracking-widest text-gray-300 uppercase mb-3 block italic underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Neural Personality // 人格设定</label>
            <textarea 
              value={char.systemPrompt} 
              onChange={(e) => updateCharacter(charId, { systemPrompt: e.target.value })}
              className="w-full bg-white/30 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-3xl p-6 text-sm text-gray-500 dark:text-gray-400 font-serif leading-relaxed focus:outline-none focus:border-gray-300 min-h-[150px] resize-none no-scrollbar"
            />
          </div>

          {/* 1. 公共书库绑定 */}
          <div className="space-y-6 pt-6 border-t-0.5 border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] tracking-widest text-gray-400 uppercase italic flex items-center gap-2">
                <Book size={12} /> Codex Binding // 书库绑定
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {library.length === 0 ? (
                <p className="text-[9px] text-gray-300 italic text-center py-4 opacity-50">书库暂无书籍可绑定</p>
              ) : (
                library.map((book) => {
                  const isBound = boundBookIds.includes(book.id)
                  return (
                    <button key={book.id} onClick={() => toggleBookBinding(book.id)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isBound ? 'bg-blue-500/10 border-blue-400/30 text-blue-600 dark:text-blue-400' : 'bg-transparent border-gray-100 dark:border-white/5 text-gray-400'}`}>
                      <div className="flex items-center gap-3">
                        <Book size={14} className={isBound ? 'opacity-100' : 'opacity-40'} />
                        <span className="text-[11px] font-serif font-bold">{book.name}</span>
                      </div>
                      {isBound ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-200 dark:border-white/10" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* 2. 角色私设 (独有) - 全量注入逻辑 */}
          <div className="space-y-6 pt-6 border-t-0.5 border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] tracking-widest text-gray-400 uppercase italic flex items-center gap-2">
                <Globe size={12} /> Character Private Settings // 角色私设
              </label>
              <button onClick={() => setIsAddingPrivate(!isAddingPrivate)} className="p-1.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-all">
                <Plus size={14} />
              </button>
            </div>


            {isAddingPrivate && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 space-y-3">
                <input placeholder="Memory Tag (Optional)" value={newKeys} onChange={e => setNewKeys(e.target.value)} className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 text-[10px] py-1 focus:outline-none" />
                <textarea placeholder="The character's immutable knowledge..." value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full bg-transparent text-[11px] font-serif min-h-[80px] resize-none focus:outline-none text-gray-600 dark:text-gray-300" />
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setIsAddingPrivate(false)} className="text-[8px] uppercase tracking-widest text-gray-400 px-3 py-1">Cancel</button>
                  <button onClick={handleAddPrivate} className="text-[8px] uppercase tracking-widest bg-blue-500/10 text-blue-500 font-bold px-3 py-1 rounded-lg">Store</button>
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              {privateEntries.length === 0 ? (
                <p className="text-[9px] text-gray-300 italic text-center py-4 opacity-50">暂无私人记忆碎片</p>
              ) : (
                privateEntries.map((entry) => (
                  <div key={entry.id} className="bg-white/50 dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden transition-all group">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer" onClick={() => setExpandedPrivateId(expandedPrivateId === entry.id ? null : entry.id)}>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[10px] font-serif font-bold text-gray-700 dark:text-gray-200 truncate">{entry.comment || entry.content.slice(0, 30)}</span>
                          <span className="text-[7px] font-mono text-gray-400 truncate opacity-60 italic">{entry.keys.join(', ') || 'Global Identity Pattern'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* 改进开关按钮：使用 Switch 样式 */}
                        <button 
                          onClick={() => updatePrivateWorldBookEntry(entry.id, { enabled: !entry.enabled })}
                          className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${entry.enabled ? 'bg-orange-400/50' : 'bg-gray-300 dark:bg-gray-700'}`}
                        >
                          <motion.div 
                            layout 
                            className="w-3 h-3 rounded-full bg-white shadow-sm" 
                            animate={{ x: entry.enabled ? 16 : 0 }} 
                          />
                        </button>

                        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                          <button onClick={() => removePrivateWorldBookEntry(entry.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                            <Trash2 size={12} />
                          </button>
                          <button onClick={() => setExpandedPrivateId(expandedPrivateId === entry.id ? null : entry.id)} className="p-1.5 text-gray-300">
                            {expandedPrivateId === entry.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedPrivateId === entry.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4 border-t border-gray-100 dark:border-white/5 pt-4 space-y-3">
                          <textarea 
                            value={entry.content} 
                            onChange={(e) => updatePrivateWorldBookEntry(entry.id, { content: e.target.value })}
                            className="w-full bg-white dark:bg-black/20 border-0.5 border-gray-100 dark:border-white/10 rounded-xl px-3 py-2 text-[11px] font-serif min-h-[100px] focus:outline-none focus:border-orange-400/50 transition-colors resize-none no-scrollbar"
                          />
                          <input 
                            placeholder="Label" 
                            value={entry.comment || ''} 
                            onChange={e => updatePrivateWorldBookEntry(entry.id, { comment: e.target.value })}
                            className="bg-transparent text-[9px] italic text-gray-400 focus:outline-none w-full px-1"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 高级解析规则模块 */}
          <div className="space-y-6 pt-6 border-t-0.5 border-gray-100 dark:border-gray-800 pb-10">
            <div className="flex justify-between items-center px-2 cursor-pointer group" onClick={() => setIsParsersExpanded(!isParsersExpanded)}>
              <label className="text-[10px] tracking-widest text-gray-400 uppercase italic flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                <Settings2 size={12} /> Advanced // 解析规则
              </label>
              <div className="text-[8px] font-mono text-gray-300 uppercase tracking-widest">{isParsersExpanded ? 'Collapse' : 'Expand'}</div>
            </div>
            <AnimatePresence>
              {isParsersExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-gray-50/50 dark:bg-white/5 rounded-[2rem] border border-gray-100 dark:border-white/5">
                  <StatusParserEditor />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <footer className="absolute bottom-0 left-0 right-0 p-6 md:p-8 pt-4 border-t-0.5 border-gray-100 dark:border-gray-800 flex gap-4 bg-echo-white dark:bg-[#121212] z-50">
          <button onClick={() => { removeCharacter(charId); onClose(); }} className="flex-1 py-3 md:py-4 flex items-center justify-center gap-2 border-0.5 border-red-100 dark:border-red-900/30 text-red-300 rounded-full text-[10px] tracking-widest uppercase hover:bg-red-50 transition-all"><Trash2 size={14} /> Purge</button>
          <button onClick={onClose} className="flex-[2] py-3 md:py-4 bg-white dark:bg-gray-900 border-0.5 border-gray-200 dark:border-gray-800 rounded-full text-[10px] tracking-widest uppercase text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center gap-2 shadow-sm"><Check size={14} /> Commit Sync</button>
        </footer>
      </motion.div>
    </motion.div>
  )
}

export default CharacterEditor
