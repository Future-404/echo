import React, { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit2, FileUp } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import type { CharacterCard } from '../store/useAppStore'
import CharacterEditor from './Config/CharacterEditor'
import { extractPersonaFromPng } from '../utils/pngParser'

const CharacterSelection: React.FC = () => {
  const { currentView, setCurrentView, characters, setSelectedCharacter, addCharacter, messages } = useAppStore()
  const characterList = Array.isArray(characters) ? characters : []
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [importMsg, setImportMsg] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [greetingPicker, setGreetingPicker] = useState<CharacterCard | null>(null)

  const showToast = (status: 'success' | 'error', msg: string) => {
    setImportStatus(status)
    setImportMsg(msg)
    setTimeout(() => setImportStatus('idle'), 3000)
  }

  const isHtmlGreeting = (char: CharacterCard) => {
    const g = char.greeting || ''
    return g.trim().startsWith('<') && g.includes('</div>')
  }

  const handleBack = () => {
    if (messages.length > 0) {
      setCurrentView('main')
    } else {
      setCurrentView('home')
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentView === 'selection' && !editingId) {
        handleBack()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentView, setCurrentView, editingId, messages.length])

  const handleCreateBlank = () => {
    const newId = `custom-${Date.now()}`
    addCharacter({
      id: newId,
      name: 'New Entity',
      image: '/src/assets/react.svg',
      description: 'A blank neural template waiting for instructions.',
      systemPrompt: '你是谁？',
      greeting: '...',
    })
    setEditingId(newId)
  }

  // 处理文件导入 (支持 PNG 隐写、普通图片和 JSON)
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportStatus('loading')
    setImportMsg('')

    // 1. 如果是图片，先尝试提取隐写的 JSON 数据
    if (file.type.startsWith('image/')) {
      const embeddedRaw = await extractPersonaFromPng(file)
      const embeddedData = embeddedRaw?.data || embeddedRaw

      if (!embeddedData || !embeddedData.name) {
        showToast('error', '导入失败：图片中未找到有效的角色卡数据')
        e.target.value = ''
        return
      }

      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const base64Image = event.target?.result as string
        const charName = embeddedData.name

        const personality = [
          embeddedData.description,
          embeddedData.personality,
          embeddedData.scenario,
          embeddedData.mes_example,
        ].filter(Boolean).join('\n\n') || `你名为 ${charName}。`

        const extensions: any = {};
        if (embeddedData.extensions) {
          const ext = embeddedData.extensions;
          if (ext.mission_tracker?.missions) extensions.missions = ext.mission_tracker.missions;
          
          const charBook = ext.world_book || embeddedData.character_book;
          if (charBook?.entries) {
            extensions.worldBook = charBook.entries.map((e: any) => ({
              id: e.id || Math.random().toString(36).substr(2, 9),
              keys: Array.isArray(e.keys) ? e.keys : (e.key ? e.key.split(',').map((k: string) => k.trim()) : []),
              content: e.content || '',
              enabled: e.enabled !== false,
              comment: e.comment || '',
              insertionOrder: e.insertion_order ?? 0,
              position: (e.position === 0 ? 0 : 1) as 0 | 1,
              constant: e.constant ?? false,
              extensions: e.extensions ?? {},
            }));
          }
          
          if (ext.luminescence) extensions.luminescence = ext.luminescence;

          if (ext.regex_scripts) {
            extensions.tagTemplates = ext.regex_scripts.map((s: any) => ({
              id: s.id || Math.random().toString(36).substr(2, 9),
              name: s.scriptName || 'unnamed',
              originalRegex: s.findRegex,
              replaceString: s.replaceString ?? '',
              placement: Array.isArray(s.placement) ? s.placement : [1, 2],
              enabled: s.disabled !== true,
              fields: s.findRegex ? (s.findRegex.match(/\(.*?\)/g) || []).map((_: any, i: number) => `param${i + 1}`) : []
            }));
          }
        }

        addCharacter({
          id: `custom-${Date.now()}`,
          name: charName,
          image: base64Image,
          description: embeddedData.description || embeddedData.personality || 'Neural Data 打捞成功',
          systemPrompt: embeddedData.system_prompt || personality,
          postHistoryInstructions: embeddedData.post_history_instructions || undefined,
          alternateGreetings: embeddedData.alternate_greetings?.length ? embeddedData.alternate_greetings : undefined,
          greeting: embeddedData.first_mes || embeddedData.first_message || embeddedData.greeting || `你好，我是 ${charName}。`,
          depthPrompt: embeddedData.extensions?.depth_prompt?.prompt
            ? { content: embeddedData.extensions.depth_prompt.prompt, depth: embeddedData.extensions.depth_prompt.depth ?? 4, role: embeddedData.extensions.depth_prompt.role || 'system' }
            : undefined,
          extensions
        })
        showToast('success', `「${charName}」导入成功`)
        } catch {
          showToast('error', '导入失败：处理角色数据时出错')
        }
      }
      reader.readAsDataURL(file)
      e.target.value = ''
      return
    }

    // 2. 如果是纯 JSON 文件
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const rawJson = JSON.parse(event.target?.result as string)
          const json = rawJson.data || rawJson
          const items = Array.isArray(json) ? json : [json]
          
          let importedCount = 0;
          items.forEach(item => {
            const data = item.data || item;
            if (data.name) {
              const charName = data.name;
              const greeting = data.first_mes || data.first_message || data.greeting || ''
              const personality = [
                data.description,
                data.personality,
                data.scenario,
                data.mes_example,
              ].filter(Boolean).join('\n\n') || '你是一个神秘的 AI。'

              const extensions: any = {};
              const charBook = data.character_book || data.extensions?.world_book;
              if (charBook?.entries) {
                extensions.worldBook = charBook.entries.map((e: any) => ({
                  id: e.id || Math.random().toString(36).substr(2, 9),
                  keys: Array.isArray(e.keys) ? e.keys : (e.key ? e.key.split(',').map((k: string) => k.trim()) : []),
                  content: e.content || '',
                  enabled: e.enabled !== false,
                  comment: e.comment || '',
                  insertionOrder: e.insertion_order ?? 0,
              position: (e.position === 0 ? 0 : 1) as 0 | 1,
                  constant: e.constant ?? false,
                  extensions: e.extensions ?? {},
                }));
              }

              if (item.extensions?.regex_scripts) {
                extensions.tagTemplates = item.extensions.regex_scripts.map((s: any) => ({
                  id: s.id || Math.random().toString(36).substr(2, 9),
                  name: s.scriptName || 'unnamed',
                  originalRegex: s.findRegex,
                  replaceString: s.replaceString ?? '',
              placement: Array.isArray(s.placement) ? s.placement : [1, 2],
                  enabled: s.disabled !== true,
                  fields: s.findRegex ? (s.findRegex.match(/\(.*?\)/g) || []).map((_: any, i: number) => `param${i + 1}`) : []
                }));
              }

              addCharacter({
                id: item.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: data.name,
                image: item.image || data.image || '/src/assets/react.svg',
                description: data.description || data.personality || 'Echo 档案室新成员',
                systemPrompt: data.system_prompt || personality,
                postHistoryInstructions: data.post_history_instructions || undefined,
                alternateGreetings: data.alternate_greetings?.length ? data.alternate_greetings : undefined,
                greeting,
                depthPrompt: data.extensions?.depth_prompt?.prompt
                  ? { content: data.extensions.depth_prompt.prompt, depth: data.extensions.depth_prompt.depth ?? 4, role: data.extensions.depth_prompt.role || 'system' }
                  : undefined,
                extensions
              })
              importedCount++;
            }
          });
          
          if (importedCount === 0) {
            showToast('error', '导入失败：JSON 中未找到有效角色数据')
          } else {
            showToast('success', `成功导入 ${importedCount} 个角色`)
          }
        } catch { showToast('error', 'JSON 解析失败，格式可能不正确') }
      }
      reader.readAsText(file)
      e.target.value = ''
    }
  }

  return (
    <AnimatePresence>
      {currentView === 'selection' && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-echo-base dark:bg-[#050505] flex items-center justify-center p-6 md:p-10"
        >
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
             <span className="text-[25vh] font-serif font-black text-gray-200/20 dark:text-white/5 uppercase tracking-[0.3em]">Archive // 档案室</span>
          </div>

          <div className="relative z-10 w-full max-w-7xl cursor-default safe-area-top">
            <header className="mb-12 md:mb-20 text-center">
              <motion.h2 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-[12px] md:text-[14px] tracking-[0.8em] text-gray-500 dark:text-gray-400 uppercase mb-4 font-medium">Neural Identifiers</motion.h2>
              <div className="w-12 h-[1px] bg-gray-400 dark:bg-gray-700 mx-auto" />
              <p className="mt-4 text-[8px] text-gray-400 dark:text-gray-500 uppercase tracking-[0.4em] opacity-80">Click card to select // 点击卡片选择角色</p>
            </header>

            <div className="flex gap-8 md:gap-12 overflow-x-auto no-scrollbar pb-20 px-4 md:px-10 snap-x relative after:content-[''] after:w-4 after:md:w-10 after:flex-shrink-0">
              {characterList.map((char, index) => (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.6 }}
                  whileHover={{ y: -10 }}
                  onClick={() => {
                    if (!isHtmlGreeting(char) && char.alternateGreetings?.length) {
                      setGreetingPicker(char)
                    } else {
                      setSelectedCharacter(char)
                    }
                  }}
                  className="snap-center flex-shrink-0 w-64 md:w-72 h-[420px] md:h-[480px] bg-white/80 dark:bg-white/5 backdrop-blur-2xl border-0.5 border-gray-200 dark:border-white/10 rounded-[3rem] cursor-pointer group flex flex-col transition-all shadow-xl hover:shadow-2xl relative select-none"
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingId(char.id); }}
                    className="absolute top-6 right-6 p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-40 hover:opacity-100 group-hover:opacity-100 transition-all z-20"
                    title="编辑角色"
                  >
                    <Edit2 size={16} strokeWidth={1.5} className="text-gray-500 dark:text-gray-400" />
                  </button>
                  <div className="flex-1 flex flex-col items-center justify-center p-8 pointer-events-none">
                    <div className="w-28 h-28 md:w-32 md:h-32 mb-10 relative">
                        <div className="absolute inset-0 rounded-full border-0.5 border-gray-100 dark:border-white/5 scale-125 animate-pulse" />
                        <img src={char.image} alt={char.name} className="w-full h-full object-cover rounded-full grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 ease-out" />
                    </div>
                    <h3 className="text-lg md:text-xl font-serif text-gray-600 dark:text-gray-200 tracking-widest group-hover:text-black dark:group-hover:text-white transition-colors">{char.name}</h3>
                    <div className="mt-3 w-4 h-[0.5px] bg-gray-300 dark:bg-gray-600 group-hover:w-12 group-hover:bg-gray-500 transition-all duration-500" />
                  </div>
                  <div className="px-10 pb-12 pointer-events-none">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center leading-relaxed tracking-widest uppercase italic pointer-events-none line-clamp-3">{char.description}</p>
                  </div>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                onClick={handleCreateBlank}
                className="snap-center flex-shrink-0 w-64 md:w-72 h-[420px] md:h-[480px] border border-dashed border-gray-300 dark:border-gray-700 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer group transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-6 group-hover:bg-white dark:group-hover:bg-gray-800 transition-colors shadow-inner">
                    <Plus strokeWidth={1} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-800 dark:group-hover:text-gray-200" />
                </div>
                <span className="text-[10px] tracking-[0.4em] text-gray-400 dark:text-gray-500 uppercase group-hover:text-gray-700 dark:group-hover:text-gray-400 transition-colors">Blank Template // 空白模板</span>
                <span className="text-[8px] mt-2 text-gray-400/60 dark:text-gray-600">Create new // 创建新角色</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: importStatus === 'loading' ? 1 : 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
                onClick={() => importStatus !== 'loading' && fileInputRef.current?.click()}
                className="snap-center flex-shrink-0 w-64 md:w-72 h-[420px] md:h-[480px] border border-dashed border-gray-300 dark:border-gray-700 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer group transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-6 group-hover:bg-white dark:group-hover:bg-gray-800 transition-colors shadow-inner">
                  {importStatus === 'loading'
                    ? <svg className="animate-spin w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <FileUp strokeWidth={1} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-800 dark:group-hover:text-gray-200" />
                  }
                </div>
                <span className="text-[10px] tracking-[0.4em] text-gray-400 dark:text-gray-500 uppercase group-hover:text-gray-700 dark:group-hover:text-gray-400 transition-colors">
                  {importStatus === 'loading' ? 'Uploading // 上传中...' : 'Import Data // 导入数据'}
                </span>
                <span className="text-[8px] mt-2 text-gray-400/60 dark:text-gray-600">JSON / PNG / V3</span>
                <input type="file" ref={fileInputRef} onChange={handleFileImport} className="hidden" accept=".json,image/*" />
              </motion.div>
            </div>

            <footer className="text-center mt-4">
                <button onClick={handleBack} className="text-[9px] tracking-[0.6em] text-gray-400 dark:text-gray-600 uppercase hover:text-gray-800 dark:hover:text-gray-400 transition-all">Discard // 返回</button>
            </footer>
          </div>

          {/* Toast 提示 */}
          <AnimatePresence>
            {importStatus !== 'idle' && importStatus !== 'loading' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-xs tracking-widest uppercase z-[200] ${
                  importStatus === 'success' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}
              >
                {importMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {editingId && <CharacterEditor charId={editingId} onClose={() => setEditingId(null)} />}
          </AnimatePresence>

          <AnimatePresence>
            {greetingPicker && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
                onClick={() => setGreetingPicker(null)}
              >
                <motion.div
                  initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                  onClick={e => e.stopPropagation()}
                  className="w-full max-w-lg bg-echo-white dark:bg-[#0d0d0d] rounded-[2rem] border-0.5 border-echo-border shadow-2xl overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-100 dark:border-white/5">
                    <p className="text-[9px] tracking-[0.5em] text-gray-400 uppercase">选择开场白 // Select Greeting</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{greetingPicker.name}</p>
                  </div>
                  <div className="overflow-y-auto max-h-[60vh] no-scrollbar divide-y divide-gray-100 dark:divide-white/5">
                    {[greetingPicker.greeting, ...(greetingPicker.alternateGreetings || [])].map((g, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedCharacter(greetingPicker, g ?? undefined); setGreetingPicker(null) }}
                        className="w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                      >
                        <span className="text-[8px] tracking-widest text-gray-400 uppercase block mb-1">
                          {i === 0 ? '默认开场白' : `备选 ${i}`}
                        </span>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-serif leading-relaxed line-clamp-3">
                          {g?.replace(/<[^>]+>/g, '').slice(0, 120) || '（空）'}
                        </p>
                      </button>
                    ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-white/5">
                    <button onClick={() => setGreetingPicker(null)} className="w-full py-2 text-[9px] tracking-widest uppercase text-gray-400 hover:text-gray-600 transition-colors">
                      取消
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CharacterSelection
