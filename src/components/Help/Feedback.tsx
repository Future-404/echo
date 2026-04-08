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
    </div>
  );
};

export default Feedback;
