import React from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { ThemeMode } from '../../types/store'

const Luminescence: React.FC = () => {
  const { config, updateConfig } = useAppStore()

  return (
    <div className="space-y-4">
      <label className="text-[9px] tracking-widest text-echo-text-dim uppercase italic px-4 underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Luminescence</label>
      <div className="flex gap-2 px-2">
        {[
          { id: 'light', icon: Sun, label: 'Light' },
          { id: 'dark', icon: Moon, label: 'Dark' },
          { id: 'system', icon: Monitor, label: 'Auto' },
        ].map(mode => (
          <button 
            key={mode.id}
            onClick={() => updateConfig({ theme: mode.id as ThemeMode })}
            className={`flex-1 py-3 rounded-2xl border-0.5 flex flex-col items-center gap-2 transition-all ${config.theme === mode.id ? 'bg-white dark:bg-white/10 border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-200' : 'bg-transparent border-gray-100 dark:border-gray-800 text-echo-text-dim hover:border-gray-200'}`}
          >
            <mode.icon size={14} strokeWidth={1} />
            <span className="text-[8px] uppercase tracking-widest">{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Luminescence
