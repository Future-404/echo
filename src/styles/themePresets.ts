export const CSS_SNIPPETS: { label: string; sub: string; css: string }[] = [
  {
    label: '关闭毛玻璃',
    sub: 'No Blur',
    css: `:root { --dialogue-backdrop: none; }
.glass-morphism { background: rgba(255,255,255,0.95); }
.dark .glass-morphism { background: rgba(10,10,10,0.95); }`,
  },
  {
    label: '暗色沉浸',
    sub: 'Dark Immersive',
    css: `.dark {
  --dialogue-bg: rgba(10, 10, 15, 0.92);
  --dialogue-text-dialogue: #f8fafc;
  --dialogue-text-narration: #94a3b8;
  --dialogue-text-thought: #818cf8;
}`,
  },
  {
    label: '气泡式消息',
    sub: 'Chat Bubbles',
    css: `:root {
  --bubble-ai: #ffffff;
  --bubble-user: #95ec69;
}
.echo-message-bubble {
  border-radius: 0 10px 10px 10px !important;
  padding: 10px 14px !important;
  background: var(--bubble-ai) !important;
}
.echo-message-row-user .echo-message-bubble {
  background: var(--bubble-user) !important;
  border-radius: 10px 0 10px 10px !important;
}`,
  },
];

export const DEFAULT_CSS_PACKAGES = [
  {
    id: 'preset-cyber-echo',
    name: '赛博霓虹',
    enabled: false,
    css: `/* 赛博霓虹 - 极致变量驱动版 */
:root {
  --echo-base: #000000;
  --echo-accent: #00f2ff;
  --dialogue-bg: rgba(5, 10, 20, 0.6);
  --dialogue-backdrop: blur(25px) saturate(2.5);
  --dialogue-text-dialogue: #00f2ff;
  --dialogue-text-narration: #ffffff;
  --dialogue-text-thought: #ff00ff;
  
  --echo-header-primary: #00f2ff;
  --echo-header-secondary: #00ccff;
  
  --echo-input-bg: rgba(0, 242, 255, 0.05);
  --echo-input-border: rgba(0, 242, 255, 0.2);
  --echo-send-btn-bg: #00f2ff;
  --echo-send-btn-text: #000000;
  --echo-typing-cursor-color: #00f2ff;
  
  --echo-message-gap: 2.5rem;
}

.dark {
  --echo-base: #050505;
  --dialogue-bg: rgba(0, 5, 15, 0.7);
}

/* 霓虹发光文字特效 */
.echo-message-row-ai .echo-message-bubble {
  text-shadow: 0 0 10px rgba(0, 242, 255, 0.5);
}

/* 精准视觉微调 (不破坏布局) */
.echo-header-container { border-bottom: 1px solid rgba(0, 242, 255, 0.15) !important; }
::-webkit-scrollbar-thumb { background: #00f2ff !important; box-shadow: 0 0 15px #00f2ff; }
.echo-config-panel { background: rgba(5,8,15,0.95) !important; }`,
  },
  {
    id: 'preset-social-chat',
    name: '极简社交',
    enabled: false,
    css: `/* 极简社交 - 极致变量驱动版 */
:root {
  --echo-base: #f7f7f7;
  --echo-white: #ffffff;
  --dialogue-bg: transparent;
  --dialogue-backdrop: none;
  --dialogue-text-dialogue: #000000;
  
  --bubble-user: #95ec69;
  --bubble-ai: #ffffff;
  
  --echo-input-radius: 0.5rem;
  --echo-input-bg: #ffffff;
  --echo-input-border: #e0e0e0;
  --echo-send-btn-bg: #07c160;
  
  --echo-header-primary: #000000;
  --echo-header-secondary: #888888;
  --echo-message-gap: 1.2rem;
}

.dark {
  --echo-base: #111111;
  --echo-white: #1a1a1a;
  --bubble-user: #07c160;
  --bubble-ai: #262626;
  --echo-input-bg: #262626;
  --echo-input-border: #333333;
  --echo-header-primary: #ffffff;
}

/* 消息气泡视觉强制 (微信风格) */
.echo-message-bubble {
  background: var(--bubble-ai) !important;
  padding: 12px 16px !important;
  border-radius: 0 10px 10px 10px !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
  color: inherit !important;
  position: relative !important;
}

.echo-message-bubble::before {
  content: '';
  position: absolute;
  top: 0;
  left: -7px;
  border: 7px solid transparent;
  border-top-color: var(--bubble-ai);
  border-right-color: var(--bubble-ai);
  border-top-left-radius: 2px;
}

.echo-message-row-user .echo-message-bubble {
  background: var(--bubble-user) !important;
  color: #000000 !important;
  border-radius: 10px 0 10px 10px !important;
}

.echo-message-row-user .echo-message-bubble::before {
  left: auto;
  right: -7px;
  border-right-color: transparent;
  border-left-color: var(--bubble-user);
  border-top-color: var(--bubble-user);
  border-top-right-radius: 2px;
  border-top-left-radius: 0;
}

.echo-message-avatar img { border: none !important; box-shadow: none !important; }`,
  },
];
