import { motion } from 'framer-motion'
import React from 'react'

const Loading: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-[999] bg-[#0a0a0a] flex flex-col items-center justify-center"
    >
      <div className="relative flex flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-7xl font-light tracking-[0.2em] text-white flex items-center gap-4"
        >
          ECHO
          <span className="text-xs tracking-[0.5em] text-white/30 border-l border-white/20 pl-4 mt-2 uppercase font-sans leading-tight">
            Visual Novel<br/>Engine
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-10 w-48 h-[1px] bg-white/10 overflow-hidden relative"
        >
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
            className="absolute top-0 bottom-0 w-1/2 bg-white/30"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-4 text-[10px] text-white/20 font-sans tracking-[0.3em] uppercase"
        >
          Calibrating Soul...
        </motion.p>
      </div>

      {/* 与 MainMenu 一致的装饰线 */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </motion.div>
  )
}

export default Loading
