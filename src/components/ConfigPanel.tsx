import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { ChevronLeft } from 'lucide-react'

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
import StatusParserEditor from './Config/StatusParserEditor'
import DebugConsole from './Config/DebugConsole'
import StorageConfig from './Config/StorageConfig'
import { ToggleLeft, ToggleRight } from 'lucide-react'

type SubView = 'main' | 'gateway' | 'world' | 'prompt' | 'provider-edit' | 'directive-edit' | 'skills' | 'persona' | 'debug' | 'storage' | 'appearance' | 'parsers'

const ConfigPanel: React.FC = () => {
  const { isConfigOpen, setIsConfigOpen, setCurrentView, addProvider, addDirective, config, updateConfig, configSubView, setConfigSubView } = useAppStore()
  const [editingId, setEditingId] = useState<string | null>(null)

  // 同步本地视图状态到全局 Store，或反之
  const activeView = configSubView;
  const setActiveView = (view: SubView) => setConfigSubView(view as any);

  return (
    <AnimatePresence>
      {isConfigOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsConfigOpen(false)} className="fixed inset-0 z-[100] bg-white/10 dark:bg-black/20 backdrop-blur-md cursor-pointer" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="theme-surface fixed right-0 top-0 bottom-0 w-full max-w-sm z-[101] bg-echo-white/95 dark:bg-[#121212]/95 backdrop-blur-3xl border-l-0.5 border-echo-border flex flex-col shadow-2xl" >
            
            <header className="p-8 pb-6 flex items-center justify-between border-b-0.5 border-gray-100/50 dark:border-gray-800/50">
               {activeView !== 'main' && (
                 <button onClick={() => setActiveView(activeView.includes('edit') ? (activeView.startsWith('provider') ? 'gateway' : 'prompt') : 'main')} className="text-gray-400 hover:text-gray-600 dark:text-gray-600 transition-colors">
                    <ChevronLeft size={20} strokeWidth={1} />
                 </button>
               )}
               <div className="flex flex-col items-end flex-1 text-right">
                 <h2 className="text-xs font-serif tracking-[0.3em] text-gray-500 dark:text-gray-400 font-medium">系统配置 // SYSTEM</h2>
                 <p className="text-[7px] text-gray-300 dark:text-gray-600 uppercase tracking-widest mt-1">Logic Configuration</p>
               </div>
            </header>

            <div className="flex-1 relative overflow-y-auto no-scrollbar">
                <AnimatePresence mode="wait">
                    {activeView === 'main' && (
                        <motion.div key="main" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="p-6 space-y-10">
                            <Luminescence />
                            <IdentityLink onClick={() => { setIsConfigOpen(false); setTimeout(() => setCurrentView('selection'), 300); }} />
                            
                            <div className="space-y-4">
                                <label className="text-[9px] tracking-widest text-gray-300 dark:text-gray-600 uppercase italic px-4 underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Settings</label>
                                {[
                                    { id: 'appearance', label: '视觉风格', icon: 'A', sub: 'Appearance' },
                                    { id: 'persona', label: '身份管理', icon: 'U', sub: 'User Persona' },
                                    { id: 'gateway', label: 'API 参数', icon: 'G', sub: 'API Gateway' },
                                    { id: 'world', label: '世界设定', icon: 'W', sub: 'World Context' },
                                    { id: 'prompt', label: 'Prompt 注入', icon: 'P', sub: 'Directives' },
                                    { id: 'skills', label: '技能扩展', icon: 'S', sub: 'Extensions' },
                                    { id: 'debug', label: '调试日志', icon: 'D', sub: 'Debug' },
                                    { id: 'storage', label: '存储后端', icon: 'K', sub: 'Storage' },
                                ].map(item => (

                                    <div key={item.id} onClick={() => setActiveView(item.id as SubView)} className="w-full p-6 flex items-center gap-6 cursor-pointer hover:bg-white/50 dark:hover:bg-white/5 rounded-3xl transition-all group">
                                        <div className="w-10 h-10 rounded-2xl border-0.5 border-gray-100 dark:border-gray-800 flex items-center justify-center group-hover:border-gray-300 dark:group-hover:border-gray-600 shadow-sm">
                                            <span className="text-gray-400 text-[10px] uppercase font-bold">{item.icon}</span>
                                        </div>
                                        <div className="flex-1 text-left">
                                            <h4 className="text-sm font-serif text-gray-600 dark:text-gray-300 tracking-wide">{item.label}</h4>
                                            <p className="text-[8px] text-gray-300 dark:text-gray-500 uppercase mt-1 tracking-widest">{item.sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeView === 'gateway' && <ProviderManager onEdit={(id) => { setEditingId(id); setActiveView('provider-edit'); }} onAdd={() => { const newId = `provider-${Date.now()}`; addProvider({ id: newId, name: '新节点', apiKey: '', endpoint: 'https://api.openai.com/v1', model: 'gpt-4o' }); setEditingId(newId); setActiveView('provider-edit'); }} />}
                    {activeView === 'provider-edit' && editingId && <ProviderEditor id={editingId} onClose={() => setActiveView('gateway')} />}
                    {activeView === 'prompt' && <DirectiveManager onEdit={(id) => { setEditingId(id); setActiveView('directive-edit'); }} onAdd={() => { const newId = `dir-${Date.now()}`; addDirective({ id: newId, title: '新指令', content: '', enabled: true }); setEditingId(newId); setActiveView('directive-edit'); }} />}
                    {activeView === 'directive-edit' && editingId && <DirectiveEditor id={editingId} onClose={() => setActiveView('prompt')} />}
                    {activeView === 'world' && <WorldBookEditor />}
                    {activeView === 'skills' && <SkillArsenal />}
                    {activeView === 'persona' && <PersonaManager />}
                    {activeView === 'debug' && <DebugConsole />}
                    {activeView === 'appearance' && <AppearanceEditor />}
                    {activeView === 'parsers' && <StatusParserEditor />}
                    {activeView === 'storage' && (
                      <motion.div key="storage" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="p-6">
                        <StorageConfig />
                      </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <footer className="p-8 pt-4 border-t-0.5 border-gray-100/50 dark:border-gray-800/50 flex flex-col gap-4">
               <div className="flex flex-col gap-2 mb-2 px-4">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => updateConfig({ isDebugEnabled: !config.isDebugEnabled })}>
                    <span className="text-[10px] tracking-widest text-gray-400 uppercase font-serif">调试模式 // Debug Mode</span>
                    <button className="text-gray-400 pointer-events-none">
                      {config.isDebugEnabled ? <ToggleRight className="text-green-400" /> : <ToggleLeft />}
                    </button>
                  </div>
                  
                  {/* 交流反馈群 */}
                  <div className="flex justify-between items-center opacity-60 hover:opacity-100 transition-opacity">
                    <span className="text-[8px] tracking-[0.2em] text-gray-400 uppercase font-serif italic">反馈群 // Feedback Q-Group</span>
                    <span className="text-[9px] font-mono text-gray-400 tracking-wider">616353694</span>
                  </div>
               </div>
               <button onClick={() => setIsConfigOpen(false)} className="w-full py-4 bg-white/50 dark:bg-gray-900 border-0.5 border-gray-200 dark:border-gray-800 rounded-full text-[10px] tracking-[0.4em] text-gray-400 dark:text-gray-500 uppercase hover:bg-white transition-all shadow-sm font-sans">同步系统 // SYNC SYSTEM</button>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ConfigPanel
