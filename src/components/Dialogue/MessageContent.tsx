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
  
  const renderParts = (segmentIndex !== undefined && segmentIndex < parts.length) 
    ? [parts[segmentIndex]] 
    : parts;

  return (
    <div className={`font-serif leading-relaxed ${isAi ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500 tracking-wide text-right'} flex flex-col gap-2`} style={{ fontSize: 'var(--app-font-size, 1.125rem)' }}>
      {renderParts.map((part) => {
        switch (part.type) {
          case 'narration':
            return <span key={part.id} className="opacity-90 whitespace-pre-wrap block w-full text-center py-2" style={{ fontSize: '0.8em', color: 'var(--dialogue-text-narration)' }}>{part.content}</span>;
          case 'dialogue':
            return (
              <span key={part.id} className="font-medium whitespace-pre-wrap drop-shadow-sm" style={{ color: 'var(--dialogue-text-dialogue)' }}>
                "{part.content}"
              </span>
            );
          case 'thought':
            return <span key={part.id} className="opacity-80 italic block mb-1 whitespace-pre-wrap" style={{ fontSize: '0.85em', color: 'var(--dialogue-text-thought)' }}>({part.content})</span>;
          case 'action':
            return <span key={part.id} className="italic whitespace-pre-wrap block w-full text-center py-2" style={{ fontSize: '0.85em', color: 'var(--dialogue-text-action)' }}>{part.content}</span>;
          case 'card': {
            const type = part.content;
            const logicTags = [
              'status', 'status-container', 'details', 'html', 'card', 
              'UpdateVariable', 'Analysis', '状态栏', 'characterCard'
            ];
            if (logicTags.includes(type) || part.metadata?.isTag) return null; 
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
