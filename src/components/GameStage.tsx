import React from 'react';
import { useAppStore } from '../store/useAppStore';
import Stage from '../engine/Stage';
import Atmosphere from '../engine/Atmosphere';

export const GameStage: React.FC = () => {
  const { isLoading, selectedCharacter } = useAppStore();

  return (
    <>
      <Stage>
        {!isLoading && <Atmosphere />}
      </Stage>

      {/* 自定义背景图层（在 PixiJS 之上，UI 之下） */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none bg-cover bg-center bg-no-repeat transition-opacity duration-700"
        style={{ 
          backgroundImage: selectedCharacter?.extensions?.activeBackground 
            ? `url("${selectedCharacter.extensions.assets?.find(a => a.type === 'background' && a.name === selectedCharacter.extensions?.activeBackground)?.uri}")`
            : 'var(--custom-bg, none)'
        }}
      />
    </>
  );
};
