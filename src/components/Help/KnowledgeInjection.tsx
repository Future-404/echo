import React from 'react';
import { Layers } from 'lucide-react';

const KnowledgeInjection: React.FC = () => {
  return (
    <div className="space-y-6 text-xs md:text-sm">
      <p>Echo 的 Prompt 由多个层次按固定顺序拼接，每次发送消息时动态构建。理解这套机制有助于写出更精准的角色卡。</p>

      {/* 注入顺序 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Prompt 构建顺序</p>
        <div className="space-y-1.5">
          {[
            ['1', '角色核心人格', '角色卡的 system_prompt 字段，支持 {{original}} 占位符引用全局设置'],
            ['2', '用户人格', '当前激活的 Persona 名称、背景描述及其私有世界书条目'],
            ['3', '全局指令 Directive', '配置面板中启用的所有 Directive，对所有角色生效'],
            ['4', '世界书 / 角色私设', '关键词命中的公共书库条目 + 角色私有条目，按 insertionOrder 排序'],
            ['5', '属性状态槽', '角色当前的数值属性（由状态栏自动提取并同步）'],
            ['6', '技能指令', '已启用技能的专属 Prompt（如任务追踪）'],
            ['7', '格式规则', '渲染引擎强制约定，不可覆盖'],
          ].map(([num, title, desc]) => (
            <div key={num} className="flex gap-3 items-start">
              <span className="text-[9px] font-mono text-blue-400 opacity-60 mt-0.5 w-3 shrink-0">{num}</span>
              <div>
                <span className="font-bold text-gray-700 dark:text-gray-200">{title}</span>
                <span className="opacity-60"> — {desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 世界书触发规则 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">世界书触发规则</p>
        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5">
            {[
              ['🔒 disabled', '灰色', 'enabled = false，永不注入'],
              ['📌 constant', '琥珀色', 'constant = true，始终注入，无视关键词'],
              ['🔑 无关键词', '蓝色', 'keys 为空，始终注入'],
              ['🔍 关键词匹配', '蓝色', '最近 N 条消息中出现任意一个 key（不区分大小写）'],
            ].map(([state, , rule]) => (
              <div key={state} className="flex items-start gap-3 px-4 py-2.5 text-[10px]">
                <span className="opacity-70 shrink-0 w-28">{state}</span>
                <span className="opacity-50">{rule}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="opacity-50 text-[10px] px-1">扫描深度（N）在每本世界书的编辑页单独设置，默认 3 条，取所有绑定书中的最大值生效。</p>
      </div>

      {/* 两种来源 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">两种知识来源</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-1">
            <p className="font-bold text-blue-400 text-[10px] uppercase tracking-widest">公共书库</p>
            <p className="opacity-60 text-[10px] leading-relaxed">在「世界书库」中创建，可绑定到多个角色。适合跨角色共享的世界观设定。</p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-1">
            <p className="font-bold text-purple-400 text-[10px] uppercase tracking-widest">角色私设</p>
            <p className="opacity-60 text-[10px] leading-relaxed">直接挂在角色卡上，全量注入（仍受 enabled 控制），适合角色专属记忆与隐藏设定。</p>
          </div>
        </div>
      </div>

      {/* {{original}} */}
      <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-1">
        <p className="font-bold text-amber-400 uppercase tracking-widest">{'💡 {{original}} 占位符'}</p>
        <p className="opacity-70 leading-relaxed">在角色卡的 system_prompt 中写入 <code className="bg-white/10 px-1 rounded">{'{{original}}'}</code>，会被替换为「全局 Directive + 格式规则」的完整内容，实现角色提示词与全局设置的叠加而非覆盖。</p>
      </div>
    </div>
  );
};

export default KnowledgeInjection;
