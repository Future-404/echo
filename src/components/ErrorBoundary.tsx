import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  onError?: (error: Error, info: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 上报到外部（可接入 Sentry 等）
    this.props.onError?.(error, errorInfo)
    // 开发环境保留控制台输出
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui' }}>
          <h1>應用遇到錯誤</h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>請重新載入頁面，如問題持續請聯繫支援。</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            重新載入
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
