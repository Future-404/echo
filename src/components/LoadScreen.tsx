import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { Trash2 } from 'lucide-react';
import { useDialog } from './GlobalDialog';

const LoadScreen: React.FC = () => {
  const { saveSlots, loadGame, deleteSaveSlot, setCurrentView, characters } = useAppStore();
  const { confirm } = useDialog();

  const getCharacterName = (charId: string) => {
    const char = characters.find(c => c.id === charId);
    return char?.name || '未知角色';
  };
  
  // 自动存档位 (最近 10 个)
  const autoSlots = saveSlots
    .filter(s => s.id.startsWith('auto_'))
    .sort((a, b) => b.timestamp - a.timestamp);

  // 手动存档位
  const manualSlots = saveSlots
    .filter(s => !s.id.startsWith('auto_'))
    .sort((a, b) => b.timestamp - a.timestamp);

  const handleLoad = async (slotId: string) => {
    const confirmed = await confirm('确定要加载此存档吗？当前未保存的进度将会丢失。', {
      confirmText: '读取',
    });
    if (confirmed) await loadGame(slotId);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md pointer-events-auto"
    >
      <div className="w-full max-w-5xl flex justify-between items-center mb-8 pt-[var(--sat)]">

        <h2 className="text-3xl md:text-4xl font-serif text-white tracking-widest">读取记忆</h2>
        <button 
          onClick={() => setCurrentView('home')} // 回到主界面
          className="px-6 py-2 border border-white/20 rounded-full text-white/70 hover:bg-white/10 transition-colors"
        >
          返回
        </button>
      </div>

      <div className="w-full max-w-5xl overflow-y-auto max-h-[75vh] pr-4 custom-scrollbar">
        {/* 自动存档区域 - 横向滚动 */}
        <div className="mb-10">
          <h3 className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Auto Save Timeline
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {autoSlots.length > 0 ? autoSlots.map((slot) => (
              <motion.div
                key={slot.id}
                whileHover={{ y: -5 }}
                className="flex-shrink-0 w-64 p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all cursor-pointer relative group"
                onClick={() => handleLoad(slot.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-mono text-blue-400/60 uppercase tracking-widest">{getCharacterName(slot.characterId)}</span>
                    <span className="text-xs font-serif text-blue-400/90 line-clamp-1">{slot.name || '自动片段'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-white/30 font-mono">
                      {new Date(slot.timestamp).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirm('确定删除此自动存档吗？', { confirmText: '删除', danger: true }).then(ok => {
                          if (ok) deleteSaveSlot(slot.id);
                        });
                      }}
                      className="p-2 -m-1 text-red-400/50 md:text-red-400/30 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-white/70 font-serif line-clamp-2 h-10 leading-relaxed italic">
                  {slot.summary}
                </div>
              </motion.div>
            )) : (
              <div className="w-full py-10 border border-dashed border-white/5 rounded-xl text-center text-white/10 font-serif italic text-sm">
                暂无时间线记录...
              </div>
            )}
          </div>
        </div>

        {/* 手动存档网格 */}
        <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.4em] mb-4">Manual Memory Slots</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
          <AnimatePresence>
            {manualSlots.map((slot, index) => (
              <motion.div
                key={slot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="relative p-6 rounded-2xl border border-white/20 bg-white/5 hover:border-white/50 hover:bg-white/10 shadow-xl transition-all cursor-pointer group"
                onClick={() => handleLoad(slot.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{getCharacterName(slot.characterId)}</span>
                    <span className="text-xl font-serif text-white/90 group-hover:text-white transition-colors">{slot.name || `存档 ${index + 1}`}</span>
                  </div>
                  <div className="flex items-center gap-2 relative z-10" onClick={e => e.stopPropagation()}>
                    <span className="text-xs text-white/40 font-mono">
                      {new Date(slot.timestamp).toLocaleString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirm('确定删除此手动存档吗？', { confirmText: '删除', danger: true }).then(ok => {
                          if (ok) deleteSaveSlot(slot.id);
                        });
                      }}
                      className="p-2 -m-1 text-red-400/60 md:text-red-400/50 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="text-white/80 font-serif line-clamp-2 leading-relaxed h-12 text-sm italic">
                  {slot.summary}
                </div>
                
                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-serif tracking-widest text-white/90 pointer-events-none">
                  点击读取记忆
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {manualSlots.length === 0 && (
            <div className="col-span-1 md:col-span-2 py-12 border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-white/20 font-serif tracking-widest">
              暂无手动存档记录
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LoadScreen;
