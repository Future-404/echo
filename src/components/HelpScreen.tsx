import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Layers, Zap, Database, ShieldCheck, Cpu, Info, ChevronRight, Save, Share2, MessageCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const HELP_SECTIONS = [
  {
    id: 'chara',
    title: '角色卡规范',
    icon: <BookOpen size={18} />,
    content: (
      <div className="space-y-4 text-xs md:text-sm">
        <p>ECHO 引擎深度兼容主流角色卡協議，并进行了本地化增强。</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>PNG 隐写：</strong> 支持直接读取 PNG 图片中的 tEXt/iTXt 数据块，提取角色设定。</li>
          <li><strong>V2 规范：</strong> 完整支持角色卡 V2 协议中的世界书引用、多开场白等高级特性。</li>
          <li><strong>动态宏：</strong> 支持 <code className="bg-white/10 px-1 rounded">{"{{user}}"}</code>、<code className="bg-white/10 px-1 rounded">{"{{char}}"}</code> 等实时宏替换。</li>
        </ul>
      </div>
    )
  },
  {
    id: 'world',
    title: '世界书库',
    icon: <Layers size={18} />,
    content: (
      <div className="space-y-4 text-xs md:text-sm">
        <p>世界书是构建角色记忆与背景知识的核心机制，支持公共库与角色私设两种模式。</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>关键词触发：</strong> 当用户或角色的对话触发预设关键词时，相关的世界设定将被自动注入 Context。</li>
          <li><strong>优先级管理：</strong> 支持设置插入顺序，确保逻辑严密。</li>
          <li><strong>角色私设：</strong> 角色独有的记忆碎片，仅在当前角色活跃时生效。</li>
        </ul>
      </div>
    )
  },
  {
    id: 'prompt',
    title: 'Prompt 注入',
    icon: <Zap size={18} />,
    content: (
      <div className="space-y-4 text-xs md:text-sm">
        <p>通过 Directive系统，可以精确控制 AI 的回复风格与逻辑限制。</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>全局指令：</strong> 对所有角色生效的通用行为规范。</li>
          <li><strong>系统提示词：</strong> 每个角色的核心人格设定，决定了 AI 的基础调性。</li>
          <li><strong>动态注入：</strong> 指令会根据当前对话状态动态拼接，最大化节省 Token。</li>
        </ul>
      </div>
    )
  },
  {
    id: 'skills',
    title: '技能 Skills',
    icon: <Cpu size={18} />,
    content: (
      <div className="space-y-4 text-xs md:text-sm">
        <p>技能扩展赋予 AI 与系统交互的能力，使其不仅仅是一个对话框。</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>任务追踪：</strong> 自动解析对话中的任务进度，并实时更新任务栏。</li>
          <li><strong>属性感知：</strong> AI 可以感知角色的数值属性。</li>
          <li><strong>自定义插件：</strong> 未來實現开发者通过 Skill API 扩展新的逻辑模块。</li>
        </ul>
      </div>
    )
  },
  {
    id: 'save',
    title: '存档系统',
    icon: <Save size={18} />,
    content: (
      <div className="space-y-4 text-xs md:text-sm">
        <p>完善的存档机制确保您的冒险历程得到完整记录。</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>多档位管理：</strong> 支持手动创建多个存档点，并可自由重命名以区分剧情线。</li>
          <li><strong>自动备份：</strong> 系统会在关键对话节点自动生成快照，并在“读取记忆”界面显示。</li>
          <li><strong>快照完整性：</strong> 存档不仅包含消息记录，还完整封装了当前的任务进度、世界书激活状态及角色属性。</li>
        </ul>
      </div>
    )
  },
  {
    id: 'storage',
    title: '存储机制',
    icon: <Database size={18} />,
    content: (
      <div className="space-y-4 text-xs md:text-sm">
        <p>ECHO 采用混合存储架构，确保高性能与大数据承载力。</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>本地优先：</strong> 默认数据全量存储于浏览器 IndexedDB，不占用 localStorage 空间。</li>
          <li><strong>图片缓存：</strong> 高清立绘与背景图片会被自动持久化，无需重复加载。</li>
          <li><strong>跨设备同步：</strong> 配合远程后端配置，可实现多终端数据的无缝同步。</li>
        </ul>
      </div>
    )
  },
  {
    id: 'api',
    title: 'AIP 规范',
    icon: <Info size={18} />,
    content: (
      <div className="space-y-4 text-xs md:text-sm">
        <p>本系统遵循标准 AI 接口协议，支持多种 Provider 切换。</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>兼容性：</strong> 完美支持 OpenAI、Anthropic 及国产大模型接口。</li>
          <li><strong>流式响应：</strong> 默认开启打字机效果，提供更自然的交互体验。</li>
          <li><strong>参数控制：</strong> 允许针对不同角色设置独立的 Temperature 和 Top_P 参数。</li>
        </ul>
      </div>
    )
  },
  {
    id: 'backend',
    title: '开源后端存储',
    icon: <Share2 size={18} />,
    content: (
      <div className="space-y-4 text-xs md:text-sm">
        <p>为了保障数据主权与灵活性，我们提供了配套的开源存储方案。</p>
        <ul className="list-disc pl-5 space-y-2 opacity-80">
          <li><strong>纯前端实现：</strong> ECHO 核心业务逻辑完全在浏览器运行，本引擎不设中心化服务器。</li>
          <li><strong>开源后端：</strong> 開源配套的存储服務，自建存儲系統 <code className="bg-white/10 px-1 rounded">echo-storage</code> 已完全开源，支持 Node.js 与 Cloudflare Worker 部署。</li>
          <li><strong>自建数据桶：</strong> 用户可以自建 D1 数据庫，通过配置 API Token 实现完全私有的云端存储。</li>
        </ul>
      </div>
    )
  },
  {
    id: 'feedback',
    title: '交流与反馈',
    icon: <MessageCircle size={18} />,
    content: (
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
    )
  }
];

const HelpScreen: React.FC = () => {
  const { setCurrentView } = useAppStore();
  const [activeTab, setActiveTab] = useState(HELP_SECTIONS[0].id);

  const activeSection = HELP_SECTIONS.find(s => s.id === activeTab) || HELP_SECTIONS[0];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-echo-base dark:bg-[#080808] flex items-center justify-center p-0 md:p-10"
    >
      <div className="relative w-full max-w-5xl h-full md:h-[85vh] bg-white dark:bg-[#121212] md:border-0.5 md:border-echo-border md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* 关闭按钮 - 移动端位置微调 */}
        <button 
          onClick={() => setCurrentView('home')}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 md:p-3 rounded-full bg-white/50 dark:bg-black/20 md:bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 z-20 transition-all"
        >
          <X size={20} />
        </button>

        {/* 导航区域 */}
        <div className="w-full md:w-72 border-b-0.5 md:border-b-0 md:border-r-0.5 border-gray-100 dark:border-gray-800 p-4 md:p-8 flex flex-col shrink-0">
          <div className="mb-4 md:mb-8 hidden md:block">
            <h2 className="text-[10px] tracking-[0.5em] text-gray-400 uppercase font-medium">System Guide</h2>
            <p className="text-xl font-serif text-gray-800 dark:text-gray-100 mt-2">引导手册</p>
          </div>
          
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-y-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {HELP_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={`flex-shrink-0 flex items-center gap-2 md:gap-4 px-4 md:px-5 py-2 md:py-4 rounded-xl md:rounded-2xl transition-all ${
                  activeTab === section.id 
                    ? 'bg-blue-500/10 text-blue-500 font-bold' 
                    : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <span className={`${activeTab === section.id ? 'text-blue-500' : 'text-gray-400'} scale-90 md:scale-100`}>
                  {section.icon}
                </span>
                <span className="text-[10px] md:text-xs tracking-widest uppercase whitespace-nowrap">{section.title}</span>
                <ChevronRight size={14} className="ml-auto hidden md:block" />
              </button>
            ))}
          </nav>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 p-6 md:p-16 overflow-y-auto no-scrollbar bg-white dark:bg-[#121212]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-2xl"
            >
              <div className="mb-6 md:mb-10">
                <div className="hidden md:flex w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 items-center justify-center text-blue-500 mb-6 border-0.5 border-gray-100 dark:border-gray-800">
                  {activeSection.icon}
                </div>
                <h3 className="text-xl md:text-3xl font-serif text-gray-800 dark:text-gray-100 mb-2">{activeSection.title}</h3>
                <div className="w-8 md:w-12 h-[2px] bg-blue-500/30" />
              </div>
              
              <div className="text-gray-500 dark:text-gray-400 leading-relaxed font-sans">
                {activeSection.content}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default HelpScreen;
