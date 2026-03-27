import React from 'react'
import { motion } from 'framer-motion'
import { useAppStore, type CharacterCard } from '../../store/useAppStore'

interface StatusPanelProps {
  character: CharacterCard;
  userName: string;
  isExpanded: boolean;
  isMobile?: boolean;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({ isExpanded, isMobile = false }) => {
  const lastExtractedHtml = useAppStore(s => s.lastExtractedHtml);

  if (!isExpanded || !lastExtractedHtml) return null;

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5"
    >
      <div className={`flex flex-col ${isMobile ? 'px-4 py-2.5' : 'px-6 md:px-8 py-3'} gap-3 overflow-y-auto no-scrollbar`} style={{ WebkitOverflowScrolling: 'touch', maxHeight: isMobile ? '30vh' : '25vh' }}>
        <div 
          className="font-serif leading-relaxed text-gray-700 dark:text-gray-300"
          style={{ fontSize: 'var(--app-font-size, 1rem)' }}
          dangerouslySetInnerHTML={{ __html: lastExtractedHtml }}
        />
      </div>
    </motion.div>
  );
};
