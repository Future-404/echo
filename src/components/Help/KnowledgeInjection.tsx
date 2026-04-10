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
            ['1', '角色核心人格', '角色卡的 system_prompt 字段'],
            ['2', '用户人格', '当前激活的 Persona 名称、背景描述及其私有世界书条目'],
            ['3', '预设包指令', '角色卡绑定的预设包中 enabled 的 Directive（无 depth 的部分）'],
            ['4', '全局指令 Directive', '配置面板手动添加的全局 Directive'],
            ['5', '世界书 / 角色私设', '关键词命中的公共书库条目 + 角色私有条目，按 insertionOrder 排序'],
            ['6', '属性状态槽', '角色当前的数值属性（由状态栏自动提取并同步）'],
            ['7', '技能指令', '已启用技能的专属 Prompt（如任务追踪）'],
            ['8', 'Depth 注入', '预设包中 depth > 0 的 Directive，插入到历史消息倒数第 N 条之前'],
          ].map(([num, title, desc]) => (
            <div key={num} className="flex gap-3 items-start">
              <span className="text-[9px] font-mono text-blue-400 opacity-60 mt-0.5 w-3 shrink-0">{num}</span>
              <div>
                <span className="font-bold text-echo-text-primary">{title}</span>
                <span className="opacity-60"> — {desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 预设包 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">预设包 Prompt Preset</p>
        <div className="grid grid-cols-1 gap-3">
          <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-1.5 text-[10px]">
            <p className="font-bold text-purple-400 uppercase tracking-widest">什么是预设包</p>
            <p className="opacity-70 leading-relaxed">预设包是一组 Directive 的集合，可以从兼容的 Instruct 预设 JSON 文件导入。每个角色卡可以独立绑定不同的预设包，实现「不同角色使用不同写作风格指令」。</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-1">
              <p className="font-bold text-blue-400 text-[10px] uppercase tracking-widest">普通 Directive</p>
              <p className="opacity-60 text-[10px] leading-relaxed">depth 为空，注入到 System Prompt 的 PROTOCOLS 段。</p>
            </div>
            <div className="p-3 rounded-2xl bg-green-500/5 border border-green-500/10 space-y-1">
              <p className="font-bold text-green-400 text-[10px] uppercase tracking-widest">Depth Directive</p>
              <p className="opacity-60 text-[10px] leading-relaxed">depth = N，插入到历史消息倒数第 N 条之前，紧贴最近对话。</p>
            </div>
          </div>
        </div>
      </div>

      {/* 世界书触发规则 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">世界书触发规则</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden">
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
