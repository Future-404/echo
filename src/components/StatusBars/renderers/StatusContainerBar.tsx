import React, { useMemo } from 'react';
import { StatProgressBar } from '../common/StatProgressBar';
import { Activity, Clock, MapPin, Cloud, Heart, Flame, Zap, Terminal, Info, Star } from 'lucide-react';
import type { StatusBarProps } from '../types';

// 图标映射表
const ICON_MAP: Record<string, any> = {
  time: Clock, location: MapPin, weather: Cloud, love: Heart, hate: Flame, 
  thought: Zap, comment: Info, rank: Star, status: Activity,
  hp: Activity, mana: Zap
};

export const StatusContainerBar: React.FC<StatusBarProps> = ({ metadata }) => {
  const rawBody = metadata?.rawBody || "";
  
  const tags = useMemo(() => {
    const extracted: { key: string; val: string }[] = [];

    // 1. 优先提取 XML 风格标签 (支持多行、允许标签内有空格、处理闭合)
    const xmlRegex = /<([^>]+)>([\s\S]*?)<\/([^>]+)>/g;
    let m;
    while ((m = xmlRegex.exec(rawBody)) !== null) {
      const k = m[1].replace(/\s+/g, '').toLowerCase();
      const closeK = m[3].replace(/\s+/g, '').toLowerCase();
      // 只要标签名处理后一致，或者闭合标签包含开启标签
      if (k === closeK || k.includes(closeK) || closeK.includes(k)) {
        extracted.push({ key: k, val: m[2].trim() });
      }
    }

    // 2. 补充提取 Key: Value 风格或未闭合单标签
    const lines = rawBody.split('\n').map(l => l.trim()).filter(Boolean);
    lines.forEach(line => {
      // 如果这一行看起来不是完整的 XML 封闭格式
      const isFullXml = line.startsWith('<') && line.includes('</');
      if (!isFullXml) {
        // 尝试 KV 解析: "Key: Value" 或 "Key：Value" (支持括号包裹)
        const kvMatch = line.match(/^[\[(]?([^:：\])]+)[\])]?[:：]\s*(.+)$/);
        if (kvMatch) {
          const k = kvMatch[1].replace(/\s+/g, '').toLowerCase();
          if (!extracted.some(t => t.key === k)) {
            extracted.push({ key: k, val: kvMatch[2].trim() });
          }
        } else {
          // 尝试单标签解析: "<Key> Value"
          const tagMatch = line.match(/^<([^>]+)>\s*(.+)$/);
          if (tagMatch) {
            const k = tagMatch[1].replace(/\s+/g, '').toLowerCase();
            if (!extracted.some(t => t.key === k)) {
              extracted.push({ key: k, val: tagMatch[2].trim() });
            }
          }
        }
      }
    });

    return extracted;
  }, [rawBody]);

  // 映射中文 key 到标准英文 key 以匹配图标和颜色
  const normalizedTags = useMemo(() => tags.map(t => {
    let k = t.key;
    if (k.includes('好感') || k.includes('爱') || k.includes('亲密')) k = 'love';
    else if (k.includes('体力') || k.includes('生命') || k.includes('血量') || k === 'hp') k = 'hp';
    else if (k.includes('魔力') || k.includes('精力') || k.includes('能量') || k.includes('蓝量') || k === 'mana') k = 'mana';
    else if (k.includes('厌恶') || k.includes('恨')) k = 'hate';
    else if (k.includes('时间') || k === 'time') k = 'time';
    else if (k.includes('地点') || k.includes('位置') || k === 'loc') k = 'location';
    else if (k.includes('天气')) k = 'weather';
    return { ...t, key: k, originalLabel: t.key };
  }), [tags]);

  // 分类策略
  const metadataItems = normalizedTags.filter(t => t.val.length < 15 && isNaN(parseFloat(t.val)));
  const numericStats = normalizedTags.filter(t => !isNaN(parseFloat(t.val)));
  const narrativeBlocks = normalizedTags.filter(t => isNaN(parseFloat(t.val)) && t.val.length >= 15);

  return (
    <div className="flex flex-col gap-6 p-6 bg-white/70 dark:bg-black/45 border border-gray-200 dark:border-white/10 rounded-[2.5rem] my-8 shadow-2xl backdrop-blur-2xl select-text group">
      {/* Header: 系统元数据栏 */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Neural Sync Matrix</span>
        </div>
        <div className="flex gap-4">
          {metadataItems.length > 0 ? metadataItems.map((item, idx) => {
            const Icon = ICON_MAP[item.key] || Activity;
            return (
              <div key={idx} className="flex items-center gap-1.5 text-[9px] font-mono text-gray-400 uppercase tracking-widest" title={item.originalLabel}>
                <Icon size={12} className="opacity-60" /> {item.val}
              </div>
            );
          }) : (
            <div className="text-[8px] text-gray-400 italic opacity-50 uppercase tracking-widest">Active Link</div>
          )}
        </div>
      </div>

      {/* Numerical Stats Grid: 自动进度条网格 */}
      {numericStats.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 px-2">
          {numericStats.map((stat, idx) => {
            const Icon = ICON_MAP[stat.key] || Activity;
            const barColor = `var(--stat-color-${stat.key}, ${
              {
                love: '#f43f5e',
                hp: '#ef4444',
                mana: '#3b82f6',
                hate: '#9333ea',
                favor: '#fb7185',
                value: '#fbbf24'
              }[stat.key] || 'var(--stat-color-default, #94a3b8)'
            })`;

            return (
              <StatProgressBar 
                key={idx}
                label={stat.originalLabel.toUpperCase()} 
                value={stat.val} 
                icon={<Icon size={12} />} 
                color={barColor} 
              />
            );
          })}
        </div>
      ) : normalizedTags.length === 0 && (
        <div className="px-2 py-4 text-[11px] font-mono text-gray-400 leading-relaxed italic opacity-80 whitespace-pre-wrap">
          {rawBody || "No data synchronized."}
        </div>
      )}

      {/* Narrative Blocks: 长文本/块级内容 */}
      {narrativeBlocks.length > 0 && (
        <div className="space-y-4">
          {narrativeBlocks.map((block, idx) => {
            const isComment = block.key.includes('comment');
            const isThought = block.key.includes('thought');
            
            return (
              <div 
                key={idx} 
                className={`p-4 rounded-2xl transition-all ${
                  isComment ? 'bg-red-500/5 border border-red-500/10' : 
                  isThought ? 'bg-blue-500/5 border border-blue-500/10 italic' : 
                  'bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{block.originalLabel}</span>
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
