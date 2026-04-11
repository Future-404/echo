export interface SkillExecuteResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
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
