import React from 'react';
import { Database } from 'lucide-react';
import type { StatusBarProps } from '../types';

export const LegacyCSVBar: React.FC<StatusBarProps> = ({ type, metadata }) => {
  const values = Array.isArray(metadata) ? metadata : [];

  return (
    <div className="inline-flex items-center gap-3 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-4 py-2 my-1 shadow-sm">
      <div className="w-6 h-6 rounded-lg bg-white dark:bg-black/20 flex items-center justify-center">
        <Database size={12} className="text-orange-400" />
      </div>
      <div className="flex flex-col">
        <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold">{type}</span>
        <div className="flex gap-2">
          {values.map((v, i) => (
            <span key={i} className="text-[10px] text-gray-600 dark:text-gray-300 font-serif">
              {v}{i < values.length - 1 && <span className="mx-1 opacity-30">|</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
