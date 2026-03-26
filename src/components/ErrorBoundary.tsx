import React, { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleReset = () => {
    localStorage.clear() // 清除可能导致问题的脏数据
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0d0d0d] text-white p-8 font-serif">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="text-4xl opacity-50">⚠️</div>
            <h1 className="text-xl tracking-widest text-red-400">系统回声中断</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              底层渲染引擎发生不可恢复的错误。这可能是由于配置冲突或内存溢出导致的。
            </p>
            <div className="p-4 bg-white/5 rounded-xl text-left overflow-auto max-h-40">
              <code className="text-[10px] text-gray-500 font-sans">
                {this.state.error?.stack}
              </code>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 border border-white/10 rounded-2xl text-[11px] tracking-widest uppercase hover:bg-white/5 transition-all"
              >
                重试
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 bg-red-500/10 text-red-400 border border-red-400/20 rounded-2xl text-[11px] tracking-widest uppercase hover:bg-red-500/20 transition-all"
              >
                重置应用
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.children
  }
}

export default ErrorBoundary
