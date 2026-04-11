import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Zap, Save, FolderOpen, Terminal } from 'lucide-react'
import { Toggle } from './ui'
import { useAppStore } from '../store/useAppStore'
import { ALL_SKILLS } from '../skills'
import { imageDb } from '../utils/imageDb'

interface CharCardProps {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement>
}

const CharCard: React.FC<CharCardProps> = ({ open, onClose, anchorRef }) => {
  const { selectedCharacter, config, toggleSkill, toggleDeviceContext, setIsConfigOpen, setCurrentView, updateCharacter } = useAppStore()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!selectedCharacter.image) { setAvatarUrl(null); return }
    if (selectedCharacter.image.startsWith('data:') || selectedCharacter.image.startsWith('http')) {
      setAvatarUrl(selectedCharacter.image)
    } else {
      imageDb.get(selectedCharacter.image).then(setAvatarUrl)
    }
  }, [selectedCharacter.image])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (cardRef.current?.contains(e.target as Node)) return
      if (anchorRef.current?.contains(e.target as Node)) return
      onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose, anchorRef])

  const bodyEngine = selectedCharacter.bodyEngine || 'vn'
  const widgetEngine = selectedCharacter.widgetEngine || 'xml'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full left-0 mt-2 w-64 z-[200] rounded-2xl border border-echo-border-md bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
        >
          {/* 角色信息 */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/5">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-echo-surface-md flex-shrink-0">
              {avatarUrl
                ? <img src={avatarUrl} alt={selectedCharacter.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-echo-text-subtle">{selectedCharacter.name[0]}</div>
              }
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate text-gray-800 dark:text-gray-100">{selectedCharacter.name}</p>
              {selectedCharacter.description && (
                <p className="text-[10px] text-echo-text-subtle truncate mt-0.5">{selectedCharacter.description}</p>
              )}
            </div>
          </div>

          {/* 渲染设置 (B/W 迁移至此) */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02]">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Terminal size={11} className="text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-echo-text-subtle">渲染引擎配置 // ENGINE</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
               <div className="space-y-1">
                  <p className="text-[8px] uppercase tracking-tighter text-echo-text-dim ml-1">正文解析 (B)</p>
                  <select 
                    value={bodyEngine}
                    onChange={(e) => updateCharacter(selectedCharacter.id, { bodyEngine: e.target.value as any })}
                    className="w-full bg-white dark:bg-black/40 border border-echo-border rounded-lg px-2 py-1 text-[10px] text-echo-text-base outline-none focus:border-blue-500/50 transition-colors"
                  >
                    <option value="vn">视觉小说 (VN)</option>
                    <option value="markdown">标记文本 (MD)</option>
                    <option value="plain">纯文本 (RAW)</option>
                  </select>
               </div>
               <div className="space-y-1">
                  <p className="text-[8px] uppercase tracking-tighter text-echo-text-dim ml-1">组件渲染 (W)</p>
                  <select 
                    value={widgetEngine}
                    onChange={(e) => updateCharacter(selectedCharacter.id, { widgetEngine: e.target.value as any })}
                    className="w-full bg-white dark:bg-black/40 border border-echo-border rounded-lg px-2 py-1 text-[10px] text-echo-text-base outline-none focus:border-orange-500/50 transition-colors"
                  >
                    <option value="xml">标准组件 (XML)</option>
                    <option value="html">高级交互 (HTML)</option>
                    <option value="st-card">仅卡片 (ST)</option>
                    <option value="none">禁用组件</option>
                  </select>
               </div>
            </div>
          </div>

          {/* Skills 开关 */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/8">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap size={11} className="text-orange-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-echo-text-subtle">Skills</span>
            </div>
            <div className="space-y-1.5">
              <div
                onClick={toggleDeviceContext}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-echo-surface transition-colors cursor-pointer"
              >
                <span className="text-[11px] text-left text-gray-700 dark:text-gray-300">设备感知</span>
                <Toggle checked={config.deviceContextEnabled ?? false} onChange={toggleDeviceContext} />
              </div>
              {ALL_SKILLS.map(skill => {
                const enabled = (config.enabledSkillIds || []).includes(skill.name)
                return (
                  <div
                    key={skill.name}
                    onClick={() => toggleSkill(skill.name)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-echo-surface transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] text-left text-gray-700 dark:text-gray-300">{skill.displayName}</span>
                    <Toggle checked={enabled} onChange={() => toggleSkill(skill.name)} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* 存档 / 读档 */}
          <button
            onClick={() => { setCurrentView('save'); onClose() }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] text-echo-text-muted hover:text-echo-text-primary hover:bg-echo-surface transition-all border-t border-gray-100 dark:border-white/8"
          >
            <Save size={13} />
            存档
          </button>
          <button
            onClick={() => { setCurrentView('load'); onClose() }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-[11px] text-echo-text-muted hover:text-echo-text-primary hover:bg-echo-surface transition-all"
          >
            <FolderOpen size={13} />
            读档
          </button>

          {/* 编辑角色卡 */}
          <button
            onClick={() => { setIsConfigOpen(true); onClose() }}
            className="w-full flex items-center gap-2 px-4 py-3 text-[11px] text-echo-text-muted hover:text-echo-text-primary hover:bg-echo-surface transition-all border-t border-gray-100 dark:border-white/8"
          >
            <Settings size={13} />
            编辑角色卡
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CharCard
