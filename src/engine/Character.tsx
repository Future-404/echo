import React, { useState, useEffect } from 'react'
import { Sprite, useTick } from '@pixi/react'
import { useWindowSize } from '../hooks/useWindowSize'
import { useAppStore } from '../store/useAppStore'

const Character: React.FC = () => {
  const { width, height } = useWindowSize()
  const { selectedCharacter } = useAppStore()
  const [motion, setMotion] = useState(0)
  const [opacity, setOpacity] = useState(0)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })

  // 获取立绘原始尺寸以计算精确缩放
  useEffect(() => {
    const img = new Image()
    img.src = selectedCharacter.image
    img.onload = () => setNaturalSize({ w: img.width, h: img.height })
  }, [selectedCharacter.image])

  // 切换角色时触发淡入淡出动效
  useEffect(() => {
    setOpacity(0)
    const timer = setTimeout(() => {
      setOpacity(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [selectedCharacter.id])

  useTick((delta) => {
    setMotion((prev) => prev + 0.02 * delta)
  })

  const isMobile = width < 640
  
  // 动态缩放逻辑：
  // 1. 移动端：宽度占比 90% ~ 110% (根据立绘宽高比调整)
  // 2. 桌面端：高度占比 80%
  let finalScale = 0.5
  if (naturalSize.w > 0) {
    if (isMobile) {
      // 移动端优先适配宽度，防止立绘超出屏幕侧边
      const targetWidth = width * 1.1 
      finalScale = targetWidth / naturalSize.w
      // 防止立绘过高（比如长图），最高不能超过屏幕高度的 70%
      if (naturalSize.h * finalScale > height * 0.7) {
        finalScale = (height * 0.7) / naturalSize.h
      }
    } else {
      // 桌面端优先适配高度
      const targetHeight = height * 0.85
      finalScale = targetHeight / naturalSize.h
    }
  }

  const scale = finalScale + Math.sin(motion) * 0.002
  const yOffset = Math.sin(motion * 0.5) * 3

  return (
    <Sprite
      image={selectedCharacter.image}
      anchor={{ x: 0.5, y: 1 }} // 锚点设为底部中心
      x={width / 2}
      y={height + yOffset + (isMobile ? 20 : 0)} // 紧贴底部，移动端稍微往下沉一点给对话框留空间
      scale={scale}
      alpha={opacity}
    />
  )
}

export default Character
