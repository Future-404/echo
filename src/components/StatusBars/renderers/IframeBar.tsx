import React, { useRef, useEffect, useState } from 'react';
    import type { StatusBarProps } from '../types';

    /**
     * 强隔离 Iframe 渲染器
     * 专门用于处理包含完整 HTML 文档 (<html>, <body>, <style>, <script>) 的内容
     * 解决样式污染和标签冲突，支持 AI 输出的完整交互界面
     */
    export const IframeBar: React.FC<StatusBarProps> = ({ metadata }) => {
      const iframeRef = useRef<HTMLIFrameElement>(null);
      const [height, setHeight] = useState('300px');
      const content = metadata?.fullMatch || metadata?.rawBody || "";

      useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe || !content) return;

        // 获取 iframe 的文档对象
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        // 构造完整的 HTML 结构
        // 如果 AI 没提供完整的 html 标签，我们进行包裹以确保样式正确
        const hasHtmlTag = content.toLowerCase().includes('<html');
        const finalHtml = hasHtmlTag 
          ? content 
          : `<!DOCTYPE html><html><head>
              <meta charset="UTF-8">
              <style>
                body { margin: 0; padding: 10px; background: transparent !important; color: inherit; font-family: system-ui, -apple-system, sans-serif; overflow-x: hidden; }
                /* 允许滚动条但隐藏它 */
                ::-webkit-scrollbar { display: none; }
              </style>
            </head><body>${content}</body></html>`;

        // 写入内容
        doc.open();
        doc.write(finalHtml);
        doc.close();

        // 自动调整高度
        const updateHeight = () => {
          try {
            const h = doc.documentElement?.scrollHeight || doc.body?.scrollHeight;
            if (h > 0) setHeight(`${h + 10}px`);
          } catch {}
        };

        iframe.onload = updateHeight;

        // 用 ResizeObserver 替代 setInterval 轮询，更高效
        let observer: ResizeObserver | null = null;
        iframe.onload = () => {
          updateHeight();
          try {
            observer = new ResizeObserver(updateHeight);
            if (doc.body) observer.observe(doc.body);
          } catch {}
        };

        window.addEventListener('resize', updateHeight);
        return () => {
          observer?.disconnect();
          window.removeEventListener('resize', updateHeight);
        };
      }, [content]);

      if (!content) return null;

      return (
        <div className="my-6 w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-200/50 dark:border-white/10 bg-white/10 dark:bg-black/20 backdrop-blur-md">
          {/* 顶部简单的控制栏感 */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-black/5 dark:border-white/5">
            <div className="w-2 h-2 rounded-full bg-red-400/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-400/50" />
            <div className="w-2 h-2 rounded-full bg-green-400/50" />
            <span className="ml-2 text-[9px] font-mono text-gray-400 uppercase tracking-widest opacity-50">Terminal Subsystem</span>
          </div>
          
          <iframe
            ref={iframeRef}
            style={{ width: '100%', height, border: 'none', display: 'block', background: 'transparent' }}
            title="AI Generated Interface"
            // 允许脚本运行以支持动画和交互，但限制其他权限
            sandbox="allow-scripts allow-popups allow-forms allow-modals"
          />
        </div>
      );
    };
