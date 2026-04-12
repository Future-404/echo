import { unzipSync, strFromU8 } from 'fflate'
import type { InstalledSkill, InstalledApp, SkillModule, SkillContext } from './types'
import { ALLOWED_PERMISSIONS } from './types'
import { registeredSkills } from './registry'
import { useAppStore } from '../../store/useAppStore'
import { imageOptimizer } from '../../utils/imageOptimizer'

const SKILL_CODE_SIZE_LIMIT = 200 * 1024 // 200KB

interface Manifest {
  id: string
  name: string
  description: string
  version: string
  author?: string
  icon?: string
  permissions?: string[]
  hasSkill?: boolean
}

// ── 静态安全检查（不执行代码）────────────────────────────────────
function validateManifest(raw: any): Manifest {
  if (!raw || typeof raw !== 'object') throw new Error('manifest.json 格式无效')
  if (!raw.id || !/^[a-z0-9-]+$/.test(raw.id)) throw new Error('id 只允许小写字母、数字和连字符')
  if (raw.id.length < 3 || raw.id.length > 32) throw new Error('id 长度必须在 3-32 个字符之间')
  if (!raw.name || typeof raw.name !== 'string') throw new Error('缺少 name 字段')
  if (!raw.version || typeof raw.version !== 'string') throw new Error('缺少 version 字段')
  if (!raw.description || typeof raw.description !== 'string') throw new Error('缺少 description 字段')

  const permissions: string[] = raw.permissions || []
  const invalid = permissions.filter((p: string) => !(ALLOWED_PERMISSIONS as readonly string[]).includes(p))
  if (invalid.length) throw new Error(`不允许的权限：${invalid.join(', ')}`)

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    version: raw.version,
    author: raw.author,
    permissions,
    hasSkill: raw.hasSkill ?? true,
  }
}

// ── 图标压缩（128×128 webp，质量 0.5）────────────────────────────
async function compressIcon(base64: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const SIZE = 128
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('canvas failed'))
      ctx.drawImage(img, 0, 0, SIZE, SIZE)
      resolve(canvas.toDataURL('image/webp', 0.5))
    }
    img.onerror = reject
    img.src = base64
  })
}

// ── 解析 zip ─────────────────────────────────────────────────────
export async function parseSkillZip(file: File): Promise<InstalledSkill> {
  const buf = await file.arrayBuffer()
  const files = unzipSync(new Uint8Array(buf))

  const manifestRaw = files['manifest.json']
  if (!manifestRaw) throw new Error('缺少 manifest.json')
  const manifest = validateManifest(JSON.parse(strFromU8(manifestRaw)))

  let code = ''
  if (manifest.hasSkill) {
    const skillRaw = files['skill.js']
    if (!skillRaw) throw new Error('manifest 声明 hasSkill 但缺少 skill.js')
    if (skillRaw.byteLength > SKILL_CODE_SIZE_LIMIT) throw new Error('skill.js 超过 200KB 限制')
    code = strFromU8(skillRaw)
  }

  return {
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    version: manifest.version,
    author: manifest.author,
    permissions: manifest.permissions ?? [],
    code,
    installedAt: Date.now(),
  }
}

// ── 运行时动态加载 skill 代码 ─────────────────────────────────────
export function loadInstalledSkill(installed: InstalledSkill): void {
  if (!installed.code) return
  // 不做去重，允许覆盖（重新导入同名包时更新）

  try {
    const fn = new Function('exports', 'ctx_api', installed.code)
    const exports: any = {}
    const ctx_api = { addFragment: (msg: string) => useAppStore.getState().addFragment(msg) }
    fn(exports, ctx_api)

    const mod: SkillModule = exports.default ?? exports
    if (!mod?.name || !mod?.schema || !mod?.execute) {
      throw new Error('skill.js 必须导出 { name, schema, execute }')
    }
    // manifest.id 转下划线后与 skill name 比较（id 允许连字符，function name 不允许）
    const expectedName = installed.id.replace(/-/g, '_')
    if (mod.name !== expectedName && mod.name !== installed.id) {
      throw new Error(`skill.js 的 name "${mod.name}" 必须为 "${expectedName}"（与 manifest.id 一致）`)
    }
    const schemaFnName = (mod.schema as any)?.function?.name
    if (schemaFnName && schemaFnName !== expectedName) {
      throw new Error(`schema.function.name "${schemaFnName}" 必须为 "${expectedName}"`)
    }

    // 包装 execute：加超时 + 权限过滤 + 只读 ctx
    const originalExecute = mod.execute.bind(mod)
    const permissions = installed.permissions || []

    mod.execute = (args: any, ctx: SkillContext) => {
      // 动态过滤上下文数据
      const filteredCtx: any = {}
      
      if (permissions.includes('chat_history')) {
        filteredCtx.messages = Object.freeze([...ctx.messages])
      } else {
        filteredCtx.messages = [] // 无权限时不返回历史记录
      }

      if (permissions.includes('character_info')) {
        filteredCtx.characterName = ctx.characterName
        filteredCtx.userName = ctx.userName
      } else {
        filteredCtx.characterName = 'AI'
        filteredCtx.userName = 'User'
      }

      if (permissions.includes('attributes')) {
        filteredCtx.attributes = Object.freeze({ ...ctx.attributes })
      } else {
        filteredCtx.attributes = {}
      }

      const frozenCtx = Object.freeze(filteredCtx as SkillContext)

      return Promise.race([
        Promise.resolve(originalExecute(args, frozenCtx)),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Skill 执行超时（5s）')), 5000)
        ),
      ])
    }

    registeredSkills[installed.id.replace(/-/g, '_')] = mod
  } catch (e: any) {
    console.error(`[SkillLoader] 加载 ${installed.id} 失败:`, e)
    throw new Error(`加载失败：${e.message}`)
  }
}

// ── 启动时恢复所有已安装 skill ────────────────────────────────────
export function restoreInstalledSkills(skills: InstalledSkill[]): void {
  for (const s of skills) {
    if (registeredSkills[s.id.replace(/-/g, '_')]) continue // 启动时跳过已存在的
    try { loadInstalledSkill(s) } catch { /* 单个失败不影响其他 */ }
  }
}

// ── 统一解析 zip（skill + app 一起处理）──────────────────────────
export interface ParsedPackage {
  skill?: InstalledSkill
  app?: InstalledApp
}

export async function parsePackageZip(file: File): Promise<ParsedPackage> {
  const buf = await file.arrayBuffer()
  const files = unzipSync(new Uint8Array(buf))

  const manifestRaw = files['manifest.json']
  if (!manifestRaw) throw new Error('缺少 manifest.json')
  const manifest = validateManifest(JSON.parse(strFromU8(manifestRaw)))

  const result: ParsedPackage = {}

  // skill 部分
  if (manifest.hasSkill !== false && files['skill.js']) {
    const skillRaw = files['skill.js']
    if (skillRaw.byteLength > SKILL_CODE_SIZE_LIMIT) throw new Error('skill.js 超过 200KB 限制')
    result.skill = {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      author: manifest.author,
      permissions: manifest.permissions ?? [],
      code: strFromU8(skillRaw),
      installedAt: Date.now(),
    }
  }

  // UI 部分
  if (files['index.html']) {
    // 处理图标：优先 icon.png/jpg/webp，其次 manifest.icon（emoji）
    let iconValue = manifest.icon
    const iconFile = files['icon.png'] || files['icon.jpg'] || files['icon.jpeg'] || files['icon.webp']
    if (iconFile) {
      try {
        // 转 base64 → 压缩为 128×128 webp
        const mime = files['icon.webp'] ? 'image/webp' : files['icon.png'] ? 'image/png' : 'image/jpeg'
        const b64 = `data:${mime};base64,` + btoa(String.fromCharCode(...iconFile))
        iconValue = await compressIcon(b64)
      } catch { /* 压缩失败则回退到 emoji */ }
    }
    result.app = {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      author: manifest.author,
      icon: iconValue,
      htmlContent: strFromU8(files['index.html']),
      installedAt: Date.now(),
    }
  }

  if (!result.skill && !result.app) throw new Error('zip 中没有 skill.js 也没有 index.html')

  return result
}
