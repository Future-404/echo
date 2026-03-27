import React from 'react'
import { parseStreamingNovelText } from '../../utils/novelParser'
import { StatusBar } from '../StatusBars'
import { useAppStore } from '../../store/useAppStore'

interface MessageContentProps {
  content: string;
  isAi: boolean;
  segmentIndex?: number;
  isGreeting?: boolean; // 是否為開場白
}

const MessageContent: React.FC<MessageContentProps> = ({ content, isAi, segmentIndex, isGreeting = false }) => {
  const config = useAppStore(s => s.config);
  
  const trimmed = content.trim();
  
  // 檢測是否為單層包裹標籤（如 <snow>...</snow>）
  const wrapperMatch = trimmed.match(/^<(\w+)(?:\s[^>]*)?>[\s\S]*<\/\1>$/);
  
  if (wrapperMatch) {
    const tagName = wrapperMatch[1].toLowerCase();
    const wrapperTags = ['snow', 'message', 'response']; // 需要剝離的包裹標籤
    
    if (wrapperTags.includes(tagName)) {
      // 提取內部內容，遞歸解析
      const innerContent = trimmed.replace(new RegExp(`^<${tagName}(?:\\s[^>]*)?>|</${tagName}>$`, 'gi'), '').trim();
      return <MessageContent content={innerContent} isAi={isAi} segmentIndex={segmentIndex} isGreeting={false} />;
    }
  }
  
  // 判斷是否為複雜 HTML 結構（包含多個頂層標籤或 <div>/<details> 等）
  const hasComplexHtml = /<(div|details|section|article|StatusBlock)/i.test(trimmed);
  
  if (hasComplexHtml) {
    return (
      <div 
        className={`font-serif leading-relaxed ${isAi ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}`}
        style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }
  
  // 否則解析對話/動作/心理/Markdown 狀態欄
  const parts = parseStreamingNovelText(content, {
    dialogueQuotes: config.dialogueQuotes,
    actionMarkers: config.actionMarkers,
    thoughtMarkers: config.thoughtMarkers,
  });
  
  const renderParts = (segmentIndex !== undefined && segmentIndex < parts.length) 
    ? [parts[segmentIndex]] 
    : parts;

  return (
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
            // Markdown 狀態欄：交給 StatusBar 系統
            return <StatusBar key={part.id} type={part.content} content={part.content} metadata={part.metadata} />;
          default:
            return <span key={part.id}>{part.content}</span>;
        }
      })}
    </div>
  );
};

export default MessageContent;
