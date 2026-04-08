import React from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'

interface AppIconProps {
  icon: string
  label: string
  onClick: () => void
  color?: string
}

const AppIcon: React.FC<AppIconProps> = ({ icon, label, onClick, color = '#6366f1' }) => (
  <motion.button
    whileTap={{ scale: 0.88 }}
    whileHover={{ scale: 1.05 }}
    onClick={onClick}
    className="flex flex-col items-center gap-1.5 cursor-pointer select-none"
  >
    <div
      className="flex items-center justify-center text-2xl shadow-lg"
      style={{
        width: 'var(--launcher-icon-size, 60px)',
        height: 'var(--launcher-icon-size, 60px)',
        borderRadius: 'var(--launcher-icon-radius, 16px)',
        background: color,
      }}
    >
      {icon}
    </div>
    <span
      className="text-[11px] font-medium drop-shadow-sm"
      style={{ color: 'var(--launcher-label-color, #fff)' }}
    >
      {label}
    </span>
  </motion.button>
)

const HomeScreen: React.FC = () => {
  const { setCurrentApp, setCurrentView } = useAppStore()

  const apps = [
    {
      icon: '🎭', label: '剧场', color: '#7c3aed',
      action: () => { setCurrentApp('vn'); setCurrentView('home') }
    },
    {
      icon: '💬', label: '聊天', color: '#0ea5e9',
      action: () => setCurrentApp('chat')
    },
    {
      icon: '📖', label: '图鉴', color: '#f59e0b',
      action: () => { setCurrentApp('vn'); setCurrentView('selection') }
    },
    {
      icon: '🌍', label: '世界书', color: '#10b981',
      action: () => { setCurrentApp('vn'); useAppStore.getState().setIsConfigOpen(true, 'world') }
    },
    {
      icon: '🧠', label: '记忆', color: '#8b5cf6',
      action: () => { setCurrentApp('vn'); useAppStore.getState().setIsConfigOpen(true, 'memory-palace') }
    },
    {
      icon: '👤', label: '身份', color: '#ec4899',
      action: () => { setCurrentApp('vn'); useAppStore.getState().setIsConfigOpen(true, 'persona') }
    },
    {
      icon: '🔌', label: 'API', color: '#64748b',
      action: () => { setCurrentApp('vn'); useAppStore.getState().setIsConfigOpen(true, 'gateway') }
    },
    {
      icon: '🎨', label: '外观', color: '#f97316',
      action: () => { setCurrentApp('vn'); useAppStore.getState().setIsConfigOpen(true, 'appearance') }
    },
    {
      icon: '🔊', label: '语音', color: '#06b6d4',
      action: () => { setCurrentApp('vn'); useAppStore.getState().setIsConfigOpen(true, 'tts') }
    },
    {
      icon: '📜', label: '指令', color: '#84cc16',
      action: () => { setCurrentApp('vn'); useAppStore.getState().setIsConfigOpen(true, 'prompt') }
    },
    {
      icon: '🔧', label: '正则', color: '#ef4444',
      action: () => { setCurrentApp('vn'); useAppStore.getState().setIsConfigOpen(true, 'regex') }
    },
    {
      icon: '💾', label: '存档', color: '#6b7280',
      action: () => { setCurrentApp('vn'); useAppStore.getState().setIsConfigOpen(true, 'storage') }
    },
    {
      icon: '❓', label: '手册', color: '#0284c7',
      action: () => { setCurrentApp('vn'); setCurrentView('help') }
    },
    {
      icon: '🐛', label: '调试', color: '#dc2626',
      action: () => { setCurrentApp('vn'); useAppStore.getState().setIsConfigOpen(true, 'debug') }
    },
  ]

  const dock = [
    apps[0], // 剧场
    apps[1], // 聊天
    apps[2], // 图鉴
    apps[6], // API
  ]

  const gridApps = apps.slice(2)

  return (
    <div className="flex flex-col h-full w-full select-none">
      {/* 状态栏 */}
      <div className="flex justify-between items-center px-5 pt-3 pb-1 text-white/80 text-[11px] font-medium flex-shrink-0">
        <span>{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        <span className="flex items-center gap-1">
          <span>●●●</span>
          <span>WiFi</span>
          <span>🔋</span>
        </span>
      </div>

      {/* App Grid */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4">
        <div className="grid grid-cols-3 gap-x-4 gap-y-6 pb-4">
          {gridApps.map(app => (
            <AppIcon key={app.label} icon={app.icon} label={app.label} color={app.color} onClick={app.action} />
          ))}
        </div>
      </div>

      {/* Dock */}
      <div className="flex-shrink-0 mx-4 mb-4">
        <div
          className="flex justify-around items-center py-3 px-2"
          style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {dock.map(app => (
            <AppIcon key={app.label} icon={app.icon} label={app.label} color={app.color} onClick={app.action} />
          ))}
        </div>
        {/* Home 指示条 */}
        <div className="flex justify-center mt-3">
          <div className="w-24 h-1 rounded-full bg-white/40" />
        </div>
      </div>
    </div>
  )
}

export default HomeScreen
