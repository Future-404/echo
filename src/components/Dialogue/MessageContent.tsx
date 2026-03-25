import React from 'react'
import { parseStreamingNovelText } from '../../utils/novelParser'
import { StatusBar } from '../StatusBars'

interface MessageContentProps {
  content: string;
  isAi: boolean;
  segmentIndex?: number; 
}

const MessageContent: React.FC<MessageContentProps> = ({ content, isAi, segmentIndex }) => {
  const parts = parseStreamingNovelText(content);
  
  // 如果指定了 index 并且不越界，则只截取那一个；否则全部渲染
  const renderParts = (segmentIndex !== undefined && segmentIndex < parts.length) 
    ? [parts[segmentIndex]] 
    : parts;

  return (
    <div className={`font-serif leading-relaxed text-base md:text-lg ${isAi ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500 tracking-wide text-right'} flex flex-col gap-2`}>
      {renderParts.map((part) => {
        switch (part.type) {
          case 'narration':
            return <span key={part.id} className="opacity-90 text-sm whitespace-pre-wrap block w-full text-center text-gray-500 dark:text-gray-500 py-2">{part.content}</span>;
          case 'dialogue':
            return (
              <span key={part.id} className="font-medium text-black dark:text-white whitespace-pre-wrap drop-shadow-sm">
                “{part.content}”
              </span>
            );
          case 'thought':
            return <span key={part.id} className="opacity-80 italic text-xs md:text-sm block mb-1 whitespace-pre-wrap text-gray-500 dark:text-gray-500">({part.content})</span>;
          case 'action':
            return <span key={part.id} className="text-sm text-gray-600 dark:text-gray-400 italic whitespace-pre-wrap block w-full text-center py-2">{part.content}</span>;
          case 'card': {
            const type = part.content;
            // 彻底隐藏逻辑类和复杂的 UI 标签，它们由全局顶部 UI 处理
            const logicTags = [
              'status', 'status-container', 'details', 'html', 'card', 
              'UpdateVariable', 'Analysis', '状态栏', 'characterCard'
            ];
            
            if (logicTags.includes(type) || part.metadata?.isTag) {
              return null; 
            }
            
            return <StatusBar key={part.id} type={type} content={part.content} metadata={part.metadata} />;
          }
          default:
            return <span key={part.id}>{part.content}</span>;
        }
      })}
    </div>
  );
};

export default MessageContent;
