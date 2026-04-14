import React from 'react';
import { CSS_VAR_GROUPS } from '../../styles/cssVariables';

const COLOR_MAP: Record<string, string> = {
  blue: 'text-blue-400', orange: 'text-orange-400', purple: 'text-purple-400',
  green: 'text-green-400', sky: 'text-sky-400', indigo: 'text-indigo-400',
  teal: 'text-teal-400', rose: 'text-rose-400',
}

const CustomCssGuide: React.FC = () => (
  <div className="space-y-6 text-xs md:text-sm">
    <p>ECHO 支持通过 CSS 变量和选择器覆盖进行深度视觉定制。自定义样式持久化存储，随账户同步。</p>

    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">核心机制</p>
      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-[11px] leading-relaxed opacity-80">
        <p>系统用 <code className="bg-white/10 px-1 rounded">MutationObserver</code> 将 <code className="bg-white/10 px-1 rounded">#user-custom-css</code> 始终保持在 <code className="bg-white/10 px-1 rounded">&lt;head&gt;</code> 末尾，优先级高于 Tailwind，无需 <code className="bg-white/10 px-1 rounded">!important</code> 即可覆盖大多数样式。</p>
      </div>
    </div>

    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">设计令牌速查表</p>
      {CSS_VAR_GROUPS.map(group => (
        <div key={group.label} className="space-y-2">
          <p className={`text-[9px] uppercase tracking-widest px-1 font-bold opacity-60 ${COLOR_MAP[group.color] ?? 'text-gray-400'}`}>
            {group.label}
          </p>
          <div className="rounded-2xl border border-echo-border overflow-hidden">
            <div className="divide-y divide-white/5">
              {group.vars.map(v => (
                <div key={v.name} className="grid grid-cols-[12rem_auto_1fr] gap-x-4 items-start px-4 py-2 text-[10px]">
                  <code className={`font-mono shrink-0 ${COLOR_MAP[group.color] ?? 'text-gray-400'}`}>{v.name}</code>
                  <code className="font-mono opacity-40 shrink-0">{v.default}</code>
                  <span className="opacity-50">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>

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
)

export default CustomCssGuide;
