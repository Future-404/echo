import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, Play, Settings2, ShieldCheck, Globe } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { ttsService } from '../../utils/ttsService'

const TtsSettings: React.FC = () => {
  const { ttsSettings, updateTtsSettings } = useAppStore()
  const [voices, setVoices] = useState<any[]>([])
  const [isTesting, setIsFetching] = useState(false)

  // 加载浏览器语音列表
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
        { id: 'alloy', name: 'Alloy' },
        { id: 'echo', name: 'Echo' },
        { id: 'fable', name: 'Fable' },
        { id: 'onyx', name: 'Onyx' },
        { id: 'nova', name: 'Nova' },
        { id: 'shimmer', name: 'Shimmer' },
      ])
    }
  }, [ttsSettings.provider])

  const handleTest = () => {
    ttsService.speak("Echo system authorization granted. Neural link established.", ttsSettings);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} 
      className="p-8 space-y-10 pb-20"
    >
      {/* Master Toggle */}
      <div className="flex justify-between items-center bg-white/5 p-6 rounded-[2rem] border border-white/5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] tracking-[0.2em] text-gray-300 uppercase font-bold italic">Neural Voice // 语音合成</label>
          <span className="text-[8px] text-gray-500 uppercase tracking-widest">Enable TTS for assistant replies</span>
        </div>
        <button 
          onClick={() => updateTtsSettings({ enabled: !ttsSettings.enabled })}
          className={`w-12 h-6 rounded-full flex items-center transition-all px-1 ${ttsSettings.enabled ? 'bg-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-gray-800'}`}
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
            {/* Provider Selection */}
            <div className="group">
              <label className="text-[9px] tracking-wide text-gray-400 uppercase mb-3 block italic underline decoration-white/5 underline-offset-8">Engine Provider // 服务商</label>
              <div className="grid grid-cols-2 gap-2">
                {(['browser', 'openai', 'elevenlabs', 'edge'] as const).map(p => (
                  <button 
                    key={p}
                    onClick={() => updateTtsSettings({ provider: p })}
                    className={`py-3 rounded-2xl border text-[10px] uppercase tracking-widest transition-all ${ttsSettings.provider === p ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-gray-500 hover:border-white/10'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* API Config for external providers */}
            {(ttsSettings.provider === 'openai' || ttsSettings.provider === 'elevenlabs') && (
              <div className="space-y-6">
                <div className="group">
                  <label className="text-[9px] tracking-wide text-gray-400 uppercase mb-2 block italic">Neural Token // API Key</label>
                  <input 
                    type="password" 
                    value={ttsSettings.globalSettings.apiKey || ''} 
                    onChange={e => updateTtsSettings({ globalSettings: { ...ttsSettings.globalSettings, apiKey: e.target.value } })}
                    placeholder="sk-..."
                    className="w-full bg-white/5 border-b border-white/10 py-2 text-xs text-gray-300 focus:outline-none focus:border-orange-500/50 transition-colors"
                  />
                </div>
                {ttsSettings.provider === 'openai' && (
                  <div className="group">
                    <label className="text-[9px] tracking-wide text-gray-400 uppercase mb-2 block italic">Endpoint // 接口地址</label>
                    <input 
                      type="text" 
                      value={ttsSettings.globalSettings.endpoint || ''} 
                      onChange={e => updateTtsSettings({ globalSettings: { ...ttsSettings.globalSettings, endpoint: e.target.value } })}
                      placeholder="https://api.openai.com/v1"
                      className="w-full bg-white/5 border-b border-white/10 py-2 text-xs text-gray-300 focus:outline-none focus:border-orange-500/50 transition-colors"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Global Sliders */}
            <div className="space-y-6">
              <div className="group">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[9px] tracking-wide text-gray-400 uppercase italic">Speech Rate // 语速</label>
                  <span className="text-[10px] text-gray-500 font-mono">{ttsSettings.globalSettings.speed}x</span>
                </div>
                <input 
                  type="range" min="0.25" max="4.0" step="0.05"
                  value={ttsSettings.globalSettings.speed}
                  onChange={e => updateTtsSettings({ globalSettings: { ...ttsSettings.globalSettings, speed: parseFloat(e.target.value) } })}
                  className="w-full accent-orange-500/50"
                />
              </div>
              <div className="flex justify-between items-center group cursor-pointer" onClick={() => updateTtsSettings({ autoSpeak: !ttsSettings.autoSpeak })}>
                <label className="text-[9px] tracking-wide text-gray-400 uppercase italic cursor-pointer">Auto Transmission // 自动播报</label>
                <div className={`w-8 h-4 rounded-full flex items-center transition-all px-0.5 ${ttsSettings.autoSpeak ? 'bg-orange-500/50' : 'bg-gray-800'}`}>
                  <motion.div layout className="w-3 h-3 rounded-full bg-white shadow-sm" animate={{ x: ttsSettings.autoSpeak ? 16 : 0 }} />
                </div>
              </div>
            </div>

            <button 
              onClick={handleTest}
              className="w-full py-4 bg-white/5 border border-white/10 text-gray-400 rounded-full text-[10px] tracking-[0.4em] uppercase hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2"
            >
              <Play size={12} fill="currentColor" /> System Audio Test
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default TtsSettings
