import React from 'react';
import { StatProgressBar } from '../common/StatProgressBar';
import { Activity, Clock, MapPin, Cloud, Heart, Flame, Zap, Terminal, Info, Star } from 'lucide-react';
import type { StatusBarProps } from '../types';

// 图标映射表
const ICON_MAP: Record<string, any> = {
  time: Clock, location: MapPin, weather: Cloud, love: Heart, hate: Flame, 
  thought: Zap, comment: Info, rank: Star, status: Activity
};

export const StatusContainerBar: React.FC<StatusBarProps> = ({ metadata }) => {
  const rawBody = metadata?.rawBody || "";
  
  // 通用标签解析
  const tags: { key: string; val: string }[] = [];
  const m = rawBody.matchAll(/<([\w-]+)>([\s\S]*?)<\/\1>/g);
  for (const match of m) {
    tags.push({ key: match[1], val: match[2].trim() });
  }

  // 分类策略：短文本非数字 → 元数据；纯数字 → 进度条；其余 → 叙事块
  const metadataItems = tags.filter(t => t.val.length < 15 && isNaN(parseFloat(t.val)));
  const numericStats = tags.filter(t => !isNaN(parseFloat(t.val)));
  const narrativeBlocks = tags.filter(t => isNaN(parseFloat(t.val)) && t.val.length >= 15);

  return (
    <div className="flex flex-col gap-6 p-6 bg-white/70 dark:bg-black/45 border border-gray-200 dark:border-white/10 rounded-[2.5rem] my-8 shadow-2xl backdrop-blur-2xl select-text group">
      {/* Header: 系统元数据栏 */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Neural Sync Matrix</span>
        </div>
        <div className="flex gap-4">
          {metadataItems.map(item => {
            const Icon = ICON_MAP[item.key.toLowerCase()] || Activity;
            return (
              <div key={item.key} className="flex items-center gap-1.5 text-[9px] font-mono text-gray-400 uppercase tracking-widest" title={item.key}>
                <Icon size={12} className="opacity-60" /> {item.val}
              </div>
            );
          })}
        </div>
      </div>

      {/* Numerical Stats Grid: 自动进度条网格 */}
      {numericStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 px-2">
          {numericStats.map(stat => {
            const Icon = ICON_MAP[stat.key.toLowerCase()] || Activity;
            const colorMap: Record<string, string> = { love: '#f43f5e', hate: '#9333ea', hp: '#ef4444', mana: '#3b82f6' };
            return (
              <StatProgressBar 
                key={stat.key}
                label={stat.key.toUpperCase()} 
                value={stat.val} 
                icon={<Icon size={12} />} 
                color={colorMap[stat.key.toLowerCase()] || '#94a3b8'} 
              />
            );
          })}
        </div>
      )}

      {/* Narrative Blocks: 长文本/块级内容 */}
      {narrativeBlocks.length > 0 && (
        <div className="space-y-4">
          {narrativeBlocks.map(block => {
            const isComment = block.key.toLowerCase().includes('comment');
            const isThought = block.key.toLowerCase().includes('thought');
            
            return (
              <div 
                key={block.key} 
                className={`p-4 rounded-2xl transition-all ${
                  isComment ? 'bg-red-500/5 border border-red-500/10' : 
                  isThought ? 'bg-blue-500/5 border border-blue-500/10 italic' : 
                  'bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{block.key}</span>
                </div>
                <p className="text-[11px] font-serif leading-relaxed text-gray-700 dark:text-gray-300">
                  {block.val}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
