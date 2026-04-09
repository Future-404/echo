export const CSS_SNIPPETS: { label: string; sub: string; css: string }[] = [
  {
    label: '全屏对话容器',
    sub: 'Fullscreen',
    css: `/* ── 全屏对话容器 ── */
:root {
  --echo-fullscreen-top: 64px;
  --echo-fullscreen-bg: var(--dialogue-bg);
}
.echo-dialogue-container {
  position: fixed !important;
  top: calc(var(--echo-fullscreen-top) + var(--sat, 0px)) !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100vw !important;
  max-width: 100vw !important;
  height: auto !important;
  margin: 0 !important;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  background: var(--echo-fullscreen-bg) !important;
}`,
  },
  {
    label: '隐藏大头立绘',
    sub: 'Hide Avatar',
    css: `.echo-char-avatar-wrapper { display: none !important; }`,
  },
  {
    label: '隐藏顶部工具栏',
    sub: 'Hide Toolbar',
    css: `.echo-dialogue-toolbar { display: none !important; }`,
  },
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
  --cyber-pink: #ff00ff;
  --echo-fullscreen-top: 0px;
  --echo-fullscreen-bg: transparent;
}
.echo-char-avatar-wrapper { display: none !important; }
.echo-dialogue-container {
  position: fixed !important;
  top: calc(var(--echo-fullscreen-top) + var(--sat, 0px)) !important;
  left: 0 !important; right: 0 !important; bottom: 0 !important;
  width: 100vw !important; max-width: 100vw !important;
  height: auto !important; margin: 0 !important;
  border: none !important; border-radius: 0 !important;
  background: var(--echo-fullscreen-bg) !important;
  box-shadow: none !important; backdrop-filter: none !important;
  pointer-events: none !important;
}
.echo-message-list {
  pointer-events: auto !important;
  padding-top: 64px !important;
  padding-left: 0 !important; padding-right: 0 !important;
  padding-bottom: 120px !important;
}
.echo-input-container {
  position: fixed !important;
  bottom: 0 !important; left: 50% !important; right: auto !important;
  transform: translateX(-50%) !important;
  width: calc(100% - 40px) !important; max-width: 720px !important;
  z-index: 100 !important; pointer-events: auto !important;
  background: rgba(10, 15, 25, 0.75) !important;
  backdrop-filter: blur(30px) !important;
  border: 1px solid rgba(0, 242, 255, 0.1) !important;
  margin: 0 0 20px 0 !important; border-radius: 20px !important;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.6) !important;
}
.echo-dialogue-toolbar {
  position: fixed !important; top: 0; left: 0; right: 0;
  z-index: 101 !important; pointer-events: auto !important;
  transform: translateY(-95%); opacity: 0;
  transition: all 0.4s ease !important;
  background: rgba(10, 15, 25, 0.8) !important;
  backdrop-filter: blur(25px) !important;
}
.echo-dialogue-toolbar:hover { transform: translateY(0); opacity: 1; }
.echo-message-row { padding-left: 12px !important; padding-right: 12px !important; margin-bottom: 2.2rem !important; }
.echo-header-container { background: transparent !important; border: none !important; backdrop-filter: none !important; }
.echo-header-container > div.pointer-events-auto { opacity: 0; transition: opacity 0.4s ease; }
.echo-header-container > div.pointer-events-auto:hover { opacity: 1; background: rgba(5, 8, 15, 0.85) !important; backdrop-filter: blur(20px) !important; border-bottom: 1px solid rgba(0, 242, 255, 0.15) !important; }
::-webkit-scrollbar { display: none; }
.echo-message-content .dialogue-text { text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8); }
.echo-app-root { background-color: #000 !important; }
.echo-message-content { max-width: 850px !important; }
.echo-input-textarea, .echo-input-action-btn { pointer-events: auto !important; }
.echo-config-panel {
  background: rgba(5, 8, 15, 0.92) !important;
  backdrop-filter: blur(40px) saturate(1.8) !important;
  border-left: 1px solid var(--cyber-blue) !important;
  box-shadow: -10px 0 50px rgba(0, 0, 0, 0.9), -2px 0 15px rgba(0, 242, 255, 0.2) !important;
  width: 400px !important;
}
.echo-config-nav-item { clip-path: polygon(0% 0%, 95% 0%, 100% 20%, 100% 100%, 5% 100%, 0% 80%); }
.echo-config-nav-item:hover { background: rgba(0, 242, 255, 0.1) !important; border: 1px solid rgba(0, 242, 255, 0.3) !important; transform: translateX(-5px); }`,
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
  --echo-dialogue-max-width: 480px;
  --echo-dialogue-padding-x: 0.75rem;
  --bubble-ai: #ffffff;
  --bubble-user: #95ec69;
  --echo-fullscreen-top: 64px;
  --echo-fullscreen-bg: var(--dialogue-bg);
}
.dark {
  --dialogue-bg: #1a1a1a;
  --dialogue-text-dialogue: #e5e5e5;
  --dialogue-text-narration: #888;
  --bubble-ai: #2c2c2c;
  --bubble-user: #07c160;
  --echo-fullscreen-bg: var(--dialogue-bg);
}
.echo-app-root { background-color: var(--dialogue-bg) !important; overflow-x: hidden !important; }
.echo-char-avatar-wrapper { display: none !important; }
.echo-dialogue-area { padding: 0 !important; width: 100% !important; align-items: stretch !important; }
.echo-dialogue-wrapper { margin-bottom: 0 !important; width: 100% !important; max-width: 100% !important; }
.echo-input-area { padding: 0 !important; max-width: none !important; background: none !important; width: 100% !important; }
.echo-app-root .echo-dialogue-area { align-items: stretch !important; }
.echo-dialogue-container {
  position: fixed !important;
  top: calc(var(--echo-fullscreen-top) + var(--sat, 0px)) !important;
  left: 0 !important; right: 0 !important; bottom: 0 !important;
  width: 100vw !important; min-width: 100vw !important;
  height: auto !important; max-width: 100vw !important;
  margin: 0 !important; transform: none !important;
  border-radius: 0 !important; border: none !important;
  box-shadow: none !important; backdrop-filter: none !important;
  background: var(--echo-fullscreen-bg) !important;
  padding-left: 0 !important; padding-right: 0 !important;
  z-index: 20 !important; overflow-y: auto !important; overflow-x: hidden !important;
}
.echo-dialogue-toolbar { display: none !important; }
.echo-message-list { background: var(--dialogue-bg) !important; padding-top: 12px !important; padding-bottom: 80px !important; padding-left: 0 !important; padding-right: 0 !important; }
.echo-message-avatar img, .echo-message-avatar > div { border-radius: 6px !important; border: none !important; box-shadow: none !important; }
.echo-message-bubble { background: var(--bubble-ai); border-radius: 0 10px 10px 10px !important; padding: 10px 14px !important; box-shadow: 0 1px 2px rgba(0,0,0,0.08) !important; max-width: 72vw !important; word-break: break-word !important; }
.echo-message-row-user .echo-message-bubble { background: var(--bubble-user) !important; border-radius: 10px 0 10px 10px !important; color: #1a1a1a !important; }
.echo-message-row-user .echo-message-content > div:first-child span:first-child { display: none !important; }
.echo-input-container { position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; transform: none !important; width: 100% !important; max-width: 100% !important; background: #f7f7f7 !important; border-top: 1px solid #e0e0e0 !important; border-radius: 0 !important; box-shadow: none !important; padding: 8px 12px !important; margin: 0 !important; z-index: 100 !important; pointer-events: auto !important; }
.echo-input-inner, .echo-input-attachments, .echo-input-hint { padding-left: 0 !important; padding-right: 0 !important; }
.dark .echo-input-container { background: #2c2c2c !important; border-top: 1px solid #3a3a3a !important; }
.echo-input-textarea { background: #ffffff !important; border: 1px solid #e0e0e0 !important; border-radius: 6px !important; padding: 8px 10px !important; font-size: 15px !important; color: #1a1a1a !important; }
.dark .echo-input-textarea { background: #1a1a1a !important; border-color: #3a3a3a !important; color: #e5e5e5 !important; }
.echo-header-container { background: #f7f7f7 !important; border-bottom: 1px solid #e0e0e0 !important; backdrop-filter: none !important; }
.dark .echo-header-container { background: #2c2c2c !important; border-bottom: 1px solid #3a3a3a !important; }
.echo-config-panel { background: #f2f2f7 !important; backdrop-filter: none !important; border-left: none !important; box-shadow: -2px 0 12px rgba(0,0,0,0.1) !important; }
.dark .echo-config-panel { background: #1c1c1e !important; }
.echo-config-nav-item { border-radius: 0 !important; border-bottom: 1px solid rgba(0,0,0,0.06) !important; background: #ffffff !important; margin: 0 !important; padding: 14px 16px !important; }
.dark .echo-config-nav-item { background: #2c2c2e !important; border-bottom-color: rgba(255,255,255,0.06) !important; }`,
  },
];
