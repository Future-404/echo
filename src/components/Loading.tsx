import { motion } from 'framer-motion'
import React from 'react'

const Loading: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* 背景装饰：科技感网格 */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      {/* 核心装饰：扩散光晕 */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute w-[600px] h-[600px] rounded-full bg-blue-500 blur-[120px] pointer-events-none"
      />

      <div className="relative flex flex-col items-center">
        <div className="flex flex-col items-center gap-2 mb-12">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 60 }}
            transition={{ duration: 1.5, ease: "circOut" }}
            className="h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent"
          />
          <motion.h1
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            animate={{ opacity: 1, letterSpacing: "1.2em" }}
            transition={{ duration: 2, ease: "circOut" }}
            className="text-5xl font-extralight text-white ml-[1.2em] select-none"
          >
            ECHO
          </motion.h1>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 120 }}
            transition={{ duration: 1.5, ease: "circOut", delay: 0.5 }}
            className="h-[1px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"
          />
        </div>

        <div className="w-64 flex flex-col items-center gap-4">
          <div className="w-full h-[2px] bg-white/[0.03] rounded-full overflow-hidden relative">
            <motion.div
              initial={{ left: "-100%" }}
              animate={{ left: "100%" }}
              transition={{ repeat: Infinity, duration: 2.5, ease: [0.45, 0, 0.55, 1] }}
              className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"
            />
          </div>

          <div className="flex flex-col items-center gap-1">
            <motion.p
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-[9px] text-blue-400/60 font-mono tracking-[0.4em] uppercase"
            >
              Syncing Consciousness...
            </motion.p>
            <motion.div 
              className="text-[7px] text-white/10 font-mono tracking-widest uppercase flex gap-4"
            >
              <span>SYS.INIT</span>
              <span>MEM.SYNC</span>
              <span>CORE.LOAD</span>
            </motion.div>
          </div>
        </div>
      </div>

      {/* 边缘装饰 */}
      <div className="absolute top-12 left-12 flex flex-col gap-2">
        <div className="w-8 h-[1px] bg-white/10" />
        <div className="w-[1px] h-8 bg-white/10" />
      </div>
      <div className="absolute bottom-12 right-12 flex flex-col items-end gap-2">
        <div className="w-[1px] h-8 bg-white/10" />
        <div className="w-8 h-[1px] bg-white/10" />
      </div>
    </motion.div>
  )
}

export default Loading
