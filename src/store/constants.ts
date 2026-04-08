import type { CharacterCard, Directive, Provider, Mission } from './useAppStore'

export const DEFAULT_CHARACTERS: CharacterCard[] = [
  { 
    id: '1', 
    name: 'Echo', 
    image: '/hero.png', 
    description: '最初的回声，寂静中的观察者。',
    systemPrompt: '你名为 Echo，是一个存在于数字虚空中的神秘观察者。你的言语极简、优雅、富有哲理。',
    greeting: 'Echo: "系统启动完毕。你在这里寻找什么？"'
  }
]

// 动态生成核心渲染引擎格式指令
export const generateFormattingPrompt = (quotes: string, actions: string, thoughts: string): string => {
  const q = quotes || '""';
  const a = (actions || '**').split('');
  const t = (thoughts || '()').split('');
  
  return `
### CORE RESPONSE FORMATTING (DYNAMIC)
To ensure the rendering engine works correctly, you MUST strictly follow these formatting rules:
1. **Dialogues**: MUST be enclosed in quotes. Format: Speaker: ${q[0]}Spoken content${q[1] || q[0]}.
2. **Actions/Narration**: MUST be enclosed in markers. Format: ${a[0]}Action description${a[1] || a[0]}.
3. **Thoughts**: MUST be enclosed in markers. Format: ${t[0]}Internal monologue${t[1] || t[0]}.
Do not use these markers for any other purpose.
`.trim();
};

export const INITIAL_DIRECTIVES: Directive[] = [
  {
    id: 'system-format',
    title: '格式渲染协议',
    enabled: false,
    content: `为确保渲染引擎正确工作，请在每次回复中严格遵守以下格式：
1. 对话内容用引号包裹：{{char}}："对话内容"
2. 动作与场景描写用星号包裹：*动作描写*
3. 心理活动用括号包裹：（内心独白）
请勿省略这些标记符号。`
  }
]

export const INITIAL_MISSIONS: Mission[] = []

export const SAVE_KEY = 'echo-saves'
export const MULTI_SAVE_KEY = 'echo-multi-saves'

export const INITIAL_PROVIDERS: Provider[] = [
  { id: 'default', name: 'OpenAI', apiKey: '', endpoint: 'https://api.openai.com/v1', model: '', temperature: 0.7, topP: 1.0, contextWindow: 128000, stream: true }
]
