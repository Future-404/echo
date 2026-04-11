// 档案图鉴测试脚本 - 在浏览器控制台运行
// 用法：复制粘贴到控制台，然后调用 testArchive()

function testArchive() {
  const store = window.__ECHO_STORE__ || useAppStore?.getState?.();
  
  if (!store) {
    console.error('❌ Store not found. Make sure you are on the Echo app page.');
    return;
  }

  console.log('🧪 Starting Archive Test...');

  // 1. 模拟角色互动数据
  const characters = store.characters || [];
  if (characters.length === 0) {
    console.warn('⚠️ No characters found. Please import some characters first.');
    return;
  }

  console.log(`📊 Found ${characters.length} characters`);

  // 2. 为每个角色生成随机对话次数
  characters.forEach((char, idx) => {
    const messageCount = Math.floor(Math.random() * 500) + 50; // 50-550 条消息
    console.log(`  - ${char.name}: ${messageCount} messages`);
    
    for (let i = 0; i < messageCount; i++) {
      store.updateCharacterStat(char.id, 1);
    }
  });

  // 3. 生成全局统计数据
  const totalMessages = characters.reduce((sum, char) => {
    const stat = store.archiveStats.characterStats[char.id];
    return sum + (stat?.messageCount || 0);
  }, 0);

  console.log(`📈 Total messages: ${totalMessages}`);

  // 模拟用户和 AI 消息比例 (60% AI, 40% User)
  const aiMessages = Math.floor(totalMessages * 0.6);
  const userMessages = totalMessages - aiMessages;

  store.archiveStats.globalStats.totalMessages = totalMessages;
  store.archiveStats.globalStats.aiMessages = aiMessages;
  store.archiveStats.globalStats.userMessages = userMessages;

  // 4. 生成活跃日期（最近 30 天随机活跃）
  const today = new Date();
  const activeDates = [];
  for (let i = 0; i < 30; i++) {
    if (Math.random() > 0.3) { // 70% 概率活跃
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      activeDates.push(date.toISOString().split('T')[0]);
    }
  }
  
  store.archiveStats.activeDates = activeDates.reverse();
  store.archiveStats.globalStats.totalDays = activeDates.length;
  store.archiveStats.globalStats.firstUseDate = new Date(activeDates[0]).getTime();

  console.log(`📅 Active days: ${activeDates.length}`);
  console.log(`🎉 Test data generated successfully!`);
  console.log('💡 Navigate to Archive page to see the results.');

  // 强制触发重新渲染
  if (store.setCurrentView) {
    const currentView = store.currentView;
    store.setCurrentView('home');
    setTimeout(() => store.setCurrentView(currentView), 100);
  }
}

// 清除测试数据
function clearArchiveData() {
  const store = window.__ECHO_STORE__ || useAppStore?.getState?.();
  
  if (!store) {
    console.error('❌ Store not found.');
    return;
  }

  store.archiveStats = {
    characterStats: {},
    globalStats: {
      totalMessages: 0,
      userMessages: 0,
      aiMessages: 0,
      firstUseDate: Date.now(),
      totalDays: 1,
      lastActiveDate: Date.now()
    },
    activeDates: [new Date().toISOString().split('T')[0]]
  };

  console.log('🧹 Archive data cleared.');
}

console.log('✅ Archive test script loaded.');
console.log('📝 Run testArchive() to generate test data');
console.log('🧹 Run clearArchiveData() to clear test data');
