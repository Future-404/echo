import React from 'react'
import { motion } from 'framer-motion'
import { Check, X, Shield } from 'lucide-react'
import type { AgentRound } from '../../types/aiAssist'

interface ConfirmBarProps {
  round: AgentRound
  onAllow: () => void
  onReject: () => void
  onTrustMode: () => void
}

const fieldLabels: Record<string, string> = {
  name: '角色名', description: '描述', systemPrompt: '人設',
  scenario: '場景', greeting: '開場白', alternateGreetings: '備用開場白',
  postHistoryInstructions: '後置指令', worldBook: '私設世界書', attributes: '狀態屬性',
}

const opLabels: Record<string, string> = {
  set: '修改', append: '新增', update: '更新', delete: '刪除',
}

const ConfirmBar: React.FC<ConfirmBarProps> = ({ round, onAllow, onReject, onTrustMode }) => {
  // 彙總本輪 changes
  const summary = round.changes.reduce<Record<string, string[]>>((acc, c) => {
    const label = fieldLabels[c.field] || c.field
    const op = opLabels[c.op] || c.op
    ;(acc[label] ||= []).push(op)
    return acc
  }, {})

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-2xl border-0.5 border-blue-200 dark:border-blue-900/50 bg-blue-50/80 dark:bg-blue-950/30 p-4 space-y-3"
    >
      <div className="flex items-start gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0 animate-pulse" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-blue-500 dark:text-blue-400 uppercase tracking-widest font-mono mb-1">
            步驟 {round.round} · AI 代理
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300 font-serif leading-relaxed">
            {round.reasoning}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(summary).map(([field, ops]) => (
              <span key={field} className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                {field} · {ops.join('/')}
              </span>
            ))}
          </div>
          {round.next_intent && (
            <p className="text-[9px] text-gray-400 mt-2 italic">下一步：{round.next_intent}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onAllow}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 text-white text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-colors"
        >
          <Check size={11} /> 允許
        </button>
        <button
          onClick={onReject}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 text-[10px] uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
        >
          <X size={11} /> 拒絕
        </button>
        <button
          onClick={onTrustMode}
          className="ml-auto flex items-center gap-1.5 text-[9px] text-gray-400 hover:text-blue-500 transition-colors"
        >
          <Shield size={11} /> 信任代理人
        </button>
      </div>
    </motion.div>
  )
}

export default ConfirmBar
