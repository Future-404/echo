import type { PatchOp, FilePatch } from './types'

export interface PatchResult {
  content: string
  failed: PatchOp[]  // 未能匹配的 op
}

function applyOp(content: string, op: PatchOp): { content: string; ok: boolean } {
  if (!content.includes(op.search)) return { content, ok: false }

  switch (op.op) {
    case 'replace':
      return { content: content.replace(op.search, op.content ?? ''), ok: true }
    case 'delete':
      return { content: content.replace(op.search, ''), ok: true }
    case 'insert_after':
      return { content: content.replace(op.search, op.search + (op.content ?? '')), ok: true }
    default:
      return { content, ok: false }
  }
}

export function applyPatch(content: string, patch: FilePatch): PatchResult {
  const failed: PatchOp[] = []
  let current = content
  for (const op of patch.ops) {
    const result = applyOp(current, op)
    if (result.ok) current = result.content
    else failed.push(op)
  }
  return { content: current, failed }
}
