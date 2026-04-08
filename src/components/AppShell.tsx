import React, { lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import HomeScreen from './HomeScreen'

// VN App — 现有 App.tsx 完整保留，零改动
const VNApp = lazy(() => import('../App'))
// Chat App — 后续新建
const ChatApp = lazy(() => import('./ChatApp/ChatApp'))

const AppShell: React.FC = () => {
  const { currentApp } = useAppStore()

  return (
    <div
      className="flex items-center justify-center w-screen h-screen overflow-hidden"
      style={{ background: 'var(--shell-bg)' }}
    >
      <div
        className="relative overflow-hidden flex flex-col"
        style={{
          width: '100%',
          maxWidth: 'var(--shell-width, 420px)',
          height: '100%',
          maxHeight: '100vh',
          borderRadius: 'var(--shell-radius, 0px)',
          boxShadow: 'var(--shell-shadow)',
        }}
      >
        <AnimatePresence mode="wait">
          {currentApp === 'launcher' && (
            <motion.div
              key="launcher"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
              style={{
                background: 'var(--shell-bg)',
              }}
            >
              <HomeScreen />
            </motion.div>
          )}

          {currentApp === 'vn' && (
            <motion.div
              key="vn"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
            >
              <Suspense fallback={null}>
                <VNApp />
              </Suspense>
            </motion.div>
          )}

          {currentApp === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
            >
              <Suspense fallback={null}>
                <ChatApp />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AppShell
