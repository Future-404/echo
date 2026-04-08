import React from 'react';

const SecurityGuide: React.FC = () => {
  return (
    <div className="space-y-6 text-xs md:text-sm">
      <p>ECHO 支持两种部署模式，均通过密码网关保护访问。</p>

      {/* 部署模式 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">部署模式</p>
        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['纯前端模式', '设置 VITE_AUTH_TOKEN 环境变量，无需后端。密码在浏览器端 SHA-256 比对，数据存 IndexedDB（Dexie）。'],
              ['前后端模式', '设置 VITE_API_URL 指向 echo-storage Node.js 后端。验证通过后获取 token，数据本地+远端混合存储。'],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3 px-4 py-2.5">
                <span className="font-bold text-gray-600 dark:text-gray-300 shrink-0 w-20">{title}</span>
                <span className="opacity-60">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 访问控制 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">访问控制机制</p>
        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['密码网关', '首次访问显示 GateScreen，5 次失败后锁定 30 秒'],
              ['纯前端认证', '密码 SHA-256 与 VITE_AUTH_TOKEN 的哈希比对，localStorage 存 local-authenticated 标记'],
              ['后端认证', 'POST /api/auth 验证，返回 token 存入 localStorage，后续请求携带 Authorization: Bearer'],
              ['换设备', '清除浏览器数据或换设备需重新输入密码'],
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
              ['强随机密码', 'openssl rand -hex 32 生成至少 32 字符的 AUTH_TOKEN / VITE_AUTH_TOKEN'],
              ['HTTPS', 'Cloudflare Pages 自动提供；Node.js 需配置 Nginx/Caddy 反向代理'],
              ['路径遍历', '后端已对所有文件路径做 path.resolve + startsWith 校验，禁止目录穿越'],
              ['Token 泄露', '重新设置环境变量并重新部署，旧 token 立即失效'],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3 px-4 py-2.5">
                <span className="font-bold text-gray-600 dark:text-gray-300 shrink-0 w-20">{title}</span>
                <span className="opacity-60">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 技术架构 */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold">技术架构</p>
        <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
          <div className="divide-y divide-white/5 text-[10px]">
            {[
              ['前端框架', 'React 18 + TypeScript + Vite'],
              ['状态管理', 'Zustand 5 + Persist（IndexedDB via Dexie 4）'],
              ['本地存储', 'Dexie（消息、存档、角色卡、世界书、记忆结晶、KV）'],
              ['远端同步', 'echo-storage Node.js（可选，REST API）'],
              ['部署', 'Cloudflare Pages（前端）+ Node.js（可选后端）'],
            ].map(([key, value]) => (
              <div key={key} className="grid grid-cols-[6rem_1fr] gap-x-4 px-4 py-2.5">
                <span className="font-bold text-gray-600 dark:text-gray-300">{key}</span>
                <span className="opacity-60 font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] space-y-1">
        <p className="font-bold text-amber-400 uppercase tracking-widest">⚠️ API Key 安全提示</p>
        <ul className="list-disc pl-5 space-y-1 opacity-70 leading-relaxed">
          <li>API Key 存储在浏览器 IndexedDB，后端模式下同步到服务器文件系统</li>
          <li>建议在各 Provider 控制台设置每月消费限额</li>
          <li>不要在公共设备上使用，或使用后清除浏览器数据</li>
        </ul>
      </div>
    </div>
  );
};

export default SecurityGuide;
