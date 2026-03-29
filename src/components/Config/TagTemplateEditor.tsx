import React, { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import type { TagTemplate } from '../../store/useAppStore'

const BLANK: Omit<TagTemplate, 'id'> = { name: '', originalRegex: '', replaceString: '', enabled: true, fields: [] }

const TagTemplateEditor: React.FC = () => {
  const { selectedCharacter, updateCharacter } = useAppStore()
  const templates: TagTemplate[] = selectedCharacter.extensions?.tagTemplates || []
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [draft, setDraft] = useState<Omit<TagTemplate, 'id'>>(BLANK)

  const save = (updated: TagTemplate[]) =>
    updateCharacter(selectedCharacter.id, { extensions: { ...selectedCharacter.extensions, tagTemplates: updated } })

  const toggle = (id: string) =>
    save(templates.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t))

  const remove = (id: string) =>
    save(templates.filter(t => t.id !== id))

  const update = (id: string, patch: Partial<TagTemplate>) =>
    save(templates.map(t => t.id === id ? { ...t, ...patch } : t))

  const add = () => {
    if (!draft.name || !draft.originalRegex) return
    save([...templates, { ...draft, id: `tpl-${Date.now()}` }])
    setDraft(BLANK)
    setIsAdding(false)
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center px-1">
        <label className="text-[9px] tracking-widest text-gray-400 uppercase italic">Regex Scripts // 正则脚本</label>
        <button onClick={() => setIsAdding(!isAdding)} className="p-1 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-all">
          <Plus size={12} />
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 space-y-3">
            <input placeholder="脚本名称" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 text-[11px] py-1 focus:outline-none text-gray-600 dark:text-gray-300" />
            <input placeholder="查找正则（如 /<UpdateVariable>[\s\S]*?<\/UpdateVariable>/gm）" value={draft.originalRegex || ''} onChange={e => setDraft(d => ({ ...d, originalRegex: e.target.value }))}
              className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 text-[10px] font-mono py-1 focus:outline-none text-gray-500 dark:text-gray-400" />
            <input placeholder="替换为（留空 = 删除匹配内容）" value={draft.replaceString || ''} onChange={e => setDraft(d => ({ ...d, replaceString: e.target.value }))}
              className="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 text-[10px] font-mono py-1 focus:outline-none text-gray-500 dark:text-gray-400" />
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setIsAdding(false); setDraft(BLANK) }} className="text-[8px] uppercase tracking-widest text-gray-400 px-3 py-1">Cancel</button>
              <button onClick={add} className="text-[8px] uppercase tracking-widest bg-purple-500/10 text-purple-500 font-bold px-3 py-1 rounded-lg">Add</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {templates.length === 0 && !isAdding && (
        <p className="text-[9px] text-gray-400 italic text-center py-3 opacity-50">暂无正则脚本</p>
      )}

      <div className="space-y-2">
        {templates.map(tpl => (
          <div key={tpl.id} className="bg-white/50 dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden group">
            <div className="p-3 flex items-center gap-3">
              <button onClick={() => toggle(tpl.id)}
                className={`w-7 h-3.5 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${tpl.enabled ? 'bg-purple-400/50' : 'bg-gray-300 dark:bg-gray-700'}`}>
                <motion.div layout className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" animate={{ x: tpl.enabled ? 14 : 0 }} />
              </button>
              <span className="text-[11px] font-serif font-bold text-gray-700 dark:text-gray-200 flex-1 truncate">{tpl.name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => remove(tpl.id)} className="p-1 text-gray-400 hover:text-red-400 transition-colors"><Trash2 size={11} /></button>
                <button onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)} className="p-1 text-gray-400">
                  {expandedId === tpl.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {expandedId === tpl.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-white/5 space-y-3">
                  <div>
                    <label className="text-[8px] uppercase tracking-widest text-gray-400 mb-1 block">查找正则</label>
                    <input value={tpl.originalRegex || ''} onChange={e => update(tpl.id, { originalRegex: e.target.value })}
                      className="w-full bg-white dark:bg-black/20 border-0.5 border-gray-100 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono focus:outline-none focus:border-purple-400/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase tracking-widest text-gray-400 mb-1 block">替换为（留空 = 删除）</label>
                    <input value={tpl.replaceString ?? ''} onChange={e => update(tpl.id, { replaceString: e.target.value })}
                      className="w-full bg-white dark:bg-black/20 border-0.5 border-gray-100 dark:border-white/10 rounded-xl px-3 py-2 text-[10px] font-mono focus:outline-none focus:border-purple-400/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase tracking-widest text-gray-400 mb-1 block">执行层级</label>
                    <div className="flex gap-2">
                      {([1, 2] as const).map(p => {
                        const active = (tpl.placement ?? [1, 2]).includes(p)
                        return (
                          <button key={p} onClick={() => {
                            const cur = tpl.placement ?? [1, 2]
                            const next = active ? cur.filter(x => x !== p) : [...cur, p]
                            if (next.length > 0) update(tpl.id, { placement: next })
                          }} className={`px-3 py-1 rounded-lg text-[9px] font-mono border transition-colors ${active ? 'bg-purple-500/20 border-purple-400/50 text-purple-400' : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-400'}`}>
                            {p === 1 ? '存储层' : '渲染层'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TagTemplateEditor
