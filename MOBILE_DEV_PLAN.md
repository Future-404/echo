# Echo 移动端 APP 开发计划（Capacitor）

## 📋 项目信息
- **项目名称**: Echo
- **当前版本**: 0.0.5
- **技术栈**: React + TypeScript + Vite + Capacitor
- **目标平台**: iOS + Android

---

## 🎯 开发目标
将 Echo Web 应用打包为原生移动端 APP，支持：
- iOS（App Store）
- Android（Google Play）
- 离线运行
- 原生性能

---

## 📦 Phase 1: 环境准备（30 分钟）

### 1.1 安装 Capacitor
```bash
cd /root/workspace/echo
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
```

### 1.2 初始化 Capacitor
```bash
npx cap init
```

**配置信息**：
- App name: `Echo`
- App ID: `com.echo.app`（或自定义）
- Web Dir: `dist`

### 1.3 安装原生开发环境
**iOS**（需要 Mac）：
- Xcode 14+
- CocoaPods: `sudo gem install cocoapods`

**Android**：
- Android Studio
- JDK 11+
- Android SDK 33+

---

## 🔧 Phase 2: 项目配置（1 小时）

### 2.1 创建 `capacitor.config.ts`
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.echo.app',
  appName: 'Echo',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0a0a",
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0a0a0a'
    }
  }
};

export default config;
```

### 2.2 修改 `vite.config.ts`
在 `defineConfig` 中添加：
```typescript
build: {
  outDir: 'dist',
  assetsDir: 'assets',
  // Capacitor 需要相对路径
  base: './'
}
```

### 2.3 修改 `index.html`
确保所有资源路径为相对路径：
```html
<!-- 检查 <base> 标签，如果有则移除或改为 <base href="./" /> -->
```

---

## 📱 Phase 3: 添加平台（20 分钟）

### 3.1 构建 Web 资源
```bash
npm run build
```

### 3.2 添加 iOS 平台
```bash
npx cap add ios
```

### 3.3 添加 Android 平台
```bash
npx cap add android
```

### 3.4 同步资源
```bash
npx cap sync
```

---

## 🎨 Phase 4: 资源配置（30 分钟）

### 4.1 准备图标和启动画面
**图标尺寸**（放在 `resources/` 目录）：
- `icon.png`: 1024x1024（iOS）
- `icon-android.png`: 512x512（Android）

**启动画面**：
- `splash.png`: 2732x2732（居中内容区 1200x1200）

### 4.2 使用 Capacitor Assets 生成
```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0a0a0a' --splashBackgroundColor '#0a0a0a'
```

---

## 🐛 Phase 5: 调试和适配（2-3 小时）

### 5.1 打开原生 IDE
**iOS**:
```bash
npx cap open ios
```

**Android**:
```bash
npx cap open android
```

### 5.2 需要测试的功能
- [ ] IndexedDB 读写
- [ ] 图片上传（相机/相册权限）
- [ ] PixiJS 渲染性能
- [ ] 键盘弹出适配
- [ ] 状态栏样式
- [ ] 安全区域（刘海屏）
- [ ] 返回键行为（Android）

### 5.3 可能需要的代码调整

#### 5.3.1 检测 Capacitor 环境
```typescript
// src/utils/platform.ts
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
```

#### 5.3.2 安全区域适配
在 `index.html` 添加：
```html
<meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

在 CSS 中使用：
```css
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

#### 5.3.3 返回键处理（Android）
```typescript
// src/App.tsx
import { App as CapApp } from '@capacitor/app';

useEffect(() => {
  if (platform === 'android') {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (currentView !== 'main') {
        setCurrentView('main');
      } else if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  }
}, [currentView]);
```

#### 5.3.4 图片上传权限
安装插件：
```bash
npm install @capacitor/camera @capacitor/filesystem
```

修改 `ChatInput.tsx` 的图片上传逻辑：
```typescript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.DataUrl
  });
  return image.dataUrl;
};
```

---

## 🚀 Phase 6: 打包发布（1-2 小时）

### 6.1 iOS 打包
1. 在 Xcode 中：
   - 设置 Bundle Identifier
   - 配置签名证书（需要 Apple Developer 账号）
   - 选择 Generic iOS Device
   - Product → Archive
   - Distribute App → App Store Connect

2. 上传到 App Store Connect
3. 提交审核

### 6.2 Android 打包
1. 生成签名密钥：
```bash
keytool -genkey -v -keystore echo-release.keystore -alias echo -keyalg RSA -keysize 2048 -validity 10000
```

2. 在 Android Studio 中：
   - Build → Generate Signed Bundle / APK
   - 选择 APK 或 AAB
   - 选择 release 模式
   - 输入密钥信息

3. 上传到 Google Play Console

---

## 📝 Phase 7: 持续集成（可选）

### 7.1 自动化构建脚本
创建 `scripts/build-mobile.sh`：
```bash
#!/bin/bash
echo "Building Echo Mobile..."

# 1. 构建 Web
npm run build

# 2. 同步到原生项目
npx cap sync

# 3. 打开 IDE（可选）
# npx cap open ios
# npx cap open android

echo "✅ Build complete!"
```

### 7.2 版本管理
每次发布前：
1. 更新 `package.json` 版本号
2. 更新 `capacitor.config.ts` 中的版本
3. 更新原生项目版本号（iOS: Info.plist, Android: build.gradle）

---

## ⚠️ 已知问题和解决方案

### 问题 1: IndexedDB 在 iOS WebView 中被清理
**解决方案**：
- 使用 `@capacitor/preferences` 存储关键数据
- 或使用 `@capacitor/filesystem` 持久化

### 问题 2: PixiJS 在低端设备卡顿
**解决方案**：
- 检测设备性能，低端设备禁用动画
- 降低 PixiJS 渲染分辨率

### 问题 3: 文件路径问题
**解决方案**：
- 使用相对路径（已在 vite.config.ts 配置）
- 图片使用 base64 或 Capacitor Filesystem API

---

## 🔍 测试清单

### 功能测试
- [ ] 角色选择和切换
- [ ] 消息发送和接收
- [ ] 图片上传和显示
- [ ] 存档保存和加载
- [ ] 配置修改和持久化
- [ ] 推文发布和查看
- [ ] 离线使用

### 性能测试
- [ ] 启动速度（< 3 秒）
- [ ] 消息渲染流畅度
- [ ] PixiJS 动画帧率（> 30 FPS）
- [ ] 内存占用（< 200MB）

### 兼容性测试
- [ ] iOS 14+
- [ ] Android 10+
- [ ] 不同屏幕尺寸
- [ ] 横屏/竖屏切换

---

## 📚 参考资源

### 官方文档
- Capacitor: https://capacitorjs.com/docs
- iOS 开发: https://developer.apple.com/documentation/
- Android 开发: https://developer.android.com/docs

### 常用命令
```bash
# 同步代码到原生项目
npx cap sync

# 更新 Capacitor 依赖
npx cap update

# 查看已安装的插件
npx cap ls

# 清理构建缓存
npx cap clean
```

---

## 🎯 里程碑

- [ ] **M1**: 环境搭建完成（Day 1）
- [ ] **M2**: iOS 真机调试成功（Day 2）
- [ ] **M3**: Android 真机调试成功（Day 2）
- [ ] **M4**: 功能测试通过（Day 3）
- [ ] **M5**: 性能优化完成（Day 4）
- [ ] **M6**: 打包发布（Day 5）

---

## 💡 开发建议

1. **先在 Web 端完善功能**，再打包移动端
2. **优先适配 Android**（调试更方便）
3. **使用真机测试**（模拟器性能不准确）
4. **保持 Web 和移动端代码一致**（条件编译最小化）
5. **定期同步代码**：`npx cap sync`

---

## 📞 问题排查

### 构建失败
```bash
# 清理缓存
rm -rf node_modules dist ios android
npm install
npm run build
npx cap add ios
npx cap add android
```

### 白屏问题
- 检查 `vite.config.ts` 中的 `base: './'`
- 检查控制台错误（Safari Web Inspector / Chrome DevTools）
- 检查资源路径是否正确

### 权限问题
- iOS: 在 `Info.plist` 添加权限描述
- Android: 在 `AndroidManifest.xml` 添加权限

---

**最后更新**: 2026-04-11
**当前状态**: 准备开始 Phase 1
