import React, { useMemo, useEffect, useState, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../store/useAppStore'
import { 
  Trophy, MessageSquare, Users, Calendar, Database, 
  ArrowLeft, RefreshCw, Star, Clock, Activity, 
  TrendingUp, Hash, Zap, Loader2
} from 'lucide-react'
import { imageDb } from '../utils/imageDb'

// --- 辅助组件: 智能头像 (优化：memo) ---
const CharAvatar = memo<{ src?: string, name: string, size?: string, className?: string }>(({ src, name, size = 'w-12 h-12', className = '' }) => {
  const [url, setUrl] = useState<string | null>(null)
  const [prevSrc, setPrevSrc] = useState<string | undefined>(src)

  if (src !== prevSrc) {
    setPrevSrc(src)
    setUrl(null)
  }

  const displayUrl = useMemo(() => {
    if (src && (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/'))) {
      return src
    }
    return url
  }, [src, url])

  useEffect(() => {
    if (!src || src.startsWith('data:') || src.startsWith('http') || src.startsWith('/')) {
      return
    }
    let isMounted = true
    imageDb.get(src).then(result => {
      if (isMounted) setUrl(result)
    })
    return () => { isMounted = false }
  }, [src])

  return (
    <div className={`${size} rounded-full overflow-hidden bg-echo-surface-md flex-shrink-0 border border-echo-border shadow-inner ${className}`}>
      {displayUrl ? (
        <img src={displayUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-echo-text-subtle font-bold uppercase">
          {name[0]}
        </div>
      )}
    </div>
  )
})

// --- 辅助组件: Bento 统计卡片 (优化：memo) ---
const StatCard = memo<{ 
  title: string, 
  value: string | number, 
  icon: React.ReactNode, 
  color: string,
  delay?: number,
  span?: string 
}>(({ title, value, icon, color, delay = 0, span = 'col-span-1' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`${span} group relative overflow-hidden rounded-3xl border border-echo-border bg-white/40 dark:bg-white/[0.03] backdrop-blur-md p-5 hover:border-echo-accent/30 transition-all duration-500`}
  >
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
    <div className="relative flex flex-col h-full justify-between gap-4">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${color} bg-opacity-10 text-white shadow-lg`}>
          {icon}
        </div>
        <TrendingUp size={12} className="text-echo-text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-echo-text-muted mb-1">{title}</p>
        <p className="text-3xl font-mono font-medium text-echo-text-primary tracking-tight leading-none">{value}</p>
      </div>
    </div>
  </motion.div>
))

const ArchiveScreen: React.FC = () => {
  const { characters, archiveStats, messages, saveSlots, setCurrentView, rebuildArchiveStats } = useAppStore()
  const [isRebuilding, setIsRebuilding] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  const handleRebuild = async () => {
    setIsRebuilding(true)
    await rebuildArchiveStats()
    setIsRebuilding(false)
  }

  const charStatsList = useMemo(() => {
    if (!archiveStats.characterStats) return []
    return Object.entries(archiveStats.characterStats)
      .map(([id, data]) => ({
        character: characters.find(c => c.id === id),
        ...data
      }))
      .filter(item => item.character)
      .sort((a, b) => b.messageCount - a.messageCount)
  }, [archiveStats.characterStats, characters])

  const top3 = charStatsList.slice(0, 3)
  const [now] = useState(() => Date.now())
  
  const globalStats = useMemo(() => {
    return {
      totalMessages: archiveStats.globalStats?.totalMessages || messages.length,
      userMessages: archiveStats.globalStats?.userMessages || 0,
      aiMessages: archiveStats.globalStats?.aiMessages || 0,
      totalCharacters: characters.length,
      totalSaves: saveSlots?.length || 0,
      activeDays: archiveStats.activeDates?.length || 0,
      lastActive: archiveStats.globalStats?.lastActiveDate || now
    }
  }, [archiveStats, messages.length, characters.length, saveSlots?.length, now])

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-20 overflow-y-auto bg-echo-base selection:bg-echo-accent/20"
    >
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
             style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div ref={statsRef} className="relative min-h-full max-w-6xl mx-auto px-6 py-12 pb-40 bg-echo-base">
        
        {/* 顶部导航 */}
        <div id="stats-nav" className="flex items-center justify-between mb-16">
          <motion.button
            whileHover={{ x: -4 }}
            onClick={() => setCurrentView('home')}
            className="group flex items-center gap-3 px-4 py-2 rounded-full bg-white/50 dark:bg-white/5 border border-echo-border backdrop-blur-sm transition-all"
          >
            <ArrowLeft size={16} className="text-echo-text-muted group-hover:text-echo-accent transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-echo-text-muted group-hover:text-echo-text-primary transition-colors">返回主界面</span>
          </motion.button>

          <motion.button
            whileHover={{ rotate: 180 }}
            onClick={handleRebuild}
            disabled={isRebuilding}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-white/5 border border-echo-border backdrop-blur-sm text-echo-text-muted hover:text-echo-accent transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRebuilding ? 'animate-spin' : ''} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{isRebuilding ? '同步中...' : '重建统计'}</span>
          </motion.button>
        </div>

        {/* 标题区 */}
        <header className="mb-20 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20"
          >
            <Trophy size={32} className="text-white" />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter text-echo-text-primary mb-4"
          >
            STATISTICS<span className="text-echo-accent">.</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[11px] font-bold uppercase tracking-[0.5em] text-echo-text-muted opacity-60"
          >
            使用统计 // 数据分析
          </motion.p>
        </header>

        {/* TOP 3 领奖台 */}
        <section className="mb-16 md:mb-24 px-0 md:px-4">
          <div className="relative flex flex-row items-end justify-center gap-2 md:gap-4 max-w-4xl mx-auto overflow-hidden">
            
            {/* Rank 2 */}
            <AnimatePresence>
              {top3[1] && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="relative flex flex-col items-center group w-1/3"
                >
                  <div className="relative mb-3 md:mb-6 scale-90 md:scale-100">
                    <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all duration-500" />
                    <CharAvatar 
                      src={top3[1].character!.image} 
                      name={top3[1].character!.name} 
                      size="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32" 
                      className="relative border-2 md:border-4 border-white/50 dark:border-white/10"
                    />
                    <div className="absolute -top-1 -right-1 w-6 h-6 md:w-10 md:h-10 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] md:text-base text-slate-600 dark:text-slate-300 font-black shadow-lg border-2 border-white dark:border-echo-base">
                      2
                    </div>
                  </div>
                  <div className="w-full h-24 md:h-40 bg-white/40 dark:bg-white/5 rounded-t-2xl md:rounded-t-3xl border-x border-t border-echo-border flex flex-col items-center pt-3 md:pt-6 px-1 md:px-4">
                    <h3 className="text-[10px] md:text-lg font-bold text-echo-text-primary truncate w-full text-center">{top3[1].character!.name}</h3>
                    <div className="mt-1 md:mt-2 flex items-center gap-0.5 md:gap-1 text-purple-500">
                      <Hash size={10} className="md:w-3 md:h-3" />
                      <span className="text-sm md:text-2xl font-mono font-bold leading-none">{top3[1].messageCount}</span>
                    </div>
                    <span className="hidden md:block text-[8px] font-bold uppercase tracking-widest text-echo-text-muted mt-2">消息数</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rank 1 */}
            <AnimatePresence>
              {top3[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative flex flex-col items-center group w-1/3 z-10"
                >
                  <div className="relative mb-3 md:mb-6">
                    <div className="absolute inset-[-20%] bg-echo-accent/20 rounded-full blur-2xl md:blur-3xl animate-pulse" />
                    <CharAvatar 
                      src={top3[0].character!.image} 
                      name={top3[0].character!.name} 
                      size="w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44" 
                      className="relative border-3 md:border-4 border-echo-accent shadow-[0_0_20px_rgba(59,130,246,0.2)] md:shadow-[0_0_40px_rgba(59,130,246,0.3)]"
                    />
                    <div className="absolute -top-2 -right-2 w-8 h-8 md:w-14 md:h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-black text-xs md:text-xl shadow-xl border-2 md:border-4 border-white dark:border-echo-base rotate-12 group-hover:rotate-0 transition-transform">
                      1
                    </div>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-2 md:px-4 py-0.5 md:py-1 bg-echo-accent text-white text-[7px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] rounded-full shadow-lg whitespace-nowrap">
                      Master
                    </div>
                  </div>
                  <div className="w-full h-32 md:h-56 bg-white/60 dark:bg-white/[0.08] rounded-t-2xl md:rounded-t-3xl border-x border-t border-echo-accent/30 shadow-[0_-10px_20px_rgba(0,0,0,0.01)] md:shadow-[0_-20px_40px_rgba(0,0,0,0.02)] flex flex-col items-center pt-4 md:pt-8 px-1 md:px-4 backdrop-blur-xl">
                    <h3 className="text-xs md:text-2xl font-black text-echo-text-primary truncate w-full text-center tracking-tight">{top3[0].character!.name}</h3>
                    <div className="mt-2 md:mt-3 flex items-center gap-1 md:gap-2 text-echo-accent">
                      <TrendingUp size={12} className="md:w-4 md:h-4" />
                      <span className="text-lg md:text-4xl font-mono font-bold leading-none tracking-tighter">{top3[0].messageCount}</span>
                    </div>
                    <span className="hidden md:block text-[9px] font-black uppercase tracking-[0.3em] text-echo-text-muted mt-3">TOTAL SYNCED</span>
                    <div className="mt-3 md:mt-6 w-8 md:w-12 h-0.5 md:h-1 bg-echo-accent/20 rounded-full" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rank 3 */}
            <AnimatePresence>
              {top3[2] && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="relative flex flex-col items-center group w-1/3"
                >
                  <div className="relative mb-3 md:mb-6 scale-75 md:scale-100 origin-bottom">
                    <div className="absolute inset-0 bg-pink-500/20 rounded-full blur-2xl group-hover:bg-pink-500/30 transition-all duration-500" />
                    <CharAvatar 
                      src={top3[2].character!.image} 
                      name={top3[2].character!.name} 
                      size="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28" 
                      className="relative border-2 md:border-4 border-white/50 dark:border-white/10"
                    />
                    <div className="absolute -top-1 -right-1 w-6 h-6 md:w-10 md:h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-[10px] md:text-base text-orange-600 dark:text-orange-400 font-black shadow-lg border-2 border-white dark:border-echo-base">
                      3
                    </div>
                  </div>
                  <div className="w-full h-20 md:h-32 bg-white/40 dark:bg-white/5 rounded-t-2xl md:rounded-t-3xl border-x border-t border-echo-border flex flex-col items-center pt-2 md:pt-5 px-1 md:px-4">
                    <h3 className="text-[10px] md:text-base font-bold text-echo-text-primary truncate w-full text-center">{top3[2].character!.name}</h3>
                    <div className="mt-0.5 md:mt-1 flex items-center gap-0.5 md:gap-1 text-pink-500">
                      <Hash size={10} className="md:w-2.5 md:h-2.5" />
                      <span className="text-sm md:text-xl font-mono font-bold leading-none">{top3[2].messageCount}</span>
                    </div>
                    <span className="hidden md:block text-[7px] font-bold uppercase tracking-widest text-echo-text-muted mt-1">消息数</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Bento 统计网格 */}
        <section className="mb-24">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-echo-border" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-echo-text-muted">全局统计</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-echo-border" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <StatCard 
              title="总消息数" 
              value={globalStats.totalMessages.toLocaleString()} 
              icon={<MessageSquare size={18} />} 
              color="from-blue-500 to-indigo-500"
              delay={0.6}
            />
            <StatCard 
              title="活跃角色" 
              value={globalStats.totalCharacters} 
              icon={<Users size={18} />} 
              color="from-purple-500 to-pink-500"
              delay={0.7}
            />
            <StatCard 
              title="存档槽位" 
              value={globalStats.totalSaves} 
              icon={<Database size={18} />} 
              color="from-emerald-500 to-teal-500"
              delay={0.8}
            />
            <StatCard 
              title="活跃天数" 
              value={globalStats.activeDays} 
              icon={<Calendar size={18} />} 
              color="from-orange-500 to-rose-500"
              delay={0.9}
            />

            {/* AI vs User 分布 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.0 }}
              className="col-span-2 md:col-span-2 rounded-3xl border border-echo-border bg-white/40 dark:bg-white/[0.03] backdrop-blur-md p-6 overflow-hidden relative group"
            >
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-6">
                   <div className="p-2 rounded-xl bg-echo-accent/10 text-echo-accent">
                    <Activity size={18} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-echo-text-muted">交互平衡</span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-echo-text-subtle uppercase tracking-widest mb-1">AI 响应占比</p>
                      <p className="text-2xl font-mono font-bold text-echo-text-primary">
                        {globalStats.totalMessages > 0 ? Math.round((globalStats.aiMessages / globalStats.totalMessages) * 100) : 0}%
                        <span className="text-xs font-normal text-echo-text-muted ml-1 italic">AI 驱动</span>
                      </p>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-bold text-echo-text-subtle uppercase tracking-widest mb-1">用户输入</p>
                       <p className="text-lg font-mono text-echo-text-muted">
                        {globalStats.userMessages} <span className="text-[10px]">条</span>
                       </p>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-echo-surface-md rounded-full overflow-hidden flex shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(globalStats.aiMessages / globalStats.totalMessages) * 100}%` }}
                      transition={{ duration: 1, delay: 1.2 }}
                      className="h-full bg-gradient-to-r from-blue-400 to-indigo-500" 
                    />
                    <div className="h-full flex-1 bg-echo-accent opacity-20" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 活跃状态 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1 }}
              className="col-span-2 md:col-span-2 rounded-3xl border border-echo-border bg-white/40 dark:bg-white/[0.03] backdrop-blur-md p-6 overflow-hidden relative"
            >
              <div className="relative z-10 flex flex-col justify-between h-full">
                 <div className="flex items-center justify-between mb-6">
                   <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                    <Clock size={18} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-echo-text-muted">在线状态</span>
                </div>
                
                <div>
                  <p className="text-[9px] font-bold text-echo-text-subtle uppercase tracking-widest mb-1">最后同步时间</p>
                  <p className="text-3xl font-mono font-bold text-echo-text-primary tracking-tighter">
                    {formatDate(globalStats.lastActive)}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">系统在线</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 角色名录 */}
        <section>
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-3xl font-black tracking-tight text-echo-text-primary">角色名录</h2>
            <div className="h-[2px] flex-1 bg-gradient-to-r from-echo-border to-transparent" />
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-echo-border bg-white/50 dark:bg-white/5 text-[9px] font-bold text-echo-text-muted uppercase tracking-widest">
              <Star size={10} className="text-yellow-500" />
              共 {charStatsList.length} 位
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {charStatsList.map((item, idx) => (
              <motion.div
                key={item.character!.id}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="group flex items-center gap-4 p-4 rounded-2xl border border-echo-border bg-white/30 dark:bg-white/[0.02] hover:bg-white/60 dark:hover:bg-white/[0.05] hover:border-echo-accent/20 hover:shadow-xl hover:shadow-echo-accent/5 transition-all duration-300"
              >
                <div className="relative">
                  <CharAvatar 
                    src={item.character!.image} 
                    name={item.character!.name} 
                    size="w-16 h-16" 
                    className="group-hover:scale-110 transition-transform duration-500"
                  />
                  {idx < 3 && (
                    <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-lg ${
                      idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : 'bg-orange-500'
                    }`}>
                      {idx + 1}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-echo-text-primary truncate group-hover:text-echo-accent transition-colors">
                    {item.character!.name}
                  </h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-echo-text-muted">
                      <MessageSquare size={10} className="text-blue-400" />
                      {item.messageCount}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-echo-text-muted">
                      <Clock size={10} className="text-orange-400" />
                      {new Date(item.lastInteraction).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                    </div>
                  </div>
                </div>

                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                   <div className="p-2 rounded-xl bg-echo-accent text-white shadow-lg">
                    <Zap size={14} />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </section>

      </div>
    </motion.div>
  )
}

export default ArchiveScreen
