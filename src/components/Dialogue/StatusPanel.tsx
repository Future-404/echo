import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Star, Zap, CircleDot, Target, BookOpen, Calendar } from 'lucide-react'
import { StatProgressBar } from '../StatusBars/common/StatProgressBar'
import { replaceMacros } from '../../logic/promptEngine'
import type { CharacterCard } from '../../store/useAppStore'

interface StatusPanelProps {
  character: CharacterCard;
  userName: string;
  isExpanded: boolean;
  isMobile?: boolean;
}

const COLOR_VAR_MAP: Record<string, string> = {
  love: 'var(--stat-color-love, #f43f5e)',
  hate: 'var(--stat-color-hate, #9333ea)',
  value: 'var(--stat-color-value, #fbbf24)',
  hp: 'var(--stat-color-hp, #ef4444)',
  mana: 'var(--stat-color-mana, #3b82f6)',
  favor: 'var(--stat-color-favor, #fb7185)',
};

const getStatConfig = (key: string) => {
  const k = key.toLowerCase();
  const mapping: Record<string, { label: string; icon: any; color: string }> = {
    love: { label: '爱意', icon: <Heart size={10} />, color: COLOR_VAR_MAP.love },
    hate: { label: '恨意', icon: <Zap size={10} />, color: COLOR_VAR_MAP.hate },
    value: { label: '满意', icon: <Star size={10} />, color: COLOR_VAR_MAP.value },
    hp: { label: '健康', icon: <Heart size={10} />, color: COLOR_VAR_MAP.hp },
    mana: { label: '灵感', icon: <Zap size={10} />, color: COLOR_VAR_MAP.mana },
    favor: { label: '好感', icon: <Heart size={10} />, color: COLOR_VAR_MAP.favor },
  };
  return mapping[k] || { label: key, icon: <CircleDot size={10} />, color: 'var(--stat-color-default, #94a3b8)' };
};

export const StatusPanel: React.FC<StatusPanelProps> = ({ character, userName, isExpanded, isMobile = false }) => {
  const attributes = character.attributes || {};
  const autoStats = Object.entries(attributes)
    .filter(([_, v]) => !isNaN(parseFloat(v as string)) && String(v).length < 10)
    .slice(0, 6);

  if (!isExpanded || Object.keys(attributes).length === 0) return null;

  const ignoreKeys = ['name', 'role', 'rank', 'value', 'efficiency', 'date', 'days', 'time', 'weather', '星期', '日期', '时间', '天气', ...autoStats.map(s => s[0])];
  const thoughtLikeKeys = ['thought', 'inner_thought', '心声', '内心', '想法'];
  const charName = character.name;

  const thoughtKey = Object.keys(attributes).find(k => thoughtLikeKeys.includes(k));
  const thoughtValue = thoughtKey ? attributes[thoughtKey] : null;

  const customAttrs = Object.entries(attributes).filter(([k, v]) => 
    !ignoreKeys.includes(k) && !thoughtLikeKeys.includes(k) && typeof v === 'string' && v.trim() !== ''
  );

  const getDisplayLabel = (k: string, v: string) => {
    const isParam = /^param\d+$/i.test(k) || /^slot\d+$/i.test(k);
    if (isParam) return null;

    const translatedV = replaceMacros(v, userName, charName);
    const hasEmbeddedLabel = /^[\u4e00-\u9fa5a-zA-Z0-9_]{2,15}[:：]/.test(translatedV);
    const isGenericSTKey = ['todo', 'diary', 'date', 'days', 'reason', 'status', 'description'].includes(k);
    
    if (isGenericSTKey && hasEmbeddedLabel) return null;

    const translation: Record<string, string> = {
      todo: '目标', diary: '备忘', date: '日期', days: '时间', reason: '状态'
    };

    return translation[k] || k;
  };

  const getIcon = (k: string) => {
    if (k === 'todo') return <Target size={12} className="text-emerald-700 dark:text-emerald-400 mt-0.5 flex-shrink-0" />;
    if (k === 'diary') return <BookOpen size={12} className="text-blue-700 dark:text-blue-400 mt-0.5 flex-shrink-0" />;
    if (['date', 'days'].includes(k)) return <Calendar size={12} className="text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />;
    return <CircleDot size={10} className="text-gray-500 dark:text-gray-400 mt-1 flex-shrink-0" />;
  };

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden border-b border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5"
    >
      <div className={`flex flex-col ${isMobile ? 'px-4 py-2.5' : 'px-6 md:px-8 py-3'} gap-3 overflow-y-auto no-scrollbar`} style={{ WebkitOverflowScrolling: 'touch', maxHeight: isMobile ? '30vh' : '25vh' }}>
        <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-black text-gray-900 dark:text-gray-100 tracking-[0.1em] uppercase`}>{attributes.name || character.name}</span>
            <span className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} text-gray-500 dark:text-gray-400 uppercase tracking-widest italic`}>{attributes.role || 'Observer'}</span>
          </div>
          <div className="flex items-center gap-2">
            {attributes.rank && (
              <div className={`px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 ${isMobile ? 'text-[10px]' : 'text-[9px]'} font-mono font-bold`}>
                LV.{attributes.rank}
              </div>
            )}
          </div>
        </div>

        <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2'}`}>
          {autoStats.map(([key, value]) => {
            const config = getStatConfig(key);
            return (
              <div key={key} className={isMobile ? '' : 'scale-90 origin-left'}>
                <StatProgressBar 
                  label={config.label} 
                  value={parseFloat(value as string)} 
                  icon={config.icon} 
                  color={config.color} 
                />
              </div>
            );
          })}
        </div>

        {thoughtValue && (
          <p className={`${isMobile ? 'text-xs' : 'text-[11px]'} text-gray-700 dark:text-gray-300 italic leading-relaxed pt-3 border-t border-black/10 dark:border-white/10`}>
            " {replaceMacros(thoughtValue as string, userName, charName)} "
          </p>
        )}
        
        {customAttrs.length > 0 && (
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-x-4 gap-y-1.5'} pt-3 border-t border-black/10 dark:border-white/10`}>
            {customAttrs.map(([k, v]) => {
              const label = getDisplayLabel(k, v as string);
              return (
                <div key={k} className="flex items-start gap-1.5 overflow-hidden">
                  {getIcon(k)}
                  <span className={`${isMobile ? 'text-xs' : 'text-[11px]'} text-gray-700 dark:text-gray-300 leading-tight font-serif ${isMobile ? 'break-words' : 'truncate'}`}>
                    {label && <span className="font-bold opacity-70 mr-1">{replaceMacros(label, userName, charName)}:</span>}
                    {replaceMacros(v as string, userName, charName)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};
