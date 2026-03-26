import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export const useFont = () => {
  const { config } = useAppStore()
  const fontFamily = config?.fontFamily || 'Noto Sans SC'
  const fontSize = config?.fontSize || 16

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font', fontFamily)
  }, [fontFamily])

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`)
  }, [fontSize])
}
