import { strToU8, zipSync } from 'fflate'

const TEMPLATE_MANIFEST = `{
  "id": "my-app",
  "name": "我的应用",
  "description": "应用简介",
  "version": "1.0.0",
  "author": "你的名字",
  "icon": "🎮",
  "permissions": [],
  "hasSkill": true
}
`

// skill.js 注释详细说明每个字段
const TEMPLATE_SKILL = `/**
 * skill.js — Echo 技能模块
 *
 * 规则：
 * - name 必须是 manifest.id 的连字符转下划线版本
 *   例如 manifest.id = "my-app" → name = "my_app"
 * - schema.function.name 必须与 name 相同
 * - execute 必须在 5 秒内返回，否则超时中止
 * - ctx 对象只读，不能修改
 * - 不能访问 window / document / localStorage / fetch
 *
 * 可用 API：
 * - ctx.messages        对话历史（需在 manifest.permissions 声明 "chat_history"）
 * - ctx.characterName   当前角色名
 * - ctx.userName        用户名
 * - ctx.attributes      角色状态属性（需声明 "attributes"）
 * - ctx_api.addFragment(msg)  在对话框顶部显示浮动提示（800ms 后消失）
 *
 * 返回值：
 * - success: boolean        是否成功
 * - message: string         返回给 AI 的文本（作为 tool result）
 * - data.writeAttrs?: object 自动写入 char.attributes（供 index.html 轮询）
 *                            key 会自动加 ext:appId: 前缀，index.html 读时只需写短 key
 * - suppressFollowUp?: bool  true 时跳过 AI follow-up 回复，对话框静默
 * - suppressDisplay?: bool   true 时隐藏触发此 skill 的 assistant 消息
 * - injectContext?: string   注入 hidden 上下文消息，AI 有记忆但不显示，不触发新请求
 */
exports.default = {
  name: 'my_app',
  displayName: '我的应用',
  description: '技能描述，AI 会根据这段文字决定何时调用',

  schema: {
    type: 'function',
    function: {
      name: 'my_app',
      description: '详细描述 AI 应该在什么情况下调用此技能',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', description: '要执行的操作' }
        },
        required: ['action']
      }
    }
  },

  systemPrompt: function(ctx) {
    return '你可以使用 my_app 技能。当用户提到相关话题时，主动调用它。'
  },

  execute: async function(args, ctx) {
    ctx_api.addFragment('✨ 技能执行中...')
    var result = '处理结果：' + args.action
    return {
      success: true,
      message: result,
      data: {
        // key 不需要加 appId 前缀，框架自动处理命名空间隔离
        writeAttrs: { 'lastResult': result }
      }
    }
  }
}
`

const TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>我的应用</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 24px; background: #0a0a0a; color: #eee; }
    button { padding: 10px 24px; background: #6366f1; color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 14px; }
    button:disabled { opacity: 0.4; }
    #result { margin-top: 16px; font-size: 13px; color: #aaa; }
  </style>
</head>
<body>
  <h2 style="font-size:18px;margin-bottom:16px;">我的应用</h2>
  <button id="btn" onclick="doAction()">触发技能</button>
  <div id="result">等待操作...</div>

  <script>
    /**
     * Echo 注入的 API（无需引入，直接使用）：
     *
     * 角色级存储（随角色切换，用于 AI 交互）：
     *   __echo__.get(key)            读取 char.attributes，key 无需加 appId 前缀
     *   __echo__.set({ key: val })   写入 char.attributes，框架自动加命名空间前缀
     *
     * 应用级私有存储（跨角色持久化，存 IndexedDB，无 5MB 限制）：
     *   __echo__.getPrivate(key)     读取应用私有存储
     *   __echo__.setPrivate({k:v})   写入应用私有存储（localStorage 自动映射到此）
     *
     * 事件监听（实时响应对话变化）：
     *   __echo__.on('ON_MESSAGE', cb)           新消息到达（cb 接收 Message 对象）
     *   __echo__.on('ON_CHARACTER_SWITCH', cb)  角色切换
     *
     * 触发 AI：
     *   window.triggerSlash(text)    发送消息，对话框可见，触发 AI 回复
     *   window.triggerHidden(text)   发送消息，不显示但保留上下文，触发 AI 回复
     *   __echo__.injectContext(text)  只插入上下文，不触发 AI 请求（用于事件摘要等）
     *
     * 扩展专用 AI 请求（走 extensionProvider，不进主对话）：
     *   const res = await __echo__.chat([{ role: 'user', content: '...' }])
     *   // res.content 是 AI 回复文本，res.error 是错误信息
     *   // 需在 设置 → 模型分配 → 扩展 中配置模型，否则回退到主对话模型
     *
     * 无 Skill 的纯 UI 应用可用 triggerHidden + <echo-set> 标签让 AI 直接写入 attributes：
     *   triggerHidden('请输出：<echo-set key="result">{"data":"value"}</echo-set>')
     *   框架自动解析写入 attributes（JSON 自动 parse），标签不显示在对话框
     *
     * 其他：
     *   __echo__.onError(cb)         监听 AI 错误，不写则默认 toastr.error
     *   window.toastr.info(msg)      显示通知
     */

    __echo__.onError(function(msg) {
      document.getElementById('btn').disabled = false
      document.getElementById('result').textContent = '错误：' + msg
    })

    // 监听新消息（可选）
    __echo__.on('ON_MESSAGE', function(msg) {
      console.log('新消息：', msg.content)
    })

    function doAction() {
      document.getElementById('btn').disabled = true
      document.getElementById('result').textContent = '等待 AI 响应...'

      window.triggerSlash('（请调用 my_app 技能，action 为 test）')

      var attempts = 0
      var timer = setInterval(async function() {
        attempts++
        // key 与 skill.js 中 writeAttrs 的 key 一致，无需加前缀
        var val = await __echo__.get('lastResult')
        if (val) {
          clearInterval(timer)
          document.getElementById('result').textContent = val
          document.getElementById('btn').disabled = false
          await __echo__.set({ 'lastResult': '' })
        }
        if (attempts > 60) {
          clearInterval(timer)
          document.getElementById('btn').disabled = false
          document.getElementById('result').textContent = '超时，请重试'
        }
      }, 1000)
    }
  </script>
</body>
</html>
`

export function downloadTemplateZip() {
  const files = {
    'manifest.json': strToU8(TEMPLATE_MANIFEST),
    'skill.js': strToU8(TEMPLATE_SKILL),
    'index.html': strToU8(TEMPLATE_HTML),
  }
  const zipped = zipSync(files, { level: 6 })
  const blob = new Blob([zipped], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'echo-app-template.zip'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
