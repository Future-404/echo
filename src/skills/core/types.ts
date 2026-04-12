export interface SkillExecuteResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
  suppressFollowUp?: boolean; // true 时跳过 AI follow-up 回复，对话框静默
  suppressDisplay?: boolean;  // true 时隐藏触发此 skill 的 assistant 消息（不在对话框显示）
  injectContext?: string;     // 注入一条 hidden 用户消息到上下文，AI 有记忆但对话框不显示，不触发新的 AI 请求
}

export interface SkillContext {
  messages: Array<{ role: string; content: string }>;
  characterName: string;
  userName: string;
  attributes: Record<string, any>;
}

export interface SkillModule {
  name: string;
  displayName: string;
  description: string;
  schema: object;
  execute: (args: any, ctx: SkillContext) => SkillExecuteResult | Promise<SkillExecuteResult>;
  // 支持静态字符串或动态函数（运行时注入上下文摘要）
  systemPrompt?: string | ((ctx: SkillContext) => string);
}

// 用户导入的第三方 skill 元信息
export interface InstalledSkill {
  id: string;           // 同 manifest.json 的 id
  name: string;         // 显示名
  description: string;
  version: string;
  author?: string;
  permissions: string[];
  code: string;         // skill.js 源码，存 store，运行时动态 eval
  installedAt: number;
}

export const ALLOWED_PERMISSIONS = ['chat_history', 'character_info', 'attributes'] as const;
export type SkillPermission = typeof ALLOWED_PERMISSIONS[number];

// 用户导入的带 UI 的应用
export interface InstalledApp {
  id: string
  name: string
  description: string
  version: string
  author?: string
  icon?: string       // emoji 或 URL
  htmlContent: string // index.html 内容
  installedAt: number
}
