import React from 'react';
import { motion } from 'framer-motion';

interface StatProgressBarProps {
  label: string;
  value: string | number;
  max?: number;
  color?: string;
  icon?: React.ReactNode;
  showText?: boolean;
}

export const StatProgressBar: React.FC<StatProgressBarProps> = ({ 
  label, value, max = 100, color = '#3b82f6', icon, showText = true 
}) => {
  // 支持 "80/100"、"80%"、"80" 三种格式
  const raw = String(value);
  const fractionMatch = raw.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  const numValue = fractionMatch ? parseFloat(fractionMatch[1]) : parseFloat(raw);
  const effectiveMax = fractionMatch ? parseFloat(fractionMatch[2]) : max;
  const percentage = isNaN(numValue) ? 0 : Math.min(100, Math.max(0, (numValue / effectiveMax) * 100));
  const displayText = fractionMatch ? raw : `${isNaN(numValue) ? 0 : numValue}%`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center text-[10px] uppercase tracking-wider">
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
          {icon}
          <span>{label}</span>
        </div>
        {showText && (
          <span className="font-mono font-bold text-xs" style={{ color }}>
            {displayText}
          </span>
        )}
      </div>
      <div className="h-1.5 w-full bg-gray-300/50 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }} 
          animate={{ width: `${isNaN(percentage) ? 0 : percentage}%` }} 
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};
