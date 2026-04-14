import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { RegexRule } from '../../types/chat';
import { X, Check, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface RegexEditorProps {
  id: string;
  onClose: () => void;
}

const RegexEditor: React.FC<RegexEditorProps> = ({ id, onClose }) => {
  const { config, updateRegexRule } = useAppStore();
  const rule = config.regexRules?.find(r => r.id === id);

  if (!rule) return null;

  const handleChange = (updates: Partial<RegexRule>) => {
    updateRegexRule(id, updates);
  };

  const toggleScope = (scope: 'ui' | 'ai' | 'user') => {
    const current = rule.runOn || [];
    if (current.includes(scope)) {
      handleChange({ runOn: current.filter(s => s !== scope) });
    } else {
      handleChange({ runOn: [...current, scope] });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-8 space-y-8 flex flex-col h-full">
      <header className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-serif text-echo-text-base">规则编辑 // EDITOR</h3>
          <p className="text-[8px] text-echo-text-subtle uppercase mt-0.5 tracking-widest">Configure Regex Rule</p>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-echo-text-base transition-colors">
          <X size={20} strokeWidth={1} />
        </button>
      </header>

      <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar pb-10" style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
        {/* 名称 */}
        <div className="space-y-2">
          <label className="text-[10px] text-echo-text-dim uppercase tracking-widest px-1">名称 // Name</label>
          <input 
            type="text"
            value={rule.name}
            onChange={e => handleChange({ name: e.target.value })}
            placeholder="例如: 隐藏系统标记"
            className="w-full bg-white/50 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-3 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>

        {/* 正则表达式 */}
        <div className="space-y-2">
          <label className="text-[10px] text-echo-text-dim uppercase tracking-widest px-1">正则表达式 // Regex</label>
          <div className="relative">
             <textarea 
               value={rule.regex}
               onChange={e => handleChange({ regex: e.target.value })}
               placeholder="\[.*?\]"
               rows={3}
               className="w-full bg-white/50 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-xs font-mono text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
             />
             <div className="absolute right-4 bottom-4 flex items-center gap-2">
                <input 
                  type="text"
                  value={rule.flags}
                  onChange={e => handleChange({ flags: e.target.value })}
                  placeholder="gi"
                  className="w-12 bg-gray-100 dark:bg-black/20 border-0.5 border-black/5 dark:border-white/5 rounded-lg px-2 py-1 text-[10px] font-mono text-center focus:outline-none"
                />
             </div>
          </div>
        </div>

        {/* 替换文本 */}
        <div className="space-y-2">
          <label className="text-[10px] text-echo-text-dim uppercase tracking-widest px-1">替换为 // Replacement</label>
          <textarea 
            value={rule.replacement}
            onChange={e => handleChange({ replacement: e.target.value })}
            placeholder="留空则删除匹配项"
            rows={2}
            className="w-full bg-white/50 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-2xl px-5 py-4 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
          />
        </div>

        {/* 作用域 */}
        <div className="space-y-4">
          <label className="text-[10px] text-echo-text-dim uppercase tracking-widest px-1">生效范围 // Scope</label>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'ui', label: '显示层 (UI)', desc: '修改你在对话框看到的内容' },
              { id: 'ai', label: '发送前 (AI 输入)', desc: '修改发送给 AI 的历史消息' },
              { id: 'user', label: '发送前 (用户输入)', desc: '修改你发送给 AI 的最新内容' }
            ].map(s => (
              <div 
                key={s.id}
                onClick={() => toggleScope(s.id as any)}
                className={`p-4 rounded-3xl border-0.5 transition-all cursor-pointer flex items-center justify-between ${
                  rule.runOn.includes(s.id as any) 
                  ? 'bg-blue-500/5 border-blue-500/20' 
                  : 'bg-white/30 dark:bg-white/5 border-gray-100 dark:border-gray-800 opacity-60'
                }`}
              >
                <div>
                  <h5 className="text-xs font-serif text-gray-700 dark:text-gray-300">{s.label}</h5>
                  <p className="text-[9px] text-gray-400 mt-0.5">{s.desc}</p>
                </div>
                {rule.runOn.includes(s.id as any) && <Check size={16} className="text-blue-500" />}
              </div>
            ))}
          </div>
        </div>

        {/* 提示信息 */}
        <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex gap-3">
          <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
          <p className="text-[9px] text-orange-600/80 leading-relaxed italic">
            提示：正则表达式将在渲染或发送前按列表顺序依次执行。错误的正则可能导致内容显示异常，请谨慎编辑。
          </p>
        </div>
      </div>

      <button 
        onClick={onClose}
        className="w-full py-4 bg-gray-900 dark:bg-white/10 rounded-full text-[10px] tracking-[0.4em] text-white/90 uppercase shadow-lg shadow-black/10 active:scale-95 transition-all"
      >
        保存配置 // SAVE
      </button>
    </motion.div>
  );
};

export default RegexEditor;
