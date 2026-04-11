import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image, Send, Heart, BookOpen, LayoutGrid } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { replaceMacros } from '../logic/promptEngine'

export interface AppDefinition {
  id: string
  name: string
  sub: string
  icon: React.ReactNode
  available: boolean
  component?: React.ComponentType
}

// 应用注册表
export const APP_REGISTRY: AppDefinition[] = [
  {
    id: 'send-image',
    name: '发送图片',
    sub: 'Send Image',
    icon: <Image size={24} strokeWidth={1.5} />,
    available: true,
  },
  {
    id: 'tweet-square',
    name: '{{char}}的推文广场',
    sub: 'Tweet Square',
    icon: <BookOpen size={24} strokeWidth={1.5} />,
    available: true,
  },
  {
    id: 'transfer',
    name: '转账',
    sub: 'Transfer',
    icon: <Send size={24} strokeWidth={1.5} />,
    available: false,
  },
  {
    id: 'couple-space',
    name: '情侣空间',
    sub: 'Couple Space',
    icon: <Heart size={24} strokeWidth={1.5} />,
    available: false,
  },
]

interface Props {
  open: boolean
  onClose: () => void
  onOpenApp: (app: AppDefinition) => void
}

const AppsSheet: React.FC<Props> = ({ open, onClose, onOpenApp }) => {
  const { selectedCharacter, config } = useAppStore()
  const activePersona = config.personas.find((p) => p.id === config.activePersonaId) || config.personas[0]
  const userName = activePersona?.name || 'Observer'
  const charName = selectedCharacter?.name || 'Character'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩 */}
          <motion.div
            key="apps-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="echo-apps-backdrop fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="apps-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="echo-apps-sheet fixed bottom-0 left-0 right-0 z-[201] rounded-t-[2.5rem] overflow-hidden"
            style={{
              background: 'var(--echo-apps-bg, var(--echo-base, #ffffff))',
              borderTop: '0.5px solid var(--echo-apps-border, rgba(0,0,0,0.08))',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.1)',
            }}
          >
            {/* 拖动条 */}
            <div className="flex justify-center pt-4 pb-1">
              <div className="w-12 h-1.5 rounded-full opacity-20" style={{ background: 'var(--echo-apps-handle, currentColor)' }} />
            </div>

            {/* 标题栏 */}
            <div className="flex items-center justify-between px-8 py-4">
              <div>
                <p className="text-[10px] font-serif tracking-[0.4em] uppercase opacity-70" style={{ color: 'var(--echo-apps-title-color, var(--echo-text-muted, #888))' }}>
                  应用中心
                </p>
                <p className="text-[7px] uppercase tracking-widest mt-0.5 opacity-40 font-mono" style={{ color: 'var(--echo-apps-sub-color, var(--echo-text-dim, #aaa))' }}>
                  Apps // Extensions // System
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90"
                style={{ background: 'var(--echo-apps-close-bg, rgba(0,0,0,0.03))', color: 'var(--echo-apps-close-color, #888)' }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* 应用网格 */}
            <div className="px-8 pb-10 pt-4 grid grid-cols-4 gap-6" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>
              {APP_REGISTRY.map(app => {
                const displayName = replaceMacros(app.name, userName, charName)
                return (
                  <button
                    key={app.id}
                    onClick={() => onOpenApp({ ...app, name: displayName })}
                    className="echo-app-item flex flex-col items-center gap-3 group"
                  >
                    <div
                      className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 group-active:scale-90 group-hover:shadow-lg group-hover:-translate-y-1"
                      style={{
                        background: app.available
                          ? 'var(--echo-app-icon-bg, rgba(99,102,241,0.06))'
                          : 'var(--echo-app-icon-bg-disabled, rgba(0,0,0,0.04))',
                        border: '0.5px solid var(--echo-app-icon-border, rgba(0,0,0,0.06))',
                        color: app.available ? 'var(--echo-app-icon-color, #6366f1)' : '#aaa',
                      }}
                    >
                      <div style={{ opacity: app.available ? 1 : 0.4, filter: app.available ? 'none' : 'grayscale(1)' }}>
                        {app.icon}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className="text-[10px] tracking-wider font-medium"
                        style={{ color: app.available ? 'var(--echo-app-label-color, var(--echo-text-base))' : '#aaa' }}
                      >
                        {displayName}
                      </span>
                      <span className="text-[6px] uppercase tracking-tighter opacity-30 font-mono">{app.sub}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default AppsSheet
