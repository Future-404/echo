export type AIAssistFieldName =
  | 'name'
  | 'description'
  | 'systemPrompt'
  | 'scenario'
  | 'greeting'
  | 'alternateGreetings'
  | 'postHistoryInstructions'
  | 'attributes'
  | 'worldBook'

export type AIAssistOp = 'set' | 'append' | 'update' | 'delete'

export interface AIAssistChange {
  field: AIAssistFieldName
  op: AIAssistOp
  index?: number   // 陣列欄位時指定操作哪一個
  value?: any      // delete 時不需要
}

export interface AIAssistResponse {
  reasoning: string
  changes: AIAssistChange[]
  status: 'done' | 'continue'
  next_intent?: string  // continue 時說明下一步意圖
}

export type AgentStatus = 'idle' | 'running' | 'awaiting_confirm' | 'done' | 'aborted' | 'error'

export interface AgentRound {
  round: number
  reasoning: string
  changes: AIAssistChange[]
  next_intent?: string
}

export interface AgentState {
  status: AgentStatus
  rounds: AgentRound[]           // 已完成的輪次記錄
  pendingChanges: AIAssistChange[] // 累積待確認的 changes（審核模式）
  undoStack: Array<{ field: AIAssistFieldName; previousValue: any }> // 信任模式撤銷用
  currentRound: number
  trustMode: boolean             // 信任代理人，無需逐輪確認
  history: Array<{ role: string; content: string }> // 跨任務對話歷史（內存，關閉面板清空）
  error?: string
}
