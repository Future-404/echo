import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Disc3, VolumeX } from 'lucide-react';

const MusicPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Play failed:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 可选：监听全局点击事件来尝试解除浏览器的自动播放限制
  // 但为了不打扰用户，最好还是让用户主动点击播放
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3; // 默认音量调低，适合做背景音
    }
  }, []);

  return (
    <div className="relative group flex items-center">
      <audio 
        ref={audioRef} 
        src="/mp3/tooone-55-miss-d-271167.mp3" 
        loop 
      />
      
      <motion.button
        onClick={togglePlay}
        className="no-tap-css w-6 h-6 flex items-center justify-center text-echo-text-subtle hover:text-echo-text-primary transition-colors pointer-events-auto"
        whileTap={{ scale: 0.9 }}
      >
        {isPlaying ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          >
            <Disc3 size={16} strokeWidth={1.5} className="text-blue-400 dark:text-blue-500" />
          </motion.div>
        ) : (
          <VolumeX size={16} strokeWidth={1.5} />
        )}
      </motion.button>

      {/* 悬停提示 */}
      <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
        <span className="text-[8px] tracking-[0.3em] font-mono text-echo-text-dim uppercase whitespace-nowrap bg-white/80 dark:bg-black/80 px-2 py-1 rounded backdrop-blur-sm border border-echo-border-md">
          {isPlaying ? 'BGM: ON' : 'BGM: OFF'}
        </span>
      </div>
    </div>
  );
};

export default MusicPlayer;