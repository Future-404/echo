import React from 'react'
import { Stage as PixiStage } from '@pixi/react'
import { useWindowSize } from '../hooks/useWindowSize'

interface StageProps {
  children?: React.ReactNode
}

const Stage: React.FC<StageProps> = ({ children }) => {
  const { width, height } = useWindowSize()

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <PixiStage
        width={width}
        height={height}
        options={{
          backgroundAlpha: 0,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        }}
      >
        {children}
      </PixiStage>
    </div>
  )
}

export default Stage
