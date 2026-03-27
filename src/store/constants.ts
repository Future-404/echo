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

// 核心渲染引擎格式强制约定 (Immutable System Prompt)
// 优先级最高，不可被用户配置覆盖，用于确保前端 NovelParser 正常工作
export const CORE_FORMATTING_RULES = `
### CORE RESPONSE FORMATTING (SYSTEM IMMUTABLE)
To ensure the rendering engine works correctly, you MUST strictly follow these formatting rules for EVERY response:
1. **Thoughts**: MUST be enclosed in (parentheses). Example: (I need to think about this...)
2. **Actions/Narration**: MUST be enclosed in *asterisks*. Example: *He sighed heavily.*
3. **Dialogues**: MUST follow the novel format using a colon and quotes. 
   - Format: SpeakerName: "Spoken content" or SpeakerName：“Spoken content”. 
   - Example: Echo: "I am listening."
   - The colon and quotes are STRICT anchors. Do not omit them.
4. **UI Cards**: Use {{card_type|data}} only if explicitly instructed by a tool or skill.
`;

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

export const INITIAL_PROVIDERS: Provider[] = [
  { id: 'default', name: 'OpenAI', apiKey: '', endpoint: 'https://api.openai.com/v1', model: '', temperature: 0.7, topP: 1.0, contextWindow: 10, stream: true }
]
