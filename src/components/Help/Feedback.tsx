import React from 'react';
import { MessageCircle } from 'lucide-react';

const Feedback: React.FC = () => {
  return (
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

      <div className="mt-8 p-5 rounded-3xl bg-orange-500/5 border border-orange-500/10 text-[11px] leading-relaxed text-echo-text-muted">
        <p className="font-bold text-orange-500 mb-1">⚠️ 软件来源提醒</p>
        <p className="mb-3">
          Echo 唯一官方发布渠道为 GitHub 仓库 <strong>Future-404/echo</strong>。本软件完全免费，永不售卖。
          若您从其他渠道付费购买，请立即申请退款并维护权益。
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2 font-medium">
          <a href="https://github.com/Future-404/echo" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
            项目仓库 (GitHub)
          </a>
          <a href="https://github.com/Future-404/echo/releases" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
            官方下载 (Releases)
          </a>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
