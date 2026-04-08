import React from 'react';
import { DataLinkBar } from './renderers/DataLinkBar';
import { LegacyCSVBar } from './renderers/LegacyCSVBar';
import { StatusContainerBar } from './renderers/StatusContainerBar';
import { IframeBar } from './renderers/IframeBar';
import type { StatusBarProps } from './types';

export const StatusBarRegistry: Record<string, React.FC<StatusBarProps>> = {
  'status': DataLinkBar,
  'status-container': StatusContainerBar,
  '状态栏': LegacyCSVBar,
  'characterCard': LegacyCSVBar,
  'details': IframeBar,
  'html': IframeBar,
  'card': IframeBar,
  'slash:js': IframeBar,
};

/**
 * 状态栏渲染分发器
 */
export const resolveStatusBar = (type: string): React.FC<StatusBarProps> | null => {
  // 1. 完全匹配
  if (StatusBarRegistry[type]) return StatusBarRegistry[type];
  
  // 2. 模糊匹配 (例如: 'charactercard_v2')
  const key = Object.keys(StatusBarRegistry).find(k => 
    type.toLowerCase().includes(k.toLowerCase())
  );
  
  return key ? StatusBarRegistry[key] : null;
};
