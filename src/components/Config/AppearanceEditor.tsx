import React from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '../../store/useAppStore'
import { Check } from 'lucide-react'

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
  const { config, updateFontFamily } = useAppStore()
  const currentFont = config?.fontFamily || 'Noto Sans SC'

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

      <div className="grid grid-cols-1 gap-3 px-2">
        {FONTS.map((font) => (
          <button
            key={font.id}
            onClick={() => updateFontFamily(font.id)}
            className={`group relative w-full p-4 rounded-2xl border-0.5 transition-all duration-500 flex items-center gap-4 ${
              currentFont === font.id 
                ? 'bg-white/80 dark:bg-white/10 border-gray-300 dark:border-gray-600 shadow-sm' 
                : 'bg-transparent border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${font.class} ${
              currentFont === font.id ? 'text-black dark:text-white' : 'text-gray-300 dark:text-gray-600'
            }`}>
              永
            </div>
            
            <div className="flex-1 text-left">
              <h4 className={`text-sm tracking-wide transition-colors ${font.class} ${
                currentFont === font.id ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {font.name}
              </h4>
              <p className="text-[8px] text-gray-300 dark:text-gray-600 uppercase tracking-widest mt-0.5 font-sans">
                {font.sub}
              </p>
            </div>

            {currentFont === font.id && (
              <motion.div 
                layoutId="active-font"
                className="text-green-500 dark:text-green-400"
              >
                <Check size={16} />
              </motion.div>
            )}
          </button>
        ))}
      </div>

      <div className="p-8 rounded-3xl bg-gray-50 dark:bg-white/5 border-0.5 border-gray-100 dark:border-gray-800">
        <div className="text-[9px] text-gray-300 dark:text-gray-600 uppercase tracking-widest mb-4">Preview // 实时预览</div>
        <p className={`text-lg leading-relaxed text-gray-600 dark:text-gray-300`} style={{ fontFamily: currentFont }}>
          回声系统正在同步。所有的记忆都将被重新排版。
        </p>
      </div>
    </motion.div>
  )
}

export default AppearanceEditor
