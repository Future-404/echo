import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { ChevronLeft, ToggleLeft, ToggleRight } from 'lucide-react'

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

import CssPackageManager from './Config/CssPackageManager'
import CssPackageEditor from './Config/CssPackageEditor'

type SubView = 'main' | 'advanced' | 'gateway' | 'world' | 'prompt' | 'provider-edit' | 'directive-edit' | 'skills' | 'persona' | 'debug' | 'appearance' | 'storage' | 'tts' | 'regex' | 'regex-edit' | 'memory-palace' | 'global-management' | 'css-packages' | 'css-package-edit'

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

const getBackTarget = (view: SubView): SubView => {
  if (view === 'provider-edit') return 'gateway'
  if (view === 'directive-edit') return 'prompt'
  if (view === 'regex-edit') return 'regex'
  if (view === 'css-packages') return 'appearance'
  if (view === 'css-package-edit') return 'css-packages'
  if (GLOBAL_ITEMS.some(i => i.id === view)) return 'global-management'
  if (ADVANCED_ITEMS.some(i => i.id === view)) return 'advanced'
  return 'main'
}

const NavItem: React.FC<{ id: string; label: string; icon: string; sub: string; onClick: () => void }> = ({ label, icon, sub, onClick }) => (
  <div onClick={onClick} className="echo-config-nav-item w-full p-5 flex items-center gap-5 cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 rounded-3xl transition-all group">
    <div className="w-9 h-9 rounded-2xl border-0.5 border-gray-100 dark:border-gray-800 flex items-center justify-center group-hover:border-gray-300 dark:group-hover:border-gray-600 shadow-sm shrink-0">
      <span className="text-gray-400 text-[10px] uppercase font-bold">{icon}</span>
    </div>
    <div className="flex-1 text-left">
      <h4 className="text-sm font-serif text-echo-text-base tracking-wide">{label}</h4>
      <p className="text-[8px] text-echo-text-subtle uppercase mt-0.5 tracking-widest">{sub}</p>
    </div>
  </div>
)

const ConfigPanel: React.FC = () => {
  const { 
    setCurrentView, addProvider, addDirective, config, updateConfig, 
    configSubView, setConfigSubView, multiCharMode, setMultiCharMode 
  } = useAppStore()
  
  const [editingId, setEditingId] = useState<string | null>(null)

  const activeView = configSubView as SubView
  const setActiveView = (view: SubView) => setConfigSubView(view as any)

  const handleBack = () => {
    if (activeView === 'main') {
      setCurrentView('main')
    } else {
      setActiveView(getBackTarget(activeView))
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 1.02 }} 
      transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
      className="echo-config-panel fixed inset-0 z-[101] bg-echo-base dark:bg-[#050505] flex flex-col overflow-hidden"
    >
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="h-[var(--sat)] min-h-[env(safe-area-inset-top)] w-full" />
      
      <header className="px-6 py-8 flex items-center justify-between">
        <button 
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-echo-text-base hover:bg-black/10 dark:hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>

        <div className="flex flex-col items-end">
          <h2 className="text-xs font-serif tracking-[0.3em] text-echo-text-muted font-medium uppercase">
            {activeView === 'main' ? '系统配置 // System' : `${activeView.replace('-', ' ')} // Context`}
          </h2>
          <p className="text-[7px] text-echo-text-dim uppercase tracking-widest mt-1">Logic Calibration</p>
        </div>
      </header>

      <div className="flex-1 relative overflow-y-auto no-scrollbar max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeView === 'main' && (
            <motion.div key="main" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="p-6 space-y-8">
              <Luminescence />
              <IdentityLink onClick={() => setCurrentView('selection')} />

              <div className="space-y-1">
                <label className="text-[9px] tracking-widest text-echo-text-dim uppercase italic px-4 underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Settings</label>
                {MAIN_ITEMS.map(item => (
                  <NavItem key={item.id} {...item} onClick={() => setActiveView(item.id as SubView)} />
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-[9px] tracking-widest text-echo-text-dim uppercase italic px-4 underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Advanced</label>
                <NavItem id="advanced" label="高级设置" icon="⚙" sub="Appearance · Storage · Debug" onClick={() => setActiveView('advanced')} />
              </div>

              <div className="px-4 flex justify-between items-center opacity-50 hover:opacity-80 transition-opacity">
                <span className="text-[8px] tracking-[0.2em] text-gray-400 uppercase font-serif italic">反馈群 // Q-Group</span>
                <span className="text-[9px] font-mono text-gray-400 tracking-wider">616353694</span>
              </div>
            </motion.div>
          )}

          {activeView === 'advanced' && (
            <motion.div key="advanced" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="p-6 space-y-4">
              <div className="space-y-1">
                {ADVANCED_ITEMS.map(item => (
                  <NavItem key={item.id} {...item} onClick={() => setActiveView(item.id as SubView)} />
                ))}
              </div>

              <div
                className="flex justify-between items-center cursor-pointer px-5 py-4 rounded-3xl hover:bg-white/50 dark:hover:bg-white/5 transition-all"
                onClick={() => setMultiCharMode(!multiCharMode)}
              >
                <div>
                  <p className="text-sm font-serif text-echo-text-base tracking-wide">多角色模式</p>
                  <p className="text-[8px] text-echo-text-subtle uppercase mt-0.5 tracking-widest">Multi-Character</p>
                </div>
                <div className="text-gray-400">
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${multiCharMode ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-800'}`}>
                    <motion.div 
                      animate={{ x: multiCharMode ? 26 : 2 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {multiCharMode && (
                <NavItem id="multi-selection" label="选择角色组合" icon="⊕" sub="Choose Char A & B"
                  onClick={() => setCurrentView('multi-selection')} />
              )}

              <div
                className="flex justify-between items-center cursor-pointer px-5 py-4 rounded-3xl hover:bg-white/50 dark:hover:bg-white/5 transition-all"
                onClick={() => updateConfig({ isDebugEnabled: !config.isDebugEnabled })}
              >
                <div>
                  <p className="text-sm font-serif text-echo-text-base tracking-wide">调试模式</p>
                  <p className="text-[8px] text-echo-text-subtle uppercase mt-0.5 tracking-widest">Debug Mode</p>
                </div>
                <div className="text-gray-400">
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${config.isDebugEnabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-800'}`}>
                    <motion.div 
                      animate={{ x: config.isDebugEnabled ? 26 : 2 }}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'global-management' && (
            <motion.div key="global-management" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] tracking-widest text-echo-text-dim uppercase italic px-4 underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Global Controls</label>
                {GLOBAL_ITEMS.map(item => (
                  <NavItem key={item.id} {...item} onClick={() => setActiveView(item.id as SubView)} />
                ))}
              </div>
            </motion.div>
          )}

          {activeView === 'gateway' && <ProviderManager onEdit={(id) => { setEditingId(id); setActiveView('provider-edit') }} />}
          {activeView === 'provider-edit' && editingId && <ProviderEditor id={editingId} onClose={() => setActiveView('gateway')} />}
          {activeView === 'prompt' && <DirectiveManager onEdit={(id) => { setEditingId(id); setActiveView('directive-edit') }} onAdd={() => { const newId = `dir-${Date.now()}`; addDirective({ id: newId, title: '新指令', content: '', enabled: true }); setEditingId(newId); setActiveView('directive-edit') }} />}
          {activeView === 'directive-edit' && editingId && <DirectiveEditor id={editingId} onClose={() => setActiveView('prompt')} />}
          {activeView === 'world' && <WorldBookEditor />}
          {activeView === 'skills' && <SkillArsenal />}
          {activeView === 'persona' && <PersonaManager />}
          {activeView === 'debug' && <DebugConsole />}
          {activeView === 'appearance' && <AppearanceEditor onOpenCssPackages={() => setActiveView('css-packages')} />}
          {activeView === 'css-packages' && <CssPackageManager onEdit={(id) => { setEditingId(id); setActiveView('css-package-edit') }} />}
          {activeView === 'css-package-edit' && editingId && <CssPackageEditor id={editingId} onClose={() => setActiveView('css-packages')} />}
          {activeView === 'regex' && <RegexManager onEdit={(id) => { setEditingId(id); setActiveView('regex-edit') }} onAdd={() => { /* Assume regex rule adding logic here */ }} />}
          {activeView === 'regex-edit' && editingId && <RegexEditor id={editingId} onClose={() => setActiveView('regex')} />}
          {activeView === 'storage' && <StorageSettings />}
          {activeView === 'tts' && <TtsSettings />}
          {activeView === 'memory-palace' && <MemoryManager />}
        </AnimatePresence>
      </div>

      <footer className="p-8 pb-12 flex justify-center">
        <button 
          onClick={() => setCurrentView('main')} 
          className="px-12 py-4 bg-white/50 dark:bg-gray-900 border-0.5 border-gray-200 dark:border-gray-800 rounded-full text-[10px] tracking-[0.4em] text-gray-600 dark:text-echo-text-subtle uppercase hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm font-sans"
        >
          退出配置 // EXIT SYSTEM
        </button>
      </footer>
    </motion.div>
  )
}

export default ConfigPanel
