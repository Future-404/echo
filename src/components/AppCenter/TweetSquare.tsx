import React, { useEffect, useState, memo, startTransition, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { ArrowLeft, Heart, Repeat2, MessageCircle, MapPin, CornerDownRight, X, Send } from 'lucide-react'
import { imageDb } from '../../utils/imageDb'
import { nanoid } from 'nanoid'

const CharAvatar = memo<{ src?: string, name: string }>(({ src, name }) => {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!src || src.startsWith('data:') || src.startsWith('http') || src.startsWith('/')) {
      setUrl(src || null)
      return
    }
    imageDb.get(src).then(setUrl)
  }, [src])

  const displayUrl = src && (src.startsWith('data:') || src.startsWith('http') || src.startsWith('/')) ? src : url

  return (
    <div className="w-12 h-12 rounded-full overflow-hidden bg-echo-surface flex-shrink-0 border border-echo-border">
      {displayUrl ? (
        <img src={displayUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-echo-text-subtle font-bold text-lg">
          {name[0]}
        </div>
      )}
    </div>
  )
})

const TweetSquare: React.FC = () => {
  const { tweets, incrementTweetLikes, incrementTweetReplies, setCurrentView, loadTweets, addTweet, config } = useAppStore()
  const seededRef = useRef(false)
  
  // 评论状态
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activePersona = config.personas.find((p) => p.id === config.activePersonaId) || config.personas[0]
  const userName = activePersona?.name || 'Observer'

  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true

    loadTweets().then(() => {
      const currentTweets = useAppStore.getState().tweets
      // 开发模式：如果没有推文，自动生成测试数据
      if (currentTweets.length === 0 && import.meta.env.DEV) {
        const mockTweets = [
          { id: `dev-${Date.now()}-1`, name: '艾莉', content: '今天的天气真好，阳光洒在窗台上，让人心情愉悦 ☀️', ts: Date.now() - 86400000 * 2 },
          { id: `dev-${Date.now()}-2`, name: '小明', content: '刚刚完成了一个新项目，感觉成就感满满！继续加油 💪', ts: Date.now() - 86400000 },
          { id: `dev-${Date.now()}-3`, name: '莉莉', content: '有时候停下来思考，比一直往前冲更重要 🤔', ts: Date.now() - 3600000 * 5 },
        ]
        
        // 模拟一条回复
        const replyTweet = {
          id: `dev-${Date.now()}-4`,
          name: '小明',
          content: '说得对！偶尔也要给自己放个假。',
          replyToId: mockTweets[2].id,
          ts: Date.now() - 3600000 * 4
        }
        
        const finalMocks = [...mockTweets, replyTweet]

        finalMocks.forEach((t) => {
          addTweet({
            id: t.id,
            characterId: `dev-${t.name}`,
            characterName: t.name,
            content: t.content,
            replyToId: t.replyToId,
            createdAt: t.ts,
            likes: Math.floor(Math.random() * 50),
            retweets: Math.floor(Math.random() * 20),
            replies: Math.floor(Math.random() * 10),
          })
        })
      }
    })
  }, [loadTweets])

  const handleLike = (id: string) => {
    incrementTweetLikes(id)
  }

  const formatTime = (ts: number) => {
    const now = Date.now()
    const diff = now - ts
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 overflow-y-auto bg-echo-base"
    >
      <div className="max-w-2xl mx-auto min-h-full border-x border-echo-border pb-24">
        
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-echo-base/80 border-b border-echo-border">
          <div className="flex items-center gap-4 px-4 py-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
            <button
              onClick={() => startTransition(() => setCurrentView('main'))}
              className="p-2 rounded-full hover:bg-echo-surface transition-colors"
            >
              <ArrowLeft size={20} className="text-echo-text-primary" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-echo-text-primary tracking-tight">推文广场</h1>
              <p className="text-[10px] text-echo-text-muted uppercase tracking-widest">Timeline // Square</p>
            </div>
          </div>
        </div>

        {/* 推文列表 */}
        <div className="divide-y divide-echo-border">
          {tweets.length === 0 ? (
            <div className="text-center py-24 px-6">
              <div className="w-16 h-16 bg-echo-surface rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} className="text-echo-text-dim" />
              </div>
              <p className="text-echo-text-muted font-medium">暂时没有推文</p>
              <p className="text-xs text-echo-text-dim mt-1">在对话中引导角色发表一些感想吧</p>
            </div>
          ) : (
            tweets.map((tweet) => (
              <motion.article
                key={tweet.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-5 hover:bg-echo-surface/30 transition-colors cursor-pointer group/tweet"
              >
                <div className="flex gap-4">
                  <CharAvatar src={tweet.characterAvatar} name={tweet.characterName} />
                  
                  <div className="flex-1 min-w-0">
                    {/* 用户名与时间 */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-[15px] text-echo-text-primary truncate">{tweet.characterName}</span>
                        <span className="text-echo-text-muted text-xs">·</span>
                        <span className="text-echo-text-muted text-xs whitespace-nowrap">{formatTime(tweet.createdAt)}</span>
                      </div>
                    </div>
                    
                    {/* 回复上下文框 */}
                    {tweet.replyToId && (() => {
                      const parent = tweets.find(t => t.id === tweet.replyToId);
                      if (!parent) return null;
                      return (
                        <div className="mb-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border-l-2 border-indigo-400/50 flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-[10px] text-indigo-500/80 font-medium">
                            <CornerDownRight size={10} strokeWidth={2.5} />
                            <span>Replying to @{parent.characterName}</span>
                          </div>
                          <span className="text-xs text-echo-text-muted line-clamp-2 break-all">{parent.content}</span>
                        </div>
                      )
                    })()}

                    {/* 正文 */}
                    <p className="text-[15px] leading-relaxed text-echo-text-primary whitespace-pre-wrap mb-3">
                      {tweet.content}
                    </p>

                    {/* 位置信息 */}
                    {tweet.location && (
                      <div className="flex items-center gap-1 text-echo-text-dim text-[11px] mb-3">
                        <MapPin size={10} />
                        <span>{tweet.location}</span>
                      </div>
                    )}

                    {/* 互动按钮组 */}
                    <div className="flex items-center gap-8 text-echo-text-muted mt-2">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setReplyingTo(tweet.id);
                          setReplyContent('');
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                        className="flex items-center gap-1.5 hover:text-blue-500 transition-colors group"
                      >
                        <div className="p-1.5 rounded-full group-hover:bg-blue-500/10 transition-colors">
                          <MessageCircle size={16} strokeWidth={1.8} />
                        </div>
                        <span className="text-xs font-medium">{tweet.replies || 0}</span>
                      </button>
                      
                      <button className="flex items-center gap-1.5 hover:text-green-500 transition-colors group">
                        <div className="p-1.5 rounded-full group-hover:bg-green-500/10 transition-colors">
                          <Repeat2 size={16} strokeWidth={1.8} />
                        </div>
                        <span className="text-xs font-medium">{tweet.retweets || 0}</span>
                      </button>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleLike(tweet.id); }}
                        className={`flex items-center gap-1.5 transition-colors group ${tweet.likes > 0 ? 'text-red-500' : 'hover:text-red-500'}`}
                      >
                        <div className="p-1.5 rounded-full group-hover:bg-red-500/10 transition-colors">
                          <Heart size={16} strokeWidth={1.8} className={tweet.likes > 0 ? "fill-red-500" : ""} />
                        </div>
                        <span className="text-xs font-medium">{tweet.likes}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))
          )}
        </div>

      </div>

      {/* 评论输入框 (固定底部) */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-echo-base/95 backdrop-blur-xl border-t border-echo-border p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pb-[calc(1rem+env(safe-area-inset-bottom))]"
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-medium text-blue-500 flex items-center gap-1">
                  <CornerDownRight size={12} />
                  回复 @{tweets.find(t => t.id === replyingTo)?.characterName}
                </span>
                <button 
                  onClick={() => { setReplyingTo(null); setReplyContent(''); }} 
                  className="p-1 rounded-full text-echo-text-muted hover:bg-echo-surface hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="留下你的评论..."
                  className="flex-1 bg-echo-surface rounded-2xl px-4 py-3 text-sm text-echo-text-primary border border-echo-border focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none no-scrollbar"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
                <button
                  disabled={!replyContent.trim()}
                  onClick={async () => {
                    if (!replyContent.trim() || !replyingTo) return;
                    const reply = {
                      id: nanoid(),
                      characterId: activePersona.id, // 使用用户 Persona 的 ID
                      characterName: userName,
                      content: replyContent.trim(),
                      replyToId: replyingTo,
                      createdAt: Date.now(),
                      likes: 0,
                      retweets: 0,
                      replies: 0
                    };
                    await addTweet(reply);
                    await incrementTweetReplies(replyingTo);
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                  className="w-11 h-11 flex-shrink-0 flex items-center justify-center bg-blue-500 text-white rounded-2xl disabled:opacity-50 disabled:bg-gray-400 hover:bg-blue-600 active:scale-95 transition-all shadow-sm"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default TweetSquare
