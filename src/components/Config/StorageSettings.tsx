import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { authenticateWithPassword, getSavedToken, isCloudConnected, resetStorageAdapter } from '../../storage';
import { backupService } from '../../utils/backupService';
import { pinHash } from '../../utils/pinHash';
import { 
  Cloud, CloudOff, Loader2, CheckCircle2, AlertCircle, 
  ShieldCheck, ShieldAlert, Download, Upload, RefreshCw, 
  Database, HardDrive, Info, Lock, Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDialog } from '../GlobalDialog';

const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

const StorageSettings: React.FC = () => {
  const { confirm, alert } = useDialog();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPersistent, setIsPersistent] = useState<boolean | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (navigator.storage?.persisted) {
      navigator.storage.persisted().then(setIsPersistent)
    }
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(e => {
        if (e.usage != null && e.quota != null) {
          setStorageEstimate({ usage: e.usage, quota: e.quota })
        }
      })
    }
  }, []);

  const currentToken = getSavedToken();
  const cloudConnected = isCloudConnected();

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
    } catch (e: any) {
      alert(`导出失败: ${e?.message ?? e}`)
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
      await alert('导入成功，即将重新加载。');
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
          <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase mt-1 tracking-widest font-mono">Archive & Portability</p>
        </div>
      </div>

      {/* 存储状态 */}
      {(() => {
        const fmt = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`
        const pct = storageEstimate ? Math.round(storageEstimate.usage / storageEstimate.quota * 100) : null
        const isSafari = IS_SAFARI
        const remaining = storageEstimate ? storageEstimate.quota - storageEstimate.usage : null
        const warn = remaining != null && (
          remaining < 200 * 1024 * 1024 ||
          (isSafari && remaining < 300 * 1024 * 1024)
        )
        return (
          <div className={`p-5 rounded-3xl border-0.5 flex flex-col gap-3 ${warn ? 'bg-red-500/5 border-red-400/20' : 'bg-gray-50/50 dark:bg-white/5 border-gray-100 dark:border-white/5'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive size={14} className={warn ? 'text-red-400' : 'text-gray-400'} />
                <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">本地存储 // Storage</span>
              </div>
              <div className="flex items-center gap-2">
                {isPersistent === true && <span className="text-[8px] text-green-500 uppercase tracking-widest flex items-center gap-1"><ShieldCheck size={10} /> 已持久化</span>}
                {isPersistent === false && <span className="text-[8px] text-amber-500 uppercase tracking-widest flex items-center gap-1"><ShieldAlert size={10} /> 未持久化</span>}
              </div>
            </div>
            {storageEstimate && (
              <>
                <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${warn ? 'bg-red-400' : 'bg-blue-400'}`} style={{ width: `${Math.min(pct!, 100)}%` }} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-mono text-gray-400">{fmt(storageEstimate.usage)} / {fmt(storageEstimate.quota)}</span>
                  <span className={`text-[8px] font-mono font-bold ${warn ? 'text-red-400' : 'text-gray-400'}`}>{pct}%</span>
                </div>
                <p className="text-[7px] text-gray-400/50 uppercase tracking-widest">配额由浏览器按磁盘空间动态分配，剩余 {remaining != null ? fmt(remaining) : '...'}</p>
                {warn && <p className="text-[8px] text-red-400 uppercase tracking-widest">⚠ 存储空间即将耗尽，请导出备份或清理数据</p>}
              </>
            )}
          </div>
        )
      })()}

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
                <p className="text-xs font-serif font-bold text-gray-700 dark:text-gray-200">导出备份</p>
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
                <p className="text-xs font-serif font-bold text-gray-700 dark:text-gray-200">导入备份</p>
                <p className="text-[8px] text-gray-400 uppercase mt-1 tracking-tighter">从本地文件恢复所有数据 (覆盖模式)</p>
              </div>
            </div>
            <RefreshCw className="absolute -right-4 -bottom-4 text-amber-500/5 -rotate-12" size={80} />
          </button>
        </div>
      </section>

      {/* 服务端同步 */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 px-1">
          <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold italic">服务端同步 // SERVER SYNC</label>
        </div>

        {cloudConnected ? (
          <div className="space-y-4">
            <div className="p-6 rounded-[2rem] bg-green-500/5 border-0.5 border-green-500/20 flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 shadow-inner">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-green-600 dark:text-green-400">服务端已连接</p>
                <p className="text-[8px] text-gray-400 mt-1 uppercase tracking-widest">DATA SYNCED TO REMOTE SERVER</p>
              </div>
            </div>
            <button onClick={() => { localStorage.removeItem('echo-storage-token'); resetStorageAdapter(); window.location.reload(); }} className="w-full py-4 text-[9px] uppercase tracking-[0.3em] text-red-400 hover:text-red-500 transition-all font-mono">
              断开服务端同步
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
                <label className="text-[8px] uppercase tracking-[0.2em] text-gray-400 font-bold ml-1 italic">访问密码 // Access Token</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter server access token..."
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
                连接服务端存储
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
            导入操作将覆盖所有现有数据，请在导入前确认已完成备份。
          </p>
        </div>
      </div>

      {/* App Lock */}
      <AppLockSettings />
    </div>
  );
};

const AppLockSettings: React.FC = () => {
  const { config, updateConfig } = useAppStore()
  const appLock = config?.appLock ?? { enabled: false, pinHash: '', timeoutMinutes: 5 }
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [saved, setSaved] = useState(false)

  const sha256hex = pinHash

  const handleToggle = async () => {
    if (appLock.enabled) {
      updateConfig({ appLock: { ...appLock, enabled: false, pinHash: '' } })
      sessionStorage.removeItem('echo-unlocked-at')
    } else {
      // require setting a PIN first
    }
  }

  const handleSavePin = async () => {
    setPinError('')
    if (newPin.length < 4) { setPinError('PIN 至少 4 位'); return }
    if (newPin !== confirmPin) { setPinError('两次输入不一致'); return }
    const hash = await sha256hex(newPin)
    updateConfig({ appLock: { ...appLock, enabled: true, pinHash: hash } })
    sessionStorage.setItem('echo-unlocked-at', String(Date.now()))
    setNewPin(''); setConfirmPin('')
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2 px-1">
        <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold italic">应用锁 // APP LOCK</label>
      </div>

      <div className="bg-gray-50/50 dark:bg-white/5 p-6 rounded-[2.5rem] border-0.5 border-gray-100 dark:border-white/5 space-y-6">
        {/* 开关状态 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {appLock.enabled
              ? <Lock size={16} className="text-blue-500" />
              : <Unlock size={16} className="text-gray-400" />}
            <div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                {appLock.enabled ? '已启用' : '未启用'}
              </p>
              <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-0.5">
                {appLock.enabled ? `超时 ${appLock.timeoutMinutes} 分钟后锁屏` : '任何人拿起设备均可直接访问'}
              </p>
            </div>
          </div>
          {appLock.enabled && (
            <button
              onClick={handleToggle}
              className="text-[9px] uppercase tracking-widest text-red-400 hover:text-red-500 font-mono transition-all"
            >
              关闭
            </button>
          )}
        </div>

        {/* 超时设置 */}
        {appLock.enabled && (
          <div className="space-y-2">
            <label className="text-[8px] uppercase tracking-widest text-gray-400 font-bold">锁屏超时</label>
            <div className="flex gap-2 flex-wrap">
              {[0, 1, 5, 15, 30].map(m => (
                <button
                  key={m}
                  onClick={() => updateConfig({ appLock: { ...appLock, timeoutMinutes: m } })}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-mono uppercase tracking-widest transition-all ${
                    appLock.timeoutMinutes === m
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {m === 0 ? '每次' : `${m}分钟`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 设置/修改 PIN */}
        <div className="space-y-3">
          <label className="text-[8px] uppercase tracking-widest text-gray-400 font-bold">
            {appLock.enabled ? '修改 PIN' : '设置 PIN 以启用'}
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={e => setNewPin(e.target.value)}
            placeholder="新 PIN（至少 4 位）"
            className="w-full bg-white dark:bg-black/20 border-0.5 border-gray-200 dark:border-white/5 rounded-2xl px-5 py-3 text-xs focus:outline-none focus:border-blue-400 transition-all font-mono tracking-widest"
          />
          <input
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value)}
            placeholder="确认 PIN"
            onKeyDown={e => e.key === 'Enter' && handleSavePin()}
            className="w-full bg-white dark:bg-black/20 border-0.5 border-gray-200 dark:border-white/5 rounded-2xl px-5 py-3 text-xs focus:outline-none focus:border-blue-400 transition-all font-mono tracking-widest"
          />
          {pinError && <p className="text-[9px] text-red-400 font-mono">{pinError}</p>}
          <button
            onClick={handleSavePin}
            disabled={!newPin || !confirmPin}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-30 text-white rounded-2xl text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2"
          >
            {saved ? <><CheckCircle2 size={14} /> 已保存</> : <><Lock size={14} /> {appLock.enabled ? '更新 PIN' : '启用应用锁'}</>}
          </button>
        </div>

        <p className="text-[8px] text-gray-400 leading-relaxed opacity-60">
          PIN 以 SHA-256 哈希存储，明文不落地。忘记 PIN 可清除浏览器数据重置。
        </p>
      </div>
    </section>
  )
}

export default StorageSettings;
