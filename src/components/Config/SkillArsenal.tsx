import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, ToggleLeft, ToggleRight, Cpu, Upload, Trash2, Ghost } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { registeredSkills } from '../../skills/core/registry'
import { ALL_SKILLS } from '../../skills'
import { parsePackageZip, loadInstalledSkill } from '../../skills/core/loader'
import { floatingPet } from '../../plugins/floatingPet'

const SkillArsenal: React.FC = () => {
  const { config, toggleSkill, toggleDeviceContext, installSkill, uninstallSkill } = useAppStore()
  const registeredSkillNames = useAppStore(s => s.registeredSkillNames)
  const enabledSkillIds = config?.enabledSkillIds || []
  const deviceEnabled = config?.deviceContextEnabled ?? false
  const installedSkills = config?.installedSkills || []
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [petRunning, setPetRunning] = useState(false)
  const [petSupported] = useState(() => floatingPet.isSupported())

  useEffect(() => {
    if (!petSupported) return
    floatingPet.isRunning().then(setPetRunning)
  }, [petSupported])

  const togglePet = async () => {
    const hasPerm = await floatingPet.hasPermission()
    if (!hasPerm) {
      await floatingPet.requestPermission()
      return
    }
    if (petRunning) {
      await floatingPet.hide()
      setPetRunning(false)
    } else {
      // 启动前传入 LLM 配置
      const provider = config.providers.find(p => p.id === (config.modelConfig?.chatProviderId || config.activeProviderId))
        || config.providers[0]
      if (provider) {
        await floatingPet.configure({
          apiKey: provider.apiKey || '',
          endpoint: provider.endpoint || 'https://api.openai.com/v1',
          model: provider.model || 'gpt-4o-mini',
          systemPrompt: '你是一个可爱的桌面宠物助手。回复简短自然，1-2句话，不要用Markdown格式。',
        })
      }
      await floatingPet.show()
      setPetRunning(true)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError(null)
    setImporting(true)
    try {
      const skill = await parseSkillZip(file)
      loadInstalledSkill(skill)
      installSkill(skill)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-6 space-y-6"
    >
      <div className="px-4 flex flex-col">
        <label className="text-xs font-serif tracking-widest text-echo-text-muted font-medium">核心能力库</label>
        <span className="text-[7px] text-echo-text-dim uppercase tracking-[0.2em] mt-0.5">Extensions</span>
      </div>

      {/* 设备感知 */}
      <div className={`w-full p-5 rounded-3xl border-0.5 transition-all flex items-start gap-4 ${deviceEnabled ? 'border-gray-300 dark:border-gray-500 bg-white/60 dark:bg-white/10' : 'border-gray-100 dark:border-gray-800 bg-white/20 dark:bg-white/5 opacity-60'}`}>
        <div className="w-10 h-10 rounded-2xl border-0.5 border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0">
          <Cpu size={16} strokeWidth={1} className={deviceEnabled ? 'text-echo-text-base' : 'text-gray-400 dark:text-gray-700'} />
        </div>
        <div className="flex-1">
          <h4 className={`text-sm font-serif tracking-wide ${deviceEnabled ? 'text-gray-600 dark:text-gray-200' : 'text-echo-text-dim'}`}>设备感知</h4>
          <p className="text-[9px] text-echo-text-subtle leading-relaxed mt-1">
            自动注入时间、电量、网络状态至每次对话上下文。
          </p>
        </div>
        <button onClick={toggleDeviceContext} className="text-echo-text-dim hover:text-gray-500 transition-colors pt-1">
          {deviceEnabled ? <ToggleRight size={20} strokeWidth={1} className="text-green-300 dark:text-green-800" /> : <ToggleLeft size={20} strokeWidth={1} />}
        </button>
      </div>

      {/* 桌宠 */}
      {petSupported && (
        <div className={`w-full p-5 rounded-3xl border-0.5 transition-all flex items-start gap-4 ${petRunning ? 'border-gray-300 dark:border-gray-500 bg-white/60 dark:bg-white/10' : 'border-gray-100 dark:border-gray-800 bg-white/20 dark:bg-white/5 opacity-60'}`}>
          <div className="w-10 h-10 rounded-2xl border-0.5 border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0">
            <Ghost size={16} strokeWidth={1} className={petRunning ? 'text-echo-text-base' : 'text-gray-400 dark:text-gray-700'} />
          </div>
          <div className="flex-1">
            <h4 className={`text-sm font-serif tracking-wide ${petRunning ? 'text-gray-600 dark:text-gray-200' : 'text-echo-text-dim'}`}>桌宠</h4>
            <p className="text-[9px] text-echo-text-subtle leading-relaxed mt-1">
              在系统桌面显示悬浮桌宠，双击返回应用。需要"显示在其他应用上层"权限。
            </p>
          </div>
          <button onClick={togglePet} className="text-echo-text-dim hover:text-gray-500 transition-colors pt-1">
            {petRunning ? <ToggleRight size={20} strokeWidth={1} className="text-green-300 dark:text-green-800" /> : <ToggleLeft size={20} strokeWidth={1} />}
          </button>
        </div>
      )}

      {/* 内置 + 已安装 Skills */}
      <div className="space-y-3">
        {/* 内置 skills（静态） */}
        {ALL_SKILLS.map(skill => {
          const isEnabled = enabledSkillIds.includes(skill.name)
          return (
            <div key={skill.name} className={`w-full p-5 rounded-3xl border-0.5 transition-all flex items-start gap-4 ${isEnabled ? 'border-gray-300 dark:border-gray-500 bg-white/60 dark:bg-white/10' : 'border-gray-100 dark:border-gray-800 bg-white/20 dark:bg-white/5 opacity-60'}`}>
              <div className="w-10 h-10 rounded-2xl border-0.5 border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0">
                <Zap size={16} strokeWidth={1} className={isEnabled ? 'text-echo-text-base' : 'text-gray-400 dark:text-gray-700'} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-serif tracking-wide ${isEnabled ? 'text-gray-600 dark:text-gray-200' : 'text-echo-text-dim'}`}>{skill.displayName}</h4>
                <p className="text-[9px] text-echo-text-subtle leading-relaxed mt-1 line-clamp-2">{skill.description}</p>
              </div>
              <button onClick={() => toggleSkill(skill.name)} className="text-echo-text-dim hover:text-gray-500 transition-colors pt-1">
                {isEnabled ? <ToggleRight size={20} strokeWidth={1} className="text-green-300 dark:text-green-800" /> : <ToggleLeft size={20} strokeWidth={1} />}
              </button>
            </div>
          )
        })}
        {/* 已安装的第三方 skills（registeredSkillNames 变化时重渲染） */}
        {installedSkills.map(installed => {
          const skillId = installed.id.replace(/-/g, '_')
          if (!registeredSkillNames.includes(skillId)) return null
          const isEnabled = enabledSkillIds.includes(skillId)
          const mod = registeredSkills[skillId]
          return (
            <div key={installed.id} className={`w-full p-5 rounded-3xl border-0.5 transition-all flex items-start gap-4 ${isEnabled ? 'border-gray-300 dark:border-gray-500 bg-white/60 dark:bg-white/10' : 'border-gray-100 dark:border-gray-800 bg-white/20 dark:bg-white/5 opacity-60'}`}>
              <div className="w-10 h-10 rounded-2xl border-0.5 border-gray-100 dark:border-gray-800 flex items-center justify-center shrink-0">
                <Zap size={16} strokeWidth={1} className={isEnabled ? 'text-echo-text-base' : 'text-gray-400 dark:text-gray-700'} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-serif tracking-wide ${isEnabled ? 'text-gray-600 dark:text-gray-200' : 'text-echo-text-dim'}`}>{mod?.displayName || installed.name}</h4>
                <p className="text-[9px] text-echo-text-subtle leading-relaxed mt-1 line-clamp-2">{installed.description}</p>
                {installed.author && <p className="text-[8px] text-echo-text-dim mt-1">by {installed.author} · v{installed.version}</p>}
                {installed.permissions?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {installed.permissions.map((p: string) => (
                      <span key={p} className="text-[7px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">{p}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 pt-1">
                <button onClick={() => toggleSkill(skillId)} className="text-echo-text-dim hover:text-gray-500 transition-colors">
                  {isEnabled ? <ToggleRight size={20} strokeWidth={1} className="text-green-300 dark:text-green-800" /> : <ToggleLeft size={20} strokeWidth={1} />}
                </button>
                <button onClick={() => uninstallSkill(skillId)} className="text-echo-text-dim hover:text-red-400 transition-colors">
                  <Trash2 size={13} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 导入按钮 */}
      <div className="px-4">
        <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={handleImport} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="w-full py-3 rounded-2xl border-0.5 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-echo-text-dim hover:text-echo-text-base hover:border-gray-400 transition-all disabled:opacity-40"
        >
          <Upload size={13} strokeWidth={1.5} />
          {importing ? '导入中...' : '导入 Skill (.zip)'}
        </button>
        {error && <p className="text-[9px] text-red-400 mt-2 font-mono px-1">{error}</p>}
      </div>
    </motion.div>
  )
}

export default SkillArsenal
