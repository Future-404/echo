import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, X } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { CSS_SNIPPETS } from '../../styles/themePresets'
import { callCssAI } from './cssAIEngine'

interface Props {
  id: string
  onClose: () => void
}

const CssPackageEditor: React.FC<Props> = ({ id, onClose }) => {
  const { config, updateCssPackage } = useAppStore()
  const pkg = (config.cssPackages || []).find(p => p.id === id)
  const [localCss, setLocalCss] = useState(pkg?.css ?? '')
  const [cssError, setCssError] = useState<string | null>(null)

  // AI 协助状态
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiStatus, setAiStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [aiResult, setAiResult] = useState('')
  const [aiError, setAiError] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const provider = config.providers.find(p =>
    p.id === (config.modelConfig.toolProviderId || config.modelConfig.extensionProviderId || config.modelConfig.chatProviderId)
  )

  useEffect(() => { setLocalCss(pkg?.css ?? '') }, [id])

  if (!pkg) return null

  const commitCss = (css: string) => {
    setLocalCss(css)
    updateCssPackage(id, { css })
  }

  const handleCssBlur = () => {
    const open = (localCss.match(/\{/g) || []).length
    const close = (localCss.match(/\}/g) || []).length
    setCssError(open !== close ? '语法警告：大括号 {} 不匹配' : null)
    updateCssPackage(id, { css: localCss })
  }

  const appendSnippet = (snippetCss: string, label: string) => {
    const next = localCss ? `${localCss}\n\n/* ── ${label} ── */\n${snippetCss}` : `/* ── ${label} ── */\n${snippetCss}`
    commitCss(next)
  }

  const handleAiGenerate = async () => {
    if (!provider || !aiPrompt.trim()) return
    setAiStatus('running')
    setAiResult('')
    setAiError('')
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const result = await callCssAI(aiPrompt.trim(), localCss, provider, controller.signal)
      setAiResult(result)
      setAiStatus('done')
    } catch (e: any) {
      if (e.name === 'AbortError') { setAiStatus('idle'); return }
      setAiError(e.message)
      setAiStatus('error')
    }
  }

  const handleReplace = () => { commitCss(aiResult); setAiStatus('idle'); setAiResult('') }
  const handleAppend = () => {
    const next = localCss ? `${localCss}\n\n/* ── AI 生成 ── */\n${aiResult}` : aiResult
    commitCss(next)
    setAiStatus('idle')
    setAiResult('')
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

      {/* CSS 编辑区 + AI 按钮 */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[9px] tracking-widest text-gray-400 uppercase">CSS 内容</label>
          <button
            onClick={() => { setAiOpen(v => !v); setAiStatus('idle'); setAiResult('') }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] tracking-widest uppercase transition-colors ${aiOpen ? 'text-purple-500 bg-purple-500/10' : 'text-gray-400 hover:text-purple-500 hover:bg-purple-500/5'}`}
          >
            <Sparkles size={11} /> AI 协助
          </button>
        </div>

        {/* AI 面板 */}
        <AnimatePresence>
          {aiOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border-0.5 border-purple-400/20 bg-purple-500/5 p-4 space-y-3 mb-2">
                {!provider && (
                  <p className="text-[9px] text-red-400 uppercase tracking-widest">请先配置模型分配中的 Provider</p>
                )}

                {/* 输入 + 生成 */}
                {(aiStatus === 'idle' || aiStatus === 'error') && (
                  <div className="flex gap-2">
                    <input
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAiGenerate() }}
                      placeholder="描述想要的效果，如：把对话框改成半透明磨砂暗色风格"
                      className="flex-1 bg-transparent border-0.5 border-purple-400/30 rounded-xl px-3 py-2 text-xs text-echo-text-base focus:outline-none focus:border-purple-400 placeholder:text-gray-400 placeholder:italic"
                    />
                    <button
                      onClick={handleAiGenerate}
                      disabled={!provider || !aiPrompt.trim()}
                      className="px-3 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-30"
                    >
                      <Sparkles size={13} />
                    </button>
                  </div>
                )}

                {aiStatus === 'error' && (
                  <p className="text-[9px] text-red-400 font-mono">{aiError}</p>
                )}

                {/* 运行中 */}
                {aiStatus === 'running' && (
                  <div className="flex items-center gap-2">
                    <Loader2 size={12} className="text-purple-400 animate-spin" />
                    <span className="text-[10px] text-gray-400">生成中...</span>
                    <button onClick={() => abortRef.current?.abort()} className="ml-auto text-[9px] text-gray-400 hover:text-red-400 transition-colors">取消</button>
                  </div>
                )}

                {/* 结果预览 + 操作 */}
                {aiStatus === 'done' && aiResult && (
                  <div className="space-y-2">
                    <pre className="text-[10px] font-mono text-gray-600 dark:text-gray-300 bg-black/5 dark:bg-white/5 rounded-xl p-3 overflow-x-auto max-h-40 no-scrollbar whitespace-pre-wrap">{aiResult}</pre>
                    <div className="flex items-center gap-2">
                      <button onClick={handleReplace} className="px-3 py-1.5 rounded-xl bg-purple-500 text-white text-[9px] uppercase tracking-widest hover:bg-purple-600 transition-colors">替换</button>
                      <button onClick={handleAppend} className="px-3 py-1.5 rounded-xl bg-echo-surface border-0.5 border-echo-border text-[9px] uppercase tracking-widest text-echo-text-muted hover:text-echo-text-base transition-colors">追加</button>
                      <button onClick={() => { setAiStatus('idle'); setAiResult('') }} className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"><X size={13} /></button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
