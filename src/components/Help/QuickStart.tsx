import React from 'react';
import { Rocket } from 'lucide-react';

const QuickStart: React.FC = () => {
  return (
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

      {/* 纯前端模式 */}
      <div className="rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden">
        <div className="px-4 py-2.5 bg-purple-500/10 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">方式四：纯前端模式（无后端）</span>
          <span className="text-[9px] opacity-50">数据存本地 · 无需服务器</span>
        </div>
        <div className="px-4 py-3 space-y-2 text-[10px]">
          <p className="opacity-70 leading-relaxed">在 Cloudflare Pages 构建变量中设置 <code className="bg-white/10 px-1 rounded">VITE_AUTH_TOKEN=your_password</code>，不设置 <code className="bg-white/10 px-1 rounded">VITE_API_URL</code>。所有数据存储在浏览器 IndexedDB，密码在前端 SHA-256 比对，无需后端服务。</p>
          <p className="opacity-40">注意：数据仅存在当前浏览器，清除浏览器数据会丢失。建议定期导出 .echo 备份文件。</p>
        </div>
      </div>
    </div>
  );
};

export default QuickStart;
