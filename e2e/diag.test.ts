import { test, expect } from '@playwright/test';

test.describe('深度诊断 - 等待渲染版', () => {
  test('验证 React 挂载时机', async ({ page }) => {
    page.on('console', msg => console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

    console.log('正在访问 http://localhost:8888 ...');
    await page.goto('http://localhost:8888');

    // 等待 #root 内部内容长度 > 0 (最多等待 10s)
    console.log('正在等待 React 挂载 DOM...');
    try {
      await page.waitForFunction(() => {
        const root = document.getElementById('root');
        return root && root.innerHTML.trim().length > 0;
      }, { timeout: 15000 });
      
      console.log('React 成功挂载 DOM！');
      const rootHtml = await page.innerHTML('#root');
      console.log(`#root 内容预览: ${rootHtml.substring(0, 100)}...`);
    } catch (e) {
      console.log('[FATAL] React 超过 15s 未向 #root 注入任何内容。');
      const rawHtml = await page.content();
      console.log('当前页面原始代码（前500字）:');
      console.log(rawHtml.substring(0, 500));
    }
  });
});
