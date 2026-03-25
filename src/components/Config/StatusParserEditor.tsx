import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, X, Tag, Settings2, EyeOff } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { CustomParser } from '../../store/useAppStore';

const StatusParserEditor: React.FC = () => {
  const { selectedCharacter, addCustomParser, updateCustomParser, removeCustomParser } = useAppStore();
  const customParsers = selectedCharacter.extensions?.customParsers || [];
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 编辑临时状态
  const [tempParser, setTempParser] = useState<Partial<CustomParser>>({
    name: '',
    triggerRegex: '',
    hideFromChat: true,
    enabled: true,
    fields: []
  });

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldIndex, setNewFieldIndex] = useState(1);

  const handleSave = () => {
    if (!tempParser.name || !tempParser.triggerRegex) return;

    if (editingId) {
      updateCustomParser(editingId, tempParser as CustomParser);
      setEditingId(null);
    } else {
      addCustomParser({
        ...tempParser,
        id: `parser-${Date.now()}`,
      } as CustomParser);
      setIsAdding(false);
    }
    
    // 重置
    setTempParser({ name: '', triggerRegex: '', hideFromChat: true, enabled: true, fields: [] });
  };

  const startEdit = (parser: CustomParser) => {
    setTempParser(parser);
    setEditingId(parser.id);
    setIsAdding(false);
  };

  const addField = () => {
    if (!newFieldName) return;
    const fields = [...(tempParser.fields || []), { index: newFieldIndex, name: newFieldName }];
    setTempParser({ ...tempParser, fields });
    setNewFieldName('');
    setNewFieldIndex(fields.length + 1);
  };

  const removeField = (idx: number) => {
    setTempParser({
      ...tempParser,
      fields: tempParser.fields?.filter((_, i) => i !== idx)
    });
  };

  return (
    <div className="flex flex-col h-full bg-transparent p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-serif text-gray-600 dark:text-gray-300 tracking-widest uppercase">数据提取规则 // DATA PARSER</h3>
          <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase mt-1 tracking-tighter">Define how system extracts status from AI responses</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); }}
          className="p-2 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500/20 transition-all shadow-sm"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto no-scrollbar pb-20">
        {(isAdding || editingId) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-white/50 dark:bg-white/5 rounded-[2rem] border border-blue-500/20 space-y-6 shadow-xl backdrop-blur-md"
          >
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold px-2">规则名称</label>
                <input 
                  type="text" 
                  value={tempParser.name}
                  onChange={e => setTempParser({...tempParser, name: e.target.value})}
                  className="w-full mt-1 px-4 py-3 bg-white dark:bg-black/40 border border-gray-100 dark:border-white/5 rounded-2xl text-xs"
                  placeholder="例如：属性提取器"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold px-2">匹配正则 (Regex)</label>
                <input 
                  type="text" 
                  value={tempParser.triggerRegex}
                  onChange={e => setTempParser({...tempParser, triggerRegex: e.target.value})}
                  className="w-full mt-1 px-4 py-3 bg-white dark:bg-black/40 border border-gray-100 dark:border-white/5 rounded-2xl text-xs font-mono"
                  placeholder="<status>([\s\S]*?)</status>"
                />
              </div>

              <div className="flex items-center gap-4 px-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={tempParser.hideFromChat}
                    onChange={e => setTempParser({...tempParser, hideFromChat: e.target.checked})}
                    className="hidden"
                  />
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${tempParser.hideFromChat ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${tempParser.hideFromChat ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest group-hover:text-blue-400 transition-colors">从对话中隐藏</span>
                </label>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] text-gray-400 uppercase font-bold px-2">字段映射 (Capture Groups)</label>
                <div className="space-y-2">
                  {tempParser.fields?.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 dark:bg-black/20 p-2 px-4 rounded-xl border border-gray-100 dark:border-white/5">
                      <span className="text-[10px] font-mono text-blue-400">${f.index}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-300 flex-1">{f.name}</span>
                      <button onClick={() => removeField(i)} className="text-gray-400 hover:text-red-400"><X size={12} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={newFieldIndex}
                    onChange={e => setNewFieldIndex(parseInt(e.target.value))}
                    className="w-16 px-3 py-2 bg-white dark:bg-black/40 border border-gray-100 dark:border-white/5 rounded-xl text-xs font-mono"
                    title="捕获组索引 (1, 2...)"
                  />
                  <input 
                    type="text" 
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-black/40 border border-gray-100 dark:border-white/5 rounded-xl text-xs"
                    placeholder="对应显示名称 (如: 好感度)"
                  />
                  <button onClick={addField} className="p-2 bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-blue-500/20 hover:text-blue-500 transition-colors">
                    <Check size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} className="flex-1 py-3 bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20">保存规则</button>
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-all">取消</button>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          {customParsers.length === 0 && !isAdding && (
            <div className="p-10 text-center space-y-4 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-[2.5rem]">
              <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto opacity-50">
                <Tag size={20} className="text-gray-400" />
              </div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">暂无角色专属解析规则</p>
            </div>
          )}

          {customParsers.map(parser => (
            <div 
              key={parser.id}
              className={`p-6 rounded-[2rem] border transition-all ${parser.enabled ? 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/10' : 'opacity-50 bg-gray-50 dark:bg-black/20 border-transparent'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${parser.enabled ? 'bg-green-400' : 'bg-gray-400'}`} />
                  <h4 className="text-xs font-serif font-bold text-gray-700 dark:text-gray-200">{parser.name}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(parser)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => removeCustomParser(parser.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[9px] font-mono text-gray-400 bg-black/5 dark:bg-black/20 p-2 rounded-lg truncate">
                  <Settings2 size={10} className="opacity-50" />
                  {parser.triggerRegex}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {parser.hideFromChat && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[8px] uppercase font-black tracking-widest">
                      <EyeOff size={8} /> Hidden
                    </div>
                  )}
                  {parser.fields.map(f => (
                    <div key={f.index} className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 text-[8px] uppercase font-bold border border-gray-200 dark:border-white/5">
                      ${f.index}: {f.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusParserEditor;
