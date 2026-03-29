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
      <div className="space-y-6 text-xs md:text-sm">
        <p>技能扩展赋予 AI 与系统交互的能力。目前内置一个核心技能：<strong>任务追踪（manage_quest_state）</strong>。</p>

        {/* 工作原理 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">工作原理</p>
          <p className="opacity-80 leading-relaxed">AI 在判断剧情发生关键推进时，会主动调用 <code className="bg-white/10 px-1 rounded text-[10px]">manage_quest_state</code> 工具函数，系统捕获调用后更新任务栏 UI。整个过程对用户透明，无需手动触发。</p>
        </div>

        {/* 四个 Action */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Action 类型</p>
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
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
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
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
    title: '状态渲染协议',
    icon: <BarChart2 size={18} />,
    content: (
      <div className="space-y-6 text-xs md:text-sm">
        <p>ECHO 拥有一套强大的结构化渲染引擎，允许 AI 通过输出特定的标记符号来直接构建 UI 组件（如进度条、数据矩阵）。</p>
        
        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-2 text-[11px] leading-relaxed">
          <p><strong>核心语法：</strong> <code className="bg-white/10 px-1 rounded">{"{{类型|内容}}"}</code></p>
          <p className="opacity-70">当 AI 输出符合此格式的内容时，文本会被拦截并转化为对应的可视化卡片。你可以通过 System Prompt 引导模型掌握此协议。</p>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">主流渲染组件 // Renderers</p>

          {/* status-container */}
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
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
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
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
          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
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
    )
  },
  {
    id: 'customcss',
    title: '自定义样式',
    icon: <Paintbrush size={18} />,
    content: (
      <div className="space-y-6 text-xs md:text-sm">
        <p>ECHO 支持通过 CSS 变量和直接选择器覆盖进行深度视觉定制。自定义样式全局持久化，并随账户多端同步。</p>

        {/* 核心机制 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">核心机制 // Architecture</p>
          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-2 text-[11px] leading-relaxed opacity-80">
            <p><strong>动态高优先级注入：</strong> 系统采用 <code className="bg-white/10 px-1 rounded">MutationObserver</code> 实时监控样式表状态。无论第三方库如何加载，自定义样式始终被强制保持在 <code className="bg-white/10 px-1 rounded">&lt;head&gt;</code> 的末尾。这意味着你可以直接覆盖 Tailwind 生成的类名，而无需大量使用 <code className="bg-white/10 px-1 rounded">!important</code>。</p>
          </div>
        </div>

        {/* CSS 变量速查表 */}
        <div className="space-y-4">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">设计令牌速查表 // Full Token Reference</p>
          
          <div className="space-y-2">
            <p className="text-[9px] text-blue-400/60 uppercase tracking-widest px-1 font-bold">1. 对话核心 // Dialogue Core</p>
            <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
              <div className="divide-y divide-white/5">
                {[
                  ['--dialogue-bg', 'rgba(255,255,255,0.7)', '对话主体背景（支持渐变/毛玻璃）'],
                  ['--dialogue-border', 'rgba(255,255,255,0.2)', '对话框边框颜色'],
                  ['--dialogue-text-dialogue', '#000000', '台词颜色（引号内文字）'],
                  ['--dialogue-text-narration', '#6b7280', '旁白/系统叙述文字颜色'],
                  ['--dialogue-text-thought', '#6b7280', '心理描写文字颜色（括号内）'],
                  ['--dialogue-text-action', '#4b5563', '动作描写文字颜色（星号内）'],
                ].map(([varName, defaultVal, desc]) => (
                  <div key={varName} className="grid grid-cols-[11rem_auto_1fr] gap-x-4 items-start px-4 py-2 text-[10px]">
                    <code className="font-mono text-blue-400 shrink-0">{varName}</code>
                    <code className="font-mono opacity-40 shrink-0">{defaultVal}</code>
                    <span className="opacity-50">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[9px] text-orange-400/60 uppercase tracking-widest px-1 font-bold">2. 状态条配色 // Progression & Stats</p>
            <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
              <div className="divide-y divide-white/5">
                {[
                  ['--stat-color-love', '#f43f5e', '好感度/爱心条颜色'],
                  ['--stat-color-hp', '#ef4444', '生命/体力条颜色'],
                  ['--stat-color-mana', '#3b82f6', '魔力/精力条颜色'],
                  ['--stat-color-hate', '#9333ea', '厌恶度/阴影条颜色'],
                  ['--stat-color-favor', '#fb7185', '偏好度/粉色条颜色'],
                  ['--stat-color-value', '#fbbf24', '通用数值/黄色条颜色'],
                  ['--stat-color-default', '#94a3b8', '默认未分类条颜色'],
                ].map(([varName, defaultVal, desc]) => (
                  <div key={varName} className="grid grid-cols-[11rem_auto_1fr] gap-x-4 items-start px-4 py-2 text-[10px]">
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
            <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
              <div className="divide-y divide-white/5">
                {[
                  ['--app-font', 'Noto Sans SC', '全局基准字体家族'],
                  ['--app-font-size', '16px', '全局文字基准大小'],
                  ['--font-serif', 'var(--app-font), ...', '衬线体组合（对话正文）'],
                  ['--font-sans', 'var(--app-font), ...', '无衬线组合（UI标签）'],
                  ['--font-mono', 'Noto Sans Mono SC', '等宽组合（代码/技术信息）'],
                ].map(([varName, defaultVal, desc]) => (
                  <div key={varName} className="grid grid-cols-[11rem_auto_1fr] gap-x-4 items-start px-4 py-2 text-[10px]">
                    <code className="font-mono text-purple-400 shrink-0">{varName}</code>
                    <code className="font-mono opacity-40 shrink-0 truncate max-w-[6rem]">{defaultVal}</code>
                    <span className="opacity-50">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[9px] text-green-400/60 uppercase tracking-widest px-1 font-bold">4. 全局 UI 调色盘 // Global Theme Surface</p>
            <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
              <div className="divide-y divide-white/5">
                {[
                  ['--color-echo-base', '#F5F5F7', '系统应用背景基色'],
                  ['--color-echo-white', '#FBFBFB', '面板容器表面主色'],
                  ['--color-echo-border', 'rgba(255,255,255,0.2)', '系统全局分割线/边框色'],
                  ['--char-a-color', '#60a5fa', '多角色：主角色（CharA）主题色'],
                  ['--char-b-color', '#c084fc', '多角色：副角色（CharB）主题色'],
                  ['--backdrop-blur-xs', '2px', '微量毛玻璃模糊强度'],
                ].map(([varName, defaultVal, desc]) => (
                  <div key={varName} className="grid grid-cols-[11rem_auto_1fr] gap-x-4 items-start px-4 py-2 text-[10px]">
                    <code className="font-mono text-green-400 shrink-0">{varName}</code>
                    <code className="font-mono opacity-40 shrink-0">{defaultVal}</code>
                    <span className="opacity-50">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 高级示例 */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">进阶示例 // Advanced Implementation</p>

          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2 bg-purple-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">暗色沉浸预设 (Immersive Dark)</span>
            </div>
            <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`:root.dark {
  --dialogue-bg: rgba(10, 10, 15, 0.9);
  --dialogue-border: rgba(100, 150, 255, 0.1);
  --dialogue-text-dialogue: #f8fafc;
  --dialogue-text-narration: #94a3b8;
  --dialogue-text-thought: #818cf8;
  --stat-color-love: #fb7185;
}`}</pre>
          </div>

          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2 bg-amber-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">UI 结构调整 (Structural Overrides)</span>
            </div>
            <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`/* 去除对话框毛玻璃效果并改为直角 */
.glass-morphism {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-radius: 4px !important;
}

/* 隐藏对话框顶部的角色名状态条 */
.DialogueBox-header { display: none; }`}</pre>
          </div>

          <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
            <div className="px-4 py-2 bg-blue-500/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">响应式适配 (Responsive Tweaks)</span>
            </div>
            <pre className="p-4 text-[10px] leading-relaxed opacity-70 overflow-x-auto whitespace-pre bg-black/5 dark:bg-black/20 font-mono">{`/* 仅在移动端缩小 AI 生成的 HTML 块字号 */
@media (max-width: 768px) {
  .echo-html-block * {
    font-size: 12px !important;
    line-height: 1.4 !important;
  }
}`}</pre>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-1">
          <p className="font-bold text-amber-400 uppercase tracking-widest">⚠️ 样式隔离声明</p>
          <p className="opacity-70 leading-relaxed">
            自定义 CSS 能够影响主应用的所有 UI 元素。但是，AI 生成的 <code className="bg-white/10 px-1 rounded">&lt;html&gt;</code> 标签内容由于运行在沙箱化 Iframe 中，**不受**此处 CSS 的影响。如需定制 Iframe 样式，请在角色卡的 System Prompt 中引导 AI 输出内联样式。
          </p>
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
              <p className="opacity-60 text-[10px] leading-relaxed">默认使用本地存储。云端同步 (R2) 是极客玩家的可选项。</p>
              <div className="space-y-0.5 pt-1">
                {[
                  '# 基础部署：',
                  'wrangler deploy',
                  '',
                  '# 进阶：开启云端同步',
                  'wrangler r2 bucket create echo-storage',
                  '# 修改 wrangler.toml 取消 R2 注释后重新 deploy',
                ].map((cmd, i) => (
                  <pre key={i} className={`text-[9px] font-mono leading-relaxed ${cmd.startsWith('#') ? 'opacity-30' : 'opacity-60'}`}>{cmd}</pre>
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
      className="fixed inset-0 z-50 bg-echo-base dark:bg-[#0a0a0a] flex items-center justify-center p-0 md:p-10 safe-area-top"
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
