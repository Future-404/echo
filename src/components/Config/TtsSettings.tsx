import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, Play, Settings2, ShieldCheck, Globe, ChevronRight } from 'lucide-react'
import { Toggle } from '../ui'
import { useAppStore } from '../../store/useAppStore'
import { ttsService } from '../../utils/ttsService'

const TtsSettings: React.FC = () => {
  const { config, ttsSettings, updateTtsSettings, selectedCharacter, secondaryCharacter, updateTtsVoice } = useAppStore()
  const [voices, setVoices] = useState<any[]>([])
  const [isTesting, setIsFetching] = useState(false)

  const ttsProviders = config.providers.filter(p => p.type === 'tts')

  // 加载语音列表
  useEffect(() => {
    if (ttsSettings.provider === 'browser') {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices()
        setVoices(v.map(voice => ({ id: voice.name, name: `${voice.name} (${voice.lang})` })))
      }
      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    } else if (ttsSettings.provider === 'openai') {
      setVoices([
        { id: 'alloy', name: 'Alloy' }, { id: 'echo', name: 'Echo' }, { id: 'fable', name: 'Fable' },
        { id: 'onyx', name: 'Onyx' }, { id: 'nova', name: 'Nova' }, { id: 'shimmer', name: 'Shimmer' },
      ])
    }
  }, [ttsSettings.provider])

  const handleTest = () => {
    ttsService.speak("Echo system authorization granted. Neural voice link established.", ttsSettings);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} 
      className="p-8 space-y-10 pb-20"
    >
      {/* Master Toggle */}
      <div className="flex justify-between items-center bg-white/5 dark:bg-white/5 p-6 rounded-[2.5rem] border border-echo-border shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] tracking-[0.2em] text-echo-text-muted uppercase font-bold italic">TTS 控制中心 // SYSTEM</label>
          <span className="text-[8px] text-echo-text-dim uppercase tracking-widest">Enable Text-to-Speech for assistant</span>
        </div>
        <button 
          onClick={() => updateTtsSettings({ enabled: !ttsSettings.enabled })}
          className={`w-12 h-6 rounded-full flex items-center transition-all px-1 ${ttsSettings.enabled ? 'bg-orange-500/50 shadow-lg shadow-orange-500/20' : 'bg-gray-200 dark:bg-gray-800'}`}
        >
          <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-sm" animate={{ x: ttsSettings.enabled ? 24 : 0 }} />
        </button>
      </div>

      <AnimatePresence>
        {ttsSettings.enabled && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="space-y-10"
          >
            {/* 角色音色关联 */}
            <div className="space-y-4">
              <label className="text-[9px] tracking-wide text-echo-text-dim uppercase italic underline decoration-gray-100 dark:decoration-white/5 underline-offset-8">Character Voice Map // 角色音色绑定</label>
              
              <div className="grid grid-cols-1 gap-3">
                {[selectedCharacter, secondaryCharacter].filter(Boolean).map((char: any) => (
                  <div key={char.id} className="bg-white/40 dark:bg-white/5 p-5 rounded-3xl border-0.5 border-echo-border flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-echo-surface flex items-center justify-center overflow-hidden border-0.5 border-echo-border-md">
                        {char.image ? <img src={char.image} className="w-full h-full object-cover" /> : <div className="text-[10px] uppercase text-gray-400">{char.name[0]}</div>}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-bold tracking-wide text-echo-text-base">{char.name}</p>
                        <p className="text-[7px] uppercase text-gray-400 mt-0.5">绑定音色: {ttsSettings.voiceMap[char.id] || '默认 (Alloy)'}</p>
                      </div>
                    </div>
                    
                    <select
                      value={ttsSettings.voiceMap[char.id] || ''}
                      onChange={(e) => updateTtsVoice(char.id, e.target.value)}
                      className="bg-transparent border-0.5 border-gray-100 dark:border-gray-800 rounded-xl px-3 py-1.5 text-[10px] text-echo-text-muted focus:outline-none focus:border-orange-300 transition-all max-w-[120px] shadow-sm"
                    >
                      <option value="">默认 (Alloy)</option>
                      {voices.map(v => (
                        <option key={v.id} value={v.id} className="bg-white dark:bg-[#121212]">{v.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Provider Selection */}
            <div className="group">
              <label className="text-[9px] tracking-wide text-echo-text-dim uppercase mb-4 block italic underline decoration-gray-100 dark:decoration-white/5 underline-offset-8">Engine Strategy // 驱动策略</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'browser', label: 'Local Browser', sub: 'Native API' },
                  { id: 'openai', label: 'Cloud Neural', sub: 'External Model' }
                ].map(p => (
                  <button 
                    key={p.id}
                    onClick={() => updateTtsSettings({ provider: p.id as any })}
                    className={`p-4 rounded-3xl border text-left transition-all ${ttsSettings.provider === p.id ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400' : 'bg-transparent border-echo-border text-gray-400 hover:border-gray-200 dark:hover:border-white/10'}`}
                  >
                    <p className="text-[10px] uppercase tracking-widest font-bold">{p.label}</p>
                    <p className="text-[7px] uppercase mt-1 opacity-60 tracking-tighter">{p.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Global Sliders */}
            <div className="space-y-8 px-2">
              <div className="group">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-[9px] tracking-wide text-gray-400 uppercase italic">Speech Rate // 语速倍率</label>
                  <span className="text-[10px] text-gray-500 font-mono bg-echo-surface px-2 py-0.5 rounded-full">{ttsSettings.globalSettings.speed}x</span>
                </div>
                <input 
                  type="range" min="0.25" max="3.0" step="0.05"
                  value={ttsSettings.globalSettings.speed}
                  onChange={e => updateTtsSettings({ globalSettings: { ...ttsSettings.globalSettings, speed: parseFloat(e.target.value) } })}
                  className="w-full accent-orange-500/50"
                />
              </div>
              
              <div className="flex justify-between items-center group cursor-pointer" onClick={() => updateTtsSettings({ autoSpeak: !ttsSettings.autoSpeak })}>
                <div className="flex flex-col">
                  <label className="text-[9px] tracking-wide text-gray-400 uppercase italic cursor-pointer">Auto Transmission // 自动播报</label>
                  <span className="text-[7px] text-gray-500 uppercase mt-0.5 tracking-widest">在回复生成完成后自动朗读</span>
                </div>
                <Toggle checked={ttsSettings.autoSpeak} onChange={() => updateTtsSettings({ autoSpeak: !ttsSettings.autoSpeak })} color="bg-orange-500/50" />
              </div>
            </div>

            <button 
              onClick={handleTest}
              className="w-full py-5 bg-white/60 dark:bg-white/5 border border-echo-border text-echo-text-muted rounded-full text-[10px] tracking-[0.4em] uppercase hover:bg-orange-500 hover:text-white hover:border-orange-400 transition-all flex items-center justify-center gap-3 shadow-sm font-bold"
            >
              <Play size={12} fill="currentColor" /> Run Audio Link Test
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default TtsSettings
