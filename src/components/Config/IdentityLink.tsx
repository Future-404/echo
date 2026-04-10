import React from 'react'
import { ChevronRight } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

interface IdentityLinkProps {
  onClick: () => void
}

const IdentityLink: React.FC<IdentityLinkProps> = ({ onClick }) => {
  const { selectedCharacter } = useAppStore()

  return (
    <div className="space-y-4">
      <label className="text-[9px] tracking-widest text-echo-text-dim uppercase italic px-4 underline decoration-gray-100 dark:decoration-gray-800 underline-offset-8">Identifier</label>
      <div 
        onClick={onClick}
        className="w-full p-6 border-0.5 border-gray-200 dark:border-gray-800 rounded-3xl flex items-center gap-6 cursor-pointer hover:bg-white dark:hover:bg-white/5 transition-all group shadow-sm"
      >
        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center p-2">
          <img src={selectedCharacter.image} alt={selectedCharacter.name} className="w-full h-full object-contain grayscale" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-serif text-echo-text-base tracking-widest">{selectedCharacter.name}</h3>
          <p className="text-[8px] text-echo-text-subtle uppercase mt-1">Active Sync</p>
        </div>
        <ChevronRight size={16} strokeWidth={1} className="text-gray-400 dark:text-gray-700" />
      </div>
    </div>
  )
}

export default IdentityLink
