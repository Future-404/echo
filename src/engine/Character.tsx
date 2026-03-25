import React, { useState, useEffect } from 'react'
import { Sprite, useTick } from '@pixi/react'
import { useWindowSize } from '../hooks/useWindowSize'
import { useAppStore } from '../store/useAppStore'

const Character: React.FC = () => {
  const { width, height } = useWindowSize()
  const { selectedCharacter } = useAppStore()
  const [motion, setMotion] = useState(0)
  const [opacity, setOpacity] = useState(0)

  // 切换角色时触发淡入淡出动效
  useEffect(() => {
    setOpacity(0)
    const timer = setTimeout(() => setOpacity(1), 300)
    return () => clearTimeout(timer)
  }, [selectedCharacter.id])

  useTick((delta) => {
    setMotion((prev) => prev + 0.02 * delta)
  })

  const isMobile = width < 640
  const baseScale = isMobile ? 0.6 : 0.8
  
  const scale = baseScale + Math.sin(motion) * 0.005
  const yOffset = Math.sin(motion * 0.5) * 5

  return (
    <Sprite
      image={selectedCharacter.image}
      anchor={0.5}
      x={width / 2}
      y={height / 2 + (isMobile ? 20 : 50) + yOffset}
      scale={scale}
      alpha={opacity}
    />
  )
}

export default Character
