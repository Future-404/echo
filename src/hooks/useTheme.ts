import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

export const useTheme = () => {
  const { config } = useAppStore()
  const theme = config?.theme || 'system'

  useEffect(() => {
    const root = window.document.documentElement
    
    const applyTheme = (mode: 'light' | 'dark') => {
      root.classList.remove('light', 'dark')
      root.classList.add(mode)
      root.style.colorScheme = mode

      // 同步原生状态栏文字颜色
      if (Capacitor.isNativePlatform()) {
        // 如果是 dark 主题，状态栏文字应为 light (Style.Dark 表示深色背景/浅色文字)
        // 注意：Capacitor 的 Style.Dark 是指 Dark 风格的状态栏（即浅色文字）
        StatusBar.setStyle({ 
          style: mode === 'dark' ? Style.Dark : Style.Light 
        }).catch(() => {})
      }
    }

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      applyTheme(systemTheme)

      // 监听系统变化
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    } else {
      applyTheme(theme)
    }
  }, [theme])
}
