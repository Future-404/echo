import React from 'react'
import { Download } from 'lucide-react'
import { downloadTemplateZip } from '../../utils/appTemplate'

const AppDevGuide: React.FC = () => {
  return (
    <div className="space-y-6 text-xs md:text-sm">
      <p>Echo 支持导入第三方应用包，开发者可以扩展 AI 技能（Skill）或创建自定义 UI 界面（App），两者可以打包在同一个 <code className="bg-white/10 px-1 rounded text-[10px]">.zip</code> 文件中一次导入。</p>

      {/* 下载模板 */}
      <div className="rounded-2xl border border-echo-border bg-echo-surface/50 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-echo-text-base">最小化模板</p>
          <p className="text-[10px] text-echo-text-dim mt-0.5">包含 manifest.json、skill.js、index.html，注释详细，可直接在此基础上开发</p>
        </div>
        <button
          onClick={downloadTemplateZip}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-colors shrink-0"
        >
          <Download size={12} />
          下载模板
        </button>
      </div>

      {/* 包结构 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">包结构</p>
        <pre className="bg-white/5 rounded-xl p-3 text-[10px] font-mono leading-relaxed">{`my-app.zip
├── manifest.json   ← 必须
├── skill.js        ← 可选，AI 技能逻辑
├── index.html      ← 可选，UI 界面
└── icon.png        ← 可选，应用图标（也支持 .jpg/.webp）`}</pre>
        <p className="opacity-70 leading-relaxed">三种组合均合法：只有 skill.js（纯 AI 技能）、只有 index.html（纯 UI）、两者都有（完整应用）。图标文件会自动压缩为 128×128 WebP，无需手动处理尺寸。未提供图标文件时使用 manifest.json 中的 icon emoji。</p>
      </div>

      {/* manifest.json */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">manifest.json</p>
        <pre className="bg-white/5 rounded-xl p-3 text-[10px] font-mono leading-relaxed">{`{
  "id": "phone-reader",
  "name": "查手机",
  "description": "AI 可以偷看用户手机聊天记录",
  "version": "1.0.0",
  "author": "开发者名",
  "icon": "📱",
  "permissions": ["chat_history"],
  "hasSkill": true
}`}</pre>
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['id', '必须', '只允许小写字母、数字、连字符，全局唯一'],
              ['name', '必须', '显示名称'],
              ['description', '必须', '简介'],
              ['version', '必须', '版本号字符串'],
              ['author', '可选', '作者名'],
              ['icon', '可选', 'emoji，显示在应用网格图标'],
              ['permissions', '可选', '权限列表，见下方说明'],
              ['hasSkill', '可选', '默认 true，设为 false 可跳过 skill.js 检查'],
            ].map(([field, req, desc]) => (
              <div key={field as string} className="flex gap-3 px-4 py-2.5">
                <code className="font-mono text-blue-400 shrink-0 w-24">{field}</code>
                <span className={`shrink-0 w-8 ${req === '必须' ? 'text-red-400' : 'text-gray-500'}`}>{req}</span>
                <span className="opacity-70">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 权限 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">权限列表 (强制隔离)</p>
        <p className="opacity-70 leading-relaxed text-[10px]">Echo 实行严格的权限隔离，必须在 <code className="bg-white/10 px-1 rounded text-[10px]">manifest.json</code> 的 <code className="bg-white/10 px-1 rounded text-[10px]">permissions</code> 数组中声明，否则对应的上下文数据将为空。</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['chat_history', '允许访问对话历史消息（ctx.messages）'],
              ['character_info', '允许访问角色名与用户名（ctx.characterName, ctx.userName）'],
              ['attributes', '允许读写角色状态属性（ctx.attributes）'],
            ].map(([perm, desc]) => (
              <div key={perm as string} className="flex gap-3 px-4 py-2.5">
                <code className="font-mono text-amber-400 shrink-0 w-32">{perm}</code>
                <span className="opacity-70">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* skill.js */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">skill.js 规范</p>
        <p className="opacity-70 leading-relaxed">skill.js 在沙箱中执行，必须将模块赋值给 <code className="bg-white/10 px-1 rounded">exports.default</code>。<strong>注意：</strong> 技能的 <code className="bg-white/10 px-1 rounded">systemPrompt</code> 仅在技能被 AI 调用后的“总结回复”阶段动态注入，不再全局干扰 AI。建议将核心逻辑通过 Tool Calling 表达。</p>
        <pre className="bg-white/5 rounded-xl p-3 text-[10px] font-mono leading-relaxed">{`exports.default = {
  name: 'read_phone',       // manifest.id 的连字符转下划线，如 phone-reader → phone_reader
  displayName: '查手机',
  description: '技能描述，AI 会根据这段文字决定何时调用',

  schema: {
    type: 'function',
    function: {
      name: 'read_phone',   // 必须与上方 name 相同
      ...
    }
  },
  description: '偷看用户手机聊天记录',

  // AI 调用的 function schema（OpenAI tool calling 格式）
  schema: {
    type: 'function',
    function: {
      name: 'read_phone',
      description: '当AI想偷看用户手机时调用',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: '要查看的联系人' }
        }
      }
    }
  },

  // 注入 AI 系统提示（可选，支持函数动态生成）
  systemPrompt: (ctx) => {
    return \`你可以用 read_phone 偷看用户手机。\`
  },

  // 执行逻辑（必须在 5 秒内返回）
  execute: async (args, ctx) => {
    ctx_api.addFragment(\`🔓 正在读取 \${args.target} 的聊天记录...\`)

    const userMsgs = ctx.messages
      .filter(m => m.role === 'user')
      .slice(-10)
      .map(m => m.content)

    return {
      success: true,
      message: \`聊天记录：\n\${userMsgs.join('\\n')}\`,
      data: { messages: userMsgs }
    }
  }
}`}</pre>
        <div className="space-y-1 opacity-70 leading-relaxed">
          <p><strong>ctx 对象（只读）：</strong></p>
          <div className="rounded-2xl border border-echo-border overflow-hidden">
            <div className="divide-y divide-white/5 text-[10px]">
              {[
                ['ctx.messages', '对话历史，需声明 chat_history 权限'],
                ['ctx.characterName', '当前角色名'],
                ['ctx.userName', '用户名'],
                ['ctx.attributes', '角色状态属性，需声明 attributes 权限'],
              ].map(([field, desc]) => (
                <div key={field as string} className="flex gap-3 px-4 py-2.5">
                  <code className="font-mono text-green-400 shrink-0 w-36">{field}</code>
                  <span className="opacity-70">{desc}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2"><strong>ctx_api 对象（操作 Echo）：</strong></p>
          <div className="rounded-2xl border border-echo-border overflow-hidden">
            <div className="divide-y divide-white/5 text-[10px]">
              {[
                ['ctx_api.addFragment(msg)', '在对话框顶部显示浮动提示（800ms 后消失）'],
              ].map(([field, desc]) => (
                <div key={field as string} className="flex gap-3 px-4 py-2.5">
                  <code className="font-mono text-green-400 shrink-0 w-48">{field}</code>
                  <span className="opacity-70">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-3 text-[10px] space-y-1">
          <p className="text-amber-400 font-bold uppercase tracking-widest">限制</p>
          <p className="opacity-70">· 文件大小 &lt; 200KB</p>
          <p className="opacity-70">· execute 必须在 5 秒内返回，否则超时中止</p>
          <p className="opacity-70">· 不能访问 window / document / localStorage</p>
          <p className="opacity-70">· 不能发起网络请求</p>
          <p className="opacity-70">· ctx 对象为只读冻结对象，不能修改</p>
        </div>
      </div>

      {/* index.html */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">index.html 规范</p>
        <p className="opacity-70 leading-relaxed">运行在 iframe sandbox 中。Echo 注入了 <code className="bg-white/10 px-1 rounded">__echo__</code> 全局 API，且原生 <code className="bg-white/10 px-1 rounded">localStorage</code> 已被劫持并由 IndexedDB 自动实现跨设备持久化。</p>
        <pre className="bg-white/5 rounded-xl p-3 text-[10px] font-mono leading-relaxed">{`<!DOCTYPE html>
<html>
<body>
  <script>
    // 1. 角色属性操作 (与 AI 交互，随角色切换而切换)
    // 写入时底层自动加 ext:[appId]: 前缀实现命名空间隔离
    await __echo__.set({ 'score': 100 })
    const score = await __echo__.get('score')

    // 2. 应用私有存储 (全局持久化，不受角色切换影响)
    await __echo__.setPrivate({ 'last_opened': Date.now() })
    const history = await __echo__.getPrivate('last_opened')
    
    // 3. 原生 localStorage 增强 (底层也是调用 setPrivate，无需担心 5MB 限制)
    localStorage.setItem('config', JSON.stringify({ theme: 'dark' }))

    // 4. 系统事件监听
    __echo__.on('ON_MESSAGE', (msg) => {
      console.log(\`收到来自 \${msg.speakerId || '系统'} 的新消息\`)
    })
    __echo__.on('ON_CHARACTER_SWITCH', (char) => {
      console.log(\`当前已切换至角色: \${char.name}\`)
    })

    // 5. 触发 AI 指令
    window.triggerSlash('你拿起了我的手机')  // 消息可见，触发 AI 回复
    window.triggerHidden('（后台指令）')    // 消息不可见，触发 AI 回复，保留上下文
    __echo__.injectContext('（旁白：发生了某事）') // 只插入上下文，不触发 AI 请求

    // 6. 扩展专用 AI 请求（走独立 extensionProvider，不进主对话，不消耗主对话 Token）
    const result = await __echo__.chat([
      { role: 'user', content: '请生成一段 JSON 数据...' }
    ])
    if (result.error) throw new Error(result.error)
    const data = JSON.parse(result.content)

    // 7. UI 反馈
    window.toastr.info('操作成功')
    __echo__.onError(msg => console.error(msg))
  <\/script>
</body>
</html>`}</pre>

        <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-3 text-[10px] space-y-1">
          <p className="text-amber-400 font-bold uppercase tracking-widest">限制与限制机制</p>
          <p className="opacity-70">· <strong>静态包大小</strong>：单次导入的所有应用总大小不得超过 <strong>20MB</strong>。</p>
          <p className="opacity-70">· <strong>单次写入限制</strong>：<code className="bg-white/10 px-1 rounded">set</code> 的单次数据大小限制为 <strong>128KB</strong>。</p>
          <p className="opacity-70">· <strong>属性总量限制</strong>：单个角色名下的扩展属性总和上限为 <strong>5MB</strong>。</p>
          <p className="opacity-70">· <strong>写入频率限制</strong>：应用 5 秒内最多写入 10 次，超出将被拦截。</p>
          <p className="opacity-70">· <strong>命名空间自动化</strong>：所有 <code className="bg-white/10 px-1 rounded">set/get</code> 操作均由底层自动隔离，无需再手动添加前缀。</p>
        </div>
      </div>

      {/* skill 与 UI 联动 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Skill 与 UI 联动</p>
        <p className="opacity-70 leading-relaxed">skill.js 和 index.html 通过 <code className="bg-white/10 px-1 rounded">char.attributes</code> 共享数据。<strong>注意：</strong> AI 看到的 State 也会按照应用进行视觉分组：</p>
        <pre className="bg-white/5 rounded-xl p-3 text-[10px] font-mono leading-relaxed">{`// skill.js：通过 data.writeAttrs 写入 attributes
execute: async (args, ctx) => {
  return {
    success: true,
    message: '已成功更新分数', // 该消息会同步显示在 UI 顶部横幅
    data: {
      writeAttrs: { 'score': 100 }  // 底层自动转为 ext:my-app:score
    }
  }
}

// index.html：监听状态变化或轮询读取
__echo__.on('ON_MESSAGE', async () => {
  const score = await __echo__.get('score')
  renderUI(score)
})`}</pre>
        <p className="opacity-70 leading-relaxed mt-2">execute 完整返回值字段：</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['success', 'boolean', '是否成功'],
              ['message', 'string', '返回给 AI 的文本（作为 tool result）'],
              ['data.writeAttrs', 'object', '自动写入 char.attributes，供 index.html 通过 __echo__.get() 读取'],
              ['suppressFollowUp', 'boolean', 'true 时跳过 AI follow-up 回复，对话框不产生新消息'],
              ['suppressDisplay', 'boolean', 'true 时隐藏触发此 skill 的 assistant 消息（适合完全后台运行的应用）'],
              ['injectContext', 'string', '注入一条 hidden 消息到上下文，AI 有记忆但对话框不显示，不触发新的 AI 请求'],
            ].map(([field, type, desc]) => (
              <div key={field as string} className="flex gap-3 px-4 py-2.5">
                <code className="font-mono text-blue-400 shrink-0 w-32">{field}</code>
                <span className="text-gray-500 shrink-0 w-14">{type}</span>
                <span className="opacity-70">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 导入方式 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">导入方式</p>
        <p className="opacity-70 leading-relaxed">在对话界面点击输入框右侧的九宫格按钮打开应用中心，点击末尾的 <strong>+</strong> 按钮选择 .zip 文件导入。导入后：</p>
        <p className="opacity-70">· 有 index.html 的应用出现在应用网格中，点击全屏打开</p>
        <p className="opacity-70">· 有 skill.js 的技能出现在 设置 → 能力库 中，可单独开关</p>
      </div>
    </div>
  )
}

export default AppDevGuide
