import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Layers, Database, Cpu, Info, ChevronRight, BarChart2, MessageCircle, Paintbrush, Users, Rocket, BrainCircuit, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

// Import sub-components
import QuickStart from './Help/QuickStart';
import EchoIntro from './Help/EchoIntro';
import WritingGuide from './Help/WritingGuide';
import KnowledgeInjection from './Help/KnowledgeInjection';
import SkillsGuide from './Help/SkillsGuide';
import MultiCharGuide from './Help/MultiCharGuide';
import StatusProtocol from './Help/StatusProtocol';
import CustomCssGuide from './Help/CustomCssGuide';
import StorageGuide from './Help/StorageGuide';
import MemoryGuide from './Help/MemoryGuide';
import SecurityGuide from './Help/SecurityGuide';
import ApiSpecs from './Help/ApiSpecs';
import Feedback from './Help/Feedback';

const HelpScreen: React.FC = () => {
  const { setCurrentView } = useAppStore();
  const [activeTab, setActiveTab] = React.useState('intro');
  const activeTabRef = React.useRef<HTMLButtonElement>(null);

  const HELP_SECTIONS = React.useMemo(() => [
    { id: 'intro', title: 'Echo 介绍', icon: <Sparkles size={18} />, component: <EchoIntro onNavigate={setActiveTab} /> },
    { id: 'quickstart', title: '快速开始', icon: <Rocket size={18} />, component: <QuickStart /> },
    { id: 'writing', title: '角色创作', icon: <BookOpen size={18} />, component: <WritingGuide /> },
    { id: 'world', title: '知识注入系统', icon: <Layers size={18} />, component: <KnowledgeInjection /> },
    { id: 'skills', title: '技能 Skills', icon: <Cpu size={18} />, component: <SkillsGuide /> },
    { id: 'multichar', title: '双角色模式', icon: <Users size={18} />, component: <MultiCharGuide /> },
    { id: 'status', title: '状态渲染协议', icon: <BarChart2 size={18} />, component: <StatusProtocol /> },
    { id: 'customcss', title: '自定义样式', icon: <Paintbrush size={18} />, component: <CustomCssGuide /> },
    { id: 'storage', title: '存储与存档', icon: <Database size={18} />, component: <StorageGuide /> },
    { id: 'memory', title: '记忆管理', icon: <BrainCircuit size={18} />, component: <MemoryGuide /> },
    { id: 'security', title: '安全与部署', icon: <Info size={18} />, component: <SecurityGuide /> },
    { id: 'api', title: 'API 规范', icon: <Cpu size={18} />, component: <ApiSpecs /> },
    { id: 'feedback', title: '交流与反馈', icon: <MessageCircle size={18} />, component: <Feedback /> },
  ], [setActiveTab]);

  React.useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  const activeSection = HELP_SECTIONS.find(s => s.id === activeTab) || HELP_SECTIONS[0];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-echo-base dark:bg-[#0a0a0a] flex items-center justify-center p-0 md:p-10 pt-[var(--sat)]"
    >
      <div className="relative w-full max-w-5xl h-full md:h-[85vh] bg-white dark:bg-[#0d0d0d] md:border-0.5 md:border-echo-border md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* 关闭按钮 */}
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
                ref={activeTab === section.id ? activeTabRef : undefined}
                onClick={() => setActiveTab(section.id)}
                className={`flex-shrink-0 flex items-center gap-2 md:gap-4 px-3 md:px-5 py-2 md:py-4 rounded-xl md:rounded-2xl transition-all ${
                  activeTab === section.id 
                    ? 'bg-blue-500/10 text-blue-500 font-bold' 
                    : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <span className={`${activeTab === section.id ? 'text-blue-500' : 'text-gray-400'} scale-90 md:scale-100 shrink-0`}>
                  {section.icon}
                </span>
                <span className="text-[10px] md:text-xs tracking-widest uppercase whitespace-nowrap">{section.title}</span>
                <ChevronRight size={14} className="ml-auto hidden md:block" />
              </button>
            ))}
          </nav>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 p-6 md:p-16 overflow-y-auto no-scrollbar bg-white dark:bg-[#0d0d0d] select-text cursor-auto">
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
                {activeSection.component}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default HelpScreen;
