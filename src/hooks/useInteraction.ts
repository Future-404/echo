import { useCallback, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'

export const useInteraction = (isLoading: boolean, currentView: string) => {
  const { setInteraction } = useAppStore()
  const lastUpdate = useRef<number>(0)

  const handleStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isLoading || currentView !== 'main') return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setInteraction(clientX, clientY, true)
  }, [isLoading, currentView, setInteraction])

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isLoading || currentView !== 'main') return
    if ('buttons' in e && e.buttons === 0) return

    const now = Date.now()
    if (now - lastUpdate.current < 16) return // 60fps 节流
    lastUpdate.current = now
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setInteraction(clientX, clientY, true)
  }, [isLoading, currentView, setInteraction])

  const handleStop = useCallback(() => {
    setInteraction(0, 0, false)
  }, [setInteraction])

  return { handleStart, handleMove, handleStop }
}
