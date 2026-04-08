import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { Plus, Edit2, Check, X, Trash2 } from 'lucide-react';
import { useDialog } from './GlobalDialog';

const SaveScreen: React.FC = () => {
  const { saveSlots, saveGame, renameSaveSlot, deleteSaveSlot, setCurrentView, messages, currentAutoSlotId } = useAppStore();
  const { confirm, prompt } = useDialog();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // 自动存档位 (只显示当前的)
  const currentAutoSlot = saveSlots.find(s => s.id === currentAutoSlotId);

  // 手动存档位
  const manualSlots = saveSlots
    .filter(s => !s.id.startsWith('auto_'))
    .sort((a, b) => b.timestamp - a.timestamp);

  const startEdit = (id: string, currentName?: string) => {
    setEditingId(id);
    setEditName(currentName || '');
  };

  const commitEdit = () => {
    if (editingId && editName.trim()) {
      renameSaveSlot(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleCreateNewSave = async () => {
    if (messages.length === 0) return;
    const name = await prompt('请输入新存档名称：', `记忆节点 ${manualSlots.length + 1}`, {
      title: '建立新存档',
      inputPlaceholder: '存档名称',
      confirmText: '保存',
    });
    if (name) {
      const newId = `manual_${Date.now()}`;
      await saveGame(newId, name as string);
    }
  };

  const handleOverwrite = async (slotId: string) => {
    if (messages.length === 0) return;
    const confirmed = await confirm('确定要覆盖此存档吗？之前的进度将丢失。', {
      confirmText: '覆盖',
      danger: true,
    });
    if (confirmed) await saveGame(slotId);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md pointer-events-auto"
    >
      <div className="w-full max-w-5xl flex justify-between items-center mb-8 pt-[var(--sat)]">

        <h2 className="text-3xl md:text-4xl font-serif text-white tracking-widest">保存进度</h2>
        <button 
          onClick={() => setCurrentView('main')} 
          className="px-6 py-2 border border-white/20 rounded-full text-white/70 hover:bg-white/10 transition-colors"
        >
          返回游戏
        </button>
      </div>

      <div className="w-full max-w-5xl overflow-y-auto max-h-[75vh] pr-4 custom-scrollbar">
        {/* 当前自动存档状态 */}
        {currentAutoSlot && (
          <div className="mb-10">
            <h3 className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Current Session (Auto-Saving)
            </h3>
            <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 relative group">
              <div className="flex justify-between items-center mb-2">
                {editingId === currentAutoSlot.id ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="bg-transparent border-b border-blue-400/50 text-blue-300 font-serif outline-none focus:border-blue-400 text-lg px-1 w-48"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && commitEdit()}
                    />
                    <button onClick={commitEdit} className="text-green-400"><Check size={16}/></button>
                    <button onClick={() => setEditingId(null)} className="text-red-400"><X size={16}/></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-serif text-blue-400/90">{currentAutoSlot.name || '当前记忆线'}</span>
                    <button onClick={() => startEdit(currentAutoSlot.id, currentAutoSlot.name)} className="opacity-0 group-hover:opacity-100 text-blue-400/50 hover:text-blue-400 transition-opacity">
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
                <span className="text-xs text-blue-400/40 font-mono">
                  {new Date(currentAutoSlot.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-white/70 font-serif line-clamp-2 leading-relaxed italic">
                {currentAutoSlot.summary}
              </div>
            </div>
          </div>
        )}

        {/* 手动存档区域 */}
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-[10px] font-mono text-gray-500 uppercase tracking-[0.4em]">Manual Memory Slots</h3>
          <button 
            onClick={handleCreateNewSave}
            className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white/90 transition-all font-serif"
          >
            <Plus size={14} /> 建立新存档
          </button>
        </div>
        
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
                onClick={() => { if(editingId !== slot.id) handleOverwrite(slot.id); }}
              >
                <div className="flex justify-between items-start mb-4 relative z-10" onClick={e => e.stopPropagation()}>
                  {editingId === slot.id ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                        className="bg-transparent border-b border-white/50 text-white font-serif outline-none focus:border-white text-xl px-1 w-40"
                        autoFocus
                        onKeyDown={e => e.key === 'Enter' && commitEdit()}
                      />
                      <button onClick={commitEdit} className="text-green-400"><Check size={16}/></button>
                      <button onClick={() => setEditingId(null)} className="text-red-400"><X size={16}/></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-serif text-white/90">{slot.name || `记忆碎片 ${index + 1}`}</span>
                      <button onClick={() => startEdit(slot.id, slot.name)} className="opacity-0 group-hover:opacity-100 text-white/50 hover:text-white transition-opacity">
                        <Edit2 size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40 font-mono">
                      {new Date(slot.timestamp).toLocaleString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirm('确定要删除这个存档吗？', { confirmText: '删除', danger: true }).then(ok => {
                          if (ok) deleteSaveSlot(slot.id);
                        });
                      }}
                      className="p-1 text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="text-white/80 font-serif line-clamp-2 leading-relaxed h-12 text-sm italic">
                  {slot.summary}
                </div>
                
                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-serif tracking-widest text-white/90 pointer-events-none">
                  点击覆盖此进度
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {manualSlots.length === 0 && (
            <div className="col-span-1 md:col-span-2 py-12 border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-white/20 font-serif tracking-widest">
              暂无手动存档记录，点击右上角建立。
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SaveScreen;