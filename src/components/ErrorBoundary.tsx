import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui' }}>
          <h1>應用遇到錯誤</h1>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            {this.state.error?.message || '未知錯誤'}
          </p>
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
