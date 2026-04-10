import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export interface AppDefinition {
  id: string
  name: string
  sub: string
  icon: string        // emoji 或 CSS class，后续可扩展为自定义图标
  available: boolean
  component?: React.ComponentType
}

// 应用注册表 — 后续新增 App 只需在此添加
export const APP_REGISTRY: AppDefinition[] = [
  {
    id: 'send-image',
    name: '发送图片',
    sub: 'Send Image',
    icon: '🖼️',
    available: true,
  },
  {
    id: 'transfer',
    name: '转账',
    sub: 'Transfer',
    icon: '💸',
    available: false,
  },
  {
    id: 'couple-space',
    name: '情侣空间',
    sub: 'Couple Space',
    icon: '💞',
    available: false,
  },
]

interface Props {
  open: boolean
  onClose: () => void
  onOpenApp: (app: AppDefinition) => void
}

const AppsSheet: React.FC<Props> = ({ open, onClose, onOpenApp }) => (
  <AnimatePresence>
    {open && (
      <>
        {/* 遮罩 */}
        <motion.div
          key="apps-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="echo-apps-backdrop fixed inset-0 z-[200] bg-black/30"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          key="apps-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="echo-apps-sheet fixed bottom-0 left-0 right-0 z-[201] rounded-t-3xl overflow-hidden"
          style={{
            background: 'var(--echo-apps-bg, var(--echo-base, #ffffff))',
            borderTop: '0.5px solid var(--echo-apps-border, rgba(0,0,0,0.08))',
          }}
        >
          {/* 拖动条 */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--echo-apps-handle, rgba(0,0,0,0.15))' }} />
          </div>

          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-3">
            <div>
              <p className="text-xs font-serif tracking-[0.3em] uppercase" style={{ color: 'var(--echo-apps-title-color, var(--echo-text-muted, #888))' }}>
                应用中心
              </p>
              <p className="text-[8px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--echo-apps-sub-color, var(--echo-text-dim, #aaa))' }}>
                Apps // Extensions
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ background: 'var(--echo-apps-close-bg, rgba(0,0,0,0.05))', color: 'var(--echo-apps-close-color, #888)' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* 应用网格 */}
          <div className="px-6 pb-8 pt-2 grid grid-cols-4 gap-4" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
            {APP_REGISTRY.map(app => (
              <button
                key={app.id}
                onClick={() => onOpenApp(app)}
                className="echo-app-icon flex flex-col items-center gap-2 group"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-transform group-active:scale-95"
                  style={{
                    background: app.available
                      ? 'var(--echo-app-icon-bg, rgba(99,102,241,0.1))'
                      : 'var(--echo-app-icon-bg-disabled, rgba(0,0,0,0.04))',
                    border: '0.5px solid var(--echo-app-icon-border, rgba(0,0,0,0.06))',
                  }}
                >
                  <span style={{ filter: app.available ? 'none' : 'grayscale(1) opacity(0.4)' }}>
                    {app.icon}
                  </span>
                </div>
                <span
                  className="text-[9px] tracking-wide text-center leading-tight"
                  style={{ color: app.available ? 'var(--echo-app-label-color, var(--echo-text-base))' : 'var(--echo-app-label-color-disabled, #aaa)' }}
                >
                  {app.name}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
)

export default AppsSheet
