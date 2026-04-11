import type { SkillModule } from '../core/types'
import { useAppStore } from '../../store/useAppStore'
import { nanoid } from 'nanoid'

export const tweetSkill: SkillModule = {
  name: 'manage_social_presence',
  displayName: '社交动态',
  
  schema: {
    type: 'function',
    function: {
      name: 'manage_social_presence',
      description: '管理社交网络动态，包括查看推文广场、发布新推文、点赞以及回复他人的评论。',
      parameters: {
        type: 'object',
        properties: {
          actions: {
            type: 'array',
            description: '你要执行的社交操作列表（可选，如果不传则仅仅是刷推特）',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['post', 'reply', 'like'],
                  description: '操作类型：post(发新推), reply(回复他人), like(点赞)'
                },
                targetTweetId: {
                  type: 'string',
                  description: '当 type 为 reply 或 like 时，目标推文的 ID'
                },
                content: {
                  type: 'string',
                  description: '当 type 为 post 或 reply 时，你要发布的正文内容'
                },
                images: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '配图 URL（可选）'
                }
              },
              required: ['type']
            }
          },
          fetch_feed: {
            type: 'boolean',
            description: '是否在操作后获取最新的广场动态和提醒（默认为 true）'
          }
        }
      }
    }
  },

  systemPrompt: `你可以使用 manage_social_presence 工具来参与社交互动（刷推特、点赞、回复、发推）。
- 如果你被 @ 了，或者有人回复了你，请记得在合适的时候使用 reply 动作回复他们。
- 每次调用此技能后，你都会收到包含 'mentions'（与你相关的互动）和 'feed'（广场最新动态）的社交摘要。
- 只有当你确认自己还没有回复过别人时（needs_reply: true），才去回复。
- 可以一次调用执行多个 action（如：同时点赞一条并回复另一条，然后自己发一条）。`,

  execute: async (args: any) => {
    const { actions = [], fetch_feed = true } = args
    const store = useAppStore.getState()
    const { addTweet, incrementTweetLikes, incrementTweetReplies, selectedCharacter, getUnrepliedMentions } = store
    
    if (!selectedCharacter) {
      return { success: false, message: '未选择角色' }
    }

    const results: string[] = []

    // 1. 处理所有 Actions
    for (const action of actions) {
      if (action.type === 'post' && action.content) {
        const post = {
          id: nanoid(),
          characterId: selectedCharacter.id,
          characterName: selectedCharacter.name,
          characterAvatar: selectedCharacter.image,
          content: action.content,
          images: action.images || [],
          createdAt: Date.now(),
          likes: 0,
          retweets: 0,
          replies: 0
        }
        await addTweet(post)
        results.push(`发推成功: [${post.id}] ${action.content.substring(0, 20)}...`)
      } 
      else if (action.type === 'reply' && action.targetTweetId && action.content) {
        const replyPost = {
          id: nanoid(),
          characterId: selectedCharacter.id,
          characterName: selectedCharacter.name,
          characterAvatar: selectedCharacter.image,
          content: action.content,
          images: action.images || [],
          createdAt: Date.now(),
          likes: 0,
          retweets: 0,
          replies: 0,
          replyToId: action.targetTweetId
        }
        await addTweet(replyPost)
        await incrementTweetReplies(action.targetTweetId)
        results.push(`回复成功 [目标: ${action.targetTweetId}]: ${action.content.substring(0, 20)}...`)
      }
      else if (action.type === 'like' && action.targetTweetId) {
        await incrementTweetLikes(action.targetTweetId)
        results.push(`点赞成功 [目标: ${action.targetTweetId}]`)
      }
    }

    // 2. 获取反馈数据 (Fetch Feed)
    let feedback: any = { actionsResult: results }
    
    if (fetch_feed !== false) {
      const mentions = await getUnrepliedMentions(selectedCharacter.id)
      
      // 取最新的广场动态 (排除自己刚发的)，限制为最新 10 条
      const feed = store.tweets
        .filter(t => t.characterId !== selectedCharacter.id) // 可以不看自己的
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map(t => ({
          id: t.id,
          author: t.characterName,
          content: t.content,
          likes: t.likes,
          replies: t.replies
        }))

      // 限制未读提醒也最多返回 10 条
      feedback.mentions = mentions.slice(0, 10).map(m => {
        const parentTweet = m.replyToId ? store.tweets.find(t => t.id === m.replyToId) : null
        return {
          id: m.id,
          author: m.characterName,
          content: m.content,
          in_reply_to_your_tweet: parentTweet ? parentTweet.content : undefined,
          needs_reply: true // 因为 getUnrepliedMentions 已经过滤过了
        }
      })
      
      feedback.feed = feed
    }
    
    return {
      success: true,
      message: `社交操作已处理`,
      data: feedback
    }
  }
}
