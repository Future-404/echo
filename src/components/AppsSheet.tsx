import React, { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image, Send, Heart, BookOpen, Plus } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { replaceMacros } from '../logic/promptEngine'
import { parsePackageZip, loadInstalledSkill } from '../skills/core/loader'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { InstalledApp } from '../skills/core/types'
import { useDialog } from './GlobalDialog'

export interface AppDefinition {
  id: string
  name: string
  sub: string
  icon: React.ReactNode
  available: boolean
  component?: React.ComponentType
  htmlContent?: string
}

export const APP_REGISTRY: AppDefinition[] = [
  { id: 'send-image', name: '发送图片', sub: 'Send Image', icon: <Image size={24} strokeWidth={1.5} />, available: true },
  { id: 'tweet-square', name: '{{char}}的推文广场', sub: 'Tweet Square', icon: <BookOpen size={24} strokeWidth={1.5} />, available: true },
  { id: 'transfer', name: '转账', sub: 'Transfer', icon: <Send size={24} strokeWidth={1.5} />, available: false },
  { id: 'couple-space', name: '情侣空间', sub: 'Couple Space', icon: <Heart size={24} strokeWidth={1.5} />, available: false },
]

interface Props {
  open: boolean
  onClose: () => void
  onOpenApp: (app: AppDefinition) => void
}

// CSS 抖動動畫（注入一次）
const WIGGLE_STYLE = `@keyframes echo-wiggle{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}`
if (typeof document !== 'undefined' && !document.getElementById('echo-wiggle-style')) {
  const s = document.createElement('style')
  s.id = 'echo-wiggle-style'
  s.textContent = WIGGLE_STYLE
  document.head.appendChild(s)
}

// 可排序應用圖標 (內置或第三方)
const SortableAppItem: React.FC<{
  app: AppDefinition | InstalledApp
  isBuiltIn: boolean
  editing: boolean
  onOpen: () => void
  onUninstall?: () => void
  onLongPressStart: () => void
  onLongPressEnd: () => void
}> = ({ app, isBuiltIn, editing, onOpen, onUninstall, onLongPressStart, onLongPressEnd }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 100 : undefined,
  }

  const icon = isBuiltIn ? (app as AppDefinition).icon : (app as InstalledApp).icon
  const available = isBuiltIn ? (app as AppDefinition).available : true
  const sub = isBuiltIn ? (app as AppDefinition).sub : (app as InstalledApp).id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="echo-app-item flex flex-col items-center gap-3 relative"
    >
      {/* 卸載按鈕 (僅限第三方) */}
      <AnimatePresence>
        {editing && !isBuiltIn && onUninstall && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={(e) => { e.stopPropagation(); onUninstall() }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center z-10 shadow-lg"
          >×</motion.button>
        )}
      </AnimatePresence>

      {/* 圖標：listeners 始終綁定（dnd-kit 自己判斷是否激活拖拽），點擊另外處理 */}
      <div
        {...attributes}
        {...listeners}
        onMouseDown={onLongPressStart}
        onMouseUp={onLongPressEnd}
        onTouchStart={onLongPressStart}
        onTouchEnd={onLongPressEnd}
        onClick={() => { if (!editing && available) onOpen() }}
        className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl overflow-hidden cursor-pointer select-none ${!editing && available ? 'active:scale-90 transition-transform' : ''}`}
        style={{
          background: available ? 'var(--echo-app-icon-bg, rgba(99,102,241,0.06))' : 'var(--echo-app-icon-bg-disabled, rgba(0,0,0,0.04))',
          border: '0.5px solid var(--echo-app-icon-border, rgba(0,0,0,0.06))',
          color: available ? (isBuiltIn ? 'var(--echo-app-icon-color, #6366f1)' : 'inherit') : '#aaa',
          animation: editing ? 'echo-wiggle 0.25s linear infinite' : 'none',
          touchAction: 'none',
        }}
      >
        <div style={{ opacity: available ? 1 : 0.4, filter: available ? 'none' : 'grayscale(1)' }} className="w-full h-full flex items-center justify-center">
          {typeof icon === 'string' && icon.startsWith('data:')
            ? <img src={icon} alt={app.name} className="w-full h-full object-cover" draggable={false} />
            : (icon || '📦')
          }
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 pointer-events-none">
        <span className="text-[10px] tracking-wider font-medium text-center truncate w-20" style={{ color: available ? 'var(--echo-app-label-color, var(--echo-text-base))' : '#aaa' }}>
          {app.name}
        </span>
        <span className="text-[6px] uppercase tracking-tighter opacity-30 font-mono">{sub}</span>
      </div>
    </div>
  )
}

const AppsSheet: React.FC<Props> = ({ open, onClose, onOpenApp }) => {
  const { selectedCharacter, config, installSkill, installApp, uninstallApp, uninstallSkill, reorderApps } = useAppStore()
  const { confirm } = useDialog()
  const activePersona = config.personas.find((p) => p.id === config.activePersonaId) || config.personas[0]
  const userName = activePersona?.name || 'Observer'
  const charName = selectedCharacter?.name || 'Character'
  
  const installedApps = config.installedApps || []
  const appOrder = config.appOrder || []

  // 合併所有應用並按 order 排序
  const allApps = React.useMemo(() => {
    const builtIn = APP_REGISTRY.map(a => ({ ...a, name: replaceMacros(a.name, userName, charName), isBuiltIn: true }))
    const thirdParty = installedApps.map(a => ({ ...a, isBuiltIn: false }))
    const combined = [...builtIn, ...thirdParty]
    
    if (appOrder.length === 0) return combined
    
    // 根據 appOrder 排序，不在 order 裡的放最後
    return combined.sort((a, b) => {
      let idxA = appOrder.indexOf(a.id)
      let idxB = appOrder.indexOf(b.id)
      if (idxA === -1) idxA = 999
      if (idxB === -1) idxB = 999
      return idxA - idxB
    })
  }, [installedApps, appOrder, userName, charName])

  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 15 } })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    
    const oldIndex = allApps.findIndex(a => a.id === active.id)
    const newIndex = allApps.findIndex(a => a.id === over.id)
    const newItems = arrayMove(allApps, oldIndex, newIndex)
    reorderApps(newItems.map(a => a.id))
  }, [allApps, reorderApps])

  // 長按任意圖標進入編輯模式（內置應用觸發，第三方應用由 dnd-kit onDragStart 觸發）
  const startLongPress = useCallback(() => {
    longPressTimer.current = setTimeout(() => setEditing(true), 500)
  }, [])

  const endLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }, [])

  const handleUninstall = useCallback(async (app: InstalledApp) => {
    const ok = await confirm(`确定卸载「${app.name}」？`, { danger: true })
    if (!ok) return

    // 询问是否保留数据
    const keepData = await confirm(`卸载完成。是否保留「${app.name}」产生的本地数据？\n(保留数据方便下次安装后恢复状态)`, {
      confirmText: '保留',
      cancelText: '清理数据',
      danger: false
    })

    uninstallApp(app.id, keepData === true)
    uninstallSkill(app.id.replace(/-/g, '_'))
    setEditing(false)
  }, [confirm, uninstallApp, uninstallSkill])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportError(null)
    setImporting(true)
    try {
      const pkg = await parsePackageZip(file)
      
      const appId = pkg.app?.id || pkg.skill?.id;
      const existingApp = installedApps.find(a => a.id === appId);
      
      if (existingApp) {
        const confirmUpdate = await confirm(`检测到已安装同名应用「${existingApp.name}」，是否覆盖并更新？`, { confirmText: '覆盖更新', danger: true });
        if (!confirmUpdate) {
          setImporting(false);
          return;
        }
      }

      // 存储限制检查 (20MB) - 针对静态包大小
      if (pkg.app) {
        const TOTAL_LIMIT = 20 * 1024 * 1024;
        const currentSize = installedApps.reduce((sum, a) => sum + (a.htmlContent?.length || 0) + (a.icon?.length || 0), 0);
        const newSize = (pkg.app.htmlContent?.length || 0) + (pkg.app.icon?.length || 0);
        
        if (currentSize + newSize > TOTAL_LIMIT) {
          throw new Error(`应用中心空间不足 (已用 ${(currentSize / 1024 / 1024).toFixed(1)}MB / 上限 20MB)。请先卸载一些应用。`);
        }
      }

      if (pkg.skill) { loadInstalledSkill(pkg.skill); installSkill(pkg.skill) }
      if (pkg.app) installApp(pkg.app)
    } catch (err: any) {
      setImportError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="apps-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="echo-apps-backdrop fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm"
            onClick={() => { setEditing(false); onClose() }}
          />
          <motion.div
            key="apps-sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="echo-apps-sheet fixed bottom-0 left-0 right-0 z-[201] rounded-t-[2.5rem] overflow-hidden"
            style={{
              background: 'var(--echo-apps-bg, var(--echo-base, #ffffff))',
              borderTop: '0.5px solid var(--echo-apps-border, rgba(0,0,0,0.08))',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.1)',
            }}
          >
            <div className="flex justify-center pt-4 pb-1">
              <div className="w-12 h-1.5 rounded-full opacity-20" style={{ background: 'var(--echo-apps-handle, currentColor)' }} />
            </div>

            <div className="flex items-center justify-between px-8 py-4">
              <div>
                <p className="text-[10px] font-serif tracking-[0.4em] uppercase opacity-70" style={{ color: 'var(--echo-apps-title-color, var(--echo-text-muted, #888))' }}>
                  {editing ? '长按拖动排序 · 点空白退出' : '应用中心'}
                </p>
                <p className="text-[7px] uppercase tracking-widest mt-0.5 opacity-40 font-mono" style={{ color: 'var(--echo-apps-sub-color, var(--echo-text-dim, #aaa))' }}>
                  Apps // Extensions // System
                </p>
              </div>
              <button
                onClick={() => editing ? setEditing(false) : onClose()}
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90"
                style={{ background: 'var(--echo-apps-close-bg, rgba(0,0,0,0.03))', color: 'var(--echo-apps-close-color, #888)' }}
              >
                {editing ? <span className="text-[11px] font-medium text-blue-500">完成</span> : <X size={16} strokeWidth={1.5} />}
              </button>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setEditing(true)} onDragEnd={handleDragEnd}>
              <div
                className="px-8 pb-10 pt-4 grid grid-cols-4 gap-6"
                style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}
                onClick={editing ? (e) => { if (e.target === e.currentTarget) setEditing(false) } : undefined}
              >
                <SortableContext items={allApps.map(a => a.id)} strategy={rectSortingStrategy}>
                  {allApps.map(app => (
                    <SortableAppItem
                      key={app.id}
                      app={app}
                      isBuiltIn={app.isBuiltIn}
                      editing={editing}
                      onOpen={() => {
                        if (app.isBuiltIn) {
                          onOpenApp(app as AppDefinition)
                        } else {
                          const a = app as InstalledApp
                          onOpenApp({ id: a.id, name: a.name, sub: a.id, icon: null, available: true, htmlContent: a.htmlContent })
                        }
                      }}
                      onUninstall={app.isBuiltIn ? undefined : () => handleUninstall(app as InstalledApp)}
                      onLongPressStart={startLongPress}
                      onLongPressEnd={endLongPress}
                    />
                  ))}
                </SortableContext>

                {/* 導入按鈕 */}
                <button
                  onClick={() => { setImportError(null); fileRef.current?.click() }}
                  disabled={importing}
                  className="echo-app-item flex flex-col items-center gap-3 group"
                >
                  <div
                    className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 group-active:scale-90 group-hover:shadow-lg group-hover:-translate-y-1"
                    style={{
                      background: 'var(--echo-app-icon-bg-disabled, rgba(0,0,0,0.03))',
                      border: '0.5px dashed var(--echo-app-icon-border, rgba(0,0,0,0.12))',
                      color: '#aaa',
                    }}
                  >
                    <Plus size={22} strokeWidth={1.2} />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[10px] tracking-wider font-medium" style={{ color: '#aaa' }}>
                      {importing ? '导入中' : '导入应用'}
                    </span>
                    <span className="text-[6px] uppercase tracking-tighter opacity-30 font-mono">.zip</span>
                  </div>
                </button>
              </div>
            </DndContext>

            {importError && <p className="px-8 pb-4 text-[9px] text-red-400 font-mono">{importError}</p>}
            <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={handleImport} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default AppsSheet
