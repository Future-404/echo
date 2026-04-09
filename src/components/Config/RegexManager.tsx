import React, { useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { RegexRule } from '../../types/chat';
import { Plus, Trash2, Edit2, ToggleLeft, ToggleRight, ArrowUp, ArrowDown, Download, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useDialog } from '../GlobalDialog';

interface RegexManagerProps {
  onEdit: (id: string) => void;
  onAdd: () => void;
}

const RegexManager: React.FC<RegexManagerProps> = ({ onEdit, onAdd }) => {
  const { config, updateRegexRule, removeRegexRule, reorderRegexRules, addRegexRule } = useAppStore();
  const { alert } = useDialog();
  const rules = config.regexRules || [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const moveRule = (index: number, direction: 'up' | 'down') => {
    const newRules = [...rules];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRules.length) return;
    
    [newRules[index], newRules[targetIndex]] = [newRules[targetIndex], newRules[index]];
    reorderRegexRules(newRules);
  };

  // 导出功能
  const handleExport = () => {
    const data = JSON.stringify(rules, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echo-regex-rules-${new Date().toLocaleDateString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入功能 (兼容 ST 格式)
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const importedRules = Array.isArray(json) ? json : [json];

        importedRules.forEach(r => {
          // 尝试映射 ST 格式
          const newRule: RegexRule = {
            id: r.id || `regex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: r.name || r.ruleName || '导入规则',
            regex: r.regex || '',
            replacement: r.replacement || '',
            flags: r.flags || (r.caseSensitive === false ? 'gi' : 'g'),
            enabled: r.enabled ?? !(r.disabled),
            runOn: r.runOn || []
          };

          // ST 兼容逻辑：处理 placement [1=AI输入, 2=渲染, 3=用户输入]
          if (r.placement && Array.isArray(r.placement)) {
            const scopes: ('ui' | 'ai' | 'user')[] = [];
            if (r.placement.includes(1)) scopes.push('ai');
            if (r.placement.includes(2)) scopes.push('ui');
            if (r.placement.includes(3)) scopes.push('user');
            newRule.runOn = scopes;
          }

          if (!newRule.runOn.length) newRule.runOn = ['ui'];
          addRegexRule(newRule);
        });
        
        if (fileInputRef.current) fileInputRef.current.value = '';
        alert(`成功导入 ${importedRules.length} 条规则`);
      } catch (err) {
        console.error('Import failed:', err);
        alert('导入失败：非法的 JSON 格式');
      }
    };
    reader.readAsText(file);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-6">
      <header className="flex justify-between items-center px-2">
        <div>
          <h3 className="text-sm font-serif text-gray-600 dark:text-gray-300">全局正则 // REGEX</h3>
          <p className="text-[8px] text-gray-400 dark:text-gray-500 uppercase mt-0.5 tracking-widest">Global Regex Rules</p>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            accept=".json" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-full bg-gray-500/10 text-gray-400 flex items-center justify-center hover:bg-gray-500/20 transition-all shadow-sm"
            title="导入 JSON"
          >
            <Upload size={14} />
          </button>
          <button 
            onClick={handleExport}
            className="w-8 h-8 rounded-full bg-gray-500/10 text-gray-400 flex items-center justify-center hover:bg-gray-500/20 transition-all shadow-sm"
            title="导出 JSON"
          >
            <Download size={14} />
          </button>
          <button 
            onClick={onAdd}
            className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow-sm"
            title="添加规则"
          >
            <Plus size={16} />
          </button>
        </div>
      </header>

      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="text-gray-300 dark:text-gray-700 font-serif italic text-sm">空寂无声 // No Rules Yet</div>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest">Add your first regex rule to start</p>
          </div>
        ) : (
          rules.map((rule, index) => (
            <div key={rule.id} className="group p-4 bg-white/50 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-3xl hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-xs font-serif text-gray-700 dark:text-gray-200 truncate">{rule.name || '未命名规则'}</h4>
                  <div className="flex gap-2 mt-1">
                    {rule.runOn.map(scope => (
                      <span key={scope} className="text-[7px] px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-400 rounded uppercase tracking-widest border-0.5 border-black/5">
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => moveRule(index, 'up')} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-blue-500 disabled:opacity-20"><ArrowUp size={14} /></button>
                   <button onClick={() => moveRule(index, 'down')} disabled={index === rules.length - 1} className="p-1.5 text-gray-400 hover:text-blue-500 disabled:opacity-20"><ArrowDown size={14} /></button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t-0.5 border-gray-100/50 dark:border-gray-800/50">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => updateRegexRule(rule.id, { enabled: !rule.enabled })}
                    className="transition-colors"
                  >
                    {rule.enabled ? <ToggleRight className="text-blue-500" size={20} /> : <ToggleLeft className="text-gray-300" size={20} />}
                  </button>
                  <span className="text-[8px] text-gray-400 uppercase tracking-widest font-mono">
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => onEdit(rule.id)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => removeRegexRule(rule.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default RegexManager;
