import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { Check, Upload, X, ChevronRight } from 'lucide-react'
import { imageDb } from '../../utils/imageDb'
import { BG_KEY } from '../../hooks/useCustomBg'
import { useDialog } from '../GlobalDialog'
import { readFileAsDataURL } from '../../utils/fileUtils'

const FONTS = [
  { id: 'Noto Sans SC', name: '思源黑体', sub: 'Noto Sans SC', class: 'font-noto-sans' },
  { id: 'Noto Serif SC', name: '思源宋体', sub: 'Noto Serif SC', class: 'font-noto-serif' },
  { id: 'ZCOOL KuaiLe', name: '站酷快乐', sub: 'ZCOOL KuaiLe', class: 'font-zcool-kuaile' },
  { id: 'ZCOOL QingKe HuangYou', name: '黄油体', sub: 'ZCOOL HuangYou', class: 'font-zcool-huangyou' },
  { id: 'ZCOOL XiaoWei', name: '站酷小薇', sub: 'ZCOOL XiaoWei', class: 'font-zcool-xiaowei' },
  { id: 'Ma Shan Zheng', name: '马善政楷书', sub: 'Ma Shan Zheng', class: 'font-mashanzheng' },
  { id: 'Zhi Mang Xing', name: '织忙行书', sub: 'Zhi Mang Xing', class: 'font-zhimangxing' },
  { id: 'Liu Jian Mao Cao', name: '刘建毛草', sub: 'Liu Jian Mao Cao', class: 'font-liujianmaocao' },
  { id: 'Long Cang', name: '龙沧手写', sub: 'Long Cang', class: 'font-longcang' },
  { id: 'Noto Sans Mono SC', name: '思源等宽', sub: 'Noto Sans Mono SC', class: 'font-noto-mono' },
]

interface Props {
  onOpenCssPackages: () => void
}

const AppearanceEditor: React.FC<Props> = ({ onOpenCssPackages }) => {
  const { config, updateFontFamily, updateFontSize, updateCustomBg } = useAppStore()
  const { alert } = useDialog()
  const currentFont = config?.fontFamily || 'Noto Sans SC'
  const currentSize = config?.fontSize || 16
  const [bgPreview, setBgPreview] = useState<string | null>(null)
  const [fontOpen, setFontOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // 初始化时加载预览
  React.useEffect(() => {
    if (config?.customBg) imageDb.get(BG_KEY).then(url => setBgPreview(url))
  }, [])

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const base64 = await readFileAsDataURL(file)
    await imageDb.save(BG_KEY, base64)
    setBgPreview(base64)
    updateCustomBg(true)
    document.documentElement.style.setProperty('--custom-bg', `url("${base64}")`)
    e.target.value = ''
  }

  const handleBgRemove = async () => {
    await imageDb.remove(BG_KEY)
    setBgPreview(null)
    updateCustomBg(false)
    document.documentElement.style.removeProperty('--custom-bg')
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      className="p-6 space-y-8"
    >
      {/* CSS 样式包入口 */}
      <div className="px-4 space-y-3">
        <label className="text-[10px] tracking-widest text-gray-400 uppercase">Custom CSS // 样式包管理</label>
        <button
          onClick={onOpenCssPackages}
          className="w-full flex items-center justify-between p-4 rounded-2xl border-0.5 border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-white/5 hover:border-blue-400 transition-colors"
        >
          <div className="text-left">
            <p className="text-sm font-serif text-echo-text-base">CSS 样式包</p>
            <p className="text-[9px] text-gray-400 mt-0.5">
              {(config.cssPackages || []).length === 0
                ? '暂无样式包，点击创建'
                : `${(config.cssPackages || []).filter(p => p.enabled).length} / ${(config.cssPackages || []).length} 个已启用`}
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="px-4">
        <h3 className="text-xs font-serif tracking-[0.3em] text-gray-400 uppercase mb-2">Font // 字体排版</h3>
      </div>

      {/* Font Size Slider */}
      <div className="px-4 space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-[10px] tracking-widest text-gray-400 uppercase">Font Size // 字体大小</label>
          <span className="text-xs font-mono text-blue-500">{currentSize}px</span>
        </div>
        <input 
          type="range" 
          min="12" 
          max="24" 
          step="1"
          value={currentSize}
          onChange={(e) => updateFontSize(parseInt(e.target.value))}
          className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-[8px] text-echo-text-dim tracking-tighter">
          <span>MIN (12px)</span>
          <span>MAX (24px)</span>
        </div>
      </div>

      {/* Font Picker — 折叠 */}
      <div className="px-2">
        <button
          onClick={() => setFontOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border-0.5 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className={`text-lg ${FONTS.find(f => f.id === currentFont)?.class}`}>永</span>
            <div className="text-left">
              <p className="text-sm font-serif text-echo-text-base">{FONTS.find(f => f.id === currentFont)?.name ?? currentFont}</p>
              <p className="text-[8px] text-echo-text-dim uppercase tracking-widest">Font Family</p>
            </div>
          </div>
          <motion.span animate={{ rotate: fontOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="text-gray-400 text-[10px]">▾</motion.span>
        </button>

        <AnimatePresence>
          {fontOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 gap-2 pt-2">
                {FONTS.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => { updateFontFamily(font.id); setFontOpen(false) }}
                    className={`w-full p-3 rounded-2xl border-0.5 transition-all duration-300 flex items-center gap-4 ${
                      currentFont === font.id
                        ? 'bg-white/80 dark:bg-white/10 border-gray-300 dark:border-gray-600 shadow-sm'
                        : 'bg-transparent border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg ${font.class} ${currentFont === font.id ? 'text-black dark:text-white' : 'text-echo-text-dim'}`}>永</span>
                    <div className="flex-1 text-left">
                      <p className={`text-sm tracking-wide ${font.class} ${currentFont === font.id ? 'text-black dark:text-white' : 'text-echo-text-muted'}`}>{font.name}</p>
                      <p className="text-[8px] text-echo-text-dim uppercase tracking-widest font-sans">{font.sub}</p>
                    </div>
                    {currentFont === font.id && <Check size={14} className="text-green-500 dark:text-green-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-8 rounded-3xl bg-echo-surface border-0.5 border-gray-100 dark:border-gray-800">
        <div className="text-[9px] text-echo-text-dim uppercase tracking-widest mb-4">Preview // 实时预览</div>
        <p className={`leading-relaxed text-echo-text-base`} style={{ fontFamily: currentFont, fontSize: `${currentSize}px` }}>
          回声系统正在同步。所有的记忆都将被重新排版。
        </p>
      </div>

      {/* Dialogue Parser Config */}
      <div className="px-4 space-y-3">
        <label className="text-[10px] tracking-widest text-gray-400 uppercase">Dialogue Parser // 对话解析规则</label>
        <div className="space-y-2">
          {['dialogueQuotes', 'actionMarkers', 'thoughtMarkers'].map((key) => {
            const labels: any = { dialogueQuotes: '对话引号', actionMarkers: '动作标记', thoughtMarkers: '心理标记' };
            const defaults: any = { dialogueQuotes: '""“”', actionMarkers: '**「」『』', thoughtMarkers: '()（）' };
            const val = (config as any)[key] || defaults[key];
            
            return (
              <div key={key}>
                <label className="text-[9px] text-echo-text-muted">{labels[key]}</label>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const input = e.target.value;
                    if (/[<>&/]/.test(input)) {
                      alert('解析规则中禁止使用 < > & / 等 HTML/XML 核心控制字符，以防渲染冲突。');
                      return;
                    }
                    useAppStore.getState().updateConfig({ [key]: input });
                  }}
                  placeholder={defaults[key]}
                  className="w-full mt-1 px-3 py-2 bg-gray-50 dark:bg-black/30 border-0.5 border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:border-blue-400"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Background */}
      <div className="px-4 space-y-3">
        <div>
          <label className="text-[10px] tracking-widest text-gray-400 uppercase">Background Image // 对话背景</label>
          <p className="text-[9px] text-echo-text-dim mt-1">支持 JPG / PNG / WebP，图片存储于本地 IndexedDB。</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
        {bgPreview ? (
          <div className="relative rounded-2xl overflow-hidden border-0.5 border-gray-200 dark:border-gray-700 h-32">
            <img src={bgPreview} className="w-full h-full object-cover" alt="background preview" />
            <button
              onClick={handleBgRemove}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full h-24 rounded-2xl border-0.5 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
          >
            <Upload size={16} />
            <span className="text-[9px] tracking-widest uppercase">点击上传图片</span>
          </button>
        )}
      </div>

    </motion.div>
  )
}

export default AppearanceEditor
