/**
 * Echo 图像优化器 - 高性能 WebP 压缩与 PNG 重构
 */

export const imageOptimizer = {
  /**
   * 将任意图片 Base64/Blob 压缩为 WebP
   * 默认质量 0.8，最大宽度 2048 (保持高清但减小内存压力)
   */
  async compressToWebP(source: string, quality = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 限制最大分辨率，防止某些 8K 原画撑爆浏览器内存
        const MAX_SIZE = 2560;
        if (width > MAX_SIZE || height > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failed'));

        ctx.drawImage(img, 0, 0, width, height);
        
        // 核心：转换为 WebP。支持透明度且体积极小。
        const webpBase64 = canvas.toDataURL('image/webp', quality);
        resolve(webpBase64);
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = source;
    });
  },

  /**
   * 将存储中的 WebP 转回 PNG，用于导出给 SillyTavern 等外部工具
   */
  async toPNG(source: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failed'));

        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = source;
    });
  }
};
