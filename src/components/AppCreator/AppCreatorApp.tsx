import React, { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Sparkles, Loader2, RotateCcw, Save, Play, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { loadInstalledSkill } from '../../skills/core/loader'
import { callCreatorAI } from './appCreatorEngine'
import { applyPatch } from './patchEngine'
import { APP_CREATOR_DOCS } from './docs'
import type { CreatorState, AppFiles, ManifestData, ChatMessage } from './types'
import { EMPTY_MANIFEST, EMPTY_FILES } from './types'
import { useDialog } from '../GlobalDialog'

// ── Form 视图 ─────────────────────────────────────────────────────

const PERMISSIONS = ['chat_history', 'character_info', 'attributes'] as const

const FormView: React.FC<{ manifest: ManifestData; onChange: (m: ManifestData) => void; onSubmit: () => void }> = ({ manifest, onChange, onSubmit }) => {
  const set = (k: keyof ManifestData, v: any) => onChange({ ...manifest, [k]: v })
  
  const valid = 
    manifest.id.length >= 3 && 
    manifest.id.length <= 24 && 
    /^[a-z0-9-]+$/.test(manifest.id) && 
    manifest.name.length >= 1 && 
    manifest.name.length <= 16 &&
    manifest.description.length >= 1 &&
    manifest.description.length <= 100

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 space-y-4">
        <p className="text-[9px] uppercase tracking-widest text-echo-text-muted">基本信息（AI 不会修改这些字段）</p>

        {[
          { key: 'id', label: 'ID', placeholder: 'my-app (3-24 字符)', max: 24 },
          { key: 'name', label: '名称', placeholder: '显示名称 (1-16 字符)', max: 16 },
          { key: 'description', label: '功能描述', placeholder: '描述应用功能 (1-100 字符)', max: 100 },
          { key: 'author', label: '作者', placeholder: '可选 (最大 12)', max: 12 },
          { key: 'icon', label: '图标', placeholder: 'emoji，如 🎮', max: 4 },
        ].map(({ key, label, placeholder, max }) => (
          <div key={key} className="space-y-1">
            <label className="text-[9px] uppercase tracking-widest text-echo-text-muted">{label}</label>
            <input
              value={(manifest as any)[key]}
              maxLength={max}
              onChange={e => set(key as keyof ManifestData, e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent border-0.5 border-echo-border rounded-xl px-3 py-2 text-xs text-echo-text-base focus:outline-none focus:border-gray-400"
            />
          </div>
        ))}

        <div className="space-y-2">
          <label className="text-[9px] uppercase tracking-widest text-echo-text-muted">权限</label>
          {PERMISSIONS.map(p => (
            <label key={p} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={manifest.permissions.includes(p)}
                onChange={e => set('permissions', e.target.checked ? [...manifest.permissions, p] : manifest.permissions.filter(x => x !== p))}
                className="rounded"
              />
              <span className="text-xs text-echo-text-base">{p}</span>
            </label>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={manifest.hasSkill} onChange={e => set('hasSkill', e.target.checked)} className="rounded" />
          <span className="text-xs text-echo-text-base">包含 AI 技能（skill.js）</span>
        </label>
      </div>

      <div className="px-6 py-4 border-t border-echo-border">
        <button
          onClick={onSubmit}
          disabled={!valid}
          className="w-full py-2.5 rounded-xl bg-purple-500 text-white text-[10px] uppercase tracking-widest hover:bg-purple-600 transition-colors disabled:opacity-30"
        >
          开始创建
        </button>
      </div>
    </div>
  )
}

// ── Chat 视图 ─────────────────────────────────────────────────────

const ChatView: React.FC<{
  chatLog: ChatMessage[]
  status: CreatorState['status']
  error?: string
  hasCode: boolean
  canUndo: boolean
  onSend: (text: string) => void
  onUndo: () => void
  onPreview: () => void
}> = ({ chatLog, status, error, hasCode, canUndo, onSend, onUndo, onPreview }) => {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatLog.length, status])

  const send = () => {
    if (!input.trim() || status === 'running') return
    onSend(input.trim())
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-3">
        {chatLog.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
              m.role === 'user'
                ? 'bg-purple-500 text-white'
                : 'bg-echo-surface text-echo-text-base border-0.5 border-echo-border'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {status === 'running' && (
          <div className="flex justify-start">
            <div className="bg-echo-surface border-0.5 border-echo-border rounded-2xl px-3 py-2">
              <Loader2 size={12} className="text-purple-400 animate-spin" />
            </div>
          </div>
        )}
        {error && <p className="text-[9px] text-red-400 font-mono px-1">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* 操作栏 */}
      {hasCode && (
        <div className="flex gap-2 px-4 pb-2">
          {canUndo && (
            <button onClick={onUndo} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-echo-surface border-0.5 border-echo-border text-[9px] text-echo-text-muted hover:text-echo-text-base transition-colors">
              <RotateCcw size={10} /> 撤销
            </button>
          )}
          <button onClick={onPreview} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-echo-surface border-0.5 border-echo-border text-[9px] text-echo-text-muted hover:text-echo-text-base transition-colors">
            <Play size={10} /> 预览运行
          </button>
        </div>
      )}

      <div className="px-4 pb-4 flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="描述需求或修改要求..."
          rows={2}
          className="flex-1 bg-transparent border-0.5 border-echo-border rounded-xl px-3 py-2 text-xs text-echo-text-base focus:outline-none focus:border-gray-400 resize-none no-scrollbar"
        />
        <button
          onClick={send}
          disabled={!input.trim() || status === 'running'}
          className="px-3 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:opacity-30"
        >
          <Sparkles size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Preview 视图 ──────────────────────────────────────────────────

const PreviewView: React.FC<{
  html: string
  onBack: () => void
  onSave: () => void | Promise<void>
}> = ({ html, onBack, onSave }) => (
  <div className="flex flex-col h-full">
    <div className="flex items-center justify-between px-4 py-3 border-b border-echo-border">
      <button onClick={onBack} className="text-[9px] uppercase tracking-widest text-echo-text-muted hover:text-echo-text-base transition-colors">
        ← 返回编辑
      </button>
      <button onClick={onSave} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-500 text-white text-[9px] uppercase tracking-widest hover:bg-green-600 transition-colors">
        <Save size={10} /> 保存到应用中心
      </button>
    </div>
    <div className="flex-1 overflow-hidden">
      {html
        ? <iframe srcDoc={html} sandbox="allow-scripts allow-same-origin" className="w-full h-full border-0" title="app-preview" />
        : <div className="flex items-center justify-center h-full text-xs text-echo-text-muted">无 UI 界面（纯 Skill 应用）</div>
      }
    </div>
  </div>
)

// ── 主组件 ────────────────────────────────────────────────────────

const AppCreatorApp: React.FC = () => {
  const { config, installApp, installSkill, setCurrentView, updateAppCreatorState, resetAppCreatorState } = useAppStore()
  const state = config.appCreatorState
  const abortRef = useRef<AbortController | null>(null)
  const { confirm } = useDialog()

  if (!state) return null // 防御性保护：状态尚未就绪时渲染为空

  const provider = (() => {
    const mc = config.modelConfig
    const id = mc.toolProviderId || mc.extensionProviderId || mc.chatProviderId
    return config.providers.find(p => p.id === id)
  })()

  const handleSend = useCallback(async (text: string) => {
    if (!provider) return

    const controller = new AbortController()
    abortRef.current = controller

    // 用本地变量追踪，避免闭包陈旧
    let localChatLog = [...state.chatLog, { role: 'user' as const, text }]
    let localHistory = [...state.history, { role: 'user', content: text }]
    let localFiles = { ...state.files }
    let localSnapshots = [...state.snapshots]

    updateAppCreatorState({ chatLog: localChatLog, history: localHistory, status: 'running', error: undefined })

    try {
      let attempts = 0
      const maxAttempts = 3
      let finalOutput = null

      while (attempts < maxAttempts) {
        attempts++
        const output = await callCreatorAI(
          localHistory,
          state.manifest,
          localFiles,
          provider,
          controller.signal,
          APP_CREATOR_DOCS
        )

        if (output.phase === 'clarify' || output.phase === 'generate') {
          finalOutput = output
          break
        }

        if (output.phase === 'patch' && output.patches) {
          let newSkill = localFiles.skill
          let newHtml = localFiles.html
          const failedFiles: string[] = []

          for (const patch of output.patches) {
            const target = patch.file === 'skill' ? newSkill : newHtml
            const result = applyPatch(target, patch)
            if (result.failed.length > 0) failedFiles.push(`${patch.file} (op: ${result.failed.map(f => f.op).join(',')})`)
            if (patch.file === 'skill') newSkill = result.content
            else newHtml = result.content
          }

          if (failedFiles.length === 0) {
            localSnapshots = [...localSnapshots, { skill: localFiles.skill, html: localFiles.html, description: text.slice(0, 40) }]
            localFiles = { ...localFiles, skill: newSkill, html: newHtml }
            finalOutput = output
            break
          } else {
            const errorMsg = `Patch 失败：以下文件的 search 字符串无法在当前源码中匹配：\n${failedFiles.join('\n')}\n建议直接使用 phase="generate" 重写。`
            localHistory = [...localHistory, { role: 'assistant', content: JSON.stringify(output) }, { role: 'user', content: errorMsg }]
            localChatLog = [...localChatLog, { role: 'assistant' as const, text: `正在自动修复代码冲突 (第 ${attempts} 次)...` }]
            updateAppCreatorState({ chatLog: localChatLog })
            continue
          }
        }
      }

      if (!finalOutput) throw new Error('AI 无法生成有效的代码修改，请尝试重新描述需求。')

      localHistory = [...localHistory, { role: 'assistant', content: JSON.stringify(finalOutput) }]
      localChatLog = [...localChatLog, { role: 'assistant' as const, text: finalOutput.message }]

      // 处理全量生成
      if (finalOutput.phase === 'generate' && finalOutput.files) {
        localSnapshots = [...localSnapshots, { skill: localFiles.skill, html: localFiles.html, description: '全量更新' }]
        localFiles = { ...localFiles, ...finalOutput.files }

        if (localFiles.skill && state.manifest.hasSkill) {
          try {
            loadInstalledSkill({
              id: state.manifest.id, name: state.manifest.name,
              description: state.manifest.description, version: state.manifest.version,
              author: state.manifest.author, permissions: state.manifest.permissions,
              code: localFiles.skill, installedAt: Date.now(),
            })
          } catch (e: any) {
            localChatLog = [...localChatLog, { role: 'assistant' as const, text: `⚠️ skill.js 加载失败：${e.message}` }]
          }
        }
      }

      // 一次性提交所有变更
      updateAppCreatorState({
        chatLog: localChatLog,
        history: localHistory,
        files: localFiles,
        snapshots: localSnapshots,
        status: 'idle',
      })
    } catch (e: any) {
      if (e.name === 'AbortError') return
      updateAppCreatorState({ status: 'error', error: e.message })
    }
  }, [provider, state, updateAppCreatorState])

  const handleUndo = useCallback(() => {
    if (state.snapshots.length === 0) return
    const prev = state.snapshots[state.snapshots.length - 1]
    
    // 找到最后一个用户消息索引，回滚气泡
    const lastUserIdx = [...state.chatLog].reverse().findIndex(m => m.role === 'user')
    const newChatLog = lastUserIdx === -1 ? state.chatLog : state.chatLog.slice(0, state.chatLog.length - lastUserIdx - 1)

    updateAppCreatorState({
      files: { ...state.files, skill: prev.skill, html: prev.html },
      history: state.history.slice(0, -2),
      chatLog: newChatLog,
      snapshots: state.snapshots.slice(0, -1)
    })
  }, [state, updateAppCreatorState])

  const handleSave = useCallback(async () => {
    const { manifest, files } = state
    if (!files.skill && !files.html) {
      await confirm('当前没有可保存的内容，请先让 AI 生成代码。', { confirmText: '知道了', cancelText: '' })
      return
    }
    if (files.skill && manifest.hasSkill) {
      installSkill({
        id: manifest.id, name: manifest.name, description: manifest.description,
        version: manifest.version, author: manifest.author, permissions: manifest.permissions,
        code: files.skill, installedAt: Date.now(),
      })
    }
    if (files.html) {
      installApp({
        id: manifest.id, name: manifest.name, description: manifest.description,
        version: manifest.version, author: manifest.author, icon: manifest.icon,
        htmlContent: files.html, installedAt: Date.now(),
      })
    }
    setCurrentView('home')
  }, [state, installApp, installSkill, setCurrentView, confirm])

  const handleReset = async () => {
    const ok = await confirm('确定要清空当前所有进度并开启新项目吗？', { danger: true })
    if (ok) resetAppCreatorState()
  }

  const hasCode = !!(state.files.skill || state.files.html)

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[300] flex flex-col"
      style={{ background: 'var(--echo-base, #fff)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-echo-border shrink-0" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        <button onClick={() => { abortRef.current?.abort(); setCurrentView('home') }} className="text-echo-text-muted hover:text-echo-text-base transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <p className="text-[10px] font-serif tracking-[0.4em] uppercase text-echo-text-muted">AI 应用实验室</p>
          {state.phase !== 'form' && (
            <p className="text-[8px] font-mono text-echo-text-dim opacity-60">{state.manifest.id || '未命名'}</p>
          )}
        </div>
        <div className="ml-auto flex gap-4">
          {state.phase !== 'form' && (
            <button
              onClick={() => updateAppCreatorState({ phase: state.phase === 'preview' ? 'chat' : 'form' })}
              className="text-[9px] uppercase tracking-widest text-echo-text-muted hover:text-echo-text-base transition-colors"
            >
              {state.phase === 'preview' ? '编辑' : '信息'}
            </button>
          )}
          <button onClick={handleReset} className="text-echo-text-muted hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {!provider && (
        <div className="px-6 py-3 bg-red-50 dark:bg-red-900/20">
          <p className="text-[9px] text-red-400 uppercase tracking-widest">请配置模型分配中的 [工具] 或 [扩展] Provider</p>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {state.phase === 'form' && (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <FormView
                manifest={state.manifest}
                onChange={m => updateAppCreatorState({ manifest: m, files: { ...state.files, manifest: m } })}
                onSubmit={() => updateAppCreatorState({ phase: 'chat' })}
              />
            </motion.div>
          )}
          {state.phase === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ChatView
                chatLog={state.chatLog}
                status={state.status}
                error={state.error}
                hasCode={hasCode}
                canUndo={state.snapshots.length > 0}
                onSend={handleSend}
                onUndo={handleUndo}
                onPreview={() => updateAppCreatorState({ phase: 'preview' })}
              />
            </motion.div>
          )}
          {state.phase === 'preview' && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <PreviewView
                html={state.files.html}
                onBack={() => updateAppCreatorState({ phase: 'chat' })}
                onSave={handleSave}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default AppCreatorApp
