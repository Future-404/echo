export interface SkillModule {
  name: string;
  schema: object;
  execute: (args: any) => string;
  systemPrompt?: string;
}
