/**
 * Echo 共用 UI 原子组件
 */
import React from 'react'

// ── 1. Toggle 开关 ──────────────────────────────────────────────
interface ToggleProps {
  checked: boolean
  onChange: () => void
  color?: string // tailwind bg class when on, e.g. 'bg-orange-500/70'
  disabled?: boolean
}
export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, color = 'bg-orange-500/70', disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${checked ? color : 'bg-echo-surface-md'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
  </button>
)

// ── 2. 表单输入 ──────────────────────────────────────────────────
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { className?: string }
export const FieldInput: React.FC<InputProps> = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`w-full bg-white dark:bg-black/20 border-0.5 border-echo-border-md rounded px-3 py-1.5 text-xs text-echo-text-primary focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors ${className}`}
  />
)

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
export const FieldTextarea: React.FC<TextareaProps> = ({ className = '', ...props }) => (
  <textarea
    {...props}
    className={`w-full bg-white dark:bg-black/20 border-0.5 border-echo-border-md rounded px-3 py-2 text-xs text-echo-text-primary focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors resize-none ${className}`}
  />
)

// ── 3. 区块标题 ──────────────────────────────────────────────────
interface SectionLabelProps {
  children: React.ReactNode
  className?: string
}
export const SectionLabel: React.FC<SectionLabelProps> = ({ children, className = '' }) => (
  <p className={`text-[9px] font-bold uppercase tracking-widest text-echo-text-muted ${className}`}>
    {children}
  </p>
)

// ── 4. 设置行 ────────────────────────────────────────────────────
interface SettingRowProps {
  label: string
  description?: string
  children: React.ReactNode
  className?: string
}
export const SettingRow: React.FC<SettingRowProps> = ({ label, description, children, className = '' }) => (
  <div className={`flex items-center justify-between gap-4 ${className}`}>
    <div className="min-w-0">
      <p className="text-xs text-echo-text-primary">{label}</p>
      {description && <p className="text-[10px] text-echo-text-subtle mt-0.5">{description}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
)
