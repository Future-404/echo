import React, { useMemo } from 'react';
import { Database } from 'lucide-react';
import type { StatusBarProps } from '../types';

export const LegacyCSVBar: React.FC<StatusBarProps> = ({ type, metadata }) => {
  const values = useMemo(() => {
    if (Array.isArray(metadata)) return metadata;
    if (typeof metadata === 'object' && metadata?.rawBody) {
      return metadata.rawBody.split('|').map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  }, [metadata]);

  return (
    <div className="inline-flex items-center gap-3 bg-echo-surface border border-echo-border-md rounded-xl px-4 py-2 my-1 shadow-sm">
      <div className="w-6 h-6 rounded-lg bg-white dark:bg-black/20 flex items-center justify-center">
        <Database size={12} className="text-orange-400" />
      </div>
      <div className="flex flex-col">
        <span className="text-[8px] uppercase tracking-widest text-gray-400 font-bold">{type}</span>
        <div className="flex gap-2">
          {values.map((v, i) => (
            <span key={i} className="text-[10px] text-echo-text-base font-serif">
              {v}{i < values.length - 1 && <span className="mx-1 opacity-30">|</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
