import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import type { StatusBarProps } from '../types';

/**
 * 全量 HTML 渲染器
 * 用于渲染 AI 直接输出的复杂 HTML/CSS 结构 (如 <details>, <style> 等)
 */
export const HtmlBar: React.FC<StatusBarProps> = ({ metadata }) => {
  const rawHtml = metadata?.fullMatch || metadata?.rawBody || "";

  const renderedContent = useMemo(() => {
    const sanitized = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: ['div', 'span', 'p', 'details', 'summary', 'style', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'hr'],
      ALLOWED_ATTR: ['class', 'style'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
    });
    return { __html: sanitized };
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
