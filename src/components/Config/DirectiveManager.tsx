import React from 'react'
import { motion, Reorder } from 'framer-motion'
import { Plus, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface DirectiveManagerProps {
  onEdit: (id: string) => void
  onAdd: () => void
}

const DirectiveManager: React.FC<DirectiveManagerProps> = ({ onEdit, onAdd }) => {
  const { config, updateDirective, reorderDirectives } = useAppStore()
  const directives = config?.directives || []

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="p-6 space-y-6"
    >
      <div className="flex justify-between items-center px-4">
        <div className="flex flex-col">
            <label className="text-xs font-serif tracking-widest text-gray-500 dark:text-gray-400 font-medium">Prompt 注入</label>
            <span className="text-[7px] text-gray-300 dark:text-gray-600 uppercase tracking-[0.2em] mt-0.5">Directives</span>
        </div>
        <button onClick={onAdd} className="text-gray-400 hover:text-gray-600 transition-colors">
          <Plus size={16} strokeWidth={1} />
        </button>
      </div>
      
      <Reorder.Group axis="y" values={directives} onReorder={reorderDirectives} className="space-y-3">
        {directives.map(d => (
          <Reorder.Item 
            key={d.id} 
            value={d} 
            className="w-full p-5 rounded-3xl border-0.5 bg-white/30 dark:bg-white/5 backdrop-blur-sm flex items-center gap-4 cursor-grab active:cursor-grabbing border-gray-100 dark:border-gray-800 hover:border-gray-200 shadow-sm"
          >
            <div className="text-gray-200 dark:text-gray-700">
              <GripVertical size={14} strokeWidth={1} />
            </div>
            <div onClick={() => onEdit(d.id)} className="flex-1 cursor-pointer">
              <h4 className={`text-sm font-serif tracking-wide transition-colors ${d.enabled ? 'text-gray-600 dark:text-gray-200' : 'text-gray-300 dark:text-gray-700 line-through'}`}>
                {d.title}
              </h4>
              <p className="text-[8px] text-gray-300 dark:text-gray-600 uppercase mt-1 truncate max-w-[150px] tracking-widest">
                {d.content || '未编写内容'}
              </p>
            </div>
            <button 
              onClick={() => updateDirective(d.id, { enabled: !d.enabled })} 
              className="text-gray-300 dark:text-gray-600 hover:text-gray-500 transition-colors"
            >
              {d.enabled ? <ToggleRight size={20} strokeWidth={1} className="text-green-300 dark:text-green-800" /> : <ToggleLeft size={20} strokeWidth={1} />}
            </button>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      <p className="text-[8px] text-gray-300 dark:text-gray-700 text-center uppercase tracking-[0.2em] opacity-50 font-sans">
        按住并拖拽调整优先级 // 顶部优先注入
      </p>
    </motion.div>
  )
}

export default DirectiveManager
