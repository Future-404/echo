import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { Check, Upload, X } from 'lucide-react'
import { imageDb } from '../../utils/imageDb'
import { BG_KEY } from '../../hooks/useCustomBg'

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

const AppearanceEditor: React.FC = () => {
  const { config, updateFontFamily, updateFontSize, updateCustomCss, updateCustomBg } = useAppStore()
  const currentFont = config?.fontFamily || 'Noto Sans SC'
  const currentSize = config?.fontSize || 16
  const [cssValue, setCssValue] = useState(config?.customCss || '')
  const [bgPreview, setBgPreview] = useState<string | null>(null)
  const [fontOpen, setFontOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cssFileRef = useRef<HTMLInputElement>(null)

  // 初始化时加载预览
  React.useEffect(() => {
    if (config?.customBg) imageDb.get(BG_KEY).then(url => setBgPreview(url))
  }, [])

  const handleCssBlur = () => updateCustomCss(cssValue)

  const handleCssImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCssValue(text)
      updateCustomCss(text)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleCssExport = () => {
    const blob = new Blob([cssValue], { type: 'text/css' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'echo-custom.css'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      await imageDb.save(BG_KEY, base64)
      setBgPreview(base64)
      updateCustomBg(true)
      document.documentElement.style.setProperty('--custom-bg', `url("${base64}")`)
    }
    reader.readAsDataURL(file)
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
      <div className="px-4">
        <h3 className="text-xs font-serif tracking-[0.3em] text-gray-400 uppercase mb-2">Typography // 字体系统</h3>
        <p className="text-[9px] text-gray-500 tracking-widest leading-relaxed">选择最契合故事氛围的文字载体。不同字体会改变整体界面的排版厚度。</p>
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
        <div className="flex justify-between text-[8px] text-gray-300 dark:text-gray-600 tracking-tighter">
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
              <p className="text-sm font-serif text-gray-600 dark:text-gray-300">{FONTS.find(f => f.id === currentFont)?.name ?? currentFont}</p>
              <p className="text-[8px] text-gray-300 dark:text-gray-600 uppercase tracking-widest">Font Family</p>
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
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg ${font.class} ${currentFont === font.id ? 'text-black dark:text-white' : 'text-gray-300 dark:text-gray-600'}`}>永</span>
                    <div className="flex-1 text-left">
                      <p className={`text-sm tracking-wide ${font.class} ${currentFont === font.id ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{font.name}</p>
                      <p className="text-[8px] text-gray-300 dark:text-gray-600 uppercase tracking-widest font-sans">{font.sub}</p>
                    </div>
                    {currentFont === font.id && <Check size={14} className="text-green-500 dark:text-green-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-8 rounded-3xl bg-gray-50 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800">
        <div className="text-[9px] text-gray-300 dark:text-gray-600 uppercase tracking-widest mb-4">Preview // 实时预览</div>
        <p className={`leading-relaxed text-gray-600 dark:text-gray-300`} style={{ fontFamily: currentFont, fontSize: `${currentSize}px` }}>
          回声系统正在同步。所有的记忆都将被重新排版。
        </p>
      </div>

      {/* Custom Background */}
      <div className="px-4 space-y-3">
        <div>
          <label className="text-[10px] tracking-widest text-gray-400 uppercase">Background Image // 对话背景</label>
          <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-1">支持 JPG / PNG / WebP，图片存储于本地 IndexedDB。</p>
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

      {/* Custom CSS Editor */}
      <div className="px-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <label className="text-[10px] tracking-widest text-gray-400 uppercase">Custom CSS // 自定义样式</label>
            <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-1 leading-relaxed">
              支持覆盖 CSS 变量与任意选择器。可用变量：<br />
              <code className="font-mono text-blue-400">--dialogue-bg</code>、
              <code className="font-mono text-blue-400">--dialogue-text-dialogue</code>、
              <code className="font-mono text-blue-400">--dialogue-text-narration</code>、
              <code className="font-mono text-blue-400">--dialogue-text-thought</code>、
              <code className="font-mono text-blue-400">--dialogue-text-action</code>、
              <code className="font-mono text-blue-400">--stat-color-love/hate/hp/mana/favor</code>、
              <code className="font-mono text-blue-400">--char-a-color</code>、
              <code className="font-mono text-blue-400">--char-b-color</code>
            </p>
          </div>
          <div className="flex gap-2 shrink-0 mt-0.5">
            {/* 导入 */}
            <button
              onClick={() => cssFileRef.current?.click()}
              className="text-[9px] tracking-widest text-gray-400 hover:text-blue-400 uppercase transition-colors"
              title="从文件导入"
            >导入</button>
            <input ref={cssFileRef} type="file" accept=".css,text/css" className="hidden" onChange={handleCssImport} />
            {/* 导出 */}
            {cssValue && (
              <button
                onClick={handleCssExport}
                className="text-[9px] tracking-widest text-gray-400 hover:text-blue-400 uppercase transition-colors"
                title="导出为 .css 文件"
              >导出</button>
            )}
          </div>
        </div>
        <textarea
          value={cssValue}
          onChange={(e) => setCssValue(e.target.value)}
          onBlur={handleCssBlur}
          spellCheck={false}
          placeholder={`:root {\n  --dialogue-bg: rgba(0, 0, 0, 0.6);\n  --dialogue-text-dialogue: #e2e8f0;\n  --stat-color-love: #ff6b9d;\n}`}
          className="w-full h-48 bg-gray-50 dark:bg-black/30 border-0.5 border-gray-200 dark:border-gray-700 rounded-2xl p-4 font-mono text-[11px] text-gray-700 dark:text-gray-300 resize-none focus:outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors leading-relaxed"
        />
        {cssValue && (
          <button
            onClick={() => { setCssValue(''); updateCustomCss('') }}
            className="text-[9px] tracking-widest text-red-400 hover:text-red-500 uppercase transition-colors"
          >
            清除自定义样式
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default AppearanceEditor
