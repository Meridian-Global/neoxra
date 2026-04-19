'use client'

import { useLanguage, type AppLanguage } from './LanguageProvider'

const OPTIONS: Array<{ value: AppLanguage; label: string }> = [
  { value: 'en', label: 'EN' },
  { value: 'zh-TW', label: '繁中' },
]

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--panel)] p-1">
      {OPTIONS.map((option) => {
        const active = option.value === language
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLanguage(option.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active
                ? 'bg-[var(--text)] text-[var(--bg)]'
                : 'text-[var(--subtle)] hover:text-[var(--text)]'
            }`}
            aria-pressed={active}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
