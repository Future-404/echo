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

  const alert = useCallback((message: string, opts?: Partial<Omit<DialogOptions, 'cancelText'>>) =>
    _trigger?.({ message, confirmText: '知道了', ...opts, cancelText: undefined }) ?? Promise.resolve(true)
  , [])

  return { confirm, prompt, alert }
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
            onClick={state.cancelText ? handleCancel : handleConfirm}
          />

          {/* 弹窗主体 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: 10, filter: 'blur(8px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none px-6"
          >
            <div className={`pointer-events-auto w-full max-w-sm glass-morphism rounded-[2rem] shadow-2xl overflow-hidden border ${state.danger ? 'border-red-500/30' : 'border-white/40 dark:border-white/10'}`}>
              
              <div className="px-8 py-8 flex flex-col gap-6 relative">
                {/* 装饰性背景光晕 */}
                <div className={`absolute -top-10 -left-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none ${state.danger ? 'bg-red-500' : 'bg-blue-400 dark:bg-white'}`} />

                {/* 标题 */}
                {state.title && (
                  <h3 className="text-base font-serif font-medium tracking-widest text-gray-900 dark:text-gray-100 relative z-10 text-center">
                    {state.title}
                  </h3>
                )}

                {/* 消息 */}
                <p className={`text-sm font-serif leading-relaxed text-gray-700 dark:text-gray-300 relative z-10 whitespace-pre-line ${state.title ? 'text-center' : 'text-center font-medium text-gray-900 dark:text-gray-100'}`}>
                  {state.message}
                </p>

                {/* Input 模式 */}
                {state.input && (
                  <div className="relative z-10 mt-1">
                    <input
                      ref={inputRef}
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                      placeholder={state.inputPlaceholder}
                      className="w-full bg-black/5 dark:bg-white/5 border border-gray-300/50 dark:border-gray-600/50 rounded-2xl px-5 py-3.5 text-sm font-serif text-gray-900 dark:text-gray-100 outline-none focus:border-gray-500 dark:focus:border-gray-400 transition-all placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                )}

                {/* 按钮组 */}
                <div className="flex gap-3 pt-2 relative z-10">
                  {state.cancelText && (
                    <button
                      onClick={handleCancel}
                      className="flex-1 py-3.5 rounded-2xl text-[11px] font-sans font-medium tracking-[0.2em] uppercase text-gray-600 dark:text-gray-400 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-gray-100 transition-all active:scale-95"
                    >
                      {state.cancelText}
                    </button>
                  )}
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 py-3.5 rounded-2xl text-[11px] font-sans font-medium tracking-[0.2em] uppercase transition-all active:scale-95 ${
                      state.danger
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20'
                        : 'bg-black/10 dark:bg-white/10 text-gray-900 dark:text-gray-100 hover:bg-black/20 dark:hover:bg-white/20 border border-gray-300/50 dark:border-gray-600/50'
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
