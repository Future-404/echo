import type { StateCreator } from 'zustand'
import type { Tweet } from '../types/tweet'
import { db } from '../storage/db'

export interface TweetSlice {
  tweets: Tweet[]
  
  addTweet: (tweet: Tweet) => Promise<void>
  updateTweet: (id: string, updates: Partial<Tweet>) => Promise<void>
  deleteTweet: (id: string) => Promise<void>
  incrementTweetLikes: (id: string) => Promise<void>
  incrementTweetReplies: (id: string) => Promise<void>
  loadTweets: () => Promise<void>
  getUnrepliedMentions: (charId: string) => Promise<Tweet[]>
}

export const createTweetSlice: StateCreator<TweetSlice> = (set, get) => ({
  tweets: [],
  
  addTweet: async (tweet) => {
    await db.tweets.add(tweet)
    set(state => ({ tweets: [tweet, ...state.tweets] }))
  },
  
  updateTweet: async (id, updates) => {
    await db.tweets.update(id, updates)
    set(state => ({
      tweets: state.tweets.map(p => p.id === id ? { ...p, ...updates } : p)
    }))
  },
  
  deleteTweet: async (id) => {
    await db.tweets.delete(id)
    set(state => ({ tweets: state.tweets.filter(p => p.id !== id) }))
  },
  
  incrementTweetLikes: async (id) => {
    const tweet = get().tweets.find(p => p.id === id)
    if (tweet) {
      await get().updateTweet(id, { likes: tweet.likes + 1 })
    }
  },
  
  incrementTweetReplies: async (id) => {
    const tweet = get().tweets.find(p => p.id === id)
    if (tweet) {
      await get().updateTweet(id, { replies: tweet.replies + 1 })
    }
  },

  loadTweets: async () => {
    const tweets = await db.tweets.orderBy('createdAt').reverse().toArray()
    set({ tweets: tweets })
  },
  
  getUnrepliedMentions: async (charId: string) => {
    // 1. 找到所有引用了我的推文（replyToId 指向我的某条推文，或者内容中直接 @ 了我，这里简化为 replyToId 逻辑为主）
    // 为了更全面，我们可以获取全部推文，找出其中 replyToId 是我的推文，或者被认为是提到了我的推文。
    // 简易实现：先查出我的所有推文ID，再找谁 replyToId 是这些ID，或者 content 中提到了我。
    const allTweets = await db.tweets.toArray()
    
    const myTweetIds = new Set(allTweets.filter(t => t.characterId === charId).map(t => t.id))
    
    // 找到对我的回复，或者内容中提到了我（假设通过名字，但暂不处理复杂正则，主要处理 replyToId）
    const mentions = allTweets.filter(t => 
      t.characterId !== charId && // 不是我自己发的
      (t.replyToId && myTweetIds.has(t.replyToId)) // 或者是回复我的
    )
    
    // 2. 检查我是否已经回复过这些 mention
    const unrepliedMentions = mentions.filter(mention => {
      const hasReplied = allTweets.some(t => t.characterId === charId && t.replyToId === mention.id)
      return !hasReplied
    })
    
    return unrepliedMentions.sort((a, b) => b.createdAt - a.createdAt)
  }
})
