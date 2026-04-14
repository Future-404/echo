export interface CssVarDef {
  name: string
  default: string
  desc: string
}

export interface CssVarGroup {
  label: string
  color: string
  vars: CssVarDef[]
}

export const CSS_VAR_GROUPS: CssVarGroup[] = [
  {
    label: '1. 对话框 // Dialogue',
    color: 'blue',
    vars: [
      { name: '--dialogue-bg', default: 'rgba(255,255,255,0.85)', desc: '对话框背景（支持渐变/纯色）' },
      { name: '--dialogue-backdrop', default: 'blur(40px) saturate(1.8)', desc: '毛玻璃参数，设为 none 可关闭' },
      { name: '--dialogue-text-dialogue', default: '#1a1a1a', desc: '台词颜色（引号内文字）' },
      { name: '--dialogue-text-narration', default: '#666666', desc: '旁白/叙述文字颜色' },
      { name: '--dialogue-text-thought', default: '#8e8e8e', desc: '心理描写颜色（括号内）' },
      { name: '--dialogue-text-action', default: '#4a5568', desc: '动作描写颜色（星号内）' },
    ],
  },
  {
    label: '2. 状态条 // Stats',
    color: 'orange',
    vars: [
      { name: '--stat-color-love', default: '#f43f5e', desc: '好感度/爱心条' },
      { name: '--stat-color-hp', default: '#ef4444', desc: '生命/体力条' },
      { name: '--stat-color-mana', default: '#3b82f6', desc: '魔力/精力条' },
      { name: '--stat-color-hate', default: '#9333ea', desc: '厌恶度/阴影条' },
      { name: '--stat-color-favor', default: '#f59e0b', desc: '偏好度条' },
      { name: '--stat-color-default', default: '#94a3b8', desc: '未分类默认颜色' },
      { name: '--stat-color-{key}', default: '—', desc: '任意自定义 key，如 --stat-color-sanity' },
    ],
  },
  {
    label: '3. 字体与排版 // Typography',
    color: 'purple',
    vars: [
      { name: '--app-font', default: 'Noto Sans SC', desc: '全局字体（由字体选择器写入）' },
      { name: '--app-font-size', default: '16px', desc: '全局基准字号（由字号滑块写入）' },
    ],
  },
  {
    label: '4. 全局主题 // Theme',
    color: 'green',
    vars: [
      { name: '--echo-base', default: '#fdfdfd', desc: '应用背景基色' },
      { name: '--echo-white', default: '#ffffff', desc: '卡片/面板背景色' },
      { name: '--echo-border', default: 'rgba(0,0,0,0.06)', desc: '全局分割线/边框色（细）' },
      { name: '--echo-border-md', default: 'rgba(0,0,0,0.12)', desc: '全局分割线/边框色（中）' },
      { name: '--echo-surface', default: 'rgba(0,0,0,0.02)', desc: '浅层背景面' },
      { name: '--echo-surface-md', default: 'rgba(0,0,0,0.04)', desc: '中层背景面' },
      { name: '--echo-accent', default: '#3b82f6', desc: '全局强调色' },
      { name: '--echo-text-primary', default: '#111827', desc: '主要文字' },
      { name: '--echo-text-base', default: '#374151', desc: '正文文字' },
      { name: '--echo-text-muted', default: '#6b7280', desc: '次要文字' },
      { name: '--echo-text-subtle', default: '#9ca3af', desc: '弱化文字' },
      { name: '--echo-text-dim', default: '#d1d5db', desc: '极弱文字/占位符' },
      { name: '--char-a-color', default: '#60a5fa', desc: '多角色：主角色主题色' },
      { name: '--char-b-color', default: '#c084fc', desc: '多角色：副角色主题色' },
    ],
  },
  {
    label: '5. 顶栏 // Header',
    color: 'sky',
    vars: [
      { name: '--echo-header-primary', default: '#374151', desc: '顶栏主文字色' },
      { name: '--echo-header-secondary', default: '#9ca3af', desc: '顶栏副文字色' },
    ],
  },
  {
    label: '6. 输入框 // Input',
    color: 'indigo',
    vars: [
      { name: '--echo-input-radius', default: '2rem', desc: '输入框圆角' },
      { name: '--echo-input-bg', default: 'rgba(0,0,0,0.02)', desc: '输入框背景' },
      { name: '--echo-input-border', default: 'rgba(0,0,0,0.05)', desc: '输入框边框色' },
      { name: '--echo-input-bottom-offset', default: '0px', desc: '输入框底部额外间距' },
      { name: '--echo-send-btn-bg', default: '#3b82f6', desc: '发送按钮背景色' },
      { name: '--echo-send-btn-text', default: '#ffffff', desc: '发送按钮图标色' },
      { name: '--echo-stop-btn-text', default: '#ef4444', desc: '停止按钮颜色' },
    ],
  },
  {
    label: '7. 消息列表 // Messages',
    color: 'teal',
    vars: [
      { name: '--echo-message-gap', default: '2rem', desc: '消息间距' },
      { name: '--echo-message-bubble-radius', default: '1rem', desc: '气泡圆角' },
      { name: '--echo-typing-cursor-color', default: '#3b82f6', desc: '打字光标颜色' },
      { name: '--echo-avatar-size', default: '2.25rem', desc: '聊天头像尺寸' },
    ],
  },
  {
    label: '8. 语义化组件锚点 // Semantic Classes',
    color: 'rose',
    vars: [
      { name: '.echo-app-root', default: '—', desc: '根容器（带 data-view 状态属性）' },
      { name: '.echo-message-list', default: '—', desc: '消息列表' },
      { name: '.echo-message-row', default: '—', desc: '独立消息行' },
      { name: '.echo-message-row-ai', default: '—', desc: 'AI 消息行' },
      { name: '.echo-message-row-user', default: '—', desc: '用户消息行' },
      { name: '.echo-message-bubble', default: '—', desc: '消息气泡容器' },
      { name: '.echo-input-container', default: '—', desc: '底部输入区' },
      { name: '.echo-header-container', default: '—', desc: '顶部导航栏' },
      { name: '.echo-config-panel', default: '—', desc: '侧边设置面板' },
      { name: '.glass-morphism', default: '—', desc: '毛玻璃效果类（对话框使用）' },
    ],
  },
]

/** 给 AI 系统提示词用的纯文本版本 */
export function buildCssVarsPrompt(): string {
  return CSS_VAR_GROUPS.map(g =>
    `【${g.label}】\n` +
    g.vars.map(v => `  ${v.name}  默认: ${v.default}  // ${v.desc}`).join('\n')
  ).join('\n\n')
}
