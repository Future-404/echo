import React, { useMemo } from 'react';
import type { StatusBarProps } from '../types';

/**
 * 全量 HTML 渲染器
 * 用于渲染 AI 直接输出的复杂 HTML/CSS 结构 (如 <details>, <style> 等)
 */
export const HtmlBar: React.FC<StatusBarProps> = ({ metadata }) => {
  const rawHtml = metadata?.fullMatch || metadata?.rawBody || "";

  // 这里的 rawHtml 包含了标签内部的内容
  // 如果 AI 输出的是 <details>内容</details>，rawHtml 就是 "内容"
  // 但 AI 往往会输出包含内部 HTML 的结构
  
  // 注入样式和内容的容器
  // 使用 useMemo 避免重复渲染时的性能开销
  const renderedContent = useMemo(() => {
    return { __html: rawHtml };
  }, [rawHtml]);

  if (!rawHtml) return null;

  return (
    <div className="my-4 w-full overflow-hidden rounded-2xl shadow-sm border border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
      <div 
        className="html-renderer-content p-1"
        dangerouslySetInnerHTML={renderedContent} 
      />
    </div>
  );
};
