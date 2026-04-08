import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { authenticateWithPassword, getSavedToken, resetStorageAdapter } from '../../storage';
import { backupService } from '../../utils/backupService';
import { 
  Cloud, CloudOff, Loader2, CheckCircle2, AlertCircle, 
  ShieldCheck, ShieldAlert, Download, Upload, RefreshCw, 
  Database, HardDrive, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialog } from '../GlobalDialog';

const StorageSettings: React.FC = () => {
  const { confirm } = useDialog();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPersistent, setIsPersistent] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (navigator.storage?.persisted) {
      navigator.storage.persisted().then(setIsPersistent)
    }
  }, []);

  const currentToken = getSavedToken();

  const handleConnect = async () => {
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      await authenticateWithPassword(password);
      setSuccess(true);
      setPassword('');
      const { useAppStore: store } = await import('../../store/useAppStore');
      await store.persist.rehydrate();
      store.getState().setHasHydrated(true);
    } catch (err: any) {
      setError(err.message || '连接失败，请检查密码或后端地址');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setBackupLoading(true);
    try {
      await backupService.exportFullBackup();
    } catch (e) {
      alert('导出失败');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ok = await confirm('确定要导入此备份并覆盖当前所有对话、角色和配置吗？此操作无法撤销。', {
      title: '确认覆盖数据？',
      confirmText: '确认覆盖',
      danger: true
    });

    if (!ok) {
      e.target.value = '';
      return;
    }

    setBackupLoading(true);
    try {
      await backupService.importFullBackup(file);
      alert('重构成功，系统即将重启以同步意识。');
      window.location.reload();
    } catch (err: any) {
      alert(`导入失败: ${err.message}`);
    } finally {
      setBackupLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-8 space-y-12 pb-24">
      {/* 标题 */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner">
          <Database size={24} strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-sm font-serif tracking-[0.2em] text-gray-700 dark:text-gray-200 uppercase font-bold italic">数据管理 // DATA</h3>
          <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase mt-1 tracking-widest font-mono">Archive & Consciousness Portability</p>
        </div>
      </div>

      {/* 离线数据包 (.echo) */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 px-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold italic underline decoration-gray-100 dark:decoration-white/5 underline-offset-8">离线数据包 // OFFLINE PACKAGE</label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 导出 */}
          <button
            onClick={handleExport}
            disabled={backupLoading}
            className="group p-6 rounded-[2.5rem] bg-white/40 dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-900 transition-all text-left shadow-sm relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                <Download size={20} />
              </div>
              <div>
                <p className="text-xs font-serif font-bold text-gray-700 dark:text-gray-200">导出意识数据</p>
                <p className="text-[8px] text-gray-400 uppercase mt-1 tracking-tighter">打包角色、记忆与配置为 .echo 文件</p>
              </div>
            </div>
            <Download className="absolute -right-4 -bottom-4 text-blue-500/5 rotate-12" size={80} />
          </button>

          {/* 导入 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={backupLoading}
            className="group p-6 rounded-[2.5rem] bg-white/40 dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 hover:border-amber-300 dark:hover:border-amber-900 transition-all text-left shadow-sm relative overflow-hidden"
          >
            <input type="file" ref={fileInputRef} onChange={handleImport} accept=".echo,.json" className="hidden" />
            <div className="relative z-10 flex flex-col gap-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <div>
                <p className="text-xs font-serif font-bold text-gray-700 dark:text-gray-200">重构意识数据</p>
                <p className="text-[8px] text-gray-400 uppercase mt-1 tracking-tighter">从本地文件恢复所有数据 (覆盖模式)</p>
              </div>
            </div>
            <RefreshCw className="absolute -right-4 -bottom-4 text-amber-500/5 -rotate-12" size={80} />
          </button>
        </div>
      </section>

      {/* 云端同步 (R2) */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 px-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold italic">云端实时同步 // CLOUD SYNC</label>
        </div>

        {currentToken ? (
          <div className="space-y-4">
            <div className="p-6 rounded-[2rem] bg-green-500/5 border-0.5 border-green-500/20 flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 shadow-inner">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-green-600 dark:text-green-400">同步链路已激活</p>
                <p className="text-[8px] text-gray-400 mt-1 uppercase tracking-widest">Active Neural Link: R2 STORAGE</p>
              </div>
            </div>
            <button onClick={() => { localStorage.removeItem('echo-storage-token'); resetStorageAdapter(); window.location.reload(); }} className="w-full py-4 text-[9px] uppercase tracking-[0.3em] text-red-400 hover:text-red-500 transition-all font-mono">
              [ 断开云端链接 / SEVER NEURAL LINK ]
            </button>
          </div>
        ) : (
          <div className="space-y-6 bg-gray-50/50 dark:bg-white/5 p-6 rounded-[2.5rem] border-0.5 border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-4 opacity-60 px-2">
              <CloudOff className="text-gray-400 shrink-0" size={20} />
              <div className="text-left">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">本地存储模式</p>
                <p className="text-[8px] text-gray-400 mt-0.5 uppercase tracking-tighter">DATA STORED LOCALLY IN BROWSER</p>
              </div>
            </div>

            <div className="space-y-4 px-2">
              <div className="space-y-2">
                <label className="text-[8px] uppercase tracking-[0.2em] text-gray-400 font-bold ml-1 italic">Neural Token // 访问密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter R2 Access Token..."
                  className="w-full bg-white dark:bg-black/20 border-0.5 border-gray-200 dark:border-white/5 rounded-2xl px-5 py-4 text-xs focus:outline-none focus:border-blue-400 transition-all shadow-sm"
                />
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-2 text-red-500">
                  <AlertCircle size={12} />
                  <span className="text-[9px] font-bold uppercase">{error}</span>
                </motion.div>
              )}

              <button
                onClick={handleConnect}
                disabled={loading || !password}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-2xl text-[10px] uppercase tracking-[0.2em] font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <Cloud size={14} />}
                Establish Cloud Link
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 提示区 */}
      <div className="bg-amber-500/5 dark:bg-amber-500/5 border-0.5 border-amber-500/10 p-6 rounded-3xl flex gap-4 items-start shadow-inner">
        <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest italic">⚠ 注意事项 // CAUTION</p>
          <p className="text-[8px] text-gray-400 dark:text-amber-200/40 leading-relaxed uppercase tracking-tighter">
            .echo 数据包是您意识的物理载体。请妥善保管此文件。导入操作将清除所有现有数据，确保您已在重构前完成了必要的备份。
          </p>
        </div>
      </div>
    </div>
  );
};

export default StorageSettings;
