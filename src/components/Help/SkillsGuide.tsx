import React from 'react';
import { Cpu } from 'lucide-react';

const SkillsGuide: React.FC = () => {
  return (
    <div className="space-y-6 text-xs md:text-sm">
      <p>技能扩展赋予 AI 与 system 交互的能力。目前内置一个核心技能：<strong>任务追踪（manage_quest_state）</strong>。</p>

      {/* 工作原理 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">工作原理</p>
        <p className="opacity-80 leading-relaxed">AI 在判断剧情发生关键推进时，会主动调用 <code className="bg-white/10 px-1 rounded text-[10px]">manage_quest_state</code> 工具函数，系统捕获调用后更新任务栏 UI。整个过程对用户透明，无需手动触发。</p>
      </div>

      {/* 四个 Action */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Action 类型</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['CREATE', 'text-green-400', '创建新任务。需提供 quest_id、title，可选 description、progress_delta（初始进度）。'],
              ['UPDATE', 'text-blue-400', '更新任务进度。progress_delta 为增量（-20 ~ +30），正数推进，负数表示挫折。进度达到 100 自动变为 COMPLETED。'],
              ['RESOLVE', 'text-yellow-400', '强制完成任务，progress 置为 100，status 变为 COMPLETED。'],
              ['FAIL', 'text-red-400', '任务失败，status 变为 FAILED，标题显示删除线。'],
            ].map(([action, color, desc]) => (
              <div key={action as string} className="flex gap-3 px-4 py-2.5">
                <span className={`font-mono font-bold shrink-0 w-16 ${color}`}>{action}</span>
                <span className="opacity-70 leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 任务类型 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">任务类型</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['MAIN', '主线任务', '始终显示在任务栏顶部，带进度条。quest_id 以 main_ 开头时自动识别，或在 CREATE 时指定 quest_type: MAIN。同时只建议存在一个激活的主线任务。'],
              ['SIDE', '支线任务', '折叠在 Side (N) 按钮下，点击展开。quest_id 以 side_ 开头时自动识别。支持多个并行。'],
            ].map(([type, name, desc]) => (
              <div key={type as string} className="flex gap-3 px-4 py-2.5">
                <div className="shrink-0 w-20">
                  <span className="font-mono font-bold text-blue-400">{type}</span>
                  <span className="block opacity-50">{name}</span>
                </div>
                <span className="opacity-70 leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 角色卡设计指南 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">角色卡设计指南</p>
        <div className="space-y-3 opacity-80 leading-relaxed">
          <p><strong>1. 在 System Prompt 中声明任务结构</strong><br />
          明确告诉 AI 本卡有哪些预设任务线，以及触发条件。例如：</p>
          <pre className="bg-white/5 rounded-xl p-3 text-[10px] font-mono whitespace-pre-wrap leading-relaxed">{`【任务系统说明】
主线任务 main_escape：帮助角色逃离宫廷，初始进度 0。
- 获得太后信任 → UPDATE +15
- 找到密道 → UPDATE +25  
- 成功出逃 → RESOLVE

支线任务 side_romance：与端王发展感情线。
- 每次深度对话 → UPDATE +10
- 表白成功 → RESOLVE`}</pre>

          <p><strong>2. quest_id 命名规范</strong><br />
          使用 <code className="bg-white/10 px-1 rounded">main_</code> 或 <code className="bg-white/10 px-1 rounded">side_</code> 前缀，后接语义化英文 ID，如 <code className="bg-white/10 px-1 rounded">main_find_truth</code>、<code className="bg-white/10 px-1 rounded">side_help_npc</code>。避免使用数字或中文作为 ID。</p>

          <p><strong>3. 利用 description 传递叙事摘要</strong><br />
          每次 UPDATE 时更新 description，记录当前进展摘要。用户点击任务标题可展开查看，有助于长对话中保持叙事连贯性。</p>

          <p><strong>4. progress_delta 的节奏控制</strong><br />
          建议单次 delta 不超过 20，让任务进度有明显的阶段感。可以用负数表示挫折（如被发现、失去道具），增加戏剧张力。</p>

          <p><strong>5. ui_toast 提示语</strong><br />
          在关键节点提供简短的系统提示，如 <code className="bg-white/10 px-1 rounded">"发现了关于密道的线索"</code>，会以浮动通知形式出现，增强沉浸感。</p>

          <p><strong>6. 回滚安全性</strong><br />
          任务状态与消息历史绑定。当用户使用分支功能回到历史节点时，任务进度会自动重放到对应状态，不会出现进度错乱。</p>
        </div>
      </div>

      {/* 初始任务预设 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">初始任务预设</p>
        <p className="opacity-80 leading-relaxed">在角色卡的 <code className="bg-white/10 px-1 rounded">extensions.missions</code> 字段中可预置初始任务列表，角色被选中时自动加载，无需等待 AI 第一次调用 CREATE。</p>
      </div>

      <p className="opacity-40 italic text-[10px]">更多 Skills 正在开发中 —</p>
    </div>
  );
};

export default SkillsGuide;
