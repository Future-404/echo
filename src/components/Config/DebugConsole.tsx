import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, Copy, Terminal, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const DebugConsole: React.FC = () => {
  const { debugLogs, clearDebugLogs } = useAppStore();

  const handleCopy = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 10 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="p-6 h-full flex flex-col space-y-4"
    >
      <div className="flex justify-between items-end px-2">
        <div className="flex flex-col">
          <label className="text-xs font-serif tracking-widest text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
            <Terminal size={14} /> 调试控制台
          </label>
          <span className="text-[7px] text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] mt-0.5">Real-time API Monitor</span>
        </div>
        <button 
          onClick={clearDebugLogs}
          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
          title="清空日志"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 no-scrollbar">
        {debugLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-700 opacity-50 space-y-2">
            <Terminal size={32} strokeWidth={0.5} />
            <p className="text-[10px] uppercase tracking-widest">Waiting for neural signals...</p>
          </div>
        ) : (
          debugLogs.map((log) => (
            <div key={log.id} className="bg-gray-50 dark:bg-white/5 border-0.5 border-gray-100 dark:border-white/5 rounded-xl p-4 space-y-2 group relative">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {log.direction === 'OUT' ? <ArrowUpRight size={12} className="text-blue-400" /> : 
                   log.direction === 'IN' ? <ArrowDownLeft size={12} className="text-green-400" /> : 
                   <AlertCircle size={12} className="text-red-400" />}
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    log.direction === 'OUT' ? 'text-blue-400' : 
                    log.direction === 'IN' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {log.label}
                  </span>
                </div>
                <span className="text-[8px] font-mono text-gray-400 opacity-50">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="max-h-[400px] overflow-y-auto relative custom-scrollbar pr-2 pb-6">
                <pre className="text-[9px] font-mono text-gray-600 dark:text-gray-400 leading-tight break-all whitespace-pre-wrap select-text">
                  {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                </pre>
              </div>

              <button 
                onClick={() => handleCopy(log.data)}
                className="absolute bottom-2 right-2 p-1.5 bg-white dark:bg-black border border-gray-200 dark:border-white/10 rounded-md shadow-sm text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Copy size={10} />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default DebugConsole;