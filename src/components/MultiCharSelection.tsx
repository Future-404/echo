import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Users } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import type { CharacterCard } from '../store/useAppStore'

const MultiCharSelection: React.FC = () => {
  const { currentView, setCurrentView, characters, selectedCharacter,
    setSelectedCharacter, setSecondaryCharacter, secondaryCharacter,
    messages, multiCharMode } = useAppStore()

  const [charA, setCharA] = useState<CharacterCard | null>(
    multiCharMode ? selectedCharacter : null
  )
  const [charB, setCharB] = useState<CharacterCard | null>(
    multiCharMode ? secondaryCharacter : null
  )

  if (currentView !== 'multi-selection') return null

  const handleSelect = (char: CharacterCard) => {
    if (charA?.id === char.id) { setCharA(null); return }
    if (charB?.id === char.id) { setCharB(null); return }
    if (!charA) { setCharA(char); return }
    if (!charB) { setCharB(char); return }
    // 两个都选了，替换 charB
    setCharB(char)
  }

  const canStart = charA && charB

  const handleStart = () => {
    if (!charA || !charB) return
    // 只用 CharA 的开场白，CharB 不需要开场
    setSelectedCharacter(charA)
    // setSelectedCharacter 会 set currentView='main'，之后再设副角色
    setSecondaryCharacter(charB)
  }

  const handleBack = () => {
    setCurrentView(messages.length > 0 ? 'main' : 'home')
  }

  const getCardState = (char: CharacterCard) => {
    if (charA?.id === char.id) return 'A'
    if (charB?.id === char.id) return 'B'
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-echo-base dark:bg-[#050505] flex flex-col items-center justify-center p-6 md:p-10"
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
        <span className="text-[25vh] font-serif font-black text-gray-200/20 dark:text-white/5 uppercase tracking-[0.3em]">Duo</span>
      </div>

      <div className="relative z-10 w-full max-w-7xl">
        <header className="mb-10 text-center">
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center justify-center gap-3 mb-3">
            <Users size={14} className="text-gray-400" />
            <h2 className="text-[12px] tracking-[0.8em] text-gray-500 dark:text-gray-400 uppercase font-medium">Multi-Character Mode</h2>
          </motion.div>
          <div className="w-12 h-[1px] bg-gray-300 dark:bg-gray-700 mx-auto mb-4" />

          {/* 已选状态栏 */}
          <div className="flex items-center justify-center gap-6">
            {(['A', 'B'] as const).map((slot) => {
              const char = slot === 'A' ? charA : charB
              const color = slot === 'A' ? 'text-blue-400' : 'text-purple-400'
              const border = slot === 'A' ? 'border-blue-400/30' : 'border-purple-400/30'
              return (
                <div key={slot} className={`flex items-center gap-2 px-4 py-2 rounded-full border-0.5 ${char ? border : 'border-gray-200 dark:border-gray-800'} transition-all`}>
                  <span className={`text-[9px] font-bold uppercase tracking-widest ${color}`}>Char {slot}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {char ? char.name : '未选择'}
                  </span>
                </div>
              )
            })}
          </div>
        </header>

        {/* 角色卡列表 */}
        <div className="flex gap-6 md:gap-8 overflow-x-auto no-scrollbar pb-20 px-4 snap-x">
          {characters.map((char, index) => {
            const state = getCardState(char)
            const isA = state === 'A'
            const isB = state === 'B'
            const selected = !!state

            return (
              <motion.div
                key={char.id}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -8 }}
                onClick={() => handleSelect(char)}
                className={`snap-center flex-shrink-0 w-56 md:w-64 h-[380px] md:h-[420px] backdrop-blur-2xl border-0.5 rounded-[3rem] cursor-pointer flex flex-col transition-all shadow-xl relative select-none
                  ${isA ? 'bg-blue-500/10 border-blue-400/40' : isB ? 'bg-purple-500/10 border-purple-400/40' : 'bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:shadow-2xl'}`}
              >
                {/* 角色标签 */}
                <AnimatePresence>
                  {selected && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      className={`absolute top-5 left-5 w-7 h-7 rounded-full flex items-center justify-center z-20 ${isA ? 'bg-blue-500' : 'bg-purple-500'}`}
                    >
                      <span className="text-white text-[10px] font-black">{state}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex-1 flex flex-col items-center justify-center p-8 pointer-events-none">
                  <div className="w-24 h-24 mb-8 relative">
                    <div className={`absolute inset-0 rounded-full border-0.5 scale-125 ${selected ? 'border-current animate-pulse' : 'border-gray-100 dark:border-white/5'}`} />
                    <img src={char.image} alt={char.name}
                      className={`w-full h-full object-cover rounded-full transition-all duration-700 ${selected ? 'grayscale-0 opacity-100' : 'grayscale opacity-60'}`}
                    />
                  </div>
                  <h3 className={`text-lg font-serif tracking-widest transition-colors ${selected ? 'text-black dark:text-white' : 'text-gray-600 dark:text-gray-200'}`}>
                    {char.name}
                  </h3>
                  <div className={`mt-3 h-[0.5px] transition-all duration-500 ${selected ? 'w-12 bg-gray-500' : 'w-4 bg-gray-300 dark:bg-gray-600'}`} />
                </div>
                <div className="px-8 pb-10 pointer-events-none">
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 text-center leading-relaxed tracking-widest uppercase italic line-clamp-2">
                    {char.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="fixed bottom-8 left-0 right-0 flex items-center justify-center gap-4 z-20">
        <button onClick={handleBack} className="px-6 py-3 rounded-full text-[10px] tracking-widest uppercase text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          返回
        </button>
        <AnimatePresence>
          {canStart && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              onClick={handleStart}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-white dark:bg-white/10 border-0.5 border-gray-300 dark:border-white/20 text-[10px] tracking-widest uppercase text-gray-600 dark:text-gray-200 shadow-lg hover:shadow-xl transition-all"
            >
              <Check size={12} />
              开始对话 // {charA?.name} &amp; {charB?.name}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default MultiCharSelection
