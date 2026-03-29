import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { authenticateWithPassword, getSavedToken, resetStorageAdapter } from '../../storage';
import { Cloud, CloudOff, Loader2, CheckCircle2, AlertCircle, ShieldCheck, ShieldAlert } from 'lucide-react';

const StorageSettings: React.FC = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPersistent, setIsPersistent] = useState<boolean | null>(null);
  const { setHasHydrated } = useAppStore();

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
    setSuccess(false);

    try {
      await authenticateWithPassword(password);
      setSuccess(true);
      setPassword('');
      // 成功后强制重新同步一次数据
      const { useAppStore: store } = await import('../../store/useAppStore');
      await store.persist.rehydrate();
      // 这里不设 true 会导致界面一直 loading，因为 rehydrate 会重置状态
      store.getState().setHasHydrated(true);
    } catch (err: any) {
      setError(err.message || '连接失败，请检查密码或后端地址');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('echo-storage-token');
    resetStorageAdapter();
    window.location.reload(); // 简单粗暴但有效，重置所有状态
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="space-y-2">
        <h3 className="text-lg font-serif text-gray-800 dark:text-gray-100">云端同步</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          开启后，您的存档、角色及配置将自动备份到 Cloudflare R2。此功能为可选进阶选项。
        </p>
      </div>

      {currentToken ? (
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-green-500/5 border border-green-500/10 flex items-center gap-4">
            <CheckCircle2 className="text-green-500 shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">已激活同步</p>
              <p className="text-[10px] text-gray-400 mt-0.5">您的数据正在实时备份至云端</p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="w-full py-4 rounded-3xl border-0.5 border-red-200 dark:border-red-900/30 text-red-500 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
          >
            断开云端连接
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-4 opacity-60">
            <CloudOff className="text-gray-400 shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">本地模式</p>
              <p className="text-[10px] text-gray-400 mt-0.5">数据仅存储在当前浏览器中</p>
            </div>
          </div>

          {isPersistent !== null && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 ${isPersistent ? 'bg-green-500/5 border border-green-500/10' : 'bg-amber-500/5 border border-amber-500/10'}`}>
              {isPersistent
                ? <ShieldCheck size={16} className="text-green-500 shrink-0" />
                : <ShieldAlert size={16} className="text-amber-500 shrink-0" />}
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isPersistent ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {isPersistent ? '持久化存储已授权' : '持久化存储未授权'}
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">
                  {isPersistent
                    ? '浏览器不会在磁盘不足时自动清理本地数据'
                    : '磁盘空间不足时浏览器可能自动清除本地存档，建议开启云端同步'}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold px-1">访问密码 (AUTH_TOKEN)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入您在部署时设置的密码"
                className="w-full bg-white dark:bg-black border-0.5 border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-2 text-red-500 animate-shake">
                <AlertCircle size={14} />
                <span className="text-[10px] font-bold">{error}</span>
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={loading || !password}
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-3xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Cloud size={16} />}
              开启云端同步
            </button>
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2">
        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">💡 提示</p>
        <p className="text-[9px] text-gray-400 leading-relaxed">
          开启同步前，请确保您已在 Cloudflare 完成了 R2 存储桶的创建与绑定。
        </p>
      </div>
    </div>
  );
};

export default StorageSettings;
