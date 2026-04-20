'use client'

import { useLanguage, type AppLanguage } from './LanguageProvider'

const OPTIONS: Array<{ value: AppLanguage; label: string }> = [
  { value: 'en', label: 'EN' },
  { value: 'zh-TW', label: '繁中' },
]

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] p-1">
      {OPTIONS.map((option) => {
        const active = option.value === language
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLanguage(option.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active
                ? 'bg-[var(--bg-accent)] text-[var(--text-on-accent)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
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
