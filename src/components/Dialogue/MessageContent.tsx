import React, { useState, useMemo, useRef } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { parseStreamingNovelText } from '../../utils/novelParser'
import { StatusBar } from '../StatusBars'
import { useAppStore } from '../../store/useAppStore'
import { applyCharacterRegexScripts } from '../../utils/tagParser'
import { applyRegexRules } from '../../utils/regexEngine'
import { IframeBlock } from './IframeBlock'

// Markdown 渲染
const MD_RE = /^#{1,6} |^\s*[-*+] |\*\*|__|^\s*\d+\. |^---$/m
function renderMd(text: string): string | null {
  if (!MD_RE.test(text)) return null
  return marked.parse(text, { async: false }) as string
}

interface MessageContentProps {
  content: string;
  isAi: boolean;
  segmentIndex?: number;
  isGreeting?: boolean;
  isLatest?: boolean;
  renderDepth?: number;
  images?: string[];
}

const ThinkingBlock: React.FC<{ content: string }> = ({ content }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <details className="mb-2 text-xs opacity-60 cursor-pointer" open={expanded} onClick={(e) => { e.preventDefault(); setExpanded(v => !v); }}>
      <summary className="font-mono text-echo-text-muted select-none">💭 思考中...</summary>
      <div className="mt-1 pl-4 border-l-2 border-gray-300 dark:border-gray-600 whitespace-pre-wrap font-mono text-gray-600 dark:text-gray-400">
        {content}
      </div>
    </details>
  );
};

const HtmlRenderer: React.FC<{ 
  html: string; 
  i: number; 
  shouldRender: boolean; 
  charData?: Record<string, any> 
}> = ({ html, i, shouldRender, charData }) => {
  if (!shouldRender) {
    return <div key={i} className="w-full rounded bg-black/5 dark:bg-white/5 text-center text-xs text-gray-400 py-2 italic">[ 界面已折叠 ]</div>;
  }
  return <IframeBlock key={i} html={html} charData={charData} />;
};

// Version: see src/version.ts
const MessageContent: React.FC<MessageContentProps> = React.memo(({ content, isAi, segmentIndex, isLatest = false, renderDepth = 3, images }) => {
  const config = useAppStore(s => s.config);
  const selectedCharacter = useAppStore(s => s.selectedCharacter);
  
  const bodyEngine = selectedCharacter.bodyEngine || 'vn';
  const widgetEngine = selectedCharacter.widgetEngine || 'xml';

  const charDataRef = useRef(isAi ? { name: selectedCharacter.name, attributes: selectedCharacter.attributes ?? {} } : undefined)
  const charData = charDataRef.current

  // 性能加固：节流解析状态
  const lastParseRef = useRef({ time: 0, length: 0 });
  const [throttledContent, setThrottledContent] = useState(content);

  // 当内容变化时，决定是否需要更新节流后的内容（触发重绘）
  React.useEffect(() => {
    const now = Date.now();
    const len = content.length;
    const isStreaming = isAi && isLatest;

    // 判定逻辑：
    // 1. 如果不是流式输出（即历史消息），立即更新
    // 2. 如果距离上次解析超过 300ms，更新
    // 3. 如果内容长度增长超过 100 字符，更新
    // 4. 如果内容以关键标签结尾 (如 >)，可能意味着一个块结束了，更新
    if (
      !isStreaming || 
      (now - lastParseRef.current.time > 300) || 
      (len - lastParseRef.current.length > 100) ||
      content.endsWith('>') ||
      content.endsWith('}')
    ) {
      setThrottledContent(content);
      lastParseRef.current = { time: now, length: len };
    }
  }, [content, isAi, isLatest]);

  const { thinkingContent, envBadges, statusCards, finalLayoutSegments } = useMemo(() => {
    // 使用节流后的内容进行解析，大幅降低 Streaming 期间的 CPU 消耗
    let workingText = throttledContent;
    
    // 阶段 0: 全局正则 (UI 渲染层)
    workingText = applyRegexRules(workingText, config.regexRules || [], 'ui');
    
    // 阶段 1: 角色自定义脚本预处理
    workingText = isAi ? applyCharacterRegexScripts(workingText, selectedCharacter, 2) : workingText;
    
    // 阶段 2: 提取 Thinking
    const thinkingMatch = workingText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    const thinkingContent = thinkingMatch ? thinkingMatch[1].trim() : null;
    workingText = workingText.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim();

    const envBadges: any[] = [];
    const statusCards: any[] = [];
    const blocks: { id: string; type: string; content: string; label?: string; metadata?: any }[] = [];
    let blockIdx = 0;
    // 使用 DOM 安全的占位符
    const getNextId = () => `:::ECHO_BLOCK_${blockIdx++}:::`;

    // --- 路径 A: 纯 HTML 模式 ---
    if (bodyEngine === 'plain' && widgetEngine === 'html') {
      statusCards.push({ id: getNextId(), type: 'html', content: workingText });
      return { thinkingContent, envBadges, statusCards, finalLayoutSegments: [] };
    }

    // --- 阶段 3: DOM 解析与分发 ---
    if (widgetEngine !== 'none') {
      // 3.1 优先捕获特殊块
      const bigBlockRegex = /```html\s*([\s\S]*?)```|<!DOCTYPE\s+html[\s\S]*?<\/html>/gi;
      workingText = workingText.replace(bigBlockRegex, (match, inner) => {
        const id = getNextId();
        blocks.push({ id, type: 'html', content: inner?.trim() || match.trim() });
        return id;
      });

      // 3.2 提取 ST-Card
      const cardRegex = /\{\{([\s\S]+?)\}\}/g;
      workingText = workingText.replace(cardRegex, (match, inner) => {
        const id = getNextId();
        blocks.push({ id, type: 'card', content: 'card', metadata: { rawBody: inner.trim(), fullMatch: match } });
        return id;
      });

      // 3.3 DOM Parser 解析
      const container = document.createElement('div');
      container.innerHTML = workingText;

      let rebuiltText = "";
      let currentHtmlBuffer = "";
      const INTERACTIVE_TAGS = new Set(['style', 'div', 'details', 'summary', 'svg', 'table', 'iframe', 'canvas', 'script', 'audio', 'video', 'main', 'section', 'header', 'footer', 'nav', 'aside', 'form', 'button', 'input']);

      const flushHtml = () => {
        if (currentHtmlBuffer.trim()) {
          const id = getNextId();
          blocks.push({ id, type: 'html', content: currentHtmlBuffer.trim() });
          rebuiltText += id;
          currentHtmlBuffer = "";
        }
      };

      const processNode = (node: ChildNode) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const val = node.nodeValue || "";
          if (val.trim()) { flushHtml(); rebuiltText += val; }
          else { currentHtmlBuffer ? (currentHtmlBuffer += val) : (rebuiltText += val); }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tag = el.tagName.toLowerCase();

          if (widgetEngine === 'xml' && /^(status|metadata|state|data)$/.test(tag)) {
            el.childNodes.forEach(child => processNode(child));
          } else if (INTERACTIVE_TAGS.has(tag)) {
            currentHtmlBuffer += el.outerHTML;
          } else if (el instanceof HTMLUnknownElement || /^(time|location|weather|thoughts|tasks|todo|affection)$/.test(tag)) {
            if (widgetEngine === 'html') {
              currentHtmlBuffer += el.outerHTML;
            } else {
              flushHtml();
              const id = getNextId();
              const innerText = el.innerHTML.trim();
              if (/^(time|location|weather|地点|天气|时间|日期)$/.test(tag)) {
                blocks.push({ id, type: 'env', content: innerText, label: tag });
              } else if (/^(thoughts|内心|想法|心声)$/.test(tag)) {
                blocks.push({ id, type: 'thought-box', content: innerText });
              } else if (/^(tasks|目标|任务|todo)$/.test(tag)) {
                blocks.push({ id, type: 'tasks', content: innerText });
              } else {
                blocks.push({ id, type: 'status', content: tag, metadata: { rawBody: innerText, fullMatch: el.outerHTML } });
              }
              rebuiltText += id;
            }
          } else {
            flushHtml();
            rebuiltText += el.outerHTML;
          }
        }
      };

      container.childNodes.forEach(processNode);
      flushHtml();
      workingText = rebuiltText;
    }

    // 阶段 4: 定向正文处理
    const tempSegments: any[] = [];
    if (bodyEngine === 'markdown') {
      const html = renderMd(workingText) || workingText;
      tempSegments.push({ type: 'md-html', content: html });
    } else if (bodyEngine === 'plain') {
      tempSegments.push({ type: 'plain', content: workingText });
    } else {
      const rawSegments = parseStreamingNovelText(workingText, {
        dialogueQuotes: config.dialogueQuotes,
        actionMarkers: config.actionMarkers,
        thoughtMarkers: config.thoughtMarkers,
      });
      rawSegments.forEach(seg => {
        const mdHtml = renderMd(seg.content);
        tempSegments.push(mdHtml ? { ...seg, type: 'md-html', content: mdHtml } : seg);
      });
    }

    // 阶段 5: 复水组合 (核心重构：将文字切片转化为组件流)
    const movedToLayout = new Set();
    blocks.forEach(b => { if (b.type === 'env') { envBadges.push(b); movedToLayout.add(b.id); } });

    const finalLayoutSegments: any[] = [];
    const blockIdRegex = /(:::ECHO_BLOCK_\d+:::)/g;

    tempSegments.forEach((seg) => {
      if (typeof seg.content !== 'string') { finalLayoutSegments.push(seg); return; }
      
      // 使用 DOMPurify 净化，但此时 ID 是安全的字符串
      const rawText = seg.content;
      const cleanContent = (seg.type === 'md-html') 
        ? DOMPurify.sanitize(rawText, { USE_PROFILES: { html: true } })
        : rawText;

      // 按 ID 切分，保留 ID 本身作为数组项
      const parts = cleanContent.split(blockIdRegex);
      parts.forEach(part => {
        if (!part) return;
        if (part.startsWith(':::ECHO_BLOCK_')) {
          const block = blocks.find(b => b.id === part);
          if (block && !movedToLayout.has(part)) {
            finalLayoutSegments.push(block);
          }
        } else {
          finalLayoutSegments.push({ ...seg, content: part });
        }
      });
    });

    return { thinkingContent, envBadges, statusCards, finalLayoutSegments };
  }, [throttledContent, isAi, selectedCharacter.id, bodyEngine, widgetEngine, config.dialogueQuotes, config.actionMarkers, config.thoughtMarkers, config.regexRules]);

  const shouldRenderIframe = renderDepth === 0 || isLatest

  return (
    <>
      {images && images.length > 0 && (
        <div className={`flex gap-2 flex-wrap mb-3 ${isAi ? 'justify-start' : 'justify-end'}`}>
          {images.map((img, i) => (
            <img key={i} src={img} alt="attachment" className="max-w-[200px] max-h-[200px] rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 object-contain" />
          ))}
        </div>
      )}
      
      {thinkingContent && <ThinkingBlock content={thinkingContent} />}

      {envBadges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 opacity-70">
          {envBadges.map((b, i) => (
            <div key={i} className="px-2 py-0.5 rounded bg-echo-surface border border-black/5 dark:border-white/5 text-[9px] tracking-[0.1em] uppercase font-mono text-gray-500">
              <span className="opacity-50 mr-1.5">{b.label}:</span>{b.content}
            </div>
          ))}
        </div>
      )}

      <div className={`font-serif leading-relaxed ${isAi ? 'text-gray-700 dark:text-gray-300 items-start' : 'text-gray-500 dark:text-gray-500 tracking-wide items-end'} flex flex-col gap-2`} style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>
        {finalLayoutSegments.map((part, i) => {
          // 如果是提取出的组件块
          if (part.id?.startsWith(':::ECHO_BLOCK_')) {
            if (part.type === 'html') return <HtmlRenderer key={i} html={part.content} i={i} shouldRender={shouldRenderIframe} charData={charData} />;
            if (part.type === 'status' || part.type === 'card') return <StatusBar key={i} type={part.content} content={part.content} metadata={part.metadata} />;
            if (part.type === 'tasks') return (
              <div key={i} className="bg-white/30 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl p-4 text-left shadow-sm w-full">
                <div className="text-[9px] tracking-[0.2em] uppercase text-gray-400 mb-3 opacity-60 font-mono italic">Registry // Active Objectives</div>
                <div className="space-y-2">{part.content.split('\n').filter((l:any)=>l.trim()).map((line: string, li: number) => (
                  <div key={li} className="flex items-start gap-3 text-xs text-gray-600 dark:text-gray-400 font-serif">
                    <div className="mt-1.5 w-1 h-1 rounded-full bg-blue-400/40 shrink-0" /><span className="leading-relaxed">{line.trim()}</span>
                  </div>
                ))}</div>
              </div>
            );
            if (part.type === 'thought-box') return (
              <div key={i} className="bg-purple-500/5 border-l border-purple-500/20 px-5 py-3 my-2 text-left italic rounded-r-xl w-full">
                <div className="text-[8px] uppercase tracking-[0.3em] text-purple-400/50 mb-2 font-mono">Cognitive Reflection // 意识碎片</div>
                <div className="text-[13px] text-purple-800/70 dark:text-purple-300/60 font-serif leading-relaxed">{part.content}</div>
              </div>
            );
          }

          // 如果是普通的 md-html
          if (part.type === 'md-html') {
            return <div key={i} className="md-body w-full text-left leading-relaxed py-1" dangerouslySetInnerHTML={{ __html: part.content }} />;
          }

          // 基础文字类型
          switch (part.type) {
            case 'narration': return <span key={i} className="opacity-90 whitespace-pre-wrap block w-full text-center py-2 font-sans" style={{ fontSize: '0.75em', color: 'var(--dialogue-text-narration)' }}>{part.content}</span>;
            case 'dialogue': return <span key={i} className={`whitespace-pre-wrap drop-shadow-sm ${isAi ? 'text-left' : 'text-right'}`} style={{ color: 'var(--dialogue-text-dialogue)' }}>{part.content}</span>;
            case 'thought': return <span key={i} className={`opacity-80 italic block mb-1 whitespace-pre-wrap font-serif ${isAi ? 'text-left' : 'text-right'}`} style={{ fontSize: '0.75em', color: 'var(--dialogue-text-thought)' }}>({part.content})</span>;
            case 'action': return <span key={i} className="italic whitespace-pre-wrap block w-full text-center py-2 font-serif" style={{ fontSize: '0.75em', color: 'var(--dialogue-text-action)' }}>{part.content}</span>;
            default: return <span key={i} className={isAi ? 'text-left' : 'text-right'}>{part.content}</span>;
          }
        })}
      </div>

      {statusCards.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {statusCards.map((b, i) => {
            if (b.type === 'html') return <HtmlRenderer key={i} html={b.content} i={i} shouldRender={shouldRenderIframe} charData={charData} />;
            if (b.type === 'status' || b.type === 'card') return <StatusBar key={i} type={b.content} content={b.content} metadata={b.metadata} />;
            return null;
          })}
        </div>
      )}
    </>
  );
});

export default MessageContent;
