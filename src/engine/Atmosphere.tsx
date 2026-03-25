import React, { useMemo, useRef } from 'react'
import { Graphics, useTick } from '@pixi/react'
import * as PIXI from 'pixi.js'
import { useWindowSize } from '../hooks/useWindowSize'
import { useAppStore } from '../store/useAppStore'

const Atmosphere: React.FC = () => {
  const { width, height } = useWindowSize()
  const lastInteraction = useAppStore(state => state.lastInteraction)
  const isInteracting = useAppStore(state => state.isInteracting)
  
  const particleCount = useMemo(() => (width < 640 ? 15 : 30), [width])

  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.4,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
    }))
  }, [])

  const graphicsRef = useRef<PIXI.Graphics>(null)

  useTick((delta) => {
    if (!graphicsRef.current) return
    const g = graphicsRef.current
    g.clear()

    for (let i = 0; i < particleCount; i++) {
      const p = particles[i]
      
      if (isInteracting && lastInteraction) {
        // 实时聚拢：计算引力向量
        const dx = lastInteraction.x - p.x
        const dy = lastInteraction.y - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist > 5) { // 稍微保持一点距离，避免闪烁
            const force = 0.08
            p.x += (dx / dist) * force * delta * 20
            p.y += (dy / dist) * force * delta * 20
        }
      } else {
        // 自由漂浮
        p.x += p.speedX * delta
        p.y += p.speedY * delta
      }

      // 边界循环
      if (p.x < 0) p.x = width
      if (p.x > width) p.x = 0
      if (p.y < 0) p.y = height
      if (p.y > height) p.y = 0

      g.beginFill(0xFFFFFF, p.alpha)
      g.drawCircle(p.x, p.y, p.size)
      g.endFill()
    }
  })

  return <Graphics ref={graphicsRef} />
}

export default Atmosphere
