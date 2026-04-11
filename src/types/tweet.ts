export interface Tweet {
  id: string;
  characterId: string;
  characterName: string;
  characterAvatar?: string;
  content: string;
  createdAt: number;
  likes: number;
  retweets: number;
  replies: number;
  images?: string[];
  location?: string;
  
  // 新增：回复和线程支持
  replyToId?: string; // 正在回复的推文ID
  rootTweetId?: string; // 根推文ID，用于串联整个对话
}
