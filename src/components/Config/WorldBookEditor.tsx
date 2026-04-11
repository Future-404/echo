import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ChevronDown, ChevronUp, Book, Key, ArrowLeft, Edit2, Settings, Upload } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { WorldBook } from '../../types/store'
import { useDialog } from '../GlobalDialog'
import { Toggle } from '../ui'
import { readFileAsText } from '../../utils/fileUtils'

const WorldBookEditor: React.FC = () => {
  const { 
    config, addWorldBook, updateWorldBook, removeWorldBook,
    addWorldBookEntry, updateWorldBookEntry, removeWorldBookEntry
  } = useAppStore()
  const { alert } = useDialog()
  
  const library = config.worldBookLibrary || []
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedBook = library.find(b => b.id === selectedBookId)

  const handleCreateBook = () => {
    const newBook: WorldBook = {
      id: `book_${Date.now()}`,
      name: '未命名世界书',
      entries: []
    }
    addWorldBook(newBook)
    setSelectedBookId(newBook.id)
    // 自动触发添加第一个空条目，方便用户直接编辑
    setTimeout(() => {
      const firstEntry: WorldBookEntry = {
        id: `entry_${Date.now()}`,
        keys: [],
        content: '',
        enabled: true,
        comment: '初始条目'
      }
      addWorldBookEntry(newBook.id, firstEntry)
      setExpandedEntryId(firstEntry.id)
    }, 100)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const content = await readFileAsText(file)
    let newBook: WorldBook | null = null

    if (file.name.endsWith('.json')) {
      try {
        const data = JSON.parse(content)
        const rawEntries = Array.isArray(data) ? data : (Array.isArray(data.entries) ? data.entries : [])
        newBook = {
          id: `book_${Date.now()}`,
          name: data.name || file.name.replace('.json', ''),
          entries: rawEntries.map((e: any) => ({
            id: e.id || `entry_${Math.random().toString(36).substr(2, 9)}`,
            keys: Array.isArray(e.keys) ? e.keys : (e.key ? [e.key] : []),
            content: e.content || e.value || '',
            enabled: true,
            comment: e.comment || e.name || '导入条目'
          }))
        }
      } catch (err) {
        alert('JSON 解析失败，请检查格式')
      }
    } else if (file.name.endsWith('.txt')) {
      newBook = {
        id: `book_${Date.now()}`,
        name: file.name.replace('.txt', ''),
        entries: [{
          id: `entry_${Date.now()}`,
          keys: [],
          content,
          enabled: true,
          comment: '全文本导入'
        }]
      }
    }

    if (newBook) {
      addWorldBook(newBook)
      alert(`成功导入：${newBook.name} (${newBook.entries.length} 条目)`)
    }
    if (e.target) e.target.value = ''
  }

  const handleAddEntry = () => {
    if (!selectedBookId) return
    const newEntry: WorldBookEntry = {
      id: `entry_${Date.now()}`,
      keys: [],
      content: '',
      enabled: true,
      comment: '新知识条目'
    }
    addWorldBookEntry(selectedBookId, newEntry)
    setExpandedEntryId(newEntry.id)
  }

  // --- 视图 1: 书库列表 ---
  if (!selectedBookId) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 h-full flex flex-col space-y-6">
        <div className="flex justify-between items-end px-2">
          <div className="flex flex-col">
            <label className="text-xs font-serif tracking-widest text-echo-text-muted font-medium flex items-center gap-2">
              <Book size={14} /> 世界书库 // Library
            </label>
            <span className="text-[7px] text-echo-text-dim uppercase tracking-[0.2em] mt-0.5">Manage your lore collections</span>
          </div>
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".json,.txt" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-white dark:bg-white/5 border border-echo-border-md rounded-full text-gray-400 hover:text-blue-500 transition-all shadow-sm"
              title="导入 JSON/TXT"
            >
              <Upload size={14} />
            </button>
            <button 
              onClick={handleCreateBook} 
              className="p-2 bg-white dark:bg-white/5 border border-echo-border-md rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-all shadow-sm"
              title="新建世界书"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
          {library.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-700 opacity-50 space-y-2">
              <Book size={32} strokeWidth={0.5} />
              <p className="text-[10px] uppercase tracking-widest">Library is empty</p>
            </div>
          ) : (
            library.map(book => (
              <div 
                key={book.id} 
                onClick={() => setSelectedBookId(book.id)}
                className="group p-4 bg-white/50 dark:bg-white/5 border border-echo-border rounded-2xl cursor-pointer hover:border-blue-400/30 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Book size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-serif font-bold text-echo-text-primary">{book.name}</h4>
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest">{book.entries.length} Entries</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeWorldBook(book.id); }}
                  className="p-2 text-gray-400 hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>
    )
  }

  // --- 视图 2: 编辑书籍条目 ---
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between px-2">
        <button onClick={() => setSelectedBookId(null)} className="flex items-center gap-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
          <ArrowLeft size={14} />
          <span className="text-[10px] uppercase tracking-widest">Back</span>
        </button>
        <button onClick={handleAddEntry} className="p-2 bg-white dark:bg-white/5 border border-echo-border-md rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-all">
          <Plus size={14} />
        </button>
      </div>

      <div className="px-2">
        <input 
          type="text"
          value={selectedBook?.name}
          onChange={(e) => updateWorldBook(selectedBookId, { name: e.target.value })}
          className="bg-transparent border-none text-xl font-serif font-bold text-gray-800 dark:text-white focus:outline-none w-full"
          placeholder="Book Name"
        />
        <div className="flex items-center gap-3 mt-2">
          <p className="text-[9px] text-gray-400 uppercase tracking-widest italic">按 Key 触发</p>
          <label className="flex items-center gap-1.5 ml-auto">
            <span className="text-[8px] uppercase tracking-widest text-gray-400">扫描深度</span>
            <input
              type="number"
              min={1}
              max={50}
              value={selectedBook?.scanDepth ?? 3}
              onChange={(e) => updateWorldBook(selectedBookId, { scanDepth: Math.max(1, parseInt(e.target.value) || 3) })}
              className="w-12 text-center bg-white dark:bg-black/30 border border-echo-border-md rounded-lg px-1 py-0.5 text-[10px] font-mono focus:outline-none focus:border-blue-400/50"
            />
            <span className="text-[8px] text-gray-400">条</span>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar pb-10">
        {selectedBook?.entries.map((entry) => (
          <div key={entry.id} className="bg-white/50 dark:bg-white/5 border-0.5 border-echo-border rounded-2xl overflow-hidden transition-all">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer group"
              onClick={() => setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id)}
            >
              <div className="flex items-center gap-3 overflow-hidden flex-1">
                <div className={`w-1.5 h-1.5 rounded-full ${entry.constant ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : entry.enabled ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[10px] font-serif font-bold text-echo-text-primary truncate">{entry.comment || 'Untitled Entry'}</span>
                  <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <Key size={8} className="text-gray-400" />
                    <span className="text-[8px] font-mono text-gray-400 truncate italic">
                      {entry.keys.length > 0 ? entry.keys.join(', ') : 'Always Active when bound'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); removeWorldBookEntry(selectedBookId, entry.id); }}
                  className="p-1.5 text-gray-400 hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={12} />
                </button>
                {expandedEntryId === entry.id ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </div>
            </div>

            <AnimatePresence>
              {expandedEntryId === entry.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 border-t border-echo-border space-y-4 pt-4"
                >
                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest text-gray-400 ml-1">Trigger Keywords (Comma separated)</label>
                    <input 
                      type="text" 
                      value={entry.keys.join(', ')} 
                      onChange={(e) => updateWorldBookEntry(selectedBookId, entry.id, { keys: e.target.value.split(',').map(k => k.trim()).filter(Boolean) })}
                      placeholder="e.g. system, magic, empire"
                      className="w-full bg-white dark:bg-black/20 border-0.5 border-echo-border-md rounded-xl px-3 py-2 text-[10px] font-mono focus:outline-none focus:border-blue-400/50 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] uppercase tracking-widest text-gray-400 ml-1">Lore Content</label>
                    <textarea 
                      value={entry.content} 
                      onChange={(e) => updateWorldBookEntry(selectedBookId, entry.id, { content: e.target.value })}
                      placeholder="Enter the details..."
                      className="w-full bg-white dark:bg-black/20 border-0.5 border-echo-border-md rounded-xl px-3 py-2 text-[11px] font-serif min-h-[120px] focus:outline-none focus:border-blue-400/50 transition-colors resize-none no-scrollbar"
                    />
                  </div>

                  <div className="flex justify-between items-center px-1">
                    <input 
                      type="text" 
                      value={entry.comment || ''} 
                      onChange={(e) => updateWorldBookEntry(selectedBookId, entry.id, { comment: e.target.value })}
                      placeholder="Entry Label"
                      className="bg-transparent border-none text-[10px] p-0 focus:outline-none text-gray-500 italic flex-1 mr-4"
                    />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer" title="Constant: always injected regardless of keywords">
                        <span className="text-[8px] uppercase tracking-widest text-gray-400">Constant</span>
                        <Toggle
                          checked={!!entry.constant}
                          onChange={() => updateWorldBookEntry(selectedBookId, entry.id, { constant: !entry.constant })}
                          color="bg-amber-400"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <span className="text-[8px] uppercase tracking-widest text-gray-400">Enabled</span>
                        <Toggle
                          checked={entry.enabled}
                          onChange={() => updateWorldBookEntry(selectedBookId, entry.id, { enabled: !entry.enabled })}
                        />
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default WorldBookEditor
