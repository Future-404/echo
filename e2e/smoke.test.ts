import { test, expect } from '@playwright/test';

test.describe('E2E 冒烟测试 - 增强定位版', () => {

  // 在每个测试前监听控制台日志，方便排查应用是否崩溃
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
    });
  });

  test('应该能加载应用并进入主对话界面', async ({ page }) => {
    await page.goto('/');

    // 1. 先验证应用标题是否出现（确认 MainMenu 已挂载）
    const title = page.locator('h1', { hasText: 'ECHO' });
    await expect(title).toBeVisible({ timeout: 25000 });

    // 2. 使用更灵活的选择器定位“新游戏”按钮
    // 同时尝试中文和英文子标题，忽略字间距带来的空格干扰
    const startBtn = page.locator('button').filter({ hasText: /新游戏|NEW GAME/i });
    await expect(startBtn).toBeVisible();

    // 3. 点击进入
    await startBtn.click();

    // 4. 验证 HUD 元素是否出现
    // 检查 ChatInput 是否存在
    const chatInput = page.locator('textarea[placeholder*="输入"]');
    await expect(chatInput).toBeVisible({ timeout: 15000 });
    
    console.log('E2E: Successfully entered the game view.');
  });

  test('发送消息并验证流式响应', async ({ page }) => {
    await page.goto('/');
    
    // 进入游戏
    const startBtn = page.locator('button').filter({ hasText: /新游戏|NEW GAME/i });
    await startBtn.click();

    // 获取输入框
    const input = page.locator('textarea[placeholder*="输入"]');
    await expect(input).toBeVisible();
    
    // 输入测试文字
    await input.fill('E2E Test: 这是一个自动化测试消息。');
    await page.keyboard.press('Enter');

    // 验证回复生成
    // 查找对话内容容器
    const dialogue = page.locator('.dialogue-content, .message-content');
    
    // 关键点：等待内容不再为空
    await expect(dialogue.first()).not.toBeEmpty({ timeout: 20000 });
    
    const content = await dialogue.first().innerText();
    console.log('E2E: Received AI response:', content.substring(0, 30) + '...');
  });
});
