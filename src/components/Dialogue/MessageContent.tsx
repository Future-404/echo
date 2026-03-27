import React, { useState, useEffect } from 'react'
import { parseStreamingNovelText } from '../../utils/novelParser'
import { StatusBar } from '../StatusBars'
import { useAppStore } from '../../store/useAppStore'
import { applyCharacterRegexScripts } from '../../utils/tagParser'

interface MessageContentProps {
  content: string;
  isAi: boolean;
  segmentIndex?: number;
  isGreeting?: boolean;
  isLatest?: boolean;
}

const MessageContent: React.FC<MessageContentProps> = ({ content, isAi, segmentIndex, isGreeting = false, isLatest = false }) => {
  const config = useAppStore(s => s.config);
  const selectedCharacter = useAppStore(s => s.selectedCharacter);
  const [expandedThinking, setExpandedThinking] = useState(false);

  // 渲染层正则（placement 包含 2）
  const rendered = isAi ? applyCharacterRegexScripts(content, selectedCharacter, 2) : content;
  const trimmed = rendered.trim();
  
  // 提取 <thinking> 标签
  const thinkingMatch = trimmed.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  const thinkingContent = thinkingMatch ? thinkingMatch[1].trim() : null;
  let contentWithoutThinking = thinkingContent 
    ? trimmed.replace(/<thinking>[\s\S]*?<\/thinking>/i, '').trim() 
    : trimmed;

  // 提取 ```html 代码块（ST 状态栏常用此格式）
  const htmlCodeBlocks: string[] = [];
  contentWithoutThinking = contentWithoutThinking.replace(/```html\s*([\s\S]*?)```/gi, (_, inner) => {
    htmlCodeBlocks.push(inner.trim());
    return '';
  }).trim();
  
  // 栈式提取顶层 HTML 块（正确处理嵌套标签）
  const extractedHtmlBlocks: string[] = [];
  const extractTopLevelHtmlBlocks = (text: string): string => {
    // void elements 没有闭合标签，跳过
    const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    const openRe = /<([A-Za-z][A-Za-z0-9-]*)(\s[^>]*)?>/g;
    const closeRe = /<\/([A-Za-z][A-Za-z0-9-]*)>/g;
    // 收集所有标签位置
    type TagPos = { type: 'open' | 'close'; name: string; start: number; end: number };
    const tags: TagPos[] = [];
    let m: RegExpExecArray | null;
    openRe.lastIndex = 0;
    while ((m = openRe.exec(text)) !== null) {
      if (text[m.index + m[0].length - 2] === '/') continue;
      if (voidTags.has(m[1].toLowerCase())) continue;
      tags.push({ type: 'open', name: m[1].toLowerCase(), start: m.index, end: m.index + m[0].length });
    }
    closeRe.lastIndex = 0;
    while ((m = closeRe.exec(text)) !== null) {
      tags.push({ type: 'close', name: m[1].toLowerCase(), start: m.index, end: m.index + m[0].length });
    }
    tags.sort((a, b) => a.start - b.start);

    const blocks: { start: number; end: number }[] = [];
    const stack: { name: string; start: number }[] = [];
    for (const tag of tags) {
      if (tag.type === 'open') {
        stack.push({ name: tag.name, start: tag.start });
      } else {
        // 找栈中最近匹配的开标签
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].name === tag.name) {
            const blockStart = stack[i].start;
            stack.splice(i, 1);
            // 只收集顶层（栈空时）
            if (stack.length === 0) {
              blocks.push({ start: blockStart, end: tag.end });
            }
            break;
          }
        }
      }
    }

    if (blocks.length === 0) return text;

    let result = '';
    let cursor = 0;
    for (const b of blocks) {
      result += text.slice(cursor, b.start);
      extractedHtmlBlocks.push(text.slice(b.start, b.end));
      cursor = b.end;
    }
    result += text.slice(cursor);
    return result;
  };
  contentWithoutThinking = extractTopLevelHtmlBlocks(contentWithoutThinking).trim();
  
  // 清理残留空代码块和孤立标签
  contentWithoutThinking = contentWithoutThinking
    .replace(/```\w*\s*```/g, '')
    .replace(/---\s*```\w*\s*```/g, '')
    .replace(/---\s+---/g, '')
    .replace(/<\/?[A-Za-z][A-Za-z0-9-]*(\s[^>]*)?>/g, '')
    .trim();
  
  // 檢測是否為單層包裹標籤（如 <snow>...</snow>）
  const wrapperMatch = contentWithoutThinking.match(/^<(\w+)(?:\s[^>]*)?>[\s\S]*<\/\1>$/);
  
  if (wrapperMatch) {
    const tagName = wrapperMatch[1].toLowerCase();
    const wrapperTags = ['snow', 'message', 'response'];
    
    if (wrapperTags.includes(tagName)) {
      const innerContent = contentWithoutThinking.replace(new RegExp(`^<${tagName}(?:\\s[^>]*)?>|</${tagName}>$`, 'gi'), '').trim();
      return (
        <>
          {thinkingContent && (
            <details className="mb-2 text-xs opacity-60 cursor-pointer" open={expandedThinking} onClick={(e) => { e.preventDefault(); setExpandedThinking(!expandedThinking); }}>
              <summary className="font-mono text-gray-500 dark:text-gray-400 select-none">💭 思考中...</summary>
              <div className="mt-1 pl-4 border-l-2 border-gray-300 dark:border-gray-600 whitespace-pre-wrap font-mono text-gray-600 dark:text-gray-400">
                {thinkingContent}
              </div>
            </details>
          )}
          <MessageContent content={innerContent} isAi={isAi} segmentIndex={segmentIndex} isGreeting={false} isLatest={isLatest} />
          {extractedHtmlBlocks.length > 0 && (
            <div className="mt-2 space-y-2">
              {extractedHtmlBlocks.map((html, i) => (
                <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
              ))}
            </div>
          )}
          {htmlCodeBlocks.length > 0 && (
            <div className="mt-2 space-y-2">
              {htmlCodeBlocks.map((html, i) => (
                <div key={`code-${i}`} dangerouslySetInnerHTML={{ __html: html }} />
              ))}
            </div>
          )}
        </>
      );
    }
  }
  
  // 现在 contentWithoutThinking 已经移除了所有 HTML 块，直接解析对话
  const parts = parseStreamingNovelText(contentWithoutThinking, {
    dialogueQuotes: config.dialogueQuotes,
    actionMarkers: config.actionMarkers,
    thoughtMarkers: config.thoughtMarkers,
  });
  
  const renderParts = (segmentIndex !== undefined && segmentIndex < parts.length) 
    ? [parts[segmentIndex]] 
    : parts;

  return (
    <>
      {thinkingContent && (
        <details className="mb-2 text-xs opacity-60 cursor-pointer" open={expandedThinking} onClick={(e) => { e.preventDefault(); setExpandedThinking(!expandedThinking); }}>
          <summary className="font-mono text-gray-500 dark:text-gray-400 select-none">💭 思考中...</summary>
          <div className="mt-1 pl-4 border-l-2 border-gray-300 dark:border-gray-600 whitespace-pre-wrap font-mono text-gray-600 dark:text-gray-400">
            {thinkingContent}
          </div>
        </details>
      )}
      <div className={`font-serif leading-relaxed ${isAi ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500 tracking-wide text-right'} flex flex-col gap-2`} style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>
        {renderParts.map((part) => {
          switch (part.type) {
            case 'narration':
              return <span key={part.id} className="opacity-90 whitespace-pre-wrap block w-full text-center py-2 font-sans" style={{ fontSize: '0.8em', color: 'var(--dialogue-text-narration)' }}>{part.content}</span>;
            case 'dialogue':
              return (
                <span key={part.id} className="font-bold whitespace-pre-wrap drop-shadow-sm" style={{ color: 'var(--dialogue-text-dialogue)' }}>
                  "{part.content}"
                </span>
              );
            case 'thought':
              return <span key={part.id} className="opacity-80 italic block mb-1 whitespace-pre-wrap font-serif" style={{ fontSize: '0.85em', color: 'var(--dialogue-text-thought)' }}>({part.content})</span>;
            case 'action':
              return <span key={part.id} className="italic whitespace-pre-wrap block w-full text-center py-2 font-serif" style={{ fontSize: '0.85em', color: 'var(--dialogue-text-action)' }}>{part.content}</span>;
            case 'card':
              return <StatusBar key={part.id} type={part.content} content={part.content} metadata={part.metadata} />;
            default:
              return <span key={part.id}>{part.content}</span>;
          }
        })}
      </div>
      {extractedHtmlBlocks.length > 0 && (
        <div className="mt-2 space-y-2">
          {extractedHtmlBlocks.map((html, i) => (
            <div key={i} dangerouslySetInnerHTML={{ __html: html }} />
          ))}
        </div>
      )}
      {htmlCodeBlocks.length > 0 && (
        <div className="mt-2 space-y-2">
          {htmlCodeBlocks.map((html, i) => (
            <div key={`code-${i}`} dangerouslySetInnerHTML={{ __html: html }} />
          ))}
        </div>
      )}
    </>
  );
};

export default MessageContent;
