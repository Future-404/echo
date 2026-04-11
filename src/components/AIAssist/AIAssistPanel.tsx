import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, RotateCcw, Loader2 } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { CharacterCard } from '../../types/chat'
import type { AgentState, AgentRound, AIAssistChange, AIAssistFieldName } from '../../types/aiAssist'
import {
  buildSystemPrompt, callAIAssist, applyChanges, getFieldValue, MAX_ROUNDS
} from '../../utils/aiAssistEngine'
import ConfirmBar from './ConfirmBar'

interface AIAssistPanelProps {
  char: CharacterCard
  onApply: (changes: AIAssistChange[]) => void
  onClose: () => void
}

const INITIAL_STATE: AgentState = {
  status: 'idle',
  rounds: [],
  pendingChanges: [],
  undoStack: [],
  currentRound: 0,
  trustMode: false,
}

const AIAssistPanel: React.FC<AIAssistPanelProps> = ({ char, onApply, onClose }) => {
  const { config } = useAppStore()
  const [state, setState] = useState<AgentState>(INITIAL_STATE)
  const [userPrompt, setUserPrompt] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  // 取得 tool provider
  const toolProvider = config.providers.find(p => p.id === config.modelConfig.toolProviderId)

  const reset = () => {
    abortRef.current?.abort()
    setState(INITIAL_STATE)
    setUserPrompt('')
  }

  // 執行單輪 AI 請求
  const runRound = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    roundNum: number,
    accumulated: AIAssistChange[],
    currentChar: CharacterCard,
    trust: boolean,
  ) => {
    if (!toolProvider) return

    setState(s => ({ ...s, status: 'running', currentRound: roundNum }))

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await callAIAssist(messages, toolProvider, controller.signal)

      const round: AgentRound = {
        round: roundNum,
        reasoning: response.reasoning,
        changes: response.changes,
        next_intent: response.next_intent,
      }

      const newMessages = [
        ...messages,
        { role: 'assistant', content: JSON.stringify(response) },
      ]

      if (trust) {
        // 信任模式：記錄 undo，直接應用
        const undoEntries = response.changes.map(c => ({
          field: c.field as AIAssistFieldName,
          previousValue: getFieldValue(currentChar, c.field as AIAssistFieldName),
        }))
        onApply(response.changes)
        const newChar = applyChanges(currentChar, response.changes)
        const newAccumulated = [...accumulated, ...response.changes]

        setState(s => ({
          ...s,
          rounds: [...s.rounds, round],
          undoStack: [...s.undoStack, ...undoEntries],
          pendingChanges: newAccumulated,
        }))

        if (response.status === 'continue' && roundNum < MAX_ROUNDS) {
          const nextMessages = [
            ...newMessages,
            { role: 'user', content: '繼續' },
          ]
          // 更新 system prompt 為最新角色卡狀態
          nextMessages[0] = { role: 'system', content: buildSystemPrompt(newChar) }
          await runRound(nextMessages, roundNum + 1, newAccumulated, newChar, trust)
        } else {
          setState(s => ({ ...s, status: 'done' }))
        }
      } else {
        // 審核模式：等待用戶確認
        setState(s => ({
          ...s,
          status: 'awaiting_confirm',
          rounds: [...s.rounds, round],
        }))
        // 後續由 handleAllow 繼續，把 messages 和 round 存起來
        pendingRef.current = { messages: newMessages, round, accumulated, currentChar }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return
      setState(s => ({ ...s, status: 'error', error: e.message }))
    }
  }, [toolProvider, onApply])

  // 審核模式的待處理數據
  const pendingRef = useRef<{
    messages: Array<{ role: string; content: string }>
    round: AgentRound
    accumulated: AIAssistChange[]
    currentChar: CharacterCard
  } | null>(null)

  const handleStart = async () => {
    if (!toolProvider || !userPrompt.trim()) return
    const systemMsg = { role: 'system', content: buildSystemPrompt(char) }
    const userMsg = { role: 'user', content: userPrompt.trim() }
    await runRound([systemMsg, userMsg], 1, [], char, state.trustMode)
  }

  const handleAllow = async () => {
    if (!pendingRef.current) return
    const { messages, round, accumulated, currentChar } = pendingRef.current
    pendingRef.current = null

    onApply(round.changes)
    const newChar = applyChanges(currentChar, round.changes)
    const newAccumulated = [...accumulated, ...round.changes]

    setState(s => ({ ...s, pendingChanges: newAccumulated }))

    const lastRound = state.rounds[state.rounds.length - 1]
    if (lastRound && lastRound.next_intent && state.currentRound < MAX_ROUNDS) {
      const nextMessages = [
        { role: 'system', content: buildSystemPrompt(newChar) },
        ...messages.slice(1),
        { role: 'user', content: '繼續' },
      ]
      await runRound(nextMessages, state.currentRound + 1, newAccumulated, newChar, false)
    } else {
      setState(s => ({ ...s, status: 'done' }))
    }
  }

  const handleReject = () => {
    pendingRef.current = null
    setState(s => ({ ...s, status: 'aborted' }))
  }

  const handleTrustMode = async () => {
    if (!pendingRef.current) return
    setState(s => ({ ...s, trustMode: true }))
    const { messages, round, accumulated, currentChar } = pendingRef.current
    pendingRef.current = null

    onApply(round.changes)
    const newChar = applyChanges(currentChar, round.changes)
    const newAccumulated = [...accumulated, ...round.changes]

    if (round.next_intent && state.currentRound < MAX_ROUNDS) {
      const nextMessages = [
        { role: 'system', content: buildSystemPrompt(newChar) },
        ...messages.slice(1),
        { role: 'user', content: '繼續' },
      ]
      await runRound(nextMessages, state.currentRound + 1, newAccumulated, newChar, true)
    } else {
      setState(s => ({ ...s, status: 'done', pendingChanges: newAccumulated }))
    }
  }

  const currentRound = state.rounds[state.rounds.length - 1]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="rounded-3xl border-0.5 border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/40 backdrop-blur-sm shadow-xl p-5 space-y-4"
    >
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-purple-400" />
          <span className="text-xs font-serif tracking-widest text-echo-text-muted uppercase">AI 協助</span>
          {state.trustMode && (
            <span className="text-[8px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-500 uppercase tracking-widest">信任模式</span>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* 輸入區（idle / done / aborted / error 時顯示） */}
      {(state.status === 'idle' || state.status === 'done' || state.status === 'aborted' || state.status === 'error') && (
        <div className="space-y-3">
          {!toolProvider && (
            <p className="text-[9px] text-red-400 uppercase tracking-widest">
              請先在設定 → API 管理中配置一個 Tool 類型的 Provider
            </p>
          )}
          <textarea
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            placeholder="描述你的需求，例如：幫我生成一個冷漠偵探的完整角色卡..."
            rows={3}
            className="w-full bg-transparent border-0.5 border-gray-200 dark:border-gray-700 rounded-2xl p-3 text-sm text-echo-text-base focus:outline-none focus:border-gray-400 resize-none no-scrollbar placeholder:text-gray-400 placeholder:italic"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleStart}
              disabled={!toolProvider || !userPrompt.trim()}
              className="flex-1 py-2.5 rounded-xl bg-purple-500 text-white text-[10px] uppercase tracking-widest hover:bg-purple-600 transition-colors disabled:opacity-30"
            >
              生成
            </button>
            {(state.status === 'done' || state.status === 'aborted') && (
              <button onClick={reset} className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-600 transition-colors">
                <RotateCcw size={13} />
              </button>
            )}
          </div>
          {state.status === 'error' && (
            <p className="text-[9px] text-red-400 font-mono">{state.error}</p>
          )}
        </div>
      )}

      {/* 運行中 */}
      {state.status === 'running' && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 size={14} className="text-purple-400 animate-spin" />
          <span className="text-xs text-gray-400 font-serif">
            第 {state.currentRound} 步，思考中...
          </span>
          <button onClick={() => abortRef.current?.abort()} className="ml-auto text-[9px] text-gray-400 hover:text-red-400 transition-colors uppercase tracking-widest">
            取消
          </button>
        </div>
      )}

      {/* 已完成輪次摘要 */}
      {state.rounds.length > 0 && (
        <div className="space-y-1">
          {state.rounds.map(r => (
            <div key={r.round} className="flex items-center gap-2 text-[9px] text-gray-400">
              <span className="text-green-400">✓</span>
              <span>步驟 {r.round}：{r.reasoning.slice(0, 40)}{r.reasoning.length > 40 ? '...' : ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* 審核確認條 */}
      <AnimatePresence>
        {state.status === 'awaiting_confirm' && currentRound && (
          <ConfirmBar
            round={currentRound}
            onAllow={handleAllow}
            onReject={handleReject}
            onTrustMode={handleTrustMode}
          />
        )}
      </AnimatePresence>

      {/* 完成摘要 */}
      {state.status === 'done' && (
        <div className="text-[9px] text-green-500 uppercase tracking-widest flex items-center gap-2">
          <span>✓</span>
          <span>已完成，共 {state.rounds.length} 步，{state.pendingChanges.length} 項修改</span>
        </div>
      )}

      {state.status === 'aborted' && (
        <p className="text-[9px] text-gray-400 uppercase tracking-widest">已取消</p>
      )}
    </motion.div>
  )
}

export default AIAssistPanel
