import React from 'react'

const MemoryGuide: React.FC = () => {
  return (
    <div className="space-y-6 text-xs md:text-sm">
      <p>记忆管理系统让角色能够跨会话记住重要事件。对话积累到一定量后，系统自动提炼为结构化记忆片段，并通过语义向量在后续对话中精准召回。</p>

      {/* 工作原理 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">工作原理</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden divide-y divide-white/5 text-[10px]">
          {[
            ['1. 消息积累', '每条新消息通过 Embedding 模型生成向量，追踪当前话题的语义质心'],
            ['2. 触发提炼', '话题漂移（余弦相似度 < 0.65）或消息数达到 15 条时，自动触发；空闲 20 分钟也会触发'],
            ['3. LLM 提炼', '将消息片段发给 LLM，提取原子命题、叙事摘要、主题标签三层结构'],
            ['4. 向量存储', '叙事摘要和每条原子命题分别生成向量，存入本地 IndexedDB'],
            ['5. 语义召回', '新对话开始时，用当前消息向量检索最相关的记忆片段注入上下文'],
          ].map(([step, desc]) => (
            <div key={step} className="flex gap-3 px-4 py-2.5">
              <span className="font-bold text-blue-400 shrink-0 w-24">{step}</span>
              <span className="opacity-60 leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 前置配置 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">前置配置</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden divide-y divide-white/5 text-[10px]">
          {[
            ['对话 Provider', '用于提炼的 LLM，使用当前激活的对话节点，建议选择速度快、成本低的模型'],
            ['Embedding Provider', '必须单独配置，在 API 参数中添加 type=embedding 的节点'],
            ['绑定 Embedding', '在设置 → 记忆管理 中选择要使用的 Embedding 节点'],
          ].map(([item, desc]) => (
            <div key={item} className="grid grid-cols-[8rem_1fr] gap-x-3 px-4 py-2.5">
              <span className="font-bold text-echo-text-base shrink-0">{item}</span>
              <span className="opacity-60 leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Embedding 兼容性 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Embedding 节点配置</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="px-4 py-2.5 bg-blue-500/10 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">OpenAI 兼容</span>
            <span className="text-[9px] opacity-50">endpoint + /embeddings</span>
          </div>
          <div className="px-4 py-3 text-[10px] space-y-1 opacity-70">
            <p>endpoint: <code className="bg-white/10 px-1 rounded">https://api.openai.com/v1</code></p>
            <p>model: <code className="bg-white/10 px-1 rounded">text-embedding-3-small</code> 或 <code className="bg-white/10 px-1 rounded">text-embedding-3-large</code></p>
            <p>embeddingDimensions: 可选，如 <code className="bg-white/10 px-1 rounded">512</code>（降维节省存储）</p>
          </div>
        </div>
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="px-4 py-2.5 bg-purple-500/10 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Google Gemini</span>
            <span className="text-[9px] opacity-50">generativelanguage.googleapis.com</span>
          </div>
          <div className="px-4 py-3 text-[10px] space-y-1 opacity-70">
            <p>endpoint: <code className="bg-white/10 px-1 rounded">https://generativelanguage.googleapis.com/v1beta</code></p>
            <p>model: <code className="bg-white/10 px-1 rounded">text-embedding-004</code></p>
            <p>apiKey: Google AI Studio 的 API Key</p>
          </div>
        </div>
      </div>

      {/* 记忆片段结构 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">记忆片段结构</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden divide-y divide-white/5 text-[10px]">
          {[
            ['原子命题', '3–8 条最小化事实陈述，每条自包含（含具体人名/物名），用于高精度细节召回'],
            ['叙事摘要', '将原子命题合并为 1 段高密度叙事，保留情感弧线，用于上下文连贯召回'],
            ['主题标签', '3–6 个精确标签（人物、地点、情绪、意图等），用于快速过滤'],
            ['重要度评分', '由原子命题的高/中/低重要性加权平均，影响召回优先级'],
          ].map(([layer, desc]) => (
            <div key={layer} className="grid grid-cols-[6rem_1fr] gap-x-3 px-4 py-2.5">
              <span className="font-bold text-echo-text-base shrink-0">{layer}</span>
              <span className="opacity-60 leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 管理操作 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">记忆管理操作</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden divide-y divide-white/5 text-[10px]">
          {[
            ['搜索', '按叙事内容或标签关键词过滤，支持中英文'],
            ['编辑', '修改叙事内容后自动重新生成向量（需要 Embedding 节点在线）'],
            ['删除', '永久删除该记忆片段，不可恢复'],
            ['展开原子命题', '查看该片段的细粒度事实列表及重要性标注'],
          ].map(([op, desc]) => (
            <div key={op} className="grid grid-cols-[5rem_1fr] gap-x-3 px-4 py-2.5">
              <span className="font-bold text-echo-text-base shrink-0">{op}</span>
              <span className="opacity-60 leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 限制与注意 */}
      <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-1.5">
        <p className="font-bold text-amber-400 uppercase tracking-widest">注意事项</p>
        <ul className="opacity-70 space-y-1 leading-relaxed list-none">
          <li>• 每个存档最多保留 1000 条记忆片段，超出后自动删除最旧的</li>
          <li>• 向量数据存储在本地 IndexedDB，导出 .echo 备份时一并打包</li>
          <li>• 编辑记忆内容需要 Embedding 节点可用，否则向量不会更新</li>
          <li>• 提炼过程在后台异步执行，不影响当前对话</li>
        </ul>
      </div>
    </div>
  )
}

export default MemoryGuide
