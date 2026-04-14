// 测试脚本：生成模拟推文数据
// 在浏览器控制台运行：复制粘贴整个脚本并回车

(async () => {
  const { useAppStore } = await import('./src/store/useAppStore')
  const { nanoid } = await import('nanoid')
  
  const mockTweets = [
    {
      characterName: '艾莉',
      content: '今天的天气真好，阳光洒在窗台上，让人心情愉悦 ☀️',
    },
    {
      characterName: '小明',
      content: '刚刚完成了一个新项目，感觉成就感满满！继续加油 💪',
    },
    {
      characterName: '艾莉',
      content: '晚安，今天也是充实的一天。明天见~ 🌙',
    },
    {
      characterName: '莉莉',
      content: '推荐一本好书：《人类简史》，读完之后对世界有了新的认识 📚',
    },
    {
      characterName: '小明',
      content: '咖啡 + 代码 = 完美的下午 ☕️',
    },
    {
      characterName: '莉莉',
      content: '有时候停下来思考，比一直往前冲更重要 🤔',
    },
  ]

  const { addBlogPost } = useAppStore.getState()
  
  for (const tweet of mockTweets) {
    const post = {
      id: nanoid(),
      characterId: `mock-${tweet.characterName}`,
      characterName: tweet.characterName,
      characterAvatar: undefined,
      content: tweet.content,
      createdAt: Date.now() - Math.random() * 86400000 * 3, // 随机过去3天内
      likes: Math.floor(Math.random() * 50),
      retweets: Math.floor(Math.random() * 20),
      replies: Math.floor(Math.random() * 10),
    }
    
    await addBlogPost(post)
    await new Promise(resolve => setTimeout(resolve, 100)) // 避免时间戳完全相同
  }
  
  console.log('✅ 已生成 6 条测试推文')
})()
