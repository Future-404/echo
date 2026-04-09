import React, { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, ToggleLeft, ToggleRight, Pencil, Trash2, GripVertical } from 'lucide-react'
import { useAppStore, type CssPackage } from '../../store/useAppStore'
import { CSS_SNIPPETS } from '../../styles/themePresets'

interface Props {
  onEdit: (id: string) => void
}

const CssPackageManager: React.FC<Props> = ({ onEdit }) => {
  const { config, addCssPackage, updateCssPackage, removeCssPackage, reorderCssPackages } = useAppStore()
  const packages: CssPackage[] = config.cssPackages || []
  const [dragOver, setDragOver] = useState<number | null>(null)
  const dragging = useRef<number | null>(null)

  const onGripPointerDown = (e: React.PointerEvent, index: number) => {
    e.preventDefault()
    dragging.current = index
    const el = (e.currentTarget as HTMLElement).closest('[data-pkg-index]') as HTMLElement
    if (!el) return

    const container = el.parentElement!
    const items = Array.from(container.querySelectorAll('[data-pkg-index]')) as HTMLElement[]

    const onMove = (me: PointerEvent) => {
      let target = index
      items.forEach((item, i) => {
        const rect = item.getBoundingClientRect()
        if (me.clientY > rect.top + rect.height / 2) target = i
      })
      setDragOver(target)
    }

    const onUp = (ue: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      let target = index
      items.forEach((item, i) => {
        const rect = item.getBoundingClientRect()
        if (ue.clientY > rect.top + rect.height / 2) target = i
      })
      if (target !== index) {
        const next = [...packages]
        const [moved] = next.splice(index, 1)
        next.splice(target, 0, moved)
        reorderCssPackages(next)
      }
      dragging.current = null
      setDragOver(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handleAdd = () => {
    const id = `css-${Date.now()}`
    addCssPackage({ id, name: '新样式包', css: '', enabled: true })
    onEdit(id)
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 space-y-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <p className="text-xs font-serif tracking-[0.3em] text-gray-400 uppercase">CSS 样式包</p>
          <p className="text-[9px] text-gray-500 mt-0.5">拖动 <GripVertical size={9} className="inline" /> 排序，靠上优先级更高</p>
        </div>
        <button onClick={handleAdd} className="p-1.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-all">
          <Plus size={14} />
        </button>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-[10px] text-gray-400 italic">暂无样式包，从模板快速创建：</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {CSS_SNIPPETS.map(s => (
              <button key={s.label} onClick={() => { const id = `css-${Date.now()}`; addCssPackage({ id, name: s.label, css: s.css, enabled: true }); onEdit(id) }}
                className="px-2.5 py-1 rounded-lg text-[9px] tracking-widest uppercase text-gray-400 border-0.5 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-400 transition-colors">
                + {s.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-[8px] text-gray-300 dark:text-gray-700 uppercase tracking-widest px-3">↑ 高优先级</p>

          {packages.map((pkg, i) => (
            <div
              key={pkg.id}
              data-pkg-index={i}
              className={`flex items-center gap-2 p-3 rounded-2xl border-0.5 transition-all ${
                dragOver === i ? 'border-blue-400 bg-blue-500/10' :
                pkg.enabled ? 'border-blue-400/20 bg-blue-500/5' : 'border-gray-100 dark:border-white/5 bg-white/50 dark:bg-white/5'
              }`}
            >
              <GripVertical
                size={14}
                className="text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing shrink-0 touch-none"
                onPointerDown={e => onGripPointerDown(e, i)}
              />
              <button onClick={() => updateCssPackage(pkg.id, { enabled: !pkg.enabled })} className="text-gray-400 shrink-0">
                {pkg.enabled ? <ToggleRight size={18} className="text-blue-400" /> : <ToggleLeft size={18} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-serif truncate ${pkg.enabled ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>{pkg.name}</p>
              </div>
              <button onClick={() => onEdit(pkg.id)} className="p-1 text-gray-400 hover:text-blue-400 transition-colors shrink-0">
                <Pencil size={12} />
              </button>
              <button onClick={() => removeCssPackage(pkg.id)} className="p-1 text-gray-400 hover:text-red-400 transition-colors shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          <p className="text-[8px] text-gray-300 dark:text-gray-700 uppercase tracking-widest px-3">↓ 低优先级</p>

          <div className="mt-2 px-3 py-2 rounded-xl bg-purple-500/5 border-0.5 border-purple-400/20">
            <p className="text-[8px] text-purple-400 uppercase tracking-widest">角色绑定包 // 始终覆盖以上所有包</p>
            <p className="text-[8px] text-gray-400 mt-0.5">在角色卡编辑页 → CSS Binding 中设置</p>
          </div>

          <div className="pt-2">
            <p className="text-[9px] text-gray-400 uppercase tracking-widest px-1 mb-2">从模板新建</p>
            <div className="flex flex-wrap gap-2">
              {CSS_SNIPPETS.map(s => (
                <button key={s.label} onClick={() => { const id = `css-${Date.now()}`; addCssPackage({ id, name: s.label, css: s.css, enabled: true }); onEdit(id) }}
                  className="px-2.5 py-1 rounded-lg text-[9px] tracking-widest uppercase text-gray-400 border-0.5 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-400 transition-colors">
                  + {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default CssPackageManager
