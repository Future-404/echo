import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { HtmlGreeting } from './HtmlGreeting';

export const HtmlGreetingOverlay: React.FC = () => {
  const { messages, setIsGreetingSession } = useAppStore();
  const [hasDismissedHtml, setHasDismissedHtml] = React.useState(false);
  
  const firstMessage = messages[0];
  const isHtmlGreeting = React.useMemo(() => {
    if (!firstMessage || firstMessage.role !== 'assistant') return false;
    const content = firstMessage.content?.trim() || '';
    if (!content) return false;
    return content.toLowerCase().includes('<!doctype html') || 
           content.toLowerCase().startsWith('<html') ||
           (content.length > 500 && content.includes('<div') && content.includes('</div>'));
  }, [firstMessage]);

  if (!hasDismissedHtml && isHtmlGreeting && messages.length === 1) {
    return (
      <HtmlGreeting 
        content={firstMessage.content} 
        onEnter={() => {
          setHasDismissedHtml(true);
          setIsGreetingSession(false);
        }} 
      />
    );
  }

  return null;
};
