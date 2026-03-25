import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export const useTheme = () => {
  const { config } = useAppStore()
  const theme = config?.theme || 'system'

  useEffect(() => {
    const root = window.document.documentElement
    
    const applyTheme = (mode: 'light' | 'dark') => {
      root.classList.remove('light', 'dark')
      root.classList.add(mode)
      root.style.colorScheme = mode
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
