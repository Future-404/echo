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
  const setLastExtractedHtml = useAppStore(s => s.setLastExtractedHtml);
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
  
  // 提取所有 HTML/XML 块（div, details, section, article, Phone 等自定义标签）
  const htmlBlockRegex = /<(div|details|section|article|StatusBlock|Phone)[\s\S]*?<\/\1>/gi;
  const extractedHtmlBlocks: string[] = [];
  contentWithoutThinking = contentWithoutThinking.replace(htmlBlockRegex, (match) => {
    extractedHtmlBlocks.push(match);
    return '';
  }).trim();
  
  // 清理残留的空代码块标记
  contentWithoutThinking = contentWithoutThinking
    .replace(/```\w*\s*```/g, '')  // 移除空代码块
    .replace(/---\s*```\w*\s*```/g, '')  // 移除带分隔符的空代码块
    .replace(/---\s+---/g, '')  // 移除连续分隔符
    .trim();
  
  // 如果是最新的 AI 消息，存储提取的 HTML
  useEffect(() => {
    if (isLatest && isAi && extractedHtmlBlocks.length > 0) {
      setLastExtractedHtml(extractedHtmlBlocks.join('\n'));
    } else if (isLatest && isAi) {
      setLastExtractedHtml(null);
    }
  }, [isLatest, isAi, extractedHtmlBlocks.length]);
  
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
