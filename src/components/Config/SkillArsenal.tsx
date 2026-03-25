import React from 'react'
import { motion } from 'framer-motion'
import { Zap, ToggleLeft, ToggleRight, Info } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { ALL_SKILLS } from '../../skills'

const SkillArsenal: React.FC = () => {
  const { config, toggleSkill } = useAppStore()
  const enabledSkillIds = config?.enabledSkillIds || []

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="p-6 space-y-6"
    >
      <div className="px-4 flex flex-col">
        <label className="text-xs font-serif tracking-widest text-gray-500 dark:text-gray-400 font-medium">核心能力库</label>
        <span className="text-[7px] text-gray-300 dark:text-gray-600 uppercase tracking-[0.2em] mt-0.5">Extensions</span>
      </div>
      
      <div className="space-y-3">
        {ALL_SKILLS.map(skill => {
          const isEnabled = enabledSkillIds.includes(skill.function.name)
          return (
            <div 
              key={skill.function.name} 
              className={`w-full p-5 rounded-3xl border-0.5 transition-all flex items-start gap-4 ${isEnabled ? 'border-gray-300 dark:border-gray-500 bg-white/60 dark:bg-white/10' : 'border-gray-100 dark:border-gray-800 bg-white/20 dark:bg-white/5 opacity-60'}`}
            >
              <div className="w-10 h-10 rounded-2xl border-0.5 border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0">
                <Zap size={16} strokeWidth={1} className={isEnabled ? 'text-gray-600 dark:text-gray-300' : 'text-gray-300 dark:text-gray-700'} />
              </div>
              
              <div className="flex-1">
                <h4 className={`text-sm font-serif tracking-wide ${isEnabled ? 'text-gray-600 dark:text-gray-200' : 'text-gray-400 dark:text-gray-600'}`}>
                  {skill.function.name.replace(/_/g, ' ').toUpperCase()}
                </h4>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 leading-relaxed mt-1 line-clamp-2">
                  {skill.function.description}
                </p>
              </div>

              <button 
                onClick={() => toggleSkill(skill.function.name)} 
                className="text-gray-300 dark:text-gray-600 hover:text-gray-500 transition-colors pt-1"
              >
                {isEnabled ? <ToggleRight size={20} strokeWidth={1} className="text-green-300 dark:text-green-800" /> : <ToggleLeft size={20} strokeWidth={1} />}
              </button>
            </div>
          )
        })}
      </div>

      <div className="px-6 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 flex gap-3 items-center">
        <Info size={12} className="text-gray-300 dark:text-gray-700" />
        <p className="text-[7px] text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] leading-normal">
          开启技能后，AI 将获得对话以外的特定操作权限 // 实时生效
        </p>
      </div>
    </motion.div>
  )
}

export default SkillArsenal
