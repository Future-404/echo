import React, { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Upload, Trash2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Edit2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { PromptPreset, Directive } from '../../store/useAppStore'
import { db } from '../../storage/db'
import { useDialog } from '../GlobalDialog'
import { readFileAsText, genId } from '../../utils/fileUtils'

interface DirectiveManagerProps {
  onEdit: (id: string) => void
  onAdd: () => void
  onEditPresetEntry: (entryId: string, presetId: string) => void
}

const DirectiveManager: React.FC<DirectiveManagerProps> = ({ onEdit, onAdd, onEditPresetEntry }) => {
  const { config, addPromptPreset, removePromptPreset, updatePromptPresetDirective, updateDirective, removeDirective } = useAppStore()
  const { alert } = useDialog()
  const presets: PromptPreset[] = config.promptPresets || []
  const globalDirectives: Directive[] = config.directives || []
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [presetEntries, setPresetEntries] = useState<Record<string, Directive[]>>({})

  // 展開時從 DB 加載條目
  useEffect(() => {
    const openIds = Object.entries(expanded).filter(([, v]) => v).map(([k]) => k)
    openIds.forEach(async (pid) => {
      if (presetEntries[pid]) return
      const entries = await db.promptPresetEntries.where('presetId').equals(pid).toArray()
      setPresetEntries(prev => ({ ...prev, [pid]: entries }))
    })
  }, [expanded])

  // 預設包的 enabled 計數從 DB 讀（異步，初始顯示 0）
  const [enabledCounts, setEnabledCounts] = useState<Record<string, { enabled: number; total: number }>>({})
  useEffect(() => {
    presets.forEach(async (p) => {
      const entries = await db.promptPresetEntries.where('presetId').equals(p.id).toArray()
      setEnabledCounts(prev => ({ ...prev, [p.id]: { enabled: entries.filter(e => e.enabled).length, total: entries.length } }))
    })
  }, [presets.length])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const json = JSON.parse(await readFileAsText(file))
      const prompts: any[] = json.prompts
      if (!Array.isArray(prompts)) { alert('❌ 文件格式不匹配，請確認是 Instruct 預設 JSON'); return }
      const directives: Directive[] = prompts
        .filter(p => !p.marker && p.content)
        .map(p => ({
          id: p.identifier || genId('st'),
          title: p.name || p.identifier || 'Unnamed',
          content: p.content,
          enabled: p.enabled !== false,
          depth: p.injection_depth || undefined,
          role: (p.role === 'assistant' || p.role === 'user') ? p.role : 'system',
          position: (p.injection_position === 0 ? 0 : 1) as 0 | 1,
        }))
      const presetName = file.name.replace(/\.json$/i, '')
      const preset: PromptPreset = { id: genId('preset'), name: presetName, directives }
      await addPromptPreset(preset)
      alert(`✓ 已導入「${presetName}」${directives.length} 條指令`)
    } catch {
      alert('❌ JSON 解析失敗')
    }
    e.target.value = ''
  }

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const handleToggleEntry = async (presetId: string, d: Directive) => {
    await updatePromptPresetDirective(presetId, d.id, { enabled: !d.enabled })
    setPresetEntries(prev => ({
      ...prev,
      [presetId]: (prev[presetId] || []).map(e => e.id === d.id ? { ...e, enabled: !e.enabled } : e)
    }))
    setEnabledCounts(prev => {
      const cur = prev[presetId] || { enabled: 0, total: 0 }
      return { ...prev, [presetId]: { ...cur, enabled: cur.enabled + (d.enabled ? -1 : 1) } }
    })
  }

  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="p-6 space-y-6">
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      <div className="flex justify-between items-center px-4">
        <div className="flex flex-col">
          <label className="text-xs font-serif tracking-widest text-echo-text-muted font-medium">預設包管理</label>
          <span className="text-[7px] text-echo-text-dim uppercase tracking-[0.2em] mt-0.5">Prompt Presets</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fileInputRef.current?.click()} title="導入預設" className="text-gray-400 hover:text-gray-600 transition-colors">
            <Upload size={14} strokeWidth={1} />
          </button>
          <button onClick={onAdd} title="新建手動指令" className="text-gray-400 hover:text-gray-600 transition-colors">
            <Plus size={16} strokeWidth={1} />
          </button>
        </div>
      </div>

      {/* 預設包列表 */}
      <div className="space-y-3">
        {presets.map(preset => {
          const counts = enabledCounts[preset.id]
          const isOpen = expanded[preset.id]
          const entries = presetEntries[preset.id] || []
          return (
            <div key={preset.id} className="rounded-3xl border-0.5 border-gray-100 dark:border-gray-800 bg-white/30 dark:bg-white/5 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4">
                <button onClick={() => toggleExpand(preset.id)} className="flex-1 flex items-center gap-3 text-left">
                  {isOpen ? <ChevronUp size={12} strokeWidth={1} className="text-gray-400 shrink-0" /> : <ChevronDown size={12} strokeWidth={1} className="text-gray-400 shrink-0" />}
                  <div>
                    <p className="text-sm font-serif text-gray-600 dark:text-gray-200 tracking-wide">{preset.name}</p>
                    <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-0.5">
                      {counts ? `${counts.enabled}/${counts.total} 已啟用` : '載入中...'}
                    </p>
                  </div>
                </button>
                <button onClick={() => removePromptPreset(preset.id).catch(() => alert('❌ 刪除失敗'))} className="text-gray-300 dark:text-gray-700 hover:text-red-400 transition-colors">
                  <Trash2 size={13} strokeWidth={1} />
                </button>
              </div>
              {isOpen && (
                <div className="border-t border-gray-100 dark:border-gray-800 divide-y divide-gray-50 dark:divide-gray-800/50 max-h-64 overflow-y-auto no-scrollbar">
                  {entries.map(d => (
                    <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-serif truncate ${d.enabled ? 'text-echo-text-primary' : 'text-echo-text-subtle line-through'}`}>{d.title}</p>
                        {d.depth && <span className="text-[7px] text-gray-400 uppercase tracking-widest">depth {d.depth}</span>}
                      </div>
                      <button onClick={() => onEditPresetEntry(d.id, preset.id)} className="text-gray-300 dark:text-gray-700 hover:text-blue-400 transition-colors">
                        <Edit2 size={12} strokeWidth={1} />
                      </button>
                      <button onClick={() => handleToggleEntry(preset.id, d)} className="text-gray-400 shrink-0">
                        {d.enabled ? <ToggleRight size={18} strokeWidth={1} className="text-green-300 dark:text-green-800" /> : <ToggleLeft size={18} strokeWidth={1} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 全局手動指令 */}
      {globalDirectives.length > 0 && (
        <div className="space-y-2">
          <p className="text-[8px] text-gray-400 uppercase tracking-[0.2em] px-4">手動指令 // Manual</p>
          <div className="space-y-2">
            {globalDirectives.map(d => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3 rounded-2xl border-0.5 border-gray-100 dark:border-gray-800 bg-white/20 dark:bg-white/3">
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-serif truncate ${d.enabled ? 'text-echo-text-primary' : 'text-echo-text-subtle line-through'}`}>{d.title}</p>
                </div>
                <button onClick={() => updateDirective(d.id, { enabled: !d.enabled })} className="text-gray-400 shrink-0">
                  {d.enabled ? <ToggleRight size={18} strokeWidth={1} className="text-green-300 dark:text-green-800" /> : <ToggleLeft size={18} strokeWidth={1} />}
                </button>
                <button onClick={() => onEdit(d.id)} className="text-gray-300 dark:text-gray-700 hover:text-blue-400 transition-colors">
                  <Edit2 size={12} strokeWidth={1} />
                </button>
                <button onClick={() => removeDirective(d.id)} className="text-gray-300 dark:text-gray-700 hover:text-red-400 transition-colors">
                  <Trash2 size={12} strokeWidth={1} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {presets.length === 0 && globalDirectives.length === 0 && (
        <p className="text-[8px] text-gray-400 dark:text-gray-700 text-center uppercase tracking-[0.2em] opacity-50">
          點擊 ↑ 導入預設 // 點擊 + 手動新增
        </p>
      )}
    </motion.div>
  )
}

export default DirectiveManager
