import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { Trash2, ChevronLeft, Edit2, Clock, Calendar } from 'lucide-react';
import { useDialog } from './GlobalDialog';

const LoadScreen: React.FC = () => {
  const { saveSlots, loadGame, deleteSaveSlot, renameSaveSlot, setCurrentView, characters } = useAppStore();
  const { confirm, prompt } = useDialog();
  const [activeTab, setActiveTab] = useState<'all' | 'manual' | 'auto'>('all');

  const getCharacter = (charId: string) => {
    return characters.find(c => c.id === charId) || characters[0];
  };

  const filteredSlots = saveSlots
    .filter(s => {
      if (activeTab === 'manual') return !s.id.startsWith('auto_');
      if (activeTab === 'auto') return s.id.startsWith('auto_');
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  const handleLoad = async (slotId: string) => {
    const confirmed = await confirm('确定要加载此存档吗？当前未保存的进度将会丢失。', {
      confirmText: '读取',
    });
    if (confirmed) await loadGame(slotId);
  };

  const handleRename = async (e: React.MouseEvent, slotId: string, currentName: string) => {
    e.stopPropagation();
    const newName = await prompt('请输入新的存档名称', {
      title: '重命名存档',
      defaultValue: currentName,
      placeholder: '例如：序章 - 邂逅',
    });
    if (newName && newName.trim()) {
      renameSaveSlot(slotId, newName.trim());
    }
  };

  const handleDelete = async (e: React.MouseEvent, slotId: string) => {
    e.stopPropagation();
    const confirmed = await confirm('确定删除此存档吗？此操作不可撤销。', {
      confirmText: '删除',
      danger: true,
    });
    if (confirmed) deleteSaveSlot(slotId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[101] bg-echo-base dark:bg-[#050505] flex flex-col overflow-hidden"
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* iOS 状态栏占位 */}
      <div className="h-[var(--sat)] min-h-[env(safe-area-inset-top)] w-full" />
      
      <header className="px-6 py-8 flex items-center justify-between">
        <button 
          onClick={() => setCurrentView('home')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-echo-text-base hover:bg-black/10 dark:hover:bg-white/10 transition-all"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>

        <div className="flex flex-col items-end">
          <h2 className="text-xs font-serif tracking-[0.3em] text-echo-text-muted font-medium uppercase">读取记忆 // ARCHIVES</h2>
          <p className="text-[7px] text-echo-text-dim uppercase tracking-widest mt-1">Memory Chronology</p>
        </div>
      </header>

      {/* 选项卡切换 */}
      <div className="px-6 mb-8 flex gap-4 max-w-2xl mx-auto w-full">
        {(['all', 'manual', 'auto'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-[10px] tracking-widest uppercase transition-all border ${
              activeTab === tab 
                ? 'bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-transparent border-echo-border text-echo-text-muted hover:border-gray-400'
            }`}
          >
            {tab === 'all' ? '全部' : tab === 'manual' ? '手动' : '自动'}
          </button>
        ))}
      </div>

      <div className="flex-1 relative overflow-y-auto no-scrollbar max-w-2xl mx-auto w-full px-6 pb-20">
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {filteredSlots.length > 0 ? filteredSlots.map((slot, index) => {
              const char = getCharacter(slot.characterId);
              const isAuto = slot.id.startsWith('auto_');

              return (
                <motion.div
                  key={slot.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => handleLoad(slot.id)}
                  className={`group relative flex items-center gap-3 p-3 rounded-[1.25rem] border transition-all cursor-pointer ${
                    isAuto 
                      ? 'bg-blue-500/[0.02] border-blue-500/10 hover:border-blue-500/30' 
                      : 'bg-white/[0.02] border-echo-border hover:border-gray-400 dark:hover:border-gray-600 shadow-sm'
                  }`}
                >
                  {/* 角色头像 - 缩小尺寸 */}
                  <div className="relative shrink-0">
                    <img 
                      src={char.image} 
                      alt={char.name} 
                      className="w-12 h-12 rounded-xl object-cover border border-black/5 dark:border-white/5 shadow-inner"
                    />
                    {isAuto && (
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-echo-base dark:border-[#050505]">
                        <Clock size={8} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* 存档内容 - 优化间距 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="text-[13px] font-serif text-echo-text-base truncate group-hover:text-blue-500 transition-colors">
                        {slot.name}
                      </h4>
                      <button 
                        onClick={(e) => handleRename(e, slot.id, slot.name)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-echo-text-dim hover:text-blue-500 transition-all"
                      >
                        <Edit2 size={10} />
                      </button>
                    </div>
                    
                    <p className="text-[10px] text-echo-text-muted line-clamp-1 italic mb-1.5 opacity-70">
                      {slot.summary || '无摘要'}
                    </p>

                    <div className="flex items-center gap-3 text-[8px] text-echo-text-dim font-mono uppercase tracking-tighter">
                      <span className="flex items-center gap-1">
                        <Calendar size={8} />
                        {new Date(slot.timestamp).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={8} />
                        {new Date(slot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => handleDelete(e, slot.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-echo-text-dim hover:text-red-500 transition-all self-start"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              );
            }) : (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="py-20 text-center"
              >
                <div className="text-echo-text-dim mb-4 flex justify-center">
                  <Clock size={40} strokeWidth={1} className="opacity-20" />
                </div>
                <p className="text-xs font-serif text-echo-text-muted italic tracking-widest">
                  时间线上空无一物...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <footer className="p-8 pb-12 flex justify-center bg-gradient-to-t from-echo-base dark:from-[#050505] to-transparent">
        <button 
          onClick={() => setCurrentView('home')} 
          className="px-12 py-4 bg-white/50 dark:bg-gray-900 border-0.5 border-gray-200 dark:border-gray-800 rounded-full text-[10px] tracking-[0.4em] text-gray-600 dark:text-echo-text-subtle uppercase hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm font-sans"
        >
          返回主界面 // RETURN
        </button>
      </footer>
    </motion.div>
  );
};

export default LoadScreen;
