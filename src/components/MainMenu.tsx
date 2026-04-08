import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { getDisplayVersion } from '../version';

const REPO_URL = 'https://github.com/Future-404/echo'

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)

const MainMenu: React.FC = () => {
  const { setCurrentView, setIsConfigOpen, selectedCharacter, startNewGame, messages } = useAppStore();

  const menuItems = [
    { 
      label: '新游戏', 
      subLabel: 'NEW GAME',
      action: () => setCurrentView('selection')
    },
    { 
      label: '继续记忆', 
      subLabel: 'CONTINUE',
      action: () => {
        if (messages.length > 0) setCurrentView('main');
      },
      disabled: messages.length === 0
    },
    { 
      label: '保存记忆', 
      subLabel: 'SAVE PROGRESS',
      action: () => setCurrentView('save'),
      disabled: messages.length === 0
    },
    { 
      label: '读取记忆', 
      subLabel: 'LOAD MEMORY',
      action: () => setCurrentView('load') 
    },
    { 
      label: '档案图鉴', 
      subLabel: 'ARCHIVE',
      action: () => setCurrentView('selection') 
    },
    { 
      label: '系统设定', 
      subLabel: 'CONFIG',
      action: () => setIsConfigOpen(true) 
    },
    { 
      label: '引导手册', 
      subLabel: 'HELP',
      action: () => setCurrentView('help') 
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-20 flex overflow-hidden bg-[#0a0a0a]"
    >
      {/* 背景装饰层 */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* 主背景图：固定 webp */}
        <motion.div
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2.5, ease: 'easeOut' }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/bg.webp)' }}
        />

        {/* 毛玻璃遮罩层 */}
        <div className="absolute inset-0 backdrop-blur-sm bg-black/40" />

        {/* 左侧光照：从左边缘向内渐变，营造聚光感 */}
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/8 via-white/3 to-transparent pointer-events-none" />
        {/* 左侧边缘竖线光 */}
        <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* 右侧光照 */}
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/8 via-white/3 to-transparent pointer-events-none" />
        {/* 右侧边缘竖线光 */}
        <div className="absolute inset-y-0 right-0 w-[2px] bg-gradient-to-b from-transparent via-white/20 to-transparent pointer-events-none" />

        {/* 顶部暗角 */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        {/* 底部暗角 */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {/* 左侧菜单区域局部加深，确保文字可读 */}
        <div className="absolute inset-y-0 left-0 w-[55%] bg-gradient-to-r from-black/65 via-black/30 to-transparent pointer-events-none" />
      </div>

      {/* 左侧菜单区域 */}
      <div className="relative z-20 w-full md:w-[45%] h-full flex flex-col justify-center px-12 md:px-24 pt-[var(--sat)]">
        {/* 标题 */}
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="mb-16"
        >
          <h1 className="text-7xl font-light tracking-[0.2em] text-white flex items-center gap-4">
            ECHO
            <span className="text-xs tracking-[0.5em] text-white/30 border-l border-white/20 pl-4 mt-2 uppercase font-sans">
              Visual Novel<br/>Engine
            </span>
          </h1>
        </motion.div>

        {/* 菜单项 */}
        <nav className="flex flex-col gap-6">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.label}
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 + index * 0.08 }}
              onClick={item.action}
              disabled={item.disabled}
              className={`group relative flex flex-col items-start transition-all duration-300 ${
                item.disabled ? 'opacity-30 cursor-not-allowed' : 'hover:pl-4'
              }`}
            >
              <div className="flex items-baseline gap-4">
                <span className="text-3xl font-light tracking-widest text-white/90 group-hover:text-white transition-colors">
                  {item.label}
                </span>
                <span className="text-[10px] tracking-[0.3em] text-white/20 group-hover:text-white/50 transition-colors uppercase font-sans">
                  {item.subLabel}
                </span>
              </div>
              
              {/* 装饰底线 */}
              <div className="mt-2 w-48 h-[1px] bg-gradient-to-r from-white/20 to-transparent group-hover:from-white/60 transition-all duration-500" />
              
              {/* 激活时的指示器 */}
              {!item.disabled && (
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1 h-0 bg-white group-hover:h-8 transition-all duration-300" />
              )}
            </motion.button>
          ))}
        </nav>

        {/* 底部信息 */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-12 left-12 md:left-24 flex flex-col gap-2"
        >
          <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase flex items-center gap-4">
            <span>Feedback Q-Group</span>
            <span className="w-8 h-[0.5px] bg-white/10" />
            <span className="text-white/50 font-mono tracking-widest">616353694</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[8px] tracking-[0.2em] text-white/30 uppercase">
              &copy; 2026 ECHO PROJECT. ALL RIGHTS RESERVED. {getDisplayVersion()}
            </div>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-white/20 hover:text-white/60 transition-colors">
              <GithubIcon />
              <span className="text-[8px] tracking-[0.2em] uppercase">GitHub</span>
            </a>
          </div>
        </motion.div>
      </div>

      {/* 右侧角色立绘区域 */}
      <div className="hidden md:flex relative z-10 flex-1 items-end justify-center perspective-1000">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedCharacter.id}
            initial={{ x: 100, opacity: 0, scale: 1.05 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="relative h-[95%] w-full flex items-end justify-center"
          >
            {/* 角色倒影/阴影 */}
            <div className="absolute bottom-0 w-[60%] h-32 bg-black/40 blur-[60px] rounded-full -z-10" />
            
            <motion.img 
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              src={selectedCharacter.image} 
              className="h-full w-auto object-contain drop-shadow-[0_0_60px_rgba(255,255,255,0.15)]"
              alt={selectedCharacter.name}
            />

            {/* 角色介绍浮窗：加毛玻璃背景 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute bottom-24 right-24 max-w-xs text-right"
            >
              <div className="backdrop-blur-md bg-black/20 border border-white/10 rounded-2xl px-5 py-4">
                <div className="text-white/40 text-[10px] tracking-[0.4em] uppercase mb-2">Current Identity</div>
                <div className="text-white text-2xl font-light tracking-widest mb-3">{selectedCharacter.name}</div>
                <div className="text-white/50 text-xs font-light leading-relaxed tracking-wide italic">
                  "{selectedCharacter.description.slice(0, 100)}..."
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 扫光装饰线 */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </motion.div>
  );
};

export default MainMenu;