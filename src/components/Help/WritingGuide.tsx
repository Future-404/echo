import React from 'react';
import { BookOpen } from 'lucide-react';

const WritingGuide: React.FC = () => {
  return (
    <div className="space-y-6 text-xs md:text-sm">
      <p>ECHO 引擎深度兼容主流角色卡协议（SillyTavern V1/V2），并针对沉浸式叙事进行了增强。一个标准的角色卡由视觉立绘与结构化 JSON 数据组成。</p>

      {/* 动态宏系统 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">动态宏 // Macros</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            ['{{char}}', '角色名称'],
            ['{{user}}', '用户名称'],
            ['{{other}}', '第三者/副角色名'],
            ['{{time}}', '当前系统时间 (14:30)'],
            ['{{date}}', '当前日期 (2026-03-26)'],
            ['{{weekday}}', '星期几 (Thursday)'],
            ['{{current_quest}}', '当前主线任务标题'],
            ['{{description}}', '用户 Persona 描述'],
            ['{{background}}', '用户 Persona 背景'],
            ['{{original}}', '系统原力 (全局指令)'],
          ].map(([code, title]) => (
            <div key={code} className="flex items-center justify-between p-2 px-3 rounded-xl bg-white/5 border border-white/5">
              <code className="text-blue-400 font-mono text-[10px]">{code}</code>
              <span className="text-[10px] opacity-50">{title}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] opacity-40 px-1 mt-1">提示：{"{{original}}"} 建议放置在 System Prompt 末尾以注入全局规则。</p>
      </div>

      {/* 创作指南 */}
      <div className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">创作指南 // Writing Guide</p>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-1 rounded-full bg-blue-500/30 shrink-0" />
            <div>
              <p className="font-bold text-[11px]">System Prompt (核心设定)</p>
              <p className="opacity-60 text-[10px] leading-relaxed mt-1">
                角色的“灵魂指令”。建议使用第二人称「你」来描述，定义语气、口癖及核心性格。
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-1 rounded-full bg-purple-500/30 shrink-0" />
            <div>
              <p className="font-bold text-[11px]">Description (外貌与背景)</p>
              <p className="opacity-60 text-[10px] leading-relaxed mt-1">
                描述视觉特征。推荐使用标签式写法（如：[头发：银色][性格：傲娇]）以节省 Token。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 沉浸式标签注入 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">高级技巧：UI 引导</p>
        <p className="opacity-60 text-[10px] leading-relaxed">
          你可以要求 AI 在特定情况下输出标签以控制前端 UI 表现。
        </p>
        <pre className="p-3 text-[9px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono rounded-xl border border-white/10">
{`// 示例：要求 AI 描述内心活动
请在回复开头使用 <thought>内容</thought> 
输出角色的潜意识想法。`}
        </pre>
      </div>

      {/* 技术规格 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">技术规格 // Specs</p>
        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden divide-y divide-white/5">
          {[
            ['PNG 隐写', '支持读取图片中的 tEXt/iTXt 数据块。'],
            ['V2 规范', '支持 character_book 与多开场白切换。'],
            ['正则表达式', '支持角色卡自带的 JS 正则转换逻辑。'],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-4 px-4 py-3 items-center">
              <span className="font-bold text-[10px] w-20 shrink-0">{title}</span>
              <span className="opacity-50 text-[10px]">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WritingGuide;
