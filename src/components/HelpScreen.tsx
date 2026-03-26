import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Layers, Database, Cpu, Info, ChevronRight, BarChart2, MessageCircle, Paintbrush } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const HELP_SECTIONS = [
  {
    id: 'chara',
    title: '角色卡规范',
    icon: <BookOpen size={18} />,
    content: (
      <div className="space-y-4 text-xs md:text-sm">
        <p>ECHO 引擎深度兼容主流角色卡协议，并进行了本地化增强。</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>PNG 隐写：</strong> 支持直接读取 PNG 图片中的 tEXt/iTXt 数据块，提取角色设定。</li>
          <li><strong>V2 规范：</strong> 完整支持角色卡 V2 协议中的世界书引用、多开场白等高级特性。</li>
          <li><strong>动态宏：</strong> 支持 <code className="bg-white/10 px-1 rounded">{"{{user}}"}</code>、<code className="bg-white/10 px-1 rounded">{"{{char}}"}</code> 等实时宏替换。</li>
        </ul>
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
                ['--stat-color-love', '#f43f5e', '状态栏：love 进度条颜色'],
                ['--stat-color-hate', '#9333ea', '状态栏：hate 进度条颜色'],
                ['--stat-color-hp', '#ef4444', '状态栏：hp 进度条颜色'],
                ['--stat-color-mana', '#3b82f6', '状态栏：mana 进度条颜色'],
                ['--stat-color-favor', '#fb7185', '状态栏：favor 进度条颜色'],
                ['--stat-color-value', '#fbbf24', '状态栏：value 进度条颜色'],
                ['--stat-color-default', '#94a3b8', '状态栏：其余未命名属性颜色'],
                ['--app-font', 'Noto Sans SC', '全局字体（也可在字体选择器中设置）'],
                ['--app-font-size', '16px', '全局字号（也可在字号滑块中设置）'],
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

/* 隐藏头像区波纹动画 */
.glass-morphism ~ div .border-blue-400\\/20 { display: none; }

/* 自定义滚动条 */
.no-scrollbar { scrollbar-width: thin !important; }`}</pre>
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
        <p>ECHO 采用统一的 <code className="bg-white/10 px-1 rounded">StorageAdapter</code> 接口，本地与远程后端无缝切换，存档数据随状态一起落盘。</p>

        {/* 本地存储 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">本地存储（默认）</p>
          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-2 text-[11px] leading-relaxed opacity-80">
            <p>所有数据默认存储于浏览器 <strong>IndexedDB</strong>，数据库名 <code className="bg-white/10 px-1 rounded">EchoAppDB</code>（配置/存档）和 <code className="bg-white/10 px-1 rounded">EchoImageDB</code>（图片）。无需任何配置，离线可用。</p>
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

        {/* 远程后端 */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">远程后端（跨设备同步）</p>
          <p className="opacity-60 text-[10px] leading-relaxed">配套开源后端 <code className="bg-white/10 px-1 rounded">echo-storage</code> 提供两种部署方式，共享同一套 REST API 协议。</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-orange-500/5 border border-orange-500/10 space-y-1.5">
              <p className="font-bold text-orange-400 text-[10px] uppercase tracking-widest">Cloudflare Workers</p>
              <p className="opacity-60 text-[10px] leading-relaxed">生产级推荐。KV 存储配置与存档，D1 数据库存储图片。全球边缘节点，免费额度充足。</p>
              <div className="space-y-0.5 pt-1">
                {[
                  'npx wrangler login',
                  'npx wrangler d1 create echo-images',
                  '# 填写 wrangler.toml 中的 database_id',
                  'npx wrangler d1 execute echo-images \\',
                  '  --file=schema.sql --remote',
                  'npx wrangler secret put AUTH_TOKEN',
                  'cd cloudflare && npx wrangler deploy',
                ].map((cmd, i) => (
                  <pre key={i} className={`text-[9px] font-mono leading-relaxed ${cmd.startsWith('#') ? 'opacity-30' : 'opacity-60'}`}>{cmd}</pre>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-green-500/5 border border-green-500/10 space-y-1.5">
              <p className="font-bold text-green-400 text-[10px] uppercase tracking-widest">Node.js</p>
              <p className="opacity-60 text-[10px] leading-relaxed">私有部署首选。SQLite 存储全部数据，适合本地服务器、家用 NAS、树莓派等环境。</p>
              <div className="space-y-0.5 pt-1">
                {[
                  'cd node && npm install',
                  'export AUTH_TOKEN=your_secret',
                  '# 默认端口 3456',
                  'node server.js',
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
                ['GET',    '/api/storage/:key',  '读取配置/存档（KV）'],
                ['PUT',    '/api/storage/:key',  '写入，body: { value: string }'],
                ['DELETE', '/api/storage/:key',  '删除指定 key'],
                ['GET',    '/api/images/:id',    '读取图片，返回 { base64 }'],
                ['PUT',    '/api/images/:id',    '上传，body: { base64: string }'],
                ['DELETE', '/api/images/:id',    '删除图片'],
              ].map(([method, path, desc]) => (
                <div key={path + method} className="grid grid-cols-[3rem_auto_1fr] gap-x-3 items-start px-4 py-2">
                  <span className={`font-bold shrink-0 ${method === 'GET' ? 'text-blue-400' : method === 'PUT' ? 'text-green-400' : 'text-red-400'}`}>{method}</span>
                  <code className="opacity-70 shrink-0">{path}</code>
                  <span className="opacity-40 font-sans">{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="opacity-40 text-[10px] px-1">所有请求需携带 <code className="bg-white/10 px-1 rounded">Authorization: Bearer &lt;AUTH_TOKEN&gt;</code>。客户端内置写入串行队列，防止乱序覆盖。</p>
        </div>

        {/* 前端配置 */}
        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-1">
          <p className="font-bold text-amber-400 uppercase tracking-widest">前端配置</p>
          <p className="opacity-70 leading-relaxed">部署完成后，在 <strong>设置 → 高级设置 → 存储后端</strong> 面板中填入后端地址（如 <code className="bg-white/10 px-1 rounded">https://echo-storage.your-name.workers.dev</code>）和 AUTH_TOKEN，保存后立即切换为远程存储。</p>
        </div>
      </div>
    )
  },
  {
    id: 'api',
    title: 'API 规范',
    icon: <Info size={18} />,
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
