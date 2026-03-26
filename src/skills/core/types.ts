export interface SkillExecuteResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
}

export interface SkillModule {
  name: string;
  displayName: string;
  description: string;
  schema: object;
  execute: (args: any) => SkillExecuteResult;
  systemPrompt?: string;
}
