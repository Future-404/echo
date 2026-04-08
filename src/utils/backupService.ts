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
      
      // 1. 抓取 IndexedDB 所有表
      const messages = await db.messages.toArray();
      const saveSlots = await db.saveSlots.toArray();
      const characters = await db.characters.toArray();
      const worldEntries = await db.worldEntries.toArray();
      const memoryEpisodes = await db.memoryEpisodes.toArray();
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
          saveSlots,
          characters,
          worldEntries,
          memoryEpisodes,
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
            console.log('[Backup] 检测到单存档包，正在合并...');
            await db.transaction('rw', [db.messages, db.saveSlots, db.characters, db.memoryEpisodes], async () => {
              // 合并元数据
              await db.saveSlots.put(data.slot);
              // 合并消息 (先清理旧的该 Slot 消息，防止重复)
              await db.messages.where('slotId').equals(data.slot.id).delete();
              await db.messages.bulkAdd(data.messages);
              // 合并记忆结晶
              await db.memoryEpisodes.where('slotId').equals(data.slot.id).delete();
              await db.memoryEpisodes.bulkAdd(data.episodes);
              // 合并关联角色 (put 会根据 ID 自动覆盖或新增)
              if (data.characters) await db.characters.bulkPut(data.characters);
            });

            // 合并图片
            if (data.images) {
              for (const img of data.images) {
                if (img.base64) await imageDb.set(img.id, img.base64);
              }
            }
            console.log('[Backup] 存档合并完成');
            resolve();
            return;
          }

          // --- 处理全量重构 (物理覆盖) ---
          console.log('[Backup] 正在执行全量意识重构...');
          await db.transaction('rw', [db.messages, db.saveSlots, db.characters, db.worldEntries, db.memoryEpisodes, db.kvStore], async () => {
            await Promise.all([
              db.messages.clear(),
              db.saveSlots.clear(),
              db.characters.clear(),
              db.worldEntries.clear(),
              db.memoryEpisodes.clear(),
              // 只清非图片 KV，图片在事务外单独处理
              db.kvStore.filter(r => !r.key.startsWith('img-')).delete(),
            ]);
            await Promise.all([
              db.messages.bulkAdd(data.db.messages),
              db.saveSlots.bulkAdd(data.db.saveSlots),
              db.characters.bulkAdd(data.db.characters),
              db.worldEntries.bulkAdd(data.db.worldEntries),
              db.memoryEpisodes.bulkAdd(data.db.memoryEpisodes),
              db.kvStore.bulkAdd(data.db.kvStore),
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
