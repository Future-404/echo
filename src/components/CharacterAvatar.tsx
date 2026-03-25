import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'

const CharacterAvatar: React.FC = () => {
  const { selectedCharacter, isTyping, messages } = useAppStore()

  const statusLabel = isTyping
    ? '回应中'
    : messages.length === 0
    ? '等待连接'
    : '在线'

  return (
    <div className="relative flex flex-col items-center justify-center py-6 pointer-events-none">
      {/* 呼吸感声波波纹装饰 */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute border border-blue-400/20 dark:border-blue-500/15 rounded-full"
            initial={{ width: 120, height: 120, opacity: 0.6 }}
            animate={{
              width: [120, 300],
              height: [120, 300],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeOut",
            }}
          />
        ))}
        
        {/* 声波脉冲 */}
        <motion.div 
          className="absolute w-40 h-40 rounded-full bg-blue-400/5 dark:bg-blue-500/5"
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* 圆形头像容器 */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-32 h-32 md:w-44 md:h-44 rounded-full p-1 bg-white/30 dark:bg-white/5 backdrop-blur-2xl border-0.5 border-white/40 dark:border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.1)] dark:shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden"
      >
        <motion.img
          key={selectedCharacter.id}
          src={selectedCharacter.image}
          alt={selectedCharacter.name}
          className="w-full h-full object-cover rounded-full select-none"
          initial={{ scale: 1.1 }}
          animate={{ 
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* 覆盖层：增加深度感 */}
        <div className="absolute inset-0 rounded-full shadow-inner pointer-events-none bg-gradient-to-b from-white/10 to-transparent" />
      </motion.div>

      {/* 角色名称标签 */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 px-4 py-1 rounded-full bg-black/5 dark:bg-white/5 border-0.5 border-black/10 dark:border-white/10 backdrop-blur-sm"
      >
        <span className="text-[10px] tracking-[0.4em] text-gray-500 dark:text-gray-400 font-serif uppercase">
          {selectedCharacter.name} // {statusLabel}
        </span>
      </motion.div>
    </div>
  )
}

export default CharacterAvatar
