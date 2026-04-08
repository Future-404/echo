import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { ChevronLeft, ToggleLeft, ToggleRight, Brain } from 'lucide-react'

// 子组件
import Luminescence from './Config/Luminescence'
import IdentityLink from './Config/IdentityLink'
import ProviderManager from './Config/ProviderManager'
import ProviderEditor from './Config/ProviderEditor'
import DirectiveManager from './Config/DirectiveManager'
import DirectiveEditor from './Config/DirectiveEditor'
import WorldBookEditor from './Config/WorldBookEditor'
import SkillArsenal from './Config/SkillArsenal'
import AppearanceEditor from './Config/AppearanceEditor'
import PersonaManager from './Config/PersonaManager'
import DebugConsole from './Config/DebugConsole'
import StorageSettings from './Config/StorageSettings'
import TtsSettings from './Config/TtsSettings'
import RegexManager from './Config/RegexManager'
import RegexEditor from './Config/RegexEditor'
import MemoryManager from './Config/MemoryManager'

type SubView = 'main' | 'advanced' | 'gateway' | 'world' | 'prompt' | 'provider-edit' | 'directive-edit' | 'skills' | 'persona' | 'debug' | 'appearance' | 'storage' | 'tts' | 'regex' | 'regex-edit' | 'memory-palace' | 'global-management'

const MAIN_ITEMS = [
  { id: 'gateway', label: 'API 参数', icon: 'G', sub: 'API Gateway' },
  { id: 'memory-palace', label: '记忆管理', icon: 'M', sub: 'Memory Manager' },
  { id: 'persona', label: '身份管理', icon: 'U', sub: 'User Persona' },
  { id: 'global-management', label: '全局管理', icon: 'L', sub: 'World · Rules · Skills' },
  { id: 'appearance', label: 'DIY 界面', icon: 'A', sub: 'Themes · Aesthetics' },
  { id: 'tts',     label: '语音合成', icon: 'V', sub: 'Voice Synthesis' },
]

const GLOBAL_ITEMS = [
  { id: 'world',   label: '世界设定', icon: 'W', sub: 'World Context' },
  { id: 'prompt',  label: 'Prompt 注入', icon: 'P', sub: 'Directives' },
  { id: 'regex',   label: '全局正则', icon: 'R', sub: 'Regex Rules' },
  { id: 'skills',  label: '技能扩展', icon: 'S', sub: 'Extensions' },
]

const ADVANCED_ITEMS = [
  { id: 'storage',    label: '数据管理', icon: 'C', sub: 'Archive & Backup' },
  { id: 'debug',      label: '调试日志', icon: 'D', sub: 'Debug' },
]

// 从子视图推断返回目标
const getBackTarget = (view: SubView): SubView => {
  if (view === 'provider-edit') return 'gateway'
  if (view === 'directive-edit') return 'prompt'
  if (view === 'regex-edit') return 'regex'
  if (GLOBAL_ITEMS.some(i => i.id === view)) return 'global-management'
  if (ADVANCED_ITEMS.some(i => i.id === view)) return 'advanced'
  return 'main'
}

const NavItem: React.FC<{ id: string; label: string; icon: string; sub: string; onClick: () => void }> = ({ label, icon, sub, onClick }) => (
  <div onClick={onClick} className="w-full p-5 flex items-center gap-5 cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 rounded-3xl transition-all group">
    <div className="w-9 h-9 rounded-2xl border-0.5 border-gray-100 dark:border-gray-800 flex items-center justify-center group-hover:border-gray-300 dark:group-hover:border-gray-600 shadow-sm shrink-0">
      <span className="text-gray-400 text-[10px] uppercase font-bold">{icon}</span>
    </div>
    <div className="flex-1 text-left">
      <h4 className="text-sm font-serif text-gray-600 dark:text-gray-300 tracking-wide">{label}</h4>
      <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase mt-0.5 tracking-widest">{sub}</p>
    </div>
  </div>
)

const ConfigPanel: React.FC = () => {
  const { isConfigOpen, setIsConfigOpen, setCurrentView, addProvider, addDirective, config, updateConfig, configSubView, setConfigSubView, multiCharMode, setMultiCharMode, routerProviderId, setRouterProviderId } = useAppStore()
  const [editingId, setEditingId] = useState<string | null>(null)

  const activeView = configSubView as SubView
  const setActiveView = (view: SubView) => setConfigSubView(view as any)

  // ConfigPanel이 열릴 때 edit 서브뷰에 editingId가 없으면 부모 뷰로 리셋
  useEffect(() => {
    if (isConfigOpen && !editingId) {
      const editViews = ['provider-edit', 'directive-edit', 'regex-edit']
      if (editViews.includes(activeView)) {
        setActiveView(getBackTarget(activeView))
      }
    }
  }, [isConfigOpen])

  return (
    <AnimatePresence>
      {isConfigOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsConfigOpen(false)} className="fixed inset-0 z-[100] bg-white/10 dark:bg-black/20 backdrop-blur-md cursor-pointer" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="theme-surface fixed right-0 top-0 bottom-0 w-full max-w-sm z-[101] bg-echo-white/95 dark:bg-[#0a0a0a]/98 backdrop-blur-3xl border-l-0.5 border-echo-border flex flex-col shadow-2xl">
            {/* iOS 状态栏占位 */}
            <div className="h-[var(--sat)] min-h-[env(safe-area-inset-top)] w-full" />
            
            <header className="p-8 pb-6 flex items-center justify-between border-b-0.5 border-gray-100/50 dark:border-gray-800/50">
              {activeView !== 'main' && (
                <button onClick={() => setActiveView(getBackTarget(activeView))} className="text-gray-400 hover:text-gray-600 dark:text-gray-600 transition-colors">
                  <ChevronLeft size={20} strokeWidth={1} />
                </button>
              )}
              <div className="flex flex-col items-end flex-1 text-right">
                <h2 className="text-xs font-serif tracking-[0.3em] text-gray-500 dark:text-gray-400 font-medium">系统配置 // SYSTEM</h2>
                <p className="text-[7px] text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-1">Logic Configuration</p>
              </div>
            </header>

            <div className="flex-1 relative overflow-y-auto no-scrollbar">
              <AnimatePresence mode="wait">

                {/* 主菜单 */}
                {activeView === 'main' && (
                  <motion.div key="main" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="p-6 space-y-8">
                    <Luminescence />
                    <IdentityLink onClick={() => { setIsConfigOpen(false); setTimeout(() => setCurrentView('selection'), 300) }} />

                    <div className="space-y-1">
                      <label className="text-[9px] tracking-widest text-gray-400 dark:text-gray-600 uppercase italic px-4 underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Settings</label>
                      {MAIN_ITEMS.map(item => (
                        <NavItem key={item.id} {...item} onClick={() => setActiveView(item.id as SubView)} />
                      ))}
                    </div>

                    {/* 高级设置入口 */}
                    <div className="space-y-1">
                      <label className="text-[9px] tracking-widest text-gray-400 dark:text-gray-600 uppercase italic px-4 underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Advanced</label>
                      <NavItem id="advanced" label="高级设置" icon="⚙" sub="Appearance · Storage · Debug" onClick={() => setActiveView('advanced')} />
                    </div>

                    {/* 反馈群 */}
                    <div className="px-4 flex justify-between items-center opacity-50 hover:opacity-80 transition-opacity">
                      <span className="text-[8px] tracking-[0.2em] text-gray-400 uppercase font-serif italic">反馈群 // Q-Group</span>
                      <span className="text-[9px] font-mono text-gray-400 tracking-wider">616353694</span>
                    </div>
                  </motion.div>
                )}

                {/* 高级设置菜单 */}
                {activeView === 'advanced' && (
                  <motion.div key="advanced" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="p-6 space-y-4">
                    <div className="space-y-1">
                      {ADVANCED_ITEMS.map(item => (
                        <NavItem key={item.id} {...item} onClick={() => setActiveView(item.id as SubView)} />
                      ))}
                    </div>

                    {/* 多角色模式 */}
                    <div
                      className="flex justify-between items-center cursor-pointer px-5 py-4 rounded-3xl hover:bg-white/50 dark:hover:bg-white/5 transition-all"
                      onClick={() => setMultiCharMode(!multiCharMode)}
                    >
                      <div>
                        <p className="text-sm font-serif text-gray-600 dark:text-gray-300 tracking-wide">多角色模式</p>
                        <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase mt-0.5 tracking-widest">Multi-Character</p>
                      </div>
                      <button className="text-gray-400 pointer-events-none">
                        {multiCharMode ? <ToggleRight className="text-purple-400" size={24} /> : <ToggleLeft size={24} />}
                      </button>
                    </div>

                    {multiCharMode && (
                      <NavItem id="multi-selection" label="选择角色组合" icon="⊕" sub="Choose Char A & B"
                        onClick={() => { setIsConfigOpen(false); setTimeout(() => setCurrentView('multi-selection'), 300) }} />
                    )}

                    {multiCharMode && (
                      <div className="px-5 py-3 space-y-2">
                        <p className="text-[9px] text-gray-400 dark:text-gray-600 uppercase tracking-widest">Router Provider</p>
                        <select
                          value={routerProviderId}
                          onChange={e => setRouterProviderId(e.target.value)}
                          className="w-full bg-transparent border-0.5 border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-2 text-xs text-gray-500 dark:text-gray-400 focus:outline-none bg-white dark:bg-[#0a0a0a]"
                        >
                          <option value="">同全局 Provider</option>
                          {config.providers.map(p => (
                            <option key={p.id} value={p.id}>{p.name} — {p.model}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 调试模式开关 */}
                    <div
                      className="flex justify-between items-center cursor-pointer px-5 py-4 rounded-3xl hover:bg-white/50 dark:hover:bg-white/5 transition-all"
                      onClick={() => updateConfig({ isDebugEnabled: !config.isDebugEnabled })}
                    >
                      <div>
                        <p className="text-sm font-serif text-gray-600 dark:text-gray-300 tracking-wide">调试模式</p>
                        <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase mt-0.5 tracking-widest">Debug Mode</p>
                      </div>
                      <button className="text-gray-400 pointer-events-none">
                        {config.isDebugEnabled ? <ToggleRight className="text-green-400" size={24} /> : <ToggleLeft size={24} />}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* 全局管理菜单 */}
                {activeView === 'global-management' && (
                  <motion.div key="global-management" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="p-6 space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] tracking-widest text-gray-400 dark:text-gray-600 uppercase italic px-4 underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Global Controls</label>
                      {GLOBAL_ITEMS.map(item => (
                        <NavItem key={item.id} {...item} onClick={() => setActiveView(item.id as SubView)} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeView === 'gateway' && <ProviderManager 
                  onEdit={(id) => { setEditingId(id); setActiveView('provider-edit') }} 
                />}
                {activeView === 'provider-edit' && editingId && <ProviderEditor id={editingId} onClose={() => setActiveView('gateway')} />}
                {activeView === 'prompt' && <DirectiveManager onEdit={(id) => { setEditingId(id); setActiveView('directive-edit') }} onAdd={() => { const newId = `dir-${Date.now()}`; addDirective({ id: newId, title: '新指令', content: '', enabled: true }); setEditingId(newId); setActiveView('directive-edit') }} />}
                {activeView === 'directive-edit' && editingId && <DirectiveEditor id={editingId} onClose={() => setActiveView('prompt')} />}
                {activeView === 'world' && <WorldBookEditor />}
                {activeView === 'skills' && <SkillArsenal />}
                {activeView === 'persona' && <PersonaManager />}
                {activeView === 'debug' && <DebugConsole />}
                {activeView === 'appearance' && <AppearanceEditor />}
                {activeView === 'regex' && <RegexManager onEdit={(id) => { setEditingId(id); setActiveView('regex-edit') }} onAdd={() => { const newId = `regex-${Date.now()}`; addRegexRule({ id: newId, name: '新正则规则', regex: '', replacement: '', flags: 'gi', enabled: true, runOn: ['ui'] }); setEditingId(newId); setActiveView('regex-edit') }} />}
                {activeView === 'regex-edit' && editingId && <RegexEditor id={editingId} onClose={() => setActiveView('regex')} />}
                {activeView === 'storage' && <StorageSettings />}
                {activeView === 'tts' && <TtsSettings />}
                {activeView === 'memory-palace' && <MemoryManager />}

              </AnimatePresence>
            </div>

            <footer className="p-8 pt-4 border-t-0.5 border-gray-100/50 dark:border-gray-800/50">
              <button onClick={() => setIsConfigOpen(false)} className="w-full py-4 bg-white/50 dark:bg-gray-900 border-0.5 border-gray-200 dark:border-gray-800 rounded-full text-[10px] tracking-[0.4em] text-gray-400 dark:text-gray-500 uppercase hover:bg-white transition-all shadow-sm font-sans">同步系统 // SYNC SYSTEM</button>
            </footer>
          </motion.div>

        </>
      )}
    </AnimatePresence>
  )
}

export default ConfigPanel
