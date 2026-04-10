import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, CircleDot, CheckCircle2, XCircle } from 'lucide-react'
import type { Mission } from '../store/useAppStore'

interface MissionPanelProps {
  missions: Mission[];
  isQuestSkillEnabled: boolean;
  isMobile?: boolean;
}

export const MissionPanel: React.FC<MissionPanelProps> = ({ missions, isQuestSkillEnabled, isMobile = false }) => {
  const [isMissionsExpanded, setIsMissionsExpanded] = useState(false);
  const [showDescriptionId, setShowDescriptionId] = useState<string | null>(null);

  if (!isQuestSkillEnabled) return null;

  const mainMission = missions?.find(m => m.type === 'MAIN');
  const sideMissions = missions?.filter(m => m.type === 'SIDE') || [];

  if (!mainMission && sideMissions.length === 0) return null;

  return (
    <div className={`flex flex-col ${isMobile ? 'px-4 py-2' : 'px-6 md:px-8 py-2'} border-b border-white/5`}>
      <div className={`flex justify-between items-center w-full group ${isMobile ? 'min-h-[44px]' : ''} cursor-pointer`} onClick={() => mainMission && setShowDescriptionId(showDescriptionId === mainMission.id ? null : mainMission.id)}>
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-4">
          {mainMission ? (
            <>
              <span className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} tracking-widest text-blue-400 font-mono uppercase flex-shrink-0`}>
                Main
              </span>
              <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-serif text-echo-text-primary ${isMobile ? 'line-clamp-1' : 'truncate'} font-medium`}>
                {mainMission.title}
              </span>
            </>
          ) : (
            <span className={`${isMobile ? 'text-xs' : 'text-[10px]'} font-serif text-gray-500 italic opacity-60`}>No Active Mission</span>
          )}
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          {mainMission && (
            <div className={`${isMobile ? 'w-16' : 'w-12 md:w-20'} h-0.5 bg-white/10 rounded-full overflow-hidden`}>
              <motion.div 
                className="h-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.4)]" 
                initial={{ width: 0 }}
                animate={{ width: `${mainMission.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          )}
          {sideMissions.length > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMissionsExpanded(!isMissionsExpanded); }}
              className={`text-gray-500 hover:text-blue-500 active:scale-95 transition-all flex items-center gap-1 ${isMobile ? 'min-w-[44px] min-h-[44px] -my-2 px-2' : ''} touch-manipulation`}
            >
              <span className={`${isMobile ? 'text-[10px]' : 'text-[9px]'} font-mono opacity-50 uppercase tracking-tighter`}>Side ({sideMissions.length})</span>
              {isMissionsExpanded ? <ChevronUp size={isMobile ? 14 : 12} /> : <ChevronDown size={isMobile ? 14 : 12} />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDescriptionId === mainMission?.id && mainMission?.description && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className={`${isMobile ? 'text-xs' : 'text-[10px]'} font-serif text-echo-text-muted mt-1 mb-1 leading-normal border-l border-blue-500/20 pl-2 italic`}>
              {mainMission.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMissionsExpanded && sideMissions.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 pt-3 pb-1">
              {sideMissions.map(mission => (
                <div key={mission.id} className="flex flex-col gap-1 group/side">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowDescriptionId(showDescriptionId === mission.id ? null : mission.id)}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1 mr-4">
                      {mission.status === 'COMPLETED' ? <CheckCircle2 size={isMobile ? 12 : 10} className="text-green-500 flex-shrink-0" /> :
                       mission.status === 'FAILED' ? <XCircle size={isMobile ? 12 : 10} className="text-red-500 flex-shrink-0" /> :
                       <CircleDot size={isMobile ? 12 : 10} className="text-gray-600 flex-shrink-0" />}
                      <span className={`${isMobile ? 'text-sm' : 'text-xs'} font-serif ${isMobile ? 'line-clamp-1' : 'truncate'} transition-colors ${
                        mission.status === 'COMPLETED' ? 'text-green-600 font-medium' :
                        mission.status === 'FAILED' ? 'text-red-600 line-through' :
                        'text-gray-700 dark:text-gray-400 group-hover/side:text-black dark:group-hover/side:text-gray-200'
                      }`}>
                        {mission.title}
                      </span>
                    </div>
                    {mission.status === 'ACTIVE' && (
                      <span className={`${isMobile ? 'text-xs' : 'text-[10px]'} font-mono text-gray-700 dark:text-gray-500 flex-shrink-0 font-bold`}>{mission.progress}%</span>
                    )}
                  </div>
                  <AnimatePresence>
                    {showDescriptionId === mission.id && mission.description && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className={`${isMobile ? 'text-xs' : 'text-[10px]'} font-serif text-gray-500/80 dark:text-gray-500 mt-1 mb-2 leading-relaxed border-l border-gray-300 dark:border-gray-700 pl-3 italic`}>
                          {mission.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
