import React from 'react';
import { BarChart2 } from 'lucide-react';

const StatusProtocol: React.FC = () => {
  return (
    <div className="space-y-6 text-xs md:text-sm">
      <p>ECHO 拥有一套强大的结构化渲染引擎，允许 AI 通过输出特定的标记符号来直接构建 UI 组件（如进度条、数据矩阵）。</p>
      
      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-2 text-[11px] leading-relaxed">
        <p><strong>核心语法：</strong> <code className="bg-white/10 px-1 rounded">{"{{类型|内容}}"}</code></p>
        <p className="opacity-70">当 AI 输出符合此格式的内容时，文本会被拦截并转化为对应的可视化卡片。你可以通过 System Prompt 引导模型掌握此协议。</p>
      </div>

      <div className="space-y-4">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">主流渲染组件 // Renderers</p>

        {/* status-container */}
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="px-4 py-2 bg-orange-500/10 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">status-container // 同步矩阵</span>
            <span className="text-[9px] opacity-50">中文语义化协议（推荐）</span>
          </div>
          <div className="p-4 space-y-3">
            <pre className="text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono p-3 rounded-xl border border-white/5">{`{{status-container|
<哈基米值>95</哈基米值>
<血量>80/100</血量>
<能量>1200/2000</能量>
<时间>深夜 02:00</时间>
}}`}</pre>
            <div className="space-y-2 text-[10px] opacity-80 leading-relaxed">
              <p>• <strong>中文标签驱动</strong>：系统优先解析中文语义标签。标签名内允许包含空格。</p>
              <p>• <strong>智能匹配</strong>：<code className="bg-white/10 px-1 rounded">血量</code> 自动匹配红色条，<code className="bg-white/10 px-1 rounded">能量</code> 自动匹配蓝色条。</p>
              <p>• <strong>自定义扩展</strong>：如 <code className="bg-white/10 px-1 rounded">哈基米值</code> 等非预设标签，可在 Custom CSS 中定义变量手动上色。</p>
            </div>
          </div>
        </div>

        {/* status */}
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="px-4 py-2 bg-purple-500/10 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">status // 属性矩阵</span>
            <span className="text-[9px] opacity-50">适合多维度文本属性</span>
          </div>
          <div className="p-4 space-y-3">
            <pre className="text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono p-3 rounded-xl border border-white/5">{`{{status|
<-核心状态->
|好感|极高|
|心情|有些兴奋|
<-外部环境->
|天气|电磁风暴|
}}`}</pre>
            <p className="text-[10px] opacity-80 leading-relaxed italic">使用表格语法快速构建紧凑的信息展示区。</p>
          </div>
        </div>

        {/* Iframe */}
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="px-4 py-2 bg-green-500/10 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">html // 终极自定义界面</span>
            <span className="text-[9px] opacity-50">全沙箱隔离渲染</span>
          </div>
          <div className="p-4">
            <p className="text-[10px] opacity-80 leading-relaxed mb-3">支持完整的 HTML/CSS 结构。甚至可以引导 AI 输出包含内联 JavaScript 的小型交互组件。</p>
            <pre className="text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono p-3 rounded-xl border border-white/5">{`{{html|
<div style="color: cyan; border: 1px solid">
  检测到终端指令注入...
</div>
}}`}</pre>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-1">
        <p className="font-bold text-amber-400 uppercase tracking-widest">💡 动态配色小贴士</p>
        <p className="opacity-70 leading-relaxed">进度条的颜色是自动匹配的。例如标签名为 <code className="bg-white/10 px-1 rounded">&lt;sanity&gt;</code>，你可以通过 Custom CSS 设置 <code className="bg-white/10 px-1 rounded">--stat-color-sanity: #00ff00;</code> 来实时为其上色。默认颜色可在「自定义样式」文档中查看。</p>
      </div>
    </div>
  );
};

export default StatusProtocol;
