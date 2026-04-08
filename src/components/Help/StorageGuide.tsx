import React from 'react';

const StorageGuide: React.FC = () => {
  return (
    <div className="space-y-6 text-xs md:text-sm">
      <p>ECHO 采用本地优先架构，所有数据默认存储在浏览器 IndexedDB（Dexie），可选配后端实现多设备同步。</p>

      {/* 数据库结构 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">本地数据库表</p>
        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px] font-mono">
            {[
              ['messages', '对话消息，按 slotId 分组，支持 vState 标记蒸馏状态'],
              ['saveSlots', '存档快照（任务、碎片、角色绑定）'],
              ['characters', '角色卡（含 System Prompt、正则脚本、引擎配置）'],
              ['worldEntries', '世界书条目，支持关键词触发和常驻注入'],
              ['memoryEpisodes', '记忆结晶（原子命题 + 叙事块 + 向量索引）'],
              ['kvStore', 'Zustand Persist 状态 + 图片 base64'],
            ].map(([table, desc]) => (
              <div key={table} className="grid grid-cols-[9rem_1fr] gap-x-4 px-4 py-2.5">
                <code className="text-blue-400 shrink-0">{table}</code>
                <span className="opacity-50 font-sans">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 存档机制 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">存档机制</p>
        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['自动存档', '每次 AI 回复完成后自动快照，覆盖上一条自动档'],
              ['手动存档', '可创建多个命名存档，包含完整消息历史、任务进度、角色属性'],
              ['分支回溯', '长按历史消息可回滚到任意节点，自动创建分支存档'],
              ['事务保护', 'saveMessages 使用 Dexie 事务，delete + bulkAdd 原子执行，中途失败不丢数据'],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3 px-4 py-2.5">
                <span className="font-bold text-gray-600 dark:text-gray-300 shrink-0 w-16">{title}</span>
                <span className="opacity-60">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 备份与恢复 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">备份与恢复</p>

        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
          <div className="px-4 py-2 bg-blue-500/10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">全量备份 .echo</span>
          </div>
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['导出内容', '所有 IndexedDB 表（消息、存档、角色卡、世界书、记忆结晶）+ 图片库 + Zustand 状态'],
              ['图片处理', '图片单独存入 images 字段（{ id, base64 }），kvStore 中排除图片条目，避免双写'],
              ['导入行为', '全量覆盖重建：先清空各表，再 bulkAdd 写入；图片库单独 clear 后重写'],
              ['适用场景', '换设备迁移、完整数据备份、灾难恢复'],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3 px-4 py-2.5">
                <span className="font-bold text-gray-600 dark:text-gray-300 shrink-0 w-16">{title}</span>
                <span className="opacity-60">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
          <div className="px-4 py-2 bg-purple-500/10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">单存档备份 .echo-slot</span>
          </div>
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['导出内容', '存档元数据 + 该 slot 的消息流 + 记忆结晶 + 关联角色卡 + 角色头像'],
              ['头像判断', '仅导出本地存储的头像（非 http URL），以 { id, base64 } 格式打包'],
              ['导入行为', '增量合并：先删除同 slotId 的旧消息和结晶，再写入；角色卡用 bulkPut 覆盖或新增'],
              ['适用场景', '分享单个剧情存档、跨账号迁移特定角色的对话进度'],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3 px-4 py-2.5">
                <span className="font-bold text-gray-600 dark:text-gray-300 shrink-0 w-16">{title}</span>
                <span className="opacity-60">{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-1">
          <p className="font-bold text-amber-400 uppercase tracking-widest">⚠️ 注意</p>
          <p className="opacity-70 leading-relaxed">全量导入会覆盖当前所有数据，操作前建议先导出一份备份。单存档导入为增量合并，不影响其他存档。导入完成后需刷新页面使状态生效。</p>
        </div>
      </div>

      {/* 后端同步（可选） */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">后端同步（可选）</p>
        <div className="p-3 rounded-2xl bg-green-500/5 border border-green-500/10 space-y-2 text-[10px]">
          <p className="font-bold text-green-400 uppercase tracking-widest">Node.js echo-storage</p>
          <pre className="opacity-60 font-mono leading-relaxed">{`cd echo-storage/node && npm install
AUTH_TOKEN=your_secret node server.js
# 默认端口 3456，前端设置 VITE_API_URL=http://your-server:3456`}</pre>
          <p className="opacity-50">启用后采用 Hybrid 模式：本地 Dexie 作为缓存层，写操作同步到远端。</p>
        </div>
      </div>

      {/* API 协议 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">后端 API 协议</p>
        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px] font-mono">
            {[
              ['POST',   '/api/auth',         '验证密码，返回 token（无需鉴权）'],
              ['GET',    '/api/storage/:key', '读取 KV'],
              ['PUT',    '/api/storage/:key', '写入，body: string (text/plain)'],
              ['DELETE', '/api/storage/:key', '删除指定 key'],
              ['GET',    '/api/images/:id',   '读取图片，返回 { base64 }'],
              ['PUT',    '/api/images/:id',   '上传，body: { base64: string }'],
              ['DELETE', '/api/images/:id',   '删除图片'],
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
  );
};

export default StorageGuide;
