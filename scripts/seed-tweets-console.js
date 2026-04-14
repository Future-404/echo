// 简化版：直接在浏览器控制台运行
// 打开应用 → F12 → Console → 粘贴以下代码

const mockTweets = [
  { name: '艾莉', content: '今天的天气真好，阳光洒在窗台上，让人心情愉悦 ☀️' },
  { name: '小明', content: '刚刚完成了一个新项目，感觉成就感满满！继续加油 💪' },
  { name: '艾莉', content: '晚安，今天也是充实的一天。明天见~ 🌙' },
  { name: '莉莉', content: '推荐一本好书：《人类简史》，读完之后对世界有了新的认识 📚' },
  { name: '小明', content: '咖啡 + 代码 = 完美的下午 ☕️' },
  { name: '莉莉', content: '有时候停下来思考，比一直往前冲更重要 🤔' },
]

const store = window.__ECHO_STORE__ || useAppStore?.getState()
if (!store) {
  console.error('❌ 无法获取 store，请确保应用已加载')
} else {
  mockTweets.forEach((tweet, i) => {
    const post = {
      id: `mock-${Date.now()}-${i}`,
      characterId: `mock-${tweet.name}`,
      characterName: tweet.name,
      content: tweet.content,
      createdAt: Date.now() - Math.random() * 86400000 * 3,
      likes: Math.floor(Math.random() * 50),
      retweets: Math.floor(Math.random() * 20),
      replies: Math.floor(Math.random() * 10),
    }
    store.addBlogPost(post)
  })
  console.log('✅ 已生成 6 条测试推文')
}
