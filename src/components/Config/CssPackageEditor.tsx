import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { CSS_SNIPPETS } from '../../styles/themePresets'

interface Props {
  id: string
  onClose: () => void
}

const CssPackageEditor: React.FC<Props> = ({ id, onClose }) => {
  const { config, updateCssPackage } = useAppStore()
  const pkg = (config.cssPackages || []).find(p => p.id === id)
  const [localCss, setLocalCss] = useState(pkg?.css ?? '')
  const [cssError, setCssError] = useState<string | null>(null)

  // 切换包时同步本地 state
  useEffect(() => { setLocalCss(pkg?.css ?? '') }, [id])

  if (!pkg) return null

  const handleCssBlur = () => {
    const open = (localCss.match(/\{/g) || []).length
    const close = (localCss.match(/\}/g) || []).length
    setCssError(open !== close ? '语法警告：大括号 {} 不匹配' : null)
    updateCssPackage(id, { css: localCss })
  }

  const appendSnippet = (snippetCss: string, label: string) => {
    const next = localCss ? `${localCss}\n\n/* ── ${label} ── */\n${snippetCss}` : `/* ── ${label} ── */\n${snippetCss}`
    setLocalCss(next)
    updateCssPackage(id, { css: next })
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 space-y-5">
      <div className="space-y-1">
        <label className="text-[9px] tracking-widest text-gray-400 uppercase">包名称</label>
        <input
          value={pkg.name}
          onChange={e => updateCssPackage(id, { name: e.target.value })}
          className="w-full px-3 py-2 bg-gray-50 dark:bg-black/30 border-0.5 border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[9px] tracking-widest text-gray-400 uppercase">快速插入</label>
        <div className="flex flex-wrap gap-2">
          {CSS_SNIPPETS.map(s => (
            <button key={s.label} onClick={() => appendSnippet(s.css, s.label)}
              className="px-2.5 py-1 rounded-lg text-[9px] tracking-widest uppercase text-gray-400 border-0.5 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:text-blue-400 transition-colors">
              + {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] tracking-widest text-gray-400 uppercase">CSS 内容</label>
        <textarea
          value={localCss}
          onChange={e => setLocalCss(e.target.value)}
          onBlur={handleCssBlur}
          spellCheck={false}
          rows={14}
          placeholder={`:root {\n  --dialogue-bg: rgba(0,0,0,0.6);\n}`}
          className={`w-full bg-gray-50 dark:bg-black/30 border-0.5 rounded-2xl p-4 font-mono text-[11px] text-gray-700 dark:text-gray-300 resize-none focus:outline-none transition-colors leading-relaxed ${cssError ? 'border-red-400' : 'border-gray-200 dark:border-gray-700 focus:border-blue-400'}`}
        />
        {cssError && <p className="text-[10px] text-red-500">{cssError}</p>}
      </div>

      <button onClick={onClose} className="w-full py-3 bg-white/50 dark:bg-gray-900 border-0.5 border-gray-200 dark:border-gray-800 rounded-full text-[10px] tracking-[0.4em] text-gray-600 dark:text-gray-400 uppercase hover:bg-white dark:hover:bg-gray-800 transition-all">
        完成
      </button>
    </motion.div>
  )
}

export default CssPackageEditor
