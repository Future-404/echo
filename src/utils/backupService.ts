import { db } from '../storage/db';
import { imageDb } from './imageDb';
import { STORE_KEY } from '../store/persist';

/**
 * Echo 意识备份服务 (.echo)
 * 负责全量数据的序列化、下载、读取与物理重构
 */
export const backupService = {
  
  /**
   * 导出全量数据包
   */
  async exportFullBackup(): Promise<void> {
    try {
      console.log('[Backup] 开始导出...');
      
      // 1. 抓取 IndexedDB 所有表（saveSlots 在 Zustand，不在 Dexie，跳过）
      const messages = await db.messages.toArray();
      const characters = await db.characters.toArray();
      const worldEntries = await db.worldEntries.toArray();
      const memoryEpisodes = await db.memoryEpisodes.toArray();
      const promptPresetEntries = await db.promptPresetEntries.toArray();
      // kvStore 排除图片条目（图片单独存 images 字段，避免双写）
      const kvStore = await db.kvStore.filter(r => !r.key.startsWith('img-')).toArray();

      // 2. 抓取图片库
      const images = await imageDb.getAll(); // [{ id, base64 }]

      // 3. 抓取 Zustand Persist 状态
      const storeState = localStorage.getItem(STORE_KEY);

      // 4. 封装全量 JSON
      const backupData = {
        version: '1.0',
        timestamp: Date.now(),
        db: {
          messages,
          characters,
          worldEntries,
          memoryEpisodes,
          promptPresetEntries,
          kvStore
        },
        images,
        store: storeState ? JSON.parse(storeState) : null
      };

      // 5. 触发下载
      const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `echo-backup-${new Date().toISOString().split('T')[0]}.echo`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('[Backup] 导出成功');
    } catch (e) {
      console.error('[Backup] 导出失败:', e);
      throw e;
    }
  },

  /**
   * 导出指定存档包 (.echo-slot)
   */
  async exportSingleSlot(slot: import('../types/store').SaveSlot): Promise<void> {
    try {
      const slotId = slot.id;
      // 1. 抓取该存档的消息流
      const messages = await db.messages.where('slotId').equals(slotId).toArray();

      // 2. 抓取该存档的记忆片段
      const episodes = await db.memoryEpisodes.where('slotId').equals(slotId).toArray();

      // 3. 抓取关联角色
      const charIds = [slot.characterId, slot.secondaryCharacterId].filter(Boolean) as string[];
      const characters = await db.characters.where('id').anyOf(charIds).toArray();

      // 4. 抓取角色头像（仅本地存储的）
      const avatarIds = characters.map(c => c.image).filter((id): id is string => !!id && !id.startsWith('http'));
      const images = (await Promise.all(
        avatarIds.map(async id => ({ id, base64: await imageDb.getRaw(id) }))
      )).filter(img => img.base64 !== null) as { id: string; base64: string }[];

      const packageData = {
        version: '1.0-slot',
        timestamp: Date.now(),
        type: 'SINGLE_SLOT',
        slot,
        messages,
        episodes,
        characters,
        images
      };

      const blob = new Blob([JSON.stringify(packageData)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `echo-slot-${slot.name || slotId}-${new Date().toISOString().split('T')[0]}.echo-slot`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error('[Backup] 单存档导出失败:', e);
      throw e;
    }
  },

  /**
   * 导入并重构意识数据
   */
  async importFullBackup(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          
          // 1. 验证格式
          if (!data.version) throw new Error('不合法的 Echo 数据包格式');

          console.log('[Backup] 正在解析数据包...');

          // --- 处理单存档导入 (增量合并) ---
          if (data.type === 'SINGLE_SLOT' && data.slot) {
            await db.transaction('rw', [db.messages, db.characters, db.memoryEpisodes], async () => {
              await db.messages.where('slotId').equals(data.slot.id).delete();
              await db.messages.bulkAdd(data.messages ?? []);
              await db.memoryEpisodes.where('slotId').equals(data.slot.id).delete();
              await db.memoryEpisodes.bulkAdd(data.episodes ?? []);
              if (data.characters) await db.characters.bulkPut(data.characters);
            });
            // 合并图片
            if (data.images) {
              for (const img of data.images) {
                if (img.base64) await imageDb.set(img.id, img.base64);
              }
            }
            // 将 slot 元数据合并进 Zustand store
            const raw = localStorage.getItem(STORE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw);
              const state = parsed?.state ?? parsed;
              const slots: any[] = state.saveSlots ?? [];
              const idx = slots.findIndex((s: any) => s.id === data.slot.id);
              if (idx >= 0) slots[idx] = data.slot; else slots.push(data.slot);
              state.saveSlots = slots;
              localStorage.setItem(STORE_KEY, JSON.stringify(parsed));
            }
            resolve();
            return;
          }

          // --- 处理全量重构 (物理覆盖) ---
          await db.transaction('rw', [db.messages, db.characters, db.worldEntries, db.memoryEpisodes, db.promptPresetEntries, db.kvStore], async () => {
            await Promise.all([
              db.messages.clear(),
              db.characters.clear(),
              db.worldEntries.clear(),
              db.memoryEpisodes.clear(),
              db.promptPresetEntries.clear(),
              db.kvStore.filter(r => !r.key.startsWith('img-')).delete(),
            ]);
            await Promise.all([
              db.messages.bulkAdd(data.db.messages ?? []),
              db.characters.bulkAdd(data.db.characters ?? []),
              db.worldEntries.bulkAdd(data.db.worldEntries ?? []),
              db.memoryEpisodes.bulkAdd(data.db.memoryEpisodes ?? []),
              db.promptPresetEntries.bulkAdd(data.db.promptPresetEntries ?? []),
              db.kvStore.bulkAdd(data.db.kvStore ?? []),
            ]);
          });

          // 重构图片库
          if (data.images && Array.isArray(data.images)) {
            await imageDb.clear();
            for (const img of data.images) {
              if (img.base64) await imageDb.set(img.id, img.base64);
            }
          }

          // 重构 Zustand 状态
          if (data.store) {
            localStorage.setItem(STORE_KEY, JSON.stringify(data.store));
          }

          console.log('[Backup] 全量意识重构完成');
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsText(file);
    });
  }
};
