import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Check, Globe, Plus, Book, Settings2, Edit2, ChevronDown, ChevronUp, Key, Camera, Palette, Sparkles, Bot } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { WorldBook } from '../../types/store'
import { Toggle } from '../ui'
import TagTemplateEditor from './TagTemplateEditor'
import { extractPersonaFromPng } from '../../utils/pngParser'
import { useDialog } from '../GlobalDialog'
import { readFileAsDataURL } from '../../utils/fileUtils'
import AIAssistPanel from '../AIAssist/AIAssistPanel'
import type { AIAssistChange } from '../../types/aiAssist'
import { applyChanges } from '../../utils/aiAssistEngine'

interface CharacterEditorProps {
  charId: string
  onClose: () => void
}

const CharacterEditor: React.FC<CharacterEditorProps> = ({ charId, onClose }) => {
  const { 
    characters, updateCharacter, removeCharacter, config, saveSlots, deleteSaveSlot,
    addPrivateWorldBookEntry, updatePrivateWorldBookEntry, removePrivateWorldBookEntry,
    ttsSettings, updateTtsVoice
  } = useAppStore()
  const { confirm } = useDialog()
  
  const char = characters.find(c => c.id === charId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. 公共书库绑定逻辑
  const library = config.worldBookLibrary || []
  const boundBookIds = char?.extensions?.worldBookIds || []
  const privateEntries = char?.extensions?.worldBook || []

  // 2. 私人记忆编辑逻辑
  const [isAddingPrivate, setIsAddingPrivate] = useState(false)
  const [expandedPrivateId, setExpandedPrivateId] = useState<string | null>(null)
  const [newContent, setNewContent] = useState('')
  const [isParsersExpanded, setIsParsersExpanded] = React.useState(false)
  const [aiAssistOpen, setAiAssistOpen] = useState(false)

  if (!char) return null

  // 语音列表
  const voices = ttsSettings.provider === 'browser' && typeof window !== 'undefined' && window.speechSynthesis
    ? window.speechSynthesis.getVoices()
    : [];

  // 头像上传处理
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const personaRaw = await extractPersonaFromPng(file)
      const isV2 = personaRaw?.spec === 'chara_card_v2'
      const isV3 = personaRaw?.spec === 'chara_card_v3'
      const persona = isV2 || isV3 ? personaRaw?.data : personaRaw
      
      const base64 = await readFileAsDataURL(file)
      if (base64) {
        const updates: any = { image: base64 }
        
        if (persona && persona.name) {
          updates.name = persona.name
          
          const description = [
            persona.description,
            persona.personality,
            persona.scenario,
            persona.system_prompt,
            persona.mes_example
          ].filter(Boolean).join('\n\n')
          
          if (description) updates.systemPrompt = description
          
          const greeting = persona.first_mes || persona.greeting || persona.first_message
          if (greeting) updates.greeting = greeting
          
          if (isV2 || isV3) {
            if (persona.alternate_greetings?.length) {
              updates.alternateGreetings = persona.alternate_greetings
            }
            if (persona.post_history_instructions) {
              updates.postHistoryInstructions = persona.post_history_instructions
            }
            if (persona.character_book) {
              updates.extensions = {
                ...char.extensions,
                worldBook: persona.character_book.entries || []
              }
            }
          }

          // V3 assets 處理
          if (isV3 && persona.assets) {
            const mainIcon = persona.assets.find((a: any) => a.type === 'icon' && a.name === 'main')
            if (mainIcon?.uri === 'ccdefault:') {
              updates.image = base64
            } else if (mainIcon?.uri) {
              updates.image = mainIcon.uri
            }

            updates.extensions = {
              ...updates.extensions,
              ...char.extensions,
              assets: persona.assets
            }
          }
        }
        
        await updateCharacter(charId, updates)
      }
    } catch (err) {
      console.error("Failed to process character image:", err)
    }
  }

  const assets = char.extensions?.assets || []
  const emotions = assets.filter(a => a.type === 'emotion')
  const backgrounds = assets.filter(a => a.type === 'background')
  const activeEmotion = char.extensions?.activeEmotion
  const activeBackground = char.extensions?.activeBackground

  // 1. 公共书库绑定逻辑
  const toggleBookBinding = (bookId: string) => {
    const currentIds = [...boundBookIds]
    const index = currentIds.indexOf(bookId)
    if (index > -1) { currentIds.splice(index, 1) } else { currentIds.push(bookId) }
    updateCharacter(charId, { extensions: { ...char.extensions, worldBookIds: currentIds } })
  }

  // 2. 預設包綁定邏輯
  const boundPresetIds = char?.extensions?.promptPresetIds || []
  const togglePresetBinding = (presetId: string) => {
    const currentIds = [...boundPresetIds]
    const index = currentIds.indexOf(presetId)
    if (index > -1) { currentIds.splice(index, 1) } else { currentIds.push(presetId) }
    updateCharacter(charId, { extensions: { ...char.extensions, promptPresetIds: currentIds } })
  }

  // 3. CSS 包绑定逻辑
  const boundCssPackageIds = char?.extensions?.cssPackageIds || []
  const toggleCssPackageBinding = (pkgId: string) => {
    const currentIds = [...boundCssPackageIds]
    const index = currentIds.indexOf(pkgId)
    if (index > -1) { currentIds.splice(index, 1) } else { currentIds.push(pkgId) }
    updateCharacter(charId, { extensions: { ...char.extensions, cssPackageIds: currentIds } })
  }

  const handleAddPrivate = () => {
    if (!newContent.trim()) return
    const entry: WorldBookEntry = {
      id: `wb-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      keys: [],
      content: newContent,
      enabled: true,
      comment: ''
    }
    addPrivateWorldBookEntry(entry, charId)
    setNewContent('')
    setIsAddingPrivate(false)
    setExpandedPrivateId(entry.id)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-white/20 dark:bg-black/40 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-echo-white dark:bg-[#0d0d0d] rounded-[2.5rem] md:rounded-[3rem] border-0.5 border-echo-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh]"
      >
        {/* iOS 状态栏占位 */}
        <div className="h-[var(--sat)] w-full shrink-0" />

        <header className="p-6 md:p-8 pb-4 flex justify-between items-center border-b-0.5 border-gray-100 dark:border-gray-800">
          <div className="flex flex-col text-left">
            <h2 className="text-[10px] tracking-[0.6em] text-gray-400 uppercase">Core // Identifier</h2>
            <p className="text-[8px] text-gray-400 uppercase mt-1 italic">Rewrite Neural Pattern</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAiAssistOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] uppercase tracking-widest transition-all ${aiAssistOpen ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-purple-500'}`}
            >
              <Sparkles size={11} /> AI 協助
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
              <X size={20} strokeWidth={1} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-10 no-scrollbar text-left pb-32" style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
          {/* AI 協助面板 */}
          <AnimatePresence>
            {aiAssistOpen && (
              <AIAssistPanel
                char={char}
                onApply={async (changes: AIAssistChange[]) => {
                  const updated = applyChanges(char, changes)
                  const patch: any = {}
                  const scalarChanges = changes.filter(c => c.field !== 'worldBook')
                  scalarChanges.forEach(c => { if (c.op === 'set') patch[c.field] = c.value })
                  if (updated.alternateGreetings !== char.alternateGreetings) patch.alternateGreetings = updated.alternateGreetings

                  // worldBook 走專用方法，不走 updateCharacter（避免清空 worldEntries）
                  const wbChanges = changes.filter(c => c.field === 'worldBook')
                  if (wbChanges.length) {
                    const newEntries = updated.extensions?.worldBook || []
                    const oldEntries = char.extensions?.worldBook || []
                    // 新增的條目
                    for (const e of newEntries) {
                      if (!oldEntries.find(o => o.id === e.id)) {
                        await addPrivateWorldBookEntry(e, charId)
                      } else {
                        await updatePrivateWorldBookEntry(e.id, e, charId)
                      }
                    }
                    // 刪除的條目
                    for (const o of oldEntries) {
                      if (!newEntries.find(n => n.id === o.id)) {
                        await removePrivateWorldBookEntry(o.id, charId)
                      }
                    }
                  }

                  if (Object.keys(patch).length) updateCharacter(charId, patch)
                }}
                onClose={() => setAiAssistOpen(false)}
              />
            )}
          </AnimatePresence>
          {/* 头像 */}
          <div className="flex flex-col items-center gap-6 text-center">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-echo-surface border-0.5 border-gray-100 dark:border-gray-800 flex items-center justify-center overflow-hidden p-0 group relative cursor-pointer"
            >
              {char.image
                ? <img src={char.image} alt={char.name} className="w-full h-full object-cover transition-all group-hover:brightness-50" />
                : <Bot size={36} strokeWidth={1} className="text-gray-400 group-hover:opacity-0 transition-opacity" />
              }
              <div className="absolute inset-0 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-white" />
              </div>
            </button>
          </div>

          {/* 角色名 */}
          <div className="group text-left">
            <label className="text-[9px] tracking-widest text-gray-400 uppercase mb-3 block italic">Identifier Name // 角色名</label>
            <input 
              type="text" 
              value={char.name} 
              onChange={(e) => updateCharacter(charId, { name: e.target.value })}
              className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-2 text-sm text-echo-text-base focus:outline-none focus:border-gray-400"
            />
          </div>

          {/* 开场白 */}
          <div className="group text-left space-y-3">
            <label className="text-[9px] tracking-widest text-gray-400 uppercase mb-3 block italic underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Neural Greeting // 开场白</label>
            <textarea 
              value={char.greeting || ''} 
              onChange={(e) => updateCharacter(charId, { greeting: e.target.value })}
              placeholder="AI 的第一句话..."
              className="w-full bg-white/30 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-3xl p-6 text-sm text-echo-text-muted font-serif leading-relaxed focus:outline-none focus:border-gray-300 min-h-[100px] resize-none no-scrollbar"
            />

            {/* 备选开场白 */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-[8px] tracking-widest text-gray-400 uppercase italic">Alternate Greetings // 备选开场白</span>
                <button
                  onClick={() => updateCharacter(charId, { alternateGreetings: [...(char.alternateGreetings || []), ''] })}
                  className="p-1 rounded-full bg-echo-surface border border-echo-border-md text-gray-400 hover:text-black dark:hover:text-white transition-all"
                >
                  <Plus size={12} />
                </button>
              </div>
              {(char.alternateGreetings || []).map((g, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <textarea
                    value={g}
                    onChange={(e) => {
                      const next = [...(char.alternateGreetings || [])]
                      next[i] = e.target.value
                      updateCharacter(charId, { alternateGreetings: next })
                    }}
                    placeholder={`备选 ${i + 1}...`}
                    className="flex-1 bg-white/30 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-xs text-echo-text-muted font-serif leading-relaxed focus:outline-none focus:border-gray-300 min-h-[80px] resize-none no-scrollbar"
                  />
                  <button
                    onClick={() => {
                      const next = (char.alternateGreetings || []).filter((_, j) => j !== i)
                      updateCharacter(charId, { alternateGreetings: next.length ? next : undefined })
                    }}
                    className="mt-2 p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 人格设定 */}
          <div className="group text-left">
            <label className="text-[9px] tracking-widest text-gray-400 uppercase mb-3 block italic underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Neural Personality // 人格设定</label>
            <textarea 
              value={char.systemPrompt} 
              onChange={(e) => updateCharacter(charId, { systemPrompt: e.target.value })}
              className="w-full bg-white/30 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-3xl p-6 text-sm text-echo-text-muted font-serif leading-relaxed focus:outline-none focus:border-gray-300 min-h-[150px] resize-none no-scrollbar"
            />
          </div>

          {/* 场景设定 (ST Scenario) */}
          <div className="group text-left">
            <label className="text-[9px] tracking-widest text-gray-400 uppercase mb-3 block italic underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Neural Scenario // 场景设定</label>
            <textarea 
              value={char.scenario || ''} 
              onChange={(e) => updateCharacter(charId, { scenario: e.target.value })}
              placeholder="当前的故事背景、地点或发生的事件..."
              className="w-full bg-white/30 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-3xl p-6 text-sm text-echo-text-muted font-serif leading-relaxed focus:outline-none focus:border-gray-300 min-h-[100px] resize-none no-scrollbar"
            />
          </div>

          {/* Provider 绑定 */}
          <div className="group text-left">
            <label className="text-[9px] tracking-widest text-gray-400 uppercase mb-3 block italic underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Provider Binding // 模型绑定</label>
            <select
              value={char.providerId || ''}
              onChange={(e) => updateCharacter(charId, { providerId: e.target.value || undefined })}
              className="w-full bg-white/30 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-xs text-echo-text-muted focus:outline-none focus:border-gray-300 bg-white dark:bg-[#0d0d0d]"
            >
              <option value="">默认（使用全局激活的 Provider）</option>
              {config.providers.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {p.model}</option>
              ))}
            </select>
          </div>

          {/* TTS 语音绑定 */}
          {ttsSettings.enabled && (
            <div className="group text-left">
              <label className="text-[9px] tracking-widest text-gray-400 uppercase mb-3 block italic underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Neural Voice // 语音设置</label>
              <select
                value={ttsSettings.voiceMap[charId] || ''}
                onChange={(e) => updateTtsVoice(charId, e.target.value)}
                className="w-full bg-white/30 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 text-xs text-echo-text-muted focus:outline-none focus:border-gray-300 bg-white dark:bg-[#0d0d0d]"
              >
                <option value="">默认语音</option>
                {ttsSettings.provider === 'openai' ? (
                  ['alloy', 'ash', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer'].map(v => (
                    <option key={v} value={v}>{v.toUpperCase()}</option>
                  ))
                ) : (
                  voices.map(v => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* 1. 公共书库绑定 */}
          <div className="space-y-6 pt-6 border-t-0.5 border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] tracking-widest text-gray-400 uppercase italic flex items-center gap-2">
                <Book size={12} /> Codex Binding // 书库绑定
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {library.length === 0 ? (
                <p className="text-[9px] text-gray-400 italic text-center py-4 opacity-50">书库暂无书籍可绑定</p>
              ) : (
                library.map((book) => {
                  const isBound = boundBookIds.includes(book.id)
                  return (
                    <button key={book.id} onClick={() => toggleBookBinding(book.id)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isBound ? 'bg-blue-500/10 border-blue-400/30 text-blue-600 dark:text-blue-400' : 'bg-transparent border-echo-border text-gray-400'}`}>
                      <div className="flex items-center gap-3">
                        <Book size={14} className={isBound ? 'opacity-100' : 'opacity-40'} />
                        <span className="text-[11px] font-serif font-bold">{book.name}</span>
                      </div>
                      {isBound ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-echo-border-md" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* 2. 預設包綁定 */}
          <div className="space-y-6 pt-6 border-t-0.5 border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] tracking-widest text-gray-400 uppercase italic flex items-center gap-2">
                <Settings2 size={12} /> Preset Binding // 預設包綁定
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(config.promptPresets || []).length === 0 ? (
                <p className="text-[9px] text-gray-400 italic text-center py-4 opacity-50">暫無預設包，請先在全局管理中導入</p>
              ) : (
                (config.promptPresets || []).map((preset) => {
                  const isBound = boundPresetIds.includes(preset.id)
                  const enabledCount = preset.directives.filter(d => d.enabled).length
                  return (
                    <button key={preset.id} onClick={() => togglePresetBinding(preset.id)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isBound ? 'bg-purple-500/10 border-purple-400/30 text-purple-600 dark:text-purple-400' : 'bg-transparent border-echo-border text-gray-400'}`}>
                      <div className="flex items-center gap-3">
                        <Settings2 size={14} className={isBound ? 'opacity-100' : 'opacity-40'} />
                        <div className="text-left">
                          <span className="text-[11px] font-serif font-bold block">{preset.name}</span>
                          <span className="text-[8px] opacity-60">{enabledCount}/{preset.directives.length} 已啟用</span>
                        </div>
                      </div>
                      {isBound ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-echo-border-md" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* 3. CSS 包绑定 */}
          <div className="space-y-6 pt-6 border-t-0.5 border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] tracking-widest text-gray-400 uppercase italic flex items-center gap-2">
                <Palette size={12} /> CSS Binding // 样式包绑定
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(config.cssPackages || []).length === 0 ? (
                <p className="text-[9px] text-gray-400 italic text-center py-4 opacity-50">暂无样式包，请先在 DIY 界面创建</p>
              ) : (
                (config.cssPackages || []).map((pkg) => {
                  const isBound = boundCssPackageIds.includes(pkg.id)
                  return (
                    <button key={pkg.id} onClick={() => toggleCssPackageBinding(pkg.id)} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isBound ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-600 dark:text-cyan-400' : 'bg-transparent border-echo-border text-gray-400'}`}>
                      <div className="flex items-center gap-3">
                        <Palette size={14} className={isBound ? 'opacity-100' : 'opacity-40'} />
                        <span className="text-[11px] font-serif font-bold">{pkg.name}</span>
                      </div>
                      {isBound ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-echo-border-md" />}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* 4. 角色私设 (独有) - 全量注入逻辑 */}
          <div className="space-y-6 pt-6 border-t-0.5 border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] tracking-widest text-gray-400 uppercase italic flex items-center gap-2">
                <Globe size={12} /> Character Private Settings // 角色私设
              </label>
              <button onClick={() => setIsAddingPrivate(!isAddingPrivate)} className="p-1.5 bg-echo-surface border border-echo-border-md rounded-full text-gray-400 hover:text-black dark:hover:text-white transition-all">
                <Plus size={14} />
              </button>
            </div>


            {isAddingPrivate && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-echo-surface rounded-2xl p-4 space-y-3">
                <textarea placeholder="输入私设内容..." value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full bg-transparent text-[11px] font-serif min-h-[80px] resize-none focus:outline-none text-echo-text-base" />
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => { setIsAddingPrivate(false); setNewContent(''); }} className="text-[8px] uppercase tracking-widest text-gray-400 px-3 py-1">Cancel</button>
                  <button onClick={handleAddPrivate} className="text-[8px] uppercase tracking-widest bg-blue-500/10 text-blue-500 font-bold px-3 py-1 rounded-lg">Store</button>
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              {privateEntries.length === 0 ? (
                <p className="text-[9px] text-gray-400 italic text-center py-4 opacity-50">暂无私人记忆碎片</p>
              ) : (
                privateEntries.map((entry) => (
                  <div key={entry.id} className="bg-white/50 dark:bg-white/5 border-0.5 border-echo-border rounded-2xl overflow-hidden transition-all group">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer" onClick={() => setExpandedPrivateId(expandedPrivateId === entry.id ? null : entry.id)}>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[10px] font-serif font-bold text-echo-text-primary truncate">{entry.comment || entry.content.slice(0, 30)}</span>
                          <span className="text-[7px] font-mono text-gray-400 truncate opacity-60 italic">{entry.keys.join(', ') || 'Global Identity Pattern'}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* 改进开关按钮：使用 Switch 样式 */}
                        <Toggle
                          checked={entry.enabled}
                          onChange={() => updatePrivateWorldBookEntry(entry.id, { enabled: !entry.enabled }, charId)}
                          color="bg-orange-400/50"
                        />

                        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all">
                          <button onClick={() => removePrivateWorldBookEntry(entry.id, charId)} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors">
                            <Trash2 size={12} />
                          </button>
                          <button onClick={() => setExpandedPrivateId(expandedPrivateId === entry.id ? null : entry.id)} className="p-1.5 text-gray-400">
                            {expandedPrivateId === entry.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedPrivateId === entry.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4 border-t border-echo-border pt-4 space-y-4">
                          <div className="space-y-2">
                            <label className="text-[8px] uppercase tracking-widest text-gray-400 px-1">Content // 记忆内容</label>
                            <textarea 
                              value={entry.content} 
                              onChange={(e) => updatePrivateWorldBookEntry(entry.id, { content: e.target.value })}
                              className="w-full bg-white dark:bg-black/20 border-0.5 border-echo-border-md rounded-xl px-3 py-2 text-[11px] font-serif min-h-[100px] focus:outline-none focus:border-orange-400/50 transition-colors resize-none no-scrollbar"
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="text-[8px] uppercase tracking-widest text-gray-400 px-1">Label // 标签</label>
                              <input 
                                placeholder="Label" 
                                value={entry.comment || ''} 
                                onChange={e => updatePrivateWorldBookEntry(entry.id, { comment: e.target.value })}
                                className="w-full bg-white dark:bg-black/20 border-0.5 border-echo-border-md rounded-xl px-3 py-2 text-[10px] focus:outline-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[8px] uppercase tracking-widest text-gray-400 px-1">Order // 排序</label>
                              <input 
                                type="number"
                                placeholder="Order" 
                                value={entry.insertionOrder ?? 0} 
                                onChange={e => updatePrivateWorldBookEntry(entry.id, { insertionOrder: parseInt(e.target.value) || 0 })}
                                className="w-full bg-white dark:bg-black/20 border-0.5 border-echo-border-md rounded-xl px-3 py-2 text-[10px] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <label className="text-[8px] uppercase tracking-widest text-gray-400 px-1">Position // 注入位置</label>
                              <select
                                value={entry.position ?? 1}
                                onChange={e => updatePrivateWorldBookEntry(entry.id, { position: parseInt(e.target.value) as any })}
                                className="w-full bg-white dark:bg-black/20 border-0.5 border-echo-border-md rounded-xl px-3 py-2 text-[10px] focus:outline-none appearance-none"
                              >
                                <option value={4}>Top (最顶部)</option>
                                <option value={0}>Before Char (描述前)</option>
                                <option value={1}>After Char (描述后)</option>
                                <option value={2}>@ Depth (指定深度)</option>
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[8px] uppercase tracking-widest text-gray-400 px-1">Depth // 注入深度</label>
                              <input 
                                type="number"
                                disabled={entry.position !== 2}
                                placeholder="Depth (only for @Depth)" 
                                value={entry.depth ?? 4} 
                                onChange={e => updatePrivateWorldBookEntry(entry.id, { depth: parseInt(e.target.value) || 0 })}
                                className={`w-full bg-white dark:bg-black/20 border-0.5 border-echo-border-md rounded-xl px-3 py-2 text-[10px] focus:outline-none ${entry.position !== 2 ? 'opacity-30' : ''}`}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 高级解析规则模块 */}
          <div className="space-y-6 pt-6 border-t-0.5 border-gray-100 dark:border-gray-800 pb-10">
            <div className="flex justify-between items-center px-2 cursor-pointer group" onClick={() => setIsParsersExpanded(!isParsersExpanded)}>
              <label className="text-[10px] tracking-widest text-gray-400 uppercase italic flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                <Settings2 size={12} /> Advanced // 解析规则
              </label>
              <div className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">{isParsersExpanded ? 'Collapse' : 'Expand'}</div>
            </div>
            <AnimatePresence>
              {isParsersExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-gray-50/50 dark:bg-white/5 rounded-[2rem] border border-echo-border">
                  <TagTemplateEditor />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 表情系統 */}
          {emotions.length > 0 && (
            <div className="space-y-4 pt-6 border-t-0.5 border-gray-100 dark:border-gray-800">
              <label className="text-[10px] tracking-widest text-gray-400 uppercase italic px-2">Emotions // 表情</label>
              <div className="grid grid-cols-4 gap-2">
                {emotions.map(emotion => (
                  <button
                    key={emotion.name}
                    onClick={() => updateCharacter(charId, { extensions: { ...char.extensions, activeEmotion: emotion.name } })}
                    className={`aspect-square rounded-2xl overflow-hidden border-2 transition-all ${activeEmotion === emotion.name ? 'border-blue-400 scale-95' : 'border-gray-200 dark:border-gray-800'}`}
                  >
                    <img src={emotion.uri} alt={emotion.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 背景系統 */}
          {backgrounds.length > 0 && (
            <div className="space-y-4 pt-6 border-t-0.5 border-gray-100 dark:border-gray-800">
              <label className="text-[10px] tracking-widest text-gray-400 uppercase italic px-2">Backgrounds // 背景</label>
              <div className="grid grid-cols-3 gap-2">
                {backgrounds.map(bg => (
                  <button
                    key={bg.name}
                    onClick={() => updateCharacter(charId, { extensions: { ...char.extensions, activeBackground: bg.name } })}
                    className={`aspect-video rounded-xl overflow-hidden border-2 transition-all ${activeBackground === bg.name ? 'border-blue-400 scale-95' : 'border-gray-200 dark:border-gray-800'}`}
                  >
                    <img src={bg.uri} alt={bg.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="absolute bottom-0 left-0 right-0 p-6 md:p-8 pt-4 border-t-0.5 border-gray-100 dark:border-gray-800 flex gap-4 bg-echo-white dark:bg-[#0d0d0d] z-50">
          <button onClick={async () => {
            const relatedSlots = (saveSlots || []).filter(s => s.characterId === charId)
            const msg = relatedSlots.length > 0
              ? `确定要删除此角色吗？同时将删除 ${relatedSlots.length} 个相关存档，此操作不可撤销。`
              : '确定要删除此角色吗？此操作不可撤销。'
            const ok = await confirm(msg, {
              title: '确认删除角色',
              confirmText: '确认删除',
              danger: true
            })

            if (!ok) return

            // 如果有存档，进行第二次确认
            if (relatedSlots.length > 0) {
              const finalOk = await confirm(
                `警告：检测到 ${relatedSlots.length} 条关联的聊天记录。删除角色后，这些数据将永久丢失。确认要永久删除吗？`,
                {
                  title: '最终确认',
                  confirmText: '永久删除',
                  danger: true
                }
              )

              if (!finalOk) return
            }

            onClose() // 先关闭界面
            setTimeout(() => {
              relatedSlots.forEach(s => deleteSaveSlot(s.id))
              removeCharacter(charId)
            }, 50) 
          }} className="flex-1 py-3 md:py-4 flex items-center justify-center gap-2 border-0.5 border-red-100 dark:border-red-900/30 text-red-300 rounded-full text-[10px] tracking-widest uppercase hover:bg-red-50 transition-all"><Trash2 size={14} /> Purge</button>
          <button onClick={onClose} className="flex-[2] py-3 md:py-4 bg-white dark:bg-gray-900 border-0.5 border-gray-200 dark:border-gray-800 rounded-full text-[10px] tracking-widest uppercase text-gray-400 hover:text-gray-600 transition-all flex items-center justify-center gap-2 shadow-sm"><Check size={14} /> Commit Sync</button>
        </footer>
      </motion.div>
    </motion.div>
  )
}

export default CharacterEditor
