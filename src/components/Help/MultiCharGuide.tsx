import React from 'react';
import { Users } from 'lucide-react';

const MultiCharGuide: React.FC = () => {
  return (
    <div className="space-y-6 text-xs md:text-sm">
      <p>双角色模式允许同时与两个 AI 角色（CharA、CharB）和一个用户（User）进行三方对话。每个角色可绑定独立的模型和供应商。</p>

      {/* 运行流程 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">每轮对话运行流程</p>
        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['1', 'Router 决策', '前置路由模型分析上下文，调用 route_response 工具，决定本轮由谁发言、顺序如何。不输出任何对话内容。'],
              ['2', 'Dispatcher 调度', '按 Router 返回的 actions 队列串行执行，每个 speak action 触发对应角色的独立 API 请求。'],
              ['3', 'CharA 发言', '使用折叠合并法重构消息历史：CharA 自己的历史为 assistant，其余所有人的发言合并为带名字前缀的 user 消息。'],
              ['4', 'CharB 发言', '同上，视角切换为 CharB。CharA 刚才的回复已包含在折叠后的 user 消息中，CharB 能看到完整上下文。'],
              ['5', '状态栏跟随', '状态栏自动显示最后发言角色的属性，头像区高亮当前发言者。'],
            ].map(([num, title, desc]) => (
              <div key={num} className="flex gap-3 px-4 py-2.5">
                <span className="text-[9px] font-mono text-blue-400 opacity-60 shrink-0 w-3 mt-0.5">{num}</span>
                <div>
                  <span className="font-bold text-gray-600 dark:text-gray-300">{title}</span>
                  <span className="opacity-60"> — {desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 上下文折叠合并法 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">上下文折叠合并法</p>
        <p className="opacity-60 text-[10px] leading-relaxed">CharB 上次发言之后发生的所有事情（User 发言 + CharA 发言），合并为一条 user 消息发给 CharB，加 <code className="bg-white/10 px-1 rounded">[名字]:</code> 前缀区分说话者。这样完全规避了 Anthropic 等模型对 role 交替的严格要求。</p>
        <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono rounded-2xl border border-white/10 dark:border-white/5">{`// CharB 视角的消息历史示例
{ role: "assistant", content: "你好，我是 CharB" }
{ role: "user",      content: "[User]: 今天去哪？\\n[CharA]: 我想去图书馆" }
// ↑ User 和 CharA 的发言折叠为一条`}</pre>
      </div>

      {/* 防止多重扮演 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">防止模型多重扮演</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-1">
            <p className="font-bold text-blue-400 text-[10px] uppercase tracking-widest">System Prompt 边界</p>
            <p className="opacity-60 text-[10px] leading-relaxed">每个角色的 System Prompt 末尾自动注入多人场景规则，明确禁止模型替他人发言或生成 <code className="bg-white/10 px-1 rounded">[CharA]:</code> 前缀。</p>
          </div>
          <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/10 space-y-1">
            <p className="font-bold text-purple-400 text-[10px] uppercase tracking-widest">Stop Sequence</p>
            <p className="opacity-60 text-[10px] leading-relaxed">API 请求自动加入 stop 参数，一旦模型试图生成其他角色的发言前缀，输出立即被截断。</p>
          </div>
        </div>
      </div>

      {/* 模型选择建议 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">模型选择建议</p>
        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['Router', '小模型 / 快模型', 'gpt-4o-mini、claude-haiku、gemini-flash', '只做路由决策，不需要强大的创作能力，优先选延迟低、价格便宜的模型。每轮消耗约 200-500 tokens。'],
              ['CharA / CharB', '主力创作模型', 'gpt-4o、claude-sonnet、gemini-pro', '负责实际对话内容，建议选择角色扮演能力强的模型。可以为两个角色选择不同模型以体现性格差异。'],
            ].map(([role, type, examples, desc]) => (
              <div key={role} className="px-4 py-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-600 dark:text-gray-300 w-16 shrink-0">{role}</span>
                  <span className="text-blue-400 opacity-70">{type}</span>
                </div>
                <p className="opacity-40 font-mono pl-[4.5rem]">{examples}</p>
                <p className="opacity-50 pl-[4.5rem] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Token 消耗 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Token 消耗估算（每轮对话）</p>
        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['Router 请求', '~200–500', '系统提示 + 近期上下文 + tool schema'],
              ['CharA 请求', '~1000–3000', '完整 system prompt + 折叠后历史 + 输出'],
              ['CharB 请求', '~1000–3000', '同上，包含 CharA 本轮回复'],
              ['合计（单轮）', '~2200–6500', '约为单角色模式的 2.5–3 倍'],
            ].map(([item, tokens, note]) => (
              <div key={item} className="grid grid-cols-[auto_5rem_1fr] gap-x-4 items-start px-4 py-2.5">
                <span className="text-gray-600 dark:text-gray-300 font-medium">{item}</span>
                <span className="font-mono text-amber-400 text-right">{tokens}</span>
                <span className="opacity-40">{note}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="opacity-40 text-[10px] px-1 leading-relaxed">实际消耗取决于 system prompt 长度、世界书条目数量、对话历史长度（contextWindow 设置）。建议将 CharA/B 的 contextWindow 设为 10–15，Router 固定使用最近 6 条消息。</p>
      </div>

      {/* Router 错误处理 */}
      <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-1">
        <p className="font-bold text-amber-400 uppercase tracking-widest">Router 错误处理</p>
        <p className="opacity-70 leading-relaxed">
          <strong>网络错误 / HTTP 失败 / 模型未返回 tool call：</strong>系统在对话框显示错误提示并停止本轮对话，不会继续触发 CharA/B 的请求。重新发送你的消息即可重新唤醒 Router。
        </p>
        <p className="opacity-70 leading-relaxed mt-1">
          <strong>Router 返回格式异常（JSON 解析失败 / speakerId 非法）：</strong>系统自动 fallback 为固定顺序（CharA → CharB），对话正常继续。
        </p>
        <p className="opacity-70 leading-relaxed mt-1">
          <strong>未配置 Router Provider / apiKey 为空：</strong>同样 fallback 为固定顺序（CharA → CharB），不报错。
        </p>
      </div>
    </div>
  );
};

export default MultiCharGuide;
