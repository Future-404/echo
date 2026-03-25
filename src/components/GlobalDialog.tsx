import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DialogOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  // prompt 模式
  input?: boolean
  inputDefault?: string
  inputPlaceholder?: string
}

interface DialogState extends DialogOptions {
  resolve: (value: string | boolean | null) => void
}

// 全局单例 trigger
let _trigger: ((opts: DialogOptions) => Promise<string | boolean | null>) | null = null

export function useDialog() {
  const confirm = useCallback((message: string, opts?: Partial<DialogOptions>) =>
    _trigger?.({ message, confirmText: '确认', cancelText: '取消', ...opts }) ?? Promise.resolve(false)
  , [])

  const prompt = useCallback((message: string, defaultValue = '', opts?: Partial<DialogOptions>) =>
    _trigger?.({ message, input: true, inputDefault: defaultValue, confirmText: '确认', cancelText: '取消', ...opts }) ?? Promise.resolve(null)
  , [])

  return { confirm, prompt }
}

export const GlobalDialog: React.FC = () => {
  const [state, setState] = useState<DialogState | null>(null)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // 注册全局 trigger
  _trigger = useCallback((opts: DialogOptions) => {
    return new Promise<string | boolean | null>(resolve => {
      setInputValue(opts.inputDefault || '')
      setState({ ...opts, resolve })
      // 自动聚焦 input
      if (opts.input) setTimeout(() => inputRef.current?.focus(), 50)
    })
  }, [])

  const handleConfirm = () => {
    if (!state) return
    state.resolve(state.input ? inputValue : true)
    setState(null)
  }

  const handleCancel = () => {
    if (!state) return
    state.resolve(state.input ? null : false)
    setState(null)
  }

  return (
    <AnimatePresence>
      {state && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            onClick={handleCancel}
          />

          {/* 弹窗主体 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none px-6"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-white/90 dark:bg-[#1a1a1a]/95 backdrop-blur-2xl border border-gray-200/60 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden">
              
              {/* 顶部装饰线 */}
              <div className={`h-[2px] w-full ${state.danger ? 'bg-gradient-to-r from-transparent via-red-400/60 to-transparent' : 'bg-gradient-to-r from-transparent via-blue-400/40 to-transparent'}`} />

              <div className="px-8 py-7 flex flex-col gap-5">
                {/* 标题 */}
                {state.title && (
                  <h3 className="text-sm font-serif tracking-widest text-gray-800 dark:text-gray-100">
                    {state.title}
                  </h3>
                )}

                {/* 消息 */}
                <p className="text-sm font-serif leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-line">
                  {state.message}
                </p>

                {/* Input 模式 */}
                {state.input && (
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                    placeholder={state.inputPlaceholder}
                    className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none focus:border-gray-500 dark:focus:border-gray-400 transition-colors font-serif"
                  />
                )}

                {/* 按钮组 */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 rounded-2xl text-[11px] tracking-[0.3em] uppercase font-sans text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
                  >
                    {state.cancelText || '取消'}
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 py-3 rounded-2xl text-[11px] tracking-[0.3em] uppercase font-sans transition-all ${
                      state.danger
                        ? 'bg-red-500/10 text-red-500 border border-red-400/30 hover:bg-red-500/20'
                        : 'bg-gray-900/5 dark:bg-white/5 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400'
                    }`}
                  >
                    {state.confirmText || '确认'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
