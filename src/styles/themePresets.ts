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
    name: '赛博沉浸 (Cyber-Echo)',
    enabled: false,
    css: `/* 赛博沉浸 */
:root {
  --echo-base: transparent;
  --dialogue-bg: transparent;
  --dialogue-backdrop: none;
  --dialogue-text-dialogue: #00f2ff;
  --dialogue-text-narration: rgba(255, 255, 255, 0.95);
  --dialogue-text-thought: #ff00ff;
  --dialogue-text-action: #7cfc00;
  --app-font-size: 18px;
  --cyber-blue: #00f2ff;
}
.echo-app-root { background-color: #000 !important; }
.echo-header-container { background: transparent !important; border: none !important; backdrop-filter: none !important; }
.echo-header-container > div.pointer-events-auto { opacity: 0; transition: opacity 0.4s ease; }
.echo-header-container > div.pointer-events-auto:hover { opacity: 1; background: rgba(5,8,15,0.85) !important; backdrop-filter: blur(20px) !important; }
.echo-message-list { padding-top: 64px !important; padding-bottom: 120px !important; }
.echo-message-row { padding-left: 12px !important; padding-right: 12px !important; margin-bottom: 2.2rem !important; }
.echo-message-content { max-width: 850px !important; }
.echo-message-content .dialogue-text { text-shadow: 0 2px 8px rgba(0,0,0,0.8); }
.echo-input-container { position: fixed !important; bottom: 0 !important; left: 50% !important; right: auto !important; transform: translateX(-50%) !important; width: calc(100% - 40px) !important; max-width: 720px !important; background: rgba(10,15,25,0.75) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0,242,255,0.1) !important; margin: 0 0 20px 0 !important; border-radius: 20px !important; }
.echo-config-panel { background: rgba(5,8,15,0.92) !important; backdrop-filter: blur(40px) saturate(1.8) !important; border-left: 1px solid var(--cyber-blue) !important; width: 400px !important; }
::-webkit-scrollbar { display: none; }`,
  },
  {
    id: 'preset-social-chat',
    name: '社交媒体 (Social Chat)',
    enabled: false,
    css: `/* 社交媒体 */
:root {
  --dialogue-bg: #f5f5f5;
  --dialogue-backdrop: none;
  --dialogue-text-dialogue: #1a1a1a;
  --dialogue-text-narration: #888888;
  --dialogue-text-thought: #888888;
  --dialogue-text-action: #555555;
  --bubble-ai: #ffffff;
  --bubble-user: #95ec69;
}
.dark {
  --dialogue-bg: #1a1a1a;
  --dialogue-text-dialogue: #e5e5e5;
  --dialogue-text-narration: #888;
  --bubble-ai: #2c2c2c;
  --bubble-user: #07c160;
}
.echo-app-root { background-color: var(--dialogue-bg) !important; }
.echo-message-list { background: var(--dialogue-bg) !important; padding-bottom: 80px !important; }
.echo-message-bubble { background: var(--bubble-ai); border-radius: 0 10px 10px 10px !important; padding: 10px 14px !important; box-shadow: 0 1px 2px rgba(0,0,0,0.08) !important; max-width: 72vw !important; }
.echo-message-row-user .echo-message-bubble { background: var(--bubble-user) !important; border-radius: 10px 0 10px 10px !important; color: #1a1a1a !important; }
.echo-input-container { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; max-width: 100% !important; background: #f7f7f7 !important; border-top: 1px solid #e0e0e0 !important; border-radius: 0 !important; padding: 8px 12px !important; }
.dark .echo-input-container { background: #2c2c2c !important; border-top-color: #3a3a3a !important; }
.echo-header-container { background: #f7f7f7 !important; border-bottom: 1px solid #e0e0e0 !important; backdrop-filter: none !important; }
.dark .echo-header-container { background: #2c2c2c !important; border-bottom-color: #3a3a3a !important; }`,
  },
];
