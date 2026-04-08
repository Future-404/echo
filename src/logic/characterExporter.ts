import type { CharacterCard } from '../types/chat';
import { writeSillyTavernData } from '../utils/pngMetadata';

/**
 * 将 Echo 角色卡转换为 SillyTavern V2 规范的 JSON 对象
 */
export const convertToSillyTavernV2 = (char: CharacterCard) => {
  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: char.name,
      description: char.description || "",
      personality: char.attributes?.personality || "",
      scenario: char.scenario || "",
      first_mes: char.greeting || "",
      mes_example: "", // Echo 暂未显式区分例句
      creator_notes: "Exported from Echo VN Engine",
      system_prompt: char.systemPrompt || "",
      post_history_instructions: char.postHistoryInstructions || "",
      alternate_greetings: char.alternateGreetings || [],
      character_book: {
        entries: char.extensions?.worldBook?.map(e => ({
          keys: e.keys,
          content: e.content,
          extensions: e.extensions || {},
          enabled: e.enabled,
          insertion_order: e.insertionOrder || 0,
          case_sensitive: false,
          name: e.id,
          priority: 10,
          id: e.id,
          comment: e.comment || "",
          selective: false,
          constant: e.constant || false,
          position: e.position || 0
        })) || []
      },
      extensions: {
        echo: {
          missions: char.extensions?.missions || [],
          directives: char.extensions?.directives || [],
        },
        fav: false
      }
    }
  };
};

/**
 * 导出角色为 JSON 文件
 */
export const exportCharacterAsJSON = (char: CharacterCard) => {
  const stData = convertToSillyTavernV2(char);
  const blob = new Blob([JSON.stringify(stData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${char.name.replace(/\s+/g, '_')}_card.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * 确保图片数据是标准的 PNG 格式
 * 如果是 JPG/WebP 等，利用 Canvas 转换为 PNG
 */
const ensurePNGData = async (imageUri: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context failed'));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for PNG conversion'));
    img.src = imageUri;
  });
};

/**
 * 导出角色为 PNG 角色卡
 */
export const exportCharacterAsPNG = async (char: CharacterCard) => {
  const stData = convertToSillyTavernV2(char);

  // 1. 确保有图片数据
  if (!char.image || char.image.length < 100) {
    throw new Error('角色没有有效的头像图片，无法生成角色卡');
  }

  try {
    // 2. 强制转换/验证 PNG 格式 (解决 JPG/WebP 无法注入元数据的问题)
    const pngImage = await ensurePNGData(char.image);

    // 3. 将数据嵌入 PNG
    const pngWithMetadata = await writeSillyTavernData(pngImage, stData);

    // 4. 下载
    const a = document.createElement('a');
    a.href = pngWithMetadata;
    a.download = `${char.name.replace(/\s+/g, '_')}_card.png`;
    a.click();
  } catch (err) {
    console.error('PNG Export failed:', err);
    throw err;
  }
};
