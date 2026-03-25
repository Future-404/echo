import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export const useFont = () => {
  const { config } = useAppStore()
  const fontFamily = config?.fontFamily || 'Noto Sans SC'

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font', fontFamily)
  }, [fontFamily])
}
