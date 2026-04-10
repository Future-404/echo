import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Plus, Edit2, Trash2, Check, Upload, Globe, Camera } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { WorldBook } from '../../types/store'
import { imageDb } from '../../utils/imageDb'
import { useDialog } from '../GlobalDialog'
import { readFileAsText, readFileAsDataURL, genId } from '../../utils/fileUtils'

const PersonaManager: React.FC = () => {
  const { 
    config, addPersona, updatePersona, removePersona, setActivePersona,
    addPersonaWorldBookEntry, updatePersonaWorldBookEntry, removePersonaWorldBookEntry
  } = useAppStore()
  const { alert } = useDialog()
  
  const personas = config?.personas || []
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedPrivateId, setExpandedPrivateId] = useState<string | null>(null)
  const [isAddingPrivate, setIsAddingPrivate] = useState(false)
  const [newPrivateKeys, setNewPrivateKeys] = useState('')
  const [newPrivateContent, setNewPrivateContent] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({})

  // 加载所有 persona 头像
  useEffect(() => {
    personas.forEach(p => {
      if (p.avatarId) {
        imageDb.get(p.avatarId).then(url => {
          if (url) setAvatarUrls(prev => ({ ...prev, [p.id]: url }))
        })
      }
    })
  }, [personas.map(p => p.avatarId).join(',')])

  const handleAvatarUpload = async (personaId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await readFileAsDataURL(file)
    const avatarId = `persona-${personaId}`
    await imageDb.save(avatarId, base64)
    updatePersona(personaId, { avatarId })
    setAvatarUrls(prev => ({ ...prev, [personaId]: base64 }))
    e.target.value = ''
  }

  const handleAdd = () => {
    const newId = `persona-${Date.now()}`
    addPersona({ id: newId, name: '新身份', description: '简短描述你的特质...', background: '', worldBook: [] })
    setEditingId(newId)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await readFileAsText(file)
    if (file.name.endsWith('.json')) {
      try {
        const data = JSON.parse(content)
        const items = Array.isArray(data) ? data : [data]
        items.forEach(item => {
          if (item.name) {
            addPersona({
              id: genId('persona'),
              name: item.name,
              description: item.description || 'Imported Persona',
              background: item.background || item.personality || '',
              worldBook: Array.isArray(item.worldBook) ? item.worldBook : []
            })
          }
        })
      } catch {
        alert('JSON 解析失败')
      }
    } else if (file.name.endsWith('.txt')) {
      addPersona({
        id: genId('persona'),
        name: file.name.replace('.txt', ''),
        description: 'Full Text Import',
        background: content,
        worldBook: []
      })
    }
    if (e.target) e.target.value = ''
  }

  const currentEditing = personas.find(p => p.id === editingId)

  const handleAddPrivate = () => {
    if (!editingId || !newPrivateContent.trim()) return
    const entry: WorldBookEntry = {
      id: `upriv_${Date.now()}`,
      keys: newPrivateKeys.split(',').map(k => k.trim()).filter(Boolean),
      content: newPrivateContent,
      enabled: true,
      comment: '用户私设'
    }
    addPersonaWorldBookEntry(editingId, entry)
    setNewPrivateKeys('')
    setNewPrivateContent('')
    setIsAddingPrivate(false)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="p-6 space-y-8 pb-32"
    >
      <div className="flex justify-between items-center px-4">
        <div className="flex flex-col">
            <label className="text-xs font-serif tracking-widest text-echo-text-muted font-medium">用户身份管理</label>
            <span className="text-[7px] text-echo-text-dim uppercase tracking-[0.2em] mt-0.5">User Persona Archive</span>
        </div>
        <div className="flex gap-3">
          <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json,.txt" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-blue-500 transition-colors" title="导入 JSON/TXT">
            <Upload size={16} strokeWidth={1} />
          </button>
          <button onClick={handleAdd} className="text-gray-400 hover:text-gray-600 transition-colors" title="新建身份">
            <Plus size={16} strokeWidth={1} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {personas.map(p => (
          <div 
            key={p.id}
            className={`w-full p-5 rounded-3xl border-0.5 transition-all flex flex-col gap-4 ${config.activePersonaId === p.id ? 'border-gray-400 dark:border-gray-500 bg-white/60 dark:bg-white/10' : 'border-gray-100 dark:border-gray-800 bg-white/20 dark:bg-white/5 opacity-70 hover:opacity-100'}`}
          >
            <div className="flex items-center gap-4">
              <div onClick={() => setActivePersona(p.id)} className="flex-1 cursor-pointer flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden">
                  {avatarUrls[p.id]
                    ? <img src={avatarUrls[p.id]} alt={p.name} className="w-full h-full object-cover" />
                    : <User size={16} strokeWidth={1} className="text-gray-400" />
                  }
                </div>
                <div>
                  <h4 className={`text-sm font-serif tracking-wide flex items-center gap-2 ${config.activePersonaId === p.id ? 'text-gray-600 dark:text-gray-200' : 'text-echo-text-dim'}`}>
                    {p.name}
                    {config.activePersonaId === p.id && <Check size={10} className="text-green-400" />}
                  </h4>
                  <p className="text-[8px] text-echo-text-subtle uppercase mt-1 italic tracking-widest">{p.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingId(editingId === p.id ? null : p.id)} className="text-echo-text-dim hover:text-gray-500"><Edit2 size={14} strokeWidth={1} /></button>
                {personas.length > 1 && (
                  <button onClick={() => removePersona(p.id)} className="text-gray-200 dark:text-gray-800 hover:text-red-300"><Trash2 size={14} strokeWidth={1} /></button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {editingId === p.id && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden pt-4 border-t border-echo-border"
                >
                  <div className="group">
                    <label className="text-[8px] tracking-widest text-echo-text-dim uppercase mb-2 block font-medium">名称 / Name</label>
                    <input type="text" value={p.name} onChange={(e) => updatePersona(p.id, { name: e.target.value })} className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-1 text-sm text-echo-text-base focus:outline-none" />
                  </div>
                    <div className="flex gap-4">
                      <div className="group flex-1">
                        <label className="text-[8px] tracking-widest text-echo-text-dim uppercase mb-2 block font-medium">姓氏 {'{{user_surname}}'}</label>
                        <input type="text" value={p.surname || ''} onChange={(e) => updatePersona(p.id, { surname: e.target.value })} placeholder="如：金" className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-1 text-sm text-echo-text-base focus:outline-none" />
                      </div>
                      <div className="group flex-1">
                        <label className="text-[8px] tracking-widest text-echo-text-dim uppercase mb-2 block font-medium">昵称 {'{{user_nickname}}'}</label>
                        <input type="text" value={p.nickname || ''} onChange={(e) => updatePersona(p.id, { nickname: e.target.value })} placeholder="如：小金" className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-1 text-sm text-echo-text-base focus:outline-none" />
                      </div>
                    </div>
                  <div className="group">
                    <label className="text-[8px] tracking-widest text-echo-text-dim uppercase mb-2 block font-medium">头像 / Avatar</label>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(p.id, e)} />
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-50 dark:bg-gray-900 border-0.5 border-gray-200 dark:border-gray-700 flex items-center justify-center">
                        {avatarUrls[p.id]
                          ? <img src={avatarUrls[p.id]} alt={p.name} className="w-full h-full object-cover" />
                          : <User size={18} strokeWidth={1} className="text-gray-400" />
                        }
                      </div>
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        className="flex items-center gap-1.5 text-[9px] tracking-widest uppercase text-gray-400 hover:text-blue-400 transition-colors"
                      >
                        <Camera size={12} /> {avatarUrls[p.id] ? '更换头像' : '上传头像'}
                      </button>
                      {avatarUrls[p.id] && (
                        <button
                          onClick={async () => {
                            await imageDb.remove(`persona-${p.id}`)
                            updatePersona(p.id, { avatarId: undefined })
                            setAvatarUrls(prev => { const n = { ...prev }; delete n[p.id]; return n })
                          }}
                          className="text-[9px] tracking-widest uppercase text-red-400 hover:text-red-500 transition-colors"
                        >移除</button>
                      )}
                    </div>
                  </div>
                  <div className="group">
                    <label className="text-[8px] tracking-widest text-echo-text-dim uppercase mb-2 block font-medium">标语 / Tagline</label>
                    <input type="text" value={p.description} onChange={(e) => updatePersona(p.id, { description: e.target.value })} className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-1 text-sm text-echo-text-base focus:outline-none" />
                  </div>
                  <div className="group">
                    <label className="text-[8px] tracking-widest text-echo-text-dim uppercase mb-2 block font-medium">用户背景设定 / Context</label>
                    <textarea value={p.background} onChange={(e) => updatePersona(p.id, { background: e.target.value })} placeholder="告诉 AI 在这个世界里你扮演着什么样的角色..." className="w-full bg-white/30 dark:bg-black/20 border-0.5 border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-xs text-echo-text-muted font-serif leading-relaxed focus:outline-none min-h-[100px] resize-none no-scrollbar" />
                  </div>

                  {/* 用户私设部分 */}
                  <div className="space-y-4 pt-4 border-t border-echo-border">
                    <div className="flex justify-between items-center px-2">
                      <label className="text-[9px] tracking-widest text-gray-400 uppercase italic flex items-center gap-2">
                        <Globe size={10} /> User Private Settings // 用户私设
                      </label>
                      <button onClick={() => setIsAddingPrivate(!isAddingPrivate)} className="p-1 bg-echo-surface border border-echo-border-md rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-all">
                        <Plus size={12} />
                      </button>
                    </div>

                    {isAddingPrivate && (
                      <div className="bg-echo-surface rounded-2xl p-4 space-y-3">
                        <input placeholder="Label (Optional)" value={newPrivateKeys} onChange={e => setNewPrivateKeys(e.target.value)} className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 text-[10px] py-1 focus:outline-none text-echo-text-base" />
                        <textarea placeholder="Your private user lore..." value={newPrivateContent} onChange={e => setNewPrivateContent(e.target.value)} className="w-full bg-transparent text-[11px] font-serif min-h-[80px] resize-none focus:outline-none text-echo-text-base" />
                        <div className="flex justify-end gap-2 pt-2">
                          <button onClick={() => setIsAddingPrivate(false)} className="text-[8px] uppercase tracking-widest text-gray-400 px-3 py-1">Cancel</button>
                          <button onClick={handleAddPrivate} className="text-[8px] uppercase tracking-widest bg-blue-500/10 text-blue-500 font-bold px-3 py-1 rounded-lg">Store</button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {(p.worldBook || []).map((entry) => (
                        <div key={entry.id} className="bg-white/50 dark:bg-white/5 border-0.5 border-echo-border rounded-2xl overflow-hidden transition-all group/item">
                          <div className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer" onClick={() => setExpandedPrivateId(expandedPrivateId === entry.id ? null : entry.id)}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); updatePersonaWorldBookEntry(p.id, entry.id, { enabled: !entry.enabled }); }}
                                className={`w-6 h-3 rounded-full flex items-center px-0.5 transition-colors ${entry.enabled ? 'bg-blue-400/50' : 'bg-gray-300 dark:bg-gray-700'}`}
                              >
                                <motion.div layout className="w-2 h-2 rounded-full bg-white" animate={{ x: entry.enabled ? 12 : 0 }} />
                              </button>
                              <span className="text-[10px] font-serif font-bold text-echo-text-primary truncate">{entry.comment || entry.content.slice(0, 30)}</span>
                            </div>
                            <button onClick={() => removePersonaWorldBookEntry(p.id, entry.id)} className="p-1 text-gray-400 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-all">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          {expandedPrivateId === entry.id && (
                            <div className="px-3 pb-3 pt-1 border-t border-echo-border space-y-2">
                              <textarea 
                                value={entry.content} 
                                onChange={(e) => updatePersonaWorldBookEntry(p.id, entry.id, { content: e.target.value })}
                                className="w-full bg-white dark:bg-black/20 border-0.5 border-echo-border-md rounded-xl px-2 py-1 text-[11px] font-serif min-h-[60px] focus:outline-none focus:border-blue-400/50 transition-colors resize-none"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => setEditingId(null)} className="w-full py-3 border-0.5 border-gray-200 dark:border-gray-800 rounded-full text-[9px] tracking-[0.4em] uppercase text-gray-400 hover:bg-white dark:hover:bg-gray-900 transition-all">
                    同步配置 // Finish Setup
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default PersonaManager
