import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { db } from '../../storage/db'
import type { Directive } from '../../store/useAppStore'

interface DirectiveEditorProps {
  id: string
  onClose: () => void
  presetId?: string  // 若有，則編輯 preset 條目
}

const DirectiveEditor: React.FC<DirectiveEditorProps> = ({ id, onClose, presetId }) => {
  const { config, updateDirective, removeDirective, updatePromptPresetDirective, removePromptPreset } = useAppStore()

  // preset 條目從 DB 讀
  const [presetEntry, setPresetEntry] = useState<Directive | null>(null)
  useEffect(() => {
    if (!presetId) return
    db.promptPresetEntries.get(id).then(e => setPresetEntry(e || null))
  }, [id, presetId])

  const directive = presetId ? presetEntry : config?.directives?.find(d => d.id === id)
  if (!directive) return null

  const updateField = (updates: Partial<Directive>) => {
    if (presetId) {
      updatePromptPresetDirective(presetId, id, updates)
      setPresetEntry(prev => prev ? { ...prev, ...updates } : prev)
    } else {
      updateDirective(id, updates)
    }
  }

  const handleRemove = () => {
    if (presetId) {
      // preset 條目刪除：直接從 DB 刪
      db.promptPresetEntries.delete(id)
    } else {
      removeDirective(id)
    }
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="p-8 h-full flex flex-col space-y-8"
    >
      <div className="group">
        <label className="text-[9px] tracking-wide text-echo-text-dim uppercase mb-3 block italic underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Directive Title</label>
        <input
          type="text"
          value={directive.title}
          onChange={(e) => updateField({ title: e.target.value })}
          className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-2 text-sm text-echo-text-base focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
        />
      </div>
      <div className="flex-1 flex flex-col min-h-[300px]">
        <label className="text-[9px] tracking-wide text-echo-text-dim uppercase mb-3 block italic">Instruction Content</label>
        <textarea
          value={directive.content}
          onChange={(e) => updateField({ content: e.target.value })}
          placeholder="Enter behavioral guidelines..."
          className="flex-1 bg-white/30 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-3xl p-6 text-sm text-echo-text-muted font-serif leading-relaxed focus:outline-none focus:border-gray-300 dark:focus:border-gray-600 transition-colors resize-none no-scrollbar shadow-inner"
        />
      </div>
      <div className="flex gap-4">
        <button
          onClick={handleRemove}
          className="flex-1 py-4 border-0.5 border-red-100 dark:border-red-900/30 text-red-300 dark:text-red-900/50 rounded-full text-[10px] tracking-widest uppercase hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
        >
          Remove
        </button>
        <button
          onClick={onClose}
          className="flex-[2] py-4 border-0.5 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-echo-text-subtle rounded-full text-[10px] tracking-widest uppercase hover:bg-gray-50 dark:hover:bg-gray-900 transition-all shadow-sm"
        >
          Done // Sync
        </button>
      </div>
    </motion.div>
  )
}

export default DirectiveEditor
