import React from 'react';

const CustomCssGuide: React.FC = () => {
  return (
    <div className="space-y-6 text-xs md:text-sm">
      <p>ECHO 支持通过 CSS 变量和选择器覆盖进行深度视觉定制。自定义样式持久化存储，随账户同步。</p>

      {/* 核心机制 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">核心机制</p>
        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-[11px] leading-relaxed opacity-80">
          <p>系统用 <code className="bg-white/10 px-1 rounded">MutationObserver</code> 将 <code className="bg-white/10 px-1 rounded">#user-custom-css</code> 始终保持在 <code className="bg-white/10 px-1 rounded">&lt;head&gt;</code> 末尾，优先级高于 Tailwind，无需 <code className="bg-white/10 px-1 rounded">!important</code> 即可覆盖大多数样式。</p>
        </div>
      </div>

      {/* CSS 变量速查表 */}
      <div className="space-y-4">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">设计令牌速查表</p>

        <div className="space-y-2">
          <p className="text-[9px] text-blue-400/60 uppercase tracking-widest px-1 font-bold">1. 对话框 // Dialogue</p>
          <div className="rounded-2xl border border-echo-border overflow-hidden">
            <div className="divide-y divide-white/5">
              {[
                ['--dialogue-bg', 'rgba(255,255,255,0.75)', '对话框背景（支持渐变/纯色）'],
                ['--dialogue-backdrop', 'blur(24px) saturate(1.4)', '毛玻璃参数，设为 none 可关闭'],
                ['--dialogue-text-dialogue', '#1a1a1a', '台词颜色（引号内文字）'],
                ['--dialogue-text-narration', '#666666', '旁白/叙述文字颜色'],
                ['--dialogue-text-thought', '#8e8e8e', '心理描写颜色（括号内）'],
                ['--dialogue-text-action', '#4a5568', '动作描写颜色（星号内）'],
              ].map(([varName, defaultVal, desc]) => (
                <div key={varName} className="grid grid-cols-[12rem_auto_1fr] gap-x-4 items-start px-4 py-2 text-[10px]">
                  <code className="font-mono text-blue-400 shrink-0">{varName}</code>
                  <code className="font-mono opacity-40 shrink-0">{defaultVal}</code>
                  <span className="opacity-50">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[9px] text-orange-400/60 uppercase tracking-widest px-1 font-bold">2. 状态条 // Stats</p>
          <div className="rounded-2xl border border-echo-border overflow-hidden">
            <div className="divide-y divide-white/5">
              {[
                ['--stat-color-love', '#f43f5e', '好感度/爱心条'],
                ['--stat-color-hp', '#ef4444', '生命/体力条'],
                ['--stat-color-mana', '#3b82f6', '魔力/精力条'],
                ['--stat-color-hate', '#9333ea', '厌恶度/阴影条'],
                ['--stat-color-favor', '#f59e0b', '偏好度条'],
                ['--stat-color-default', '#94a3b8', '未分类默认颜色'],
                ['--stat-color-{key}', '—', '任意自定义 key，如 --stat-color-sanity'],
              ].map(([varName, defaultVal, desc]) => (
                <div key={varName} className="grid grid-cols-[12rem_auto_1fr] gap-x-4 items-start px-4 py-2 text-[10px]">
                  <code className="font-mono text-orange-400 shrink-0">{varName}</code>
                  <code className="font-mono opacity-40 shrink-0">{defaultVal}</code>
                  <span className="opacity-50">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[9px] text-purple-400/60 uppercase tracking-widest px-1 font-bold">3. 字体与排版 // Typography</p>
          <div className="rounded-2xl border border-echo-border overflow-hidden">
            <div className="divide-y divide-white/5">
              {[
                ['--app-font', 'Noto Sans SC', '全局字体（由字体选择器写入）'],
                ['--app-font-size', '16px', '全局基准字号（由字号滑块写入）'],
              ].map(([varName, defaultVal, desc]) => (
                <div key={varName} className="grid grid-cols-[12rem_auto_1fr] gap-x-4 items-start px-4 py-2 text-[10px]">
                  <code className="font-mono text-purple-400 shrink-0">{varName}</code>
                  <code className="font-mono opacity-40 shrink-0">{defaultVal}</code>
                  <span className="opacity-50">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[9px] text-green-400/60 uppercase tracking-widest px-1 font-bold">4. 全局主题 // Theme</p>
          <div className="rounded-2xl border border-echo-border overflow-hidden">
            <div className="divide-y divide-white/5">
              {[
                ['--echo-base', '#fdfdfd', '应用背景基色'],
                ['--echo-border', 'rgba(0,0,0,0.08)', '全局分割线/边框色'],
                ['--char-a-color', '#60a5fa', '多角色：主角色主题色'],
                ['--char-b-color', '#c084fc', '多角色：副角色主题色'],
              ].map(([varName, defaultVal, desc]) => (
                <div key={varName} className="grid grid-cols-[12rem_auto_1fr] gap-x-4 items-start px-4 py-2 text-[10px]">
                  <code className="font-mono text-green-400 shrink-0">{varName}</code>
                  <code className="font-mono opacity-40 shrink-0">{defaultVal}</code>
                  <span className="opacity-50">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[9px] text-teal-400/60 uppercase tracking-widest px-1 font-bold">5. 布局与尺寸 // Layout</p>
          <div className="rounded-2xl border border-echo-border overflow-hidden">
            <div className="divide-y divide-white/5">
              {[
                ['--echo-input-bottom-offset', '1rem', '输入框底部间距'],
                ['--echo-avatar-size', '2.25rem', '聊天头像尺寸'],
              ].map(([varName, defaultVal, desc]) => (
                <div key={varName} className="grid grid-cols-[12rem_auto_1fr] gap-x-4 items-start px-4 py-2 text-[10px]">
                  <code className="font-mono text-teal-400 shrink-0">{varName}</code>
                  <code className="font-mono opacity-40 shrink-0">{defaultVal}</code>
                  <span className="opacity-50">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[9px] text-rose-400/60 uppercase tracking-widest px-1 font-bold">6. 语义化组件锚点 // Semantic Classes</p>
          <div className="p-4 rounded-2xl border border-echo-border text-[11px] leading-relaxed opacity-80 font-mono space-y-1">
            <p className="text-rose-300">.echo-app-root <span className="text-gray-500 ml-2">// 根容器 (带 data-view 状态)</span></p>
            <p className="text-rose-300">.echo-message-list <span className="text-gray-500 ml-2">// 消息列表</span></p>
            <p className="text-rose-300">.echo-message-row <span className="text-gray-500 ml-2">// 独立消息行</span></p>
            <p className="text-rose-300">.echo-message-bubble <span className="text-gray-500 ml-2">// 消息气泡容器</span></p>
            <p className="text-rose-300">.echo-input-container <span className="text-gray-500 ml-2">// 底部输入区</span></p>
            <p className="text-rose-300">.echo-header-container <span className="text-gray-500 ml-2">// 顶部导航栏</span></p>
            <p className="text-rose-300">.echo-config-panel <span className="text-gray-500 ml-2">// 侧边设置面板</span></p>
          </div>
        </div>
      </div>

      {/* 示例 */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">示例</p>

        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="px-4 py-2 bg-purple-500/10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">暗色沉浸预设</span>
          </div>
          <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`.dark {
  --dialogue-bg: rgba(10, 10, 15, 0.9);
  --dialogue-text-dialogue: #f8fafc;
  --dialogue-text-narration: #94a3b8;
  --dialogue-text-thought: #818cf8;
  --stat-color-love: #fb7185;
}`}</pre>
        </div>

        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="px-4 py-2 bg-amber-500/10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">关闭毛玻璃效果</span>
          </div>
          <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`.glass-morphism {
  --dialogue-backdrop: none;
  background: rgba(255, 255, 255, 0.95);
}`}</pre>
        </div>

        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="px-4 py-2 bg-blue-500/10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">移动端 HTML 块字号</span>
          </div>
          <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`@media (max-width: 768px) {
  .echo-html-block * {
    font-size: 12px !important;
  }
}`}</pre>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-1">
        <p className="font-bold text-amber-400 uppercase tracking-widest">⚠️ 样式隔离与 Iframe 穿透</p>
        <p className="opacity-70 leading-relaxed">AI 生成的 HTML 内容运行在沙箱 iframe 中。如需定制 iframe 内部样式，请在 CSS 面板中使用特定注释包裹：<br/>
          <code className="text-amber-300 bg-black/20 px-1 py-0.5 rounded mt-1 inline-block">/* @iframe-start */<br/>body &#123; color: red; &#125;<br/>/* @iframe-end */</code>
        </p>
      </div>
    </div>
  );
};

export default CustomCssGuide;
