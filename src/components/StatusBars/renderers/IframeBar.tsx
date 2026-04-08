import React from 'react';
import type { StatusBarProps } from '../types';
import { IframeBlock } from '../../Dialogue/IframeBlock';

/**
 * 状态栏包装下的 Iframe 渲染器 (兼容 /js 命令与 html 块)
 */
export const IframeBar: React.FC<StatusBarProps> = ({ type, metadata }) => {
  const rawContent = metadata?.rawBody || "";
  if (!rawContent) return null;

  // 如果是斜杠命令 /js，我们将其代码包裹在 script 标签中
  const isSlashJs = type === 'slash:js';
  const finalHtml = isSlashJs 
    ? `<script>\n${rawContent}\n</script>`
    : rawContent;

  return (
    <div className="my-6 w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-200/50 dark:border-white/10 bg-white/10 dark:bg-black/20 backdrop-blur-md text-left">
      {/* 顶部简单的控制栏感 */}
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-black/5 dark:border-white/5">
        <div className="w-2 h-2 rounded-full bg-red-400/50" />
        <div className="w-2 h-2 rounded-full bg-yellow-400/50" />
        <div className="w-2 h-2 rounded-full bg-green-400/50" />
        <span className="ml-2 text-[9px] font-mono text-gray-400 uppercase tracking-widest opacity-50">
          {isSlashJs ? 'Slash Runner // Execution' : 'Terminal Subsystem // Render'}
        </span>
      </div>
      
      <IframeBlock html={finalHtml} />
    </div>
  );
};
