import React from 'react';

const ApiSpecs: React.FC = () => {
  return (
    <div className="space-y-6 text-xs md:text-sm">
      <p>ECHO 使用统一的 Provider 节点系统管理所有 AI 服务，支持对话、TTS、Embedding 三类用途。</p>

      {/* Provider 节点 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Provider 节点字段</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px] font-mono">
            {[
              ['endpoint', '必填', 'API 基础 URL，如 https://api.openai.com/v1'],
              ['apiKey', '必填', 'Bearer token'],
              ['model', '必填', '模型名称，如 gpt-4o / claude-3-5-sonnet'],
              ['ttsVoice', '可选', 'TTS 声音 ID，如 alloy / nova'],
              ['ttsFormat', '可选', '音频格式：mp3 / opus / aac / flac'],
              ['embeddingDimensions', '可选', 'Embedding 输出维度，如 512 / 1536'],
            ].map(([field, req, desc]) => (
              <div key={field} className="grid grid-cols-[8rem_3rem_1fr] gap-x-3 items-start px-4 py-2">
                <code className="text-blue-400 shrink-0">{field}</code>
                <span className={`shrink-0 ${req === '必填' ? 'text-red-400' : 'text-gray-500'}`}>{req}</span>
                <span className="opacity-50 font-sans">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 对话 API */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">对话 API 兼容性</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['OpenAI', 'POST /chat/completions，支持流式 SSE，自动处理 [DONE] 终止符'],
              ['Anthropic', 'POST /messages，支持 claude-3-* 系列，流式 event: content_block_delta'],
              ['Gemini', 'POST /models/{model}:streamGenerateContent，自动检测 generativelanguage.googleapis 域名'],
              ['兼容格式', '所有 OpenAI 兼容接口（Ollama、第三方中转、本地部署）均可使用'],
            ].map(([provider, desc]) => (
              <div key={provider} className="flex gap-3 px-4 py-2.5">
                <span className="font-bold text-echo-text-base shrink-0 w-16">{provider}</span>
                <span className="opacity-60">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TTS */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">TTS 配置</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['browser', '浏览器原生 SpeechSynthesis，无需 API Key'],
              ['openai', 'POST /audio/speech，从绑定的 Provider 节点读取 apiKey / ttsVoice / ttsFormat'],
              ['elevenlabs', '独立 API Key 配置，支持 speed 参数'],
              ['edge', '浏览器 SpeechSynthesis（Edge TTS 声音）'],
            ].map(([type, desc]) => (
              <div key={type} className="flex gap-3 px-4 py-2.5">
                <code className="font-mono text-purple-400 shrink-0 w-16">{type}</code>
                <span className="opacity-60">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Embedding */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Embedding API</p>
        <div className="rounded-2xl border border-echo-border overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['OpenAI 兼容', 'POST /embeddings，body: { input, model, dimensions? }，返回 data[0].embedding'],
              ['Gemini', 'POST /models/{model}:embedContent，自动检测 generativelanguage.googleapis 域名，返回 embedding.values'],
            ].map(([type, desc]) => (
              <div key={type} className="flex gap-3 px-4 py-2.5">
                <span className="font-bold text-echo-text-base shrink-0 w-20">{type}</span>
                <span className="opacity-60">{desc}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="opacity-40 text-[10px] px-1">Embedding 用于记忆结晶的向量索引，在设置 → 记忆系统中绑定 Provider 节点。</p>
      </div>

      {/* 流式处理 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">流式处理细节</p>
        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-[10px] leading-relaxed opacity-80 space-y-1">
          <p>• 流式响应通过 <code className="bg-white/10 px-1 rounded">ReadableStream</code> 逐 chunk 解析，支持多行 SSE 合并</p>
          <p>• <code className="bg-white/10 px-1 rounded">[DONE]</code> 信号触发流结束，自动释放 reader lock</p>
          <p>• 流式期间每 300ms 或内容增长 100 字符触发一次 UI 重绘（节流），降低 CPU 占用</p>
        </div>
      </div>
    </div>
  );
};

export default ApiSpecs;
