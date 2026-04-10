import React from 'react';
import { Terminal } from 'lucide-react';
import { resolveStatusBar } from './registry';
import type { StatusBarProps } from './types';

/**
 * 通用状态栏分发组件
 */
export const StatusBar: React.FC<StatusBarProps> = (props) => {
  const { type, metadata } = props;
  
  // 查找对应的渲染器
  const Renderer = resolveStatusBar(type);
  
  if (!Renderer) {
    // 回退渲染器 (针对未知类型)
    return (
      <div className="inline-flex items-center gap-3 bg-white/50 dark:bg-black/20 border-0.5 border-echo-border-md rounded-2xl px-4 py-2 my-2 shadow-sm">
        <div className="w-6 h-6 rounded-lg bg-echo-surface flex items-center justify-center">
          <Terminal size={12} className="text-gray-400" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold">{type}</span>
          <span className="text-[10px] text-echo-text-base font-medium">
            {Array.isArray(metadata) ? metadata.join(' | ') : (metadata?.rawBody || 'Unknown format')}
          </span>
        </div>
      </div>
    );
  }

  return <Renderer {...props} />;
};

export * from './types';
