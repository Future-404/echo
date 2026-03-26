import React from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'

interface MultiCharAvatarProps {
  activeSpeakerId?: string // 当前发言者的 id，undefined = 无人发言（Router 阶段）
}

const AvatarSlot: React.FC<{
  char: { id: string; name: string; image: string }
  isActive: boolean
  isRouting: boolean
  color: 'blue' | 'purple'
  label: string
}> = ({ char, isActive, isRouting, color, label }) => {
  const cssVar = color === 'blue' ? 'var(--char-a-color, #60a5fa)' : 'var(--char-b-color, #c084fc)'

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        {/* 声波波纹：仅发言时显示 */}
        {isActive && [1, 2].map(i => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ borderWidth: 1, borderStyle: 'solid', borderColor: `color-mix(in srgb, ${cssVar} 20%, transparent)` }}
            initial={{ width: 80, height: 80, opacity: 0.6 }}
            animate={{ width: [80, 180], height: [80, 180], opacity: [0.6, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
          />
        ))}

        {/* 脉冲背景 */}
        {isActive && (
          <motion.div
            className="absolute w-24 h-24 rounded-full"
            style={{ backgroundColor: `color-mix(in srgb, ${cssVar} 5%, transparent)` }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        )}

        {/* 头像 */}
        <motion.div
          animate={{
            scale: isActive ? 1 : isRouting ? 0.88 : 0.92,
            opacity: isActive ? 1 : isRouting ? 0.4 : 0.55,
          }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="relative z-10 w-20 h-20 md:w-28 md:h-28 rounded-full p-0.5 bg-white/20 dark:bg-white/5 backdrop-blur-xl overflow-hidden shadow-lg"
          style={{ borderWidth: '0.5px', borderStyle: 'solid', borderColor: isActive ? `color-mix(in srgb, ${cssVar} 40%, transparent)` : 'rgba(255,255,255,0.05)' }}
        >
          <img src={char.image} alt={char.name} className="w-full h-full object-cover rounded-full select-none" />
          <div className="absolute inset-0 rounded-full shadow-inner bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        </motion.div>
      </div>

      {/* 名字标签 */}
      <motion.div
        animate={{ opacity: isActive ? 1 : 0.4 }}
        transition={{ duration: 0.3 }}
        className="mt-2 px-3 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border-0.5 border-black/10 dark:border-white/10"
      >
        <span className="text-[8px] tracking-[0.3em] uppercase font-serif" style={{ color: isActive ? cssVar : undefined }}>
          {label} // {char.name}
        </span>
      </motion.div>
    </div>
  )
}

const MultiCharAvatar: React.FC<MultiCharAvatarProps> = ({ activeSpeakerId }) => {
  const { selectedCharacter, secondaryCharacter, isTyping } = useAppStore()
  if (!secondaryCharacter) return null

  const isRouting = isTyping && !activeSpeakerId
  const charAActive = activeSpeakerId === selectedCharacter.id
  const charBActive = activeSpeakerId === secondaryCharacter.id

  return (
    <div className="relative flex items-end justify-center gap-8 md:gap-12 py-4 pointer-events-none">
      <AvatarSlot
        char={selectedCharacter}
        isActive={charAActive}
        isRouting={isRouting}
        color="blue"
        label="A"
      />
      <AvatarSlot
        char={secondaryCharacter}
        isActive={charBActive}
        isRouting={isRouting}
        color="purple"
        label="B"
      />
    </div>
  )
}

export default MultiCharAvatar
