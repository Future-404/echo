import React from 'react';
import { Activity, Layers, Terminal } from 'lucide-react';
import type { StatusBarProps } from '../types';

export const DataLinkBar: React.FC<StatusBarProps> = ({ metadata }) => {
  const rawData = metadata?.rawBody || "";
  
  // 结构化解析逻辑
  const lines = rawData.split('\n').map(l => l.trim()).filter(Boolean);
  const sections: { title: string; rows: string[][] }[] = [];
  let currentSection: { title: string; rows: string[][] } | null = null;

  lines.forEach(line => {
    // 匹配标题行 <-标题->
    const sectionMatch = line.match(/^<-(.+)->$/);
    if (sectionMatch) {
      currentSection = { title: sectionMatch[1], rows: [] };
      sections.push(currentSection);
    } 
    // 匹配表格行 |A|B|C|
    else if (line.startsWith('|') && line.endsWith('|')) {
      const row = line.split('|').map(s => s.trim()).filter(s => s !== '');
      if (row.length > 0) {
        if (!currentSection) {
          currentSection = { title: 'DATA LOG', rows: [] };
          sections.push(currentSection);
        }
        currentSection.rows.push(row);
      }
    }
    // 匹配普通文本行
    else if (line.length > 0) {
      if (!currentSection) {
        currentSection = { title: 'INFO', rows: [] };
        sections.push(currentSection);
      }
      currentSection.rows.push([line]);
    }
  });

  return (
    <div className="flex flex-col gap-4 p-5 bg-white/60 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-3xl my-6 shadow-xl backdrop-blur-md select-text">
      {/* 顶部标识 */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Neural Sync // 状态矩阵</span>
        </div>
        <Terminal size={12} className="text-gray-400 dark:text-gray-700" />
      </div>

      {/* 动态渲染区块 */}
      <div className="space-y-6">
        {sections.length === 0 ? (
           <p className="text-[11px] text-gray-500 italic whitespace-pre-wrap">{rawData}</p>
        ) : (
          sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers size={10} className="text-gray-400" />
                <h4 className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {section.title}
                </h4>
              </div>
              
              <div className="flex flex-col gap-2">
                {section.rows.map((row, rIdx) => (
                  <div key={rIdx} className="flex flex-wrap gap-2">
                    {row.map((cell, cIdx) => (
                      <div 
                        key={cIdx} 
                        className="bg-gray-50/50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/5 hover:border-blue-200/50 transition-colors"
                      >
                        <span className="text-[11px] font-serif text-gray-600 dark:text-gray-300 leading-relaxed">
                          {cell}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
