import React from 'react';
import { Sparkles, Brain, BookOpen, Users, Zap, Code2, Lock, Paintbrush, Cpu } from 'lucide-react';

const FEATURES = [
  { icon: <Sparkles size={16} className="text-purple-400" />, title: '角色系统', desc: '导入 CharX / PNG 角色卡，完整人设、记忆、世界书一体化管理' },
  { icon: <Brain size={16} className="text-blue-400" />, title: '长期记忆', desc: '自动蒸馏对话精华，向量检索历史记忆，角色不再失忆' },
  { icon: <BookOpen size={16} className="text-green-400" />, title: '世界书', desc: '关键词触发知识注入，为角色构建专属世界观与背景设定' },
  { icon: <Users size={16} className="text-yellow-400" />, title: '双角色模式', desc: '两个 AI 角色同时在线，支持多角色协同对话场景' },
  { icon: <Zap size={16} className="text-orange-400" />, title: 'Skills 系统', desc: '联网搜索、实时天气、地理位置、设备信息，AI 主动感知现实' },
  { icon: <Code2 size={16} className="text-cyan-400" />, title: 'HTML 渲染', desc: 'iframe 沙盒渲染动态状态卡与自定义交互界面，打造沉浸体验' },
];

const ADVANTAGES = [
  { icon: <Lock size={18} className="text-blue-400" />, title: '数据本地', desc: '对话记录存储在你自己的设备，永远不经过我们的服务器' },
  { icon: <Paintbrush size={18} className="text-pink-400" />, title: '高度可定制', desc: 'CSS 包 + 状态渲染协议，界面风格完全由你掌控' },
  { icon: <Cpu size={18} className="text-orange-400" />, title: '可扩展技能', desc: 'Skills 系统持续扩展 AI 的现实感知能力，不止于对话' },
];

const EchoIntro: React.FC<{ onNavigate?: (id: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-8 text-xs md:text-sm">

      {/* 定位 */}
      <div className="text-center space-y-2 py-2">
        <h2 className="text-lg md:text-xl font-bold tracking-tight">欢迎使用 Echo</h2>
        <p className="opacity-60 leading-relaxed max-w-md mx-auto">
          运行在浏览器里的本地 AI 角色扮演平台。<br />
          数据存你自己的设备，无需注册，无需订阅。
        </p>
      </div>

      {/* 核心功能 */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3">核心功能</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {FEATURES.map(f => (
            <div key={f.title} className="flex gap-3 p-3 rounded-xl border border-white/8 bg-white/2 hover:bg-white/5 transition-colors">
              <div className="mt-0.5 shrink-0">{f.icon}</div>
              <div>
                <p className="font-semibold mb-0.5">{f.title}</p>
                <p className="opacity-50 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 优势 */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3">为什么选 Echo</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {ADVANTAGES.map(a => (
            <div key={a.title} className="p-3 rounded-xl border border-white/8 bg-white/2 space-y-1.5">
              <div className="flex items-center gap-2">
                {a.icon}
                <span className="font-semibold">{a.title}</span>
              </div>
              <p className="opacity-50 leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      {onNavigate && (
        <div className="text-center pt-2">
          <button
            onClick={() => onNavigate('quickstart')}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/20 transition-colors text-xs font-semibold"
          >
            快速开始 →
          </button>
        </div>
      )}
    </div>
  );
};

export default EchoIntro;
