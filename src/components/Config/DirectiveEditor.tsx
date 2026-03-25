import React from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'

interface DirectiveEditorProps {
  id: string
  onClose: () => void
}

const DirectiveEditor: React.FC<DirectiveEditorProps> = ({ id, onClose }) => {
  const { config, updateDirective, removeDirective } = useAppStore()
  const directive = config?.directives?.find(d => d.id === id)

  if (!directive) return null

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: 10 }} 
      className="p-8 h-full flex flex-col space-y-8"
    >
      <div className="group">
        <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase mb-3 block italic underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Directive Title</label>
        <input 
          type="text" 
          value={directive.title} 
          onChange={(e) => updateDirective(id, { title: e.target.value })} 
          className="w-full bg-transparent border-b-0.5 border-gray-200 dark:border-gray-800 py-2 text-sm text-gray-600 dark:text-gray-300 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors" 
        />
      </div>
      <div className="flex-1 flex flex-col min-h-[300px]">
        <label className="text-[9px] tracking-wide text-gray-300 dark:text-gray-600 uppercase mb-3 block italic">Instruction Content</label>
        <textarea 
          value={directive.content} 
          onChange={(e) => updateDirective(id, { content: e.target.value })} 
          placeholder="Enter behavioral guidelines..." 
          className="flex-1 bg-white/30 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800 rounded-3xl p-6 text-sm text-gray-500 dark:text-gray-400 font-serif leading-relaxed focus:outline-none focus:border-gray-300 dark:focus:border-gray-600 transition-colors resize-none no-scrollbar shadow-inner" 
        />
      </div>
      <div className="flex gap-4">
        <button 
          onClick={() => { removeDirective(id); onClose(); }} 
          className="flex-1 py-4 border-0.5 border-red-100 dark:border-red-900/30 text-red-300 dark:text-red-900/50 rounded-full text-[10px] tracking-widest uppercase hover:bg-red-50 dark:hover:bg-red-900/10 transition-all"
        >
          Remove
        </button>
        <button 
          onClick={onClose} 
          className="flex-[2] py-4 border-0.5 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 rounded-full text-[10px] tracking-widest uppercase hover:bg-white dark:hover:bg-gray-900 transition-all shadow-sm"
        >
          Done // Sync
        </button>
      </div>
    </motion.div>
  )
}

export default DirectiveEditor
