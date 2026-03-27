import React from 'react'
import { motion } from 'framer-motion'
import { Plus, Edit3, Trash2, Check } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { Provider } from '../../store/useAppStore'

interface ProviderManagerProps {
  onEdit: (id: string) => void
  onAdd: () => void
}

const ProviderManager: React.FC<ProviderManagerProps> = ({ onEdit, onAdd }) => {
  const { config, setActiveProvider, removeProvider } = useAppStore()
  const providers = config?.providers || []

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="p-6 space-y-6"
    >
      <div className="flex justify-between items-center px-4">
        <div className="flex flex-col">
            <label className="text-xs font-serif tracking-widest text-gray-500 dark:text-gray-400 font-medium">LLM API 参数</label>
            <span className="text-[7px] text-gray-300 dark:text-gray-600 uppercase tracking-[0.2em] mt-0.5">API Gateway</span>
        </div>
        <div className="flex gap-2">
          <button onClick={onAdd} className="text-gray-400 hover:text-gray-600 transition-colors">
            <Plus size={16} strokeWidth={1} />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {providers.map(p => (
          <div 
            key={p.id} 
            className={`w-full p-5 rounded-3xl border-0.5 transition-all flex items-center gap-4 ${config.activeProviderId === p.id ? 'border-gray-400 dark:border-gray-500 bg-white/60 dark:bg-white/10' : 'border-gray-100 dark:border-gray-800 bg-white/20 dark:bg-white/5 hover:border-gray-200'}`}
          >
            <div onClick={() => setActiveProvider(p.id)} className="flex-1 cursor-pointer">
              <h4 className="text-sm font-serif text-gray-600 dark:text-gray-200 tracking-wide flex items-center gap-2">
                {p.name}
                {config.activeProviderId === p.id && <Check size={10} className="text-green-400" />}
              </h4>
              <p className="text-[8px] text-gray-300 dark:text-gray-500 uppercase mt-1 tracking-widest">
                {p.model || '未设定模型'} // ACTIVE NODE
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(p.id)} className="text-gray-300 dark:text-gray-600 hover:text-gray-500 transition-colors">
                <Edit3 size={14} strokeWidth={1} />
              </button>
              {providers.length > 1 && (
                <button onClick={() => removeProvider(p.id)} className="text-gray-200 dark:text-gray-800 hover:text-red-300">
                  <Trash2 size={14} strokeWidth={1} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default ProviderManager
