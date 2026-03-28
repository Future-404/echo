import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Layers, Database, Cpu, Info, ChevronRight, BarChart2, MessageCircle, Paintbrush, Users, Rocket } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const HELP_SECTIONS = [
  {
    id: 'quickstart',
    title: '快速开始',
    icon: <Rocket size={18} />,
    content: (
      <div className="space-y-6 text-xs md:text-sm">
        <p>Echo 是私有部署应用，需要配合后端服务使用。选择适合你的部署方式，完成后输入密码即可进入。</p>

        {/* 方式对比 */}
        <div className="grid grid-cols-1 gap-3">

          {/* Cloudflare 自动部署 */}
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2.5 bg-orange-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">方式一：GitHub + Cloudflare（推荐小白）</span>
              <span className="text-[9px] opacity-50">免费 · 全自动 · push 自动更新</span>
            </div>
            <div className="px-4 py-3 space-y-3 text-[10px]">
              <div className="space-y-1.5 opacity-80 leading-relaxed">
                <p><span className="font-bold">1.</span> Fork 本仓库到你的 GitHub 账号</p>
                <p><span className="font-bold">2.</span> 在 GitHub → Settings → Secrets 添加两个变量：</p>
              </div>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {[
                  ['CLOUDFLARE_API_TOKEN', 'Cloudflare → My Profile → API Tokens → 创建（模板选 Edit Cloudflare Workers，使用 cfut_ 开头的 token）'],
                  ['CLOUDFLARE_ACCOUNT_ID', 'Cloudflare Dashboard 右侧边栏 → Account ID'],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[auto_1fr] gap-x-3 px-3 py-2 border-b border-white/5 last:border-0">
                    <code className="text-blue-400 shrink-0">{k}</code>
                    <span className="opacity-50">{v}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 opacity-80 leading-relaxed">
                <p><span className="font-bold">3.</span> Actions → <strong>🚀 Setup (First Time)</strong> → Run workflow</p>
                <p className="opacity-60 pl-4">AUTH_TOKEN 输入框留空自动生成，或填入你想要的密码</p>
                <p><span className="font-bold">4.</span> 等约 2 分钟，在 workflow Summary 查看网站地址和 AUTH_TOKEN</p>
              </div>
              <p className="opacity-60">之后每次 push 自动重新部署，前后端一体，无需额外配置。</p>
            </div>
          </div>

          {/* Docker */}
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2.5 bg-blue-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">方式二：Docker 自托管</span>
              <span className="text-[9px] opacity-50">有服务器 · 完全私有</span>
            </div>
            <div className="px-4 py-3 space-y-2 text-[10px]">
              <pre className="p-3 text-[9px] font-mono opacity-60 bg-black/5 dark:bg-black/20 rounded-xl overflow-x-auto whitespace-pre">{`git clone https://github.com/your-username/echo.git && cd echo
cp .env.example .env
# 编辑 .env，将 AUTH_TOKEN 改为随机字符串（openssl rand -hex 32）
docker-compose up -d
# 访问 http://localhost:8888，输入 AUTH_TOKEN 进入`}</pre>
              <p className="opacity-50">数据持久化到 Docker volume，重启不丢失。</p>
            </div>
          </div>

          {/* Node.js 生产 */}
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2.5 bg-green-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">方式三：Node.js 生产部署</span>
              <span className="text-[9px] opacity-50">单端口 · 前后端一体</span>
            </div>
            <div className="px-4 py-3 space-y-2 text-[10px]">
              <pre className="p-3 text-[9px] font-mono opacity-60 bg-black/5 dark:bg-black/20 rounded-xl overflow-x-auto whitespace-pre">{`npm install && npm run build
cd echo-storage/node && npm install
AUTH_TOKEN=your_token node server.js
# 访问 http://your-server:3456，输入 AUTH_TOKEN 进入`}</pre>
              <p className="opacity-50">后端同时 serve 前端静态文件，只需一个端口。</p>
            </div>
          </div>
        </div>

        {/* 进入后第一步 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">进入后第一步</p>
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5 text-[10px]">
              {[
                ['1', '配置 API', '设置 → API 参数 → 填入 Endpoint、API Key、模型名称'],
                ['2', '导入角色卡', '主界面 → 点击角色区域 → 上传 PNG 角色卡（SillyTavern 格式）'],
                ['3', '开始对话', '选择角色后点击开场白，或直接在输入框发送消息'],
              ].map(([num, title, desc]) => (
                <div key={num} className="flex gap-3 px-4 py-2.5">
                  <span className="text-[9px] font-mono text-blue-400 opacity-60 w-3 shrink-0 mt-0.5">{num}</span>
                  <div>
                    <span className="font-bold text-gray-600 dark:text-gray-300">{title}</span>
                    <span className="opacity-60"> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-1">
          <p className="font-bold text-amber-400 uppercase tracking-widest">⚠️ AUTH_TOKEN 是唯一密码</p>
          <p className="opacity-70 leading-relaxed">后端必须设置 <code className="bg-white/10 px-1 rounded">AUTH_TOKEN</code> 环境变量，无此变量服务直接退出。这个 token 同时是网站访问密码和 API 鉴权凭证，请妥善保管，不要使用默认值。</p>
        </div>
      </div>
    )
  },
  {
    icon: <BookOpen size={18} />,
    content: (
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
    )
  },
  {
    id: 'world',
    title: '知识注入系统',
    icon: <Layers size={18} />,
    content: (
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
    )
  },
  {
    id: 'skills',
    title: '技能 Skills',
    icon: <Cpu size={18} />,
    content: (
      <div className="space-y-4 text-xs md:text-sm">
        <p>技能扩展赋予 AI 与系统交互的能力，使其不仅仅是一个对话框。</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>任务追踪：</strong> 自动解析对话中的任务进度，并实时更新任务栏。</li>
          <li><strong>属性感知：</strong> AI 可以感知角色的数值属性。</li>
          <li><strong>自定义插件：</strong> 开发者可通过 Skill API 扩展新的逻辑模块。</li>
        </ul>
      </div>
    )
  },
  {
    id: 'multichar',
    title: '双角色模式',
    icon: <Users size={18} />,
    content: (
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
    )
  },
  {
    id: 'status',
    title: '状态栏',
    icon: <BarChart2 size={18} />,
    content: (
      <div className="space-y-6 text-xs md:text-sm">
        <p>状态栏允许 AI 在回复中输出结构化的角色状态，并以可视化组件渲染在对话框内。</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>自动提取：</strong> 引擎自动识别状态标签，将数值同步到角色属性槽，无需手动解析。</li>
          <li><strong>自定义解析器：</strong> 在「数据提取规则」面板中，可为每个角色定义专属正则表达式，精确提取任意格式的状态数据。</li>
        </ul>

        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">推荐格式 · 写入角色卡 System Prompt</p>

          {/* status-container */}
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2 bg-blue-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">status-container</span>
              <span className="text-[9px] opacity-50">进度条 + 叙事块（推荐）</span>
            </div>
            <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`<status-container>
<time>傍晚 18:30</time>
<location>魔法学院图书馆</location>
<weather>晴</weather>
<love>72</love>
<hp>85/100</hp>
<thought>他今天主动来找我……</thought>
<comment>好感度小幅提升。</comment>
</status-container>`}</pre>
            <div className="px-4 py-2 text-[9px] opacity-50 border-t border-white/5">
              数字标签自动渲染为进度条；<code className="bg-white/10 px-1 rounded">thought</code> 蓝色斜体，<code className="bg-white/10 px-1 rounded">comment</code> 红色卡片。内置颜色：love→玫红，hp→红，mana→蓝。
            </div>
          </div>

          {/* status */}
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2 bg-purple-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">status</span>
              <span className="text-[9px] opacity-50">数据矩阵</span>
            </div>
            <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`<status>
<-角色状态->
|姓名|艾拉·斯塔尔|
|心情|有些紧张|
|好感|72|
<-环境信息->
|时间|傍晚 18:30|
|地点|魔法学院图书馆|
</status>`}</pre>
            <div className="px-4 py-2 text-[9px] opacity-50 border-t border-white/5">
              <code className="bg-white/10 px-1 rounded">{'<-标题->'}</code> 创建分节，<code className="bg-white/10 px-1 rounded">|键|值|</code> 渲染为标签卡片。
            </div>
          </div>

          {/* html */}
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2 bg-green-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">html</span>
              <span className="text-[9px] opacity-50">完全自定义界面</span>
            </div>
            <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`<html>
<div style="padding:12px;background:#1a1a2e;
  color:#eee;border-radius:12px;font-family:sans-serif">
  <div style="font-size:18px;font-weight:bold">艾拉</div>
  <div style="color:#f43f5e">好感度 ❤️ 72</div>
  <div style="color:#3b82f6">HP 85/100</div>
</div>
</html>`}</pre>
            <div className="px-4 py-2 text-[9px] opacity-50 border-t border-white/5">
              在沙箱 iframe 中渲染，支持完整 HTML/CSS/JS，样式完全隔离。
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'customcss',
    title: '自定义样式',
    icon: <Paintbrush size={18} />,
    content: (
      <div className="space-y-6 text-xs md:text-sm">
        <p>在「外观」设置面板底部的 <strong>Custom CSS</strong> 编辑框中输入 CSS，保存后立即生效，并随配置持久化。</p>

        {/* CSS 变量速查表 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">可用 CSS 变量</p>
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5">
              {[
                ['--dialogue-bg', 'rgba(255,255,255,0.70)', '对话框背景色（支持 rgba / 渐变）'],
                ['--dialogue-border', 'rgba(255,255,255,0.20)', '对话框边框颜色'],
                ['--dialogue-text-dialogue', '#000000', '对话文字颜色（引号内台词）'],
                ['--dialogue-text-narration', '#6b7280', '旁白文字颜色（居中小字）'],
                ['--dialogue-text-thought', '#6b7280', '心理描写颜色（斜体括号内）'],
                ['--dialogue-text-action', '#4b5563', '动作描写颜色（居中斜体）'],
                ['--char-a-color', '#60a5fa', '双角色模式：CharA 头像/名字颜色'],
                ['--char-b-color', '#c084fc', '双角色模式：CharB 头像/名字颜色'],
                ['--app-font', 'Noto Sans SC', '全局字体（也可在字体选择器中设置）'],
                ['--app-font-size', '16px', '全局字号（也可在字号滑块中设置）'],
                ['--custom-bg', 'none', '自定义背景图（url(...) 格式）'],
              ].map(([varName, defaultVal, desc]) => (
                <div key={varName} className="grid grid-cols-[auto_auto_1fr] gap-x-4 items-start px-4 py-2.5 text-[10px]">
                  <code className="font-mono text-blue-400 shrink-0">{varName}</code>
                  <code className="font-mono opacity-40 shrink-0">{defaultVal}</code>
                  <span className="opacity-50">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 示例 */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">示例</p>

          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2 bg-purple-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">暗色沉浸风</span>
            </div>
            <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`:root {
  --dialogue-bg: rgba(10, 10, 20, 0.88);
  --dialogue-border: rgba(100, 120, 255, 0.15);
  --dialogue-text-dialogue: #e2e8f0;
  --dialogue-text-narration: #64748b;
  --dialogue-text-thought: #818cf8;
  --dialogue-text-action: #94a3b8;
  --stat-color-love: #ff6b9d;
  --stat-color-hp: #f87171;
  --stat-color-mana: #818cf8;
}`}</pre>
          </div>

          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2 bg-amber-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">任意选择器覆盖</span>
            </div>
            <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`/* 对话框改为直角 */
.glass-morphism { border-radius: 0 !important; }

/* 自定义滚动条 */
.no-scrollbar { scrollbar-width: thin !important; }`}</pre>
          </div>

          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2 bg-green-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-400">双角色配色</span>
            </div>
            <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`:root {
  --char-a-color: #f43f5e;  /* CharA 改为玫红 */
  --char-b-color: #10b981;  /* CharB 改为绿色 */
}`}</pre>
          </div>

          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2 bg-blue-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">深浅色主题分别控制</span>
            </div>
            <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`/* 同时覆盖两个主题 */
:root {
  --dialogue-bg: rgba(20, 10, 40, 0.85);
}

/* 只覆盖深色模式 */
:root.dark {
  --dialogue-bg: rgba(0, 0, 0, 0.7);
  --dialogue-border: rgba(100, 80, 255, 0.2);
}

/* 只覆盖亮色模式 */
:root:not(.dark) {
  --dialogue-bg: rgba(255, 250, 240, 0.9);
}`}</pre>
          </div>

          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2 bg-rose-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">角色卡 HTML 内容样式覆盖</span>
            </div>
            <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`/* 统一缩小角色卡 HTML 内容的字号（移动端适配）*/
.echo-html-block * {
  font-size: 13px !important;
}

/* 覆盖角色卡状态栏背景色 */
.echo-html-block details {
  background: rgba(0, 0, 0, 0.6) !important;
}`}</pre>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-1">
          <p className="font-bold text-amber-400 uppercase tracking-widest">⚠️ 注意</p>
          <p className="opacity-70 leading-relaxed">自定义 CSS 以最高优先级注入，可覆盖任何内置样式。深色/浅色主题切换时，<code className="bg-white/10 px-1 rounded">:root</code> 变量会同时生效，如需区分主题请使用 <code className="bg-white/10 px-1 rounded">:root.dark</code> 选择器。</p>
        </div>
      </div>
    )
  },
  {
    title: '存储与存档',
    icon: <Database size={18} />,
    content: (
      <div className="space-y-6 text-xs md:text-sm">
        <p>ECHO 采用统一的 <code className="bg-white/10 px-1 rounded">StorageAdapter</code> 接口，所有数据（配置、对话、图片）存储在私有后端服务，支持多设备同步。</p>

        {/* 访问控制 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">访问控制</p>
          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-2 text-[11px] leading-relaxed opacity-80">
            <p>首次访问时显示密码输入页，输入正确的 <code className="bg-white/10 px-1 rounded">AUTH_TOKEN</code> 后进入应用。Token 存入浏览器 <code className="bg-white/10 px-1 rounded">localStorage</code>，后续自动登录。清除浏览器数据或换设备需重新输入。</p>
          </div>
        </div>

        {/* 存档机制 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">存档机制</p>
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5 text-[10px]">
              {[
                ['自动存档', '每次 AI 回复完成后自动生成快照，覆盖上一条自动档'],
                ['手动存档', '可创建多个命名存档，内容包含完整消息历史、任务进度、角色属性'],
                ['分支回溯', '长按历史消息可回滚到任意节点，自动创建分支存档，原存档不丢失'],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3 px-4 py-2.5">
                  <span className="font-bold text-gray-600 dark:text-gray-300 shrink-0 w-16">{title}</span>
                  <span className="opacity-60">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 后端部署 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">后端部署</p>
          <p className="opacity-60 text-[10px] leading-relaxed">配套开源后端 <code className="bg-white/10 px-1 rounded">echo-storage</code> 提供两种部署方式，共享同一套 REST API 协议。</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-orange-500/5 border border-orange-500/10 space-y-1.5">
              <p className="font-bold text-orange-400 text-[10px] uppercase tracking-widest">Cloudflare Workers</p>
              <p className="opacity-60 text-[10px] leading-relaxed">R2 存储配置与存档，D1 数据库存储图片。全球边缘节点，免费额度极充裕。</p>
              <div className="space-y-0.5 pt-1">
                {[
                  'wrangler r2 bucket create echo-storage',
                  'wrangler d1 create echo-images',
                  'wrangler d1 execute echo-images \\',
                  '  --file=schema.sql --remote',
                  'wrangler secret put AUTH_TOKEN',
                  'wrangler deploy',
                ].map((cmd, i) => (
                  <pre key={i} className="text-[9px] font-mono leading-relaxed opacity-60">{cmd}</pre>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-green-500/5 border border-green-500/10 space-y-1.5">
              <p className="font-bold text-green-400 text-[10px] uppercase tracking-widest">Node.js</p>
              <p className="opacity-60 text-[10px] leading-relaxed">SQLite 存储全部数据，适合本地服务器、家用 NAS、树莓派等环境。</p>
              <div className="space-y-0.5 pt-1">
                {[
                  'cd echo-storage/node',
                  'npm install',
                  'AUTH_TOKEN=your_secret node server.js',
                  '# 默认端口 3456',
                ].map((cmd, i) => (
                  <pre key={i} className={`text-[9px] font-mono leading-relaxed ${cmd.startsWith('#') ? 'opacity-30' : 'opacity-60'}`}>{cmd}</pre>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* API 协议 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">API 协议</p>
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5 text-[10px] font-mono">
              {[
                ['POST',   '/api/auth',           '验证密码，返回 token（无需鉴权）'],
                ['GET',    '/api/storage/:key',   '读取配置/存档（R2）'],
                ['PUT',    '/api/storage/:key',   '写入，body: string (text/plain)'],
                ['DELETE', '/api/storage/:key',   '删除指定 key'],
                ['GET',    '/api/images/:id',     '读取图片，返回 { base64 }'],
                ['PUT',    '/api/images/:id',     '上传，body: { base64: string }'],
                ['DELETE', '/api/images/:id',     '删除图片'],
              ].map(([method, path, desc]) => (
                <div key={path + method} className="grid grid-cols-[3.5rem_auto_1fr] gap-x-3 items-start px-4 py-2">
                  <span className={`font-bold shrink-0 ${method === 'GET' ? 'text-blue-400' : method === 'POST' ? 'text-yellow-400' : method === 'PUT' ? 'text-green-400' : 'text-red-400'}`}>{method}</span>
                  <code className="opacity-70 shrink-0">{path}</code>
                  <span className="opacity-40 font-sans">{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="opacity-40 text-[10px] px-1">除 <code className="bg-white/10 px-1 rounded">/api/auth</code> 外，所有请求需携带 <code className="bg-white/10 px-1 rounded">Authorization: Bearer &lt;token&gt;</code>。</p>
        </div>
      </div>
    )
  },
  {
    id: 'security',
    title: '安全与部署',
    icon: <Info size={18} />,
    content: (
      <div className="space-y-6 text-xs md:text-sm">
        <p>ECHO 采用单 Token 私有部署架构，网站本身受 <code className="bg-white/10 px-1 rounded">AUTH_TOKEN</code> 保护，未授权用户无法访问任何内容。</p>

        {/* 访问控制 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">访问控制机制</p>
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5 text-[10px]">
              {[
                ['密码网关', '首次访问显示密码输入页，输入 AUTH_TOKEN 后才能进入应用'],
                ['Token 缓存', '验证成功后 token 存入 localStorage，同设备同浏览器自动登录'],
                ['API 鉴权', '所有后端请求携带 Authorization: Bearer <token>，无效 token 返回 401'],
                ['换设备登录', '清除浏览器数据或换设备需重新输入密码'],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3 px-4 py-2.5">
                  <span className="font-bold text-gray-600 dark:text-gray-300 shrink-0 w-20">{title}</span>
                  <span className="opacity-60">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 部署安全建议 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">部署安全建议</p>
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5 text-[10px]">
              {[
                ['强随机 Token', '使用 openssl rand -hex 32 生成至少 32 字符的 AUTH_TOKEN'],
                ['限制 CORS', '生产环境将 ALLOWED_ORIGIN 设为前端域名，不使用 *'],
                ['HTTPS 部署', 'Cloudflare Workers 自动提供 HTTPS；Node.js 需配置 Nginx/Caddy 反向代理'],
                ['定期备份', 'Node.js 版本定期备份 echo.db；Cloudflare 自动备份'],
                ['Token 泄露', '立即在后端重新设置 AUTH_TOKEN，旧 token 立即失效'],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3 px-4 py-2.5">
                  <span className="font-bold text-gray-600 dark:text-gray-300 shrink-0 w-24">{title}</span>
                  <span className="opacity-60">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 部署检查清单 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">部署检查清单</p>
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5">
              {[
                '✅ AUTH_TOKEN 已设置为强随机字符串（非默认值）',
                '✅ ALLOWED_ORIGIN 已设为前端域名',
                '✅ 使用 HTTPS 访问',
                '✅ 已测试密码登录流程',
                '✅ 已测试 API 数据读写',
                '✅ 数据库已初始化（D1 schema 或 SQLite 文件）',
              ].map((item, i) => (
                <div key={i} className="px-4 py-2 text-[10px] opacity-70 font-mono">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* API Key 安全 */}
        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-1">
          <p className="font-bold text-amber-400 uppercase tracking-widest">⚠️ API Key 安全提示</p>
          <ul className="list-disc pl-5 space-y-1 opacity-70 leading-relaxed">
            <li>API Key 以明文存储在后端数据库，后端安全即数据安全</li>
            <li>建议在 OpenAI/Anthropic 控制台设置 <strong>每月消费限额</strong></li>
            <li>不要在公共设备上使用，或使用后清除浏览器数据</li>
            <li>定期检查 API 使用量，避免意外超支</li>
          </ul>
        </div>

        {/* 技术架构 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">技术架构</p>
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="divide-y divide-white/5 text-[10px]">
              {[
                ['前端框架', 'React 18 + TypeScript + Vite'],
                ['渲染引擎', 'PixiJS 7 (WebGL)'],
                ['状态管理', 'Zustand + Persist'],
                ['访问控制', 'AUTH_TOKEN 单密码网关'],
                ['后端选项', 'Cloudflare R2 + D1 / Node.js + SQLite'],
              ].map(([key, value]) => (
                <div key={key} className="grid grid-cols-[6rem_1fr] gap-x-4 px-4 py-2.5">
                  <span className="font-bold text-gray-600 dark:text-gray-300">{key}</span>
                  <span className="opacity-60 font-mono">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'api',
    title: 'API 规范',
    icon: <Cpu size={18} />,
    content: (
      <div className="space-y-4 text-xs md:text-sm">
        <p>本系统遵循标准 AI 接口协议，支持多种 Provider 切换。</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>兼容性：</strong> 支持 OpenAI、Anthropic、Gemini 及所有兼容 OpenAI 格式的接口（本地 Ollama、第三方中转等）。</li>
          <li><strong>流式响应：</strong> 默认开启打字机效果，提供更自然的交互体验。</li>
          <li><strong>参数控制：</strong> 允许针对不同角色设置独立的 Temperature 和 Top_P 参数。</li>
        </ul>
      </div>
    )
  },
  {
    id: 'feedback',
    title: '交流与反馈',
    icon: <MessageCircle size={18} />,
    content: (
      <div className="space-y-6 text-xs md:text-sm">
        <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10">
          <p className="text-blue-500 font-bold mb-2">加入交流反馈群</p>
          <p className="opacity-80 leading-relaxed mb-4">欢迎加入我们的社区，与其他创作者交流心得，或向开发团队反馈 Bug 与建议。</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-widest text-gray-400 uppercase">QQ Group // 群号</span>
            <code className="text-lg md:text-2xl font-mono text-blue-500 tracking-tighter bg-blue-500/10 px-3 py-1 rounded-xl">616353694</code>
          </div>
        </div>
        <div className="space-y-2 opacity-60">
          <p>• 提交 Issue：请前往项目的 GitHub 仓库。</p>
        </div>
      </div>
    )
  }
];

const HelpScreen: React.FC = () => {
  const { setCurrentView } = useAppStore();
  const [activeTab, setActiveTab] = useState(HELP_SECTIONS[0].id);

  const activeSection = HELP_SECTIONS.find(s => s.id === activeTab) || HELP_SECTIONS[0];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-echo-base dark:bg-[#0a0a0a] flex items-center justify-center p-0 md:p-10"
    >
      <div className="relative w-full max-w-5xl h-full md:h-[85vh] bg-white dark:bg-[#0d0d0d] md:border-0.5 md:border-echo-border md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* 关闭按钮 */}
        <button 
          onClick={() => setCurrentView('home')}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 md:p-3 rounded-full bg-white/50 dark:bg-black/20 md:bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 z-20 transition-all"
        >
          <X size={20} />
        </button>

        {/* 导航区域 */}
        <div className="w-full md:w-72 border-b-0.5 md:border-b-0 md:border-r-0.5 border-gray-100 dark:border-gray-800 p-4 md:p-8 flex flex-col shrink-0">
          <div className="mb-4 md:mb-8 hidden md:block">
            <h2 className="text-[10px] tracking-[0.5em] text-gray-400 uppercase font-medium">System Guide</h2>
            <p className="text-xl font-serif text-gray-800 dark:text-gray-100 mt-2">引导手册</p>
          </div>
          
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {HELP_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`flex-shrink-0 flex items-center gap-2 md:gap-4 px-4 md:px-5 py-2 md:py-4 rounded-xl md:rounded-2xl transition-all ${
                  activeTab === section.id 
                    ? 'bg-blue-500/10 text-blue-500 font-bold' 
                    : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <span className={`${activeTab === section.id ? 'text-blue-500' : 'text-gray-400'} scale-90 md:scale-100`}>
                  {section.icon}
                </span>
                <span className="text-[10px] md:text-xs tracking-widest uppercase whitespace-nowrap">{section.title}</span>
                <ChevronRight size={14} className="ml-auto hidden md:block" />
              </button>
            ))}
          </nav>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 p-6 md:p-16 overflow-y-auto no-scrollbar bg-white dark:bg-[#0d0d0d] select-text cursor-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-2xl"
            >
              <div className="mb-6 md:mb-10">
                <div className="hidden md:flex w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 items-center justify-center text-blue-500 mb-6 border-0.5 border-gray-100 dark:border-gray-800">
                  {activeSection.icon}
                </div>
                <h3 className="text-xl md:text-3xl font-serif text-gray-800 dark:text-gray-100 mb-2">{activeSection.title}</h3>
                <div className="w-8 md:w-12 h-[2px] bg-blue-500/30" />
              </div>
              
              <div className="text-gray-500 dark:text-gray-400 leading-relaxed font-sans">
                {activeSection.content}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default HelpScreen;
