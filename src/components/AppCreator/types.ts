import type { Provider } from '../../types/store'

export interface AppFiles {
  manifest: ManifestData
  skill: string   // skill.js 源码，空字符串表示无 skill
  html: string    // index.html 源码，空字符串表示无 UI
}

export interface ManifestData {
  id: string
  name: string
  description: string
  version: string
  author: string
  icon: string
  permissions: string[]
  hasSkill: boolean
}

// search-replace patch op
export interface PatchOp {
  op: 'replace' | 'insert_after' | 'delete'
  search: string
  content?: string  // replace / insert_after 时使用
}

export interface FilePatch {
  file: 'skill' | 'html'
  ops: PatchOp[]
}

// AI 每轮输出
export interface AgentOutput {
  phase: 'clarify' | 'generate' | 'patch'
  message: string
  // phase=generate: 全量文件（首次生成）
  files?: Partial<Pick<AppFiles, 'skill' | 'html'>>
  // phase=patch: 差量修改
  patches?: FilePatch[]
}

// 历史快照（用于撤销）
export interface FileSnapshot {
  skill: string
  html: string
  description: string  // 本次修改的描述，用于 UI 展示
}

export type CreatorPhase = 'form' | 'chat' | 'preview'

export interface ChatMessage { role: 'user' | 'assistant'; text: string }

export interface CreatorState {
  phase: CreatorPhase
  manifest: ManifestData
  files: AppFiles
  history: Array<{ role: string; content: string }>
  chatLog: ChatMessage[] // 增加此字段用于 UI 持久化
  snapshots: FileSnapshot[]
  status: 'idle' | 'running' | 'error'
  error?: string
}

export const EMPTY_MANIFEST: ManifestData = {
  id: '',
  name: '',
  description: '',
  version: '1.0.0',
  author: '',
  icon: '🎮',
  permissions: [],
  hasSkill: true,
}

export const EMPTY_FILES: AppFiles = {
  manifest: EMPTY_MANIFEST,
  skill: '',
  html: '',
}
