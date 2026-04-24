'use client'

import { useLanguage } from './LanguageProvider'
import type { TemplateInfo } from '../lib/instagram-types'

const STYLE_LABELS: Record<'en' | 'zh-TW', Record<string, string>> = {
  'zh-TW': {
    professional: '專業',
    bold: '醒目',
    minimal: '極簡',
    editorial: '社論',
    playful: '活潑',
  },
  en: {
    professional: 'Professional',
    bold: 'Bold',
    minimal: 'Minimal',
    editorial: 'Editorial',
    playful: 'Playful',
  },
}

interface TemplatePreviewProps {
  template: TemplateInfo
  selected: boolean
  onClick: () => void
}

export function TemplatePreview({ template, selected, onClick }: TemplatePreviewProps) {
  const { language } = useLanguage()
  const styleLabel = STYLE_LABELS[language][template.style] ?? template.style
  const displayName = language === 'zh-TW' ? template.nameZh : template.name

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col gap-2.5 rounded-[16px] p-2.5 text-left transition-all duration-150 ${
        selected
          ? 'bg-[var(--bg-elevated)] ring-2 ring-[var(--accent)] shadow-[var(--shadow-glow)]'
          : 'bg-transparent hover:bg-[var(--bg-elevated)] hover:shadow-[var(--shadow-md)]'
      }`}
    >
      <div
        className={`relative aspect-square w-full overflow-hidden rounded-[12px] transition-transform duration-150 group-hover:scale-[1.02] ${
          selected ? 'ring-1 ring-[var(--accent)]/30' : ''
        }`}
        style={{ backgroundColor: template.previewColors.background }}
      >
        {/* Badge circle */}
        <div
          className="absolute left-3 top-3 h-5 w-5 rounded-full"
          style={{ backgroundColor: template.previewColors.accent }}
        />

        {/* Simulated title lines */}
        <div className="absolute left-4 right-4 top-[38%] space-y-2">
          <div
            className="h-2.5 w-[75%] rounded-full"
            style={{ backgroundColor: template.previewColors.textPrimary, opacity: 0.9 }}
          />
          <div
            className="h-2.5 w-[55%] rounded-full"
            style={{ backgroundColor: template.previewColors.textPrimary, opacity: 0.9 }}
          />
        </div>

        {/* Simulated body lines */}
        <div className="absolute bottom-[22%] left-4 right-4 space-y-1.5">
          <div
            className="h-1.5 w-[90%] rounded-full"
            style={{ backgroundColor: template.previewColors.textPrimary, opacity: 0.35 }}
          />
          <div
            className="h-1.5 w-[70%] rounded-full"
            style={{ backgroundColor: template.previewColors.textPrimary, opacity: 0.35 }}
          />
          <div
            className="h-1.5 w-[80%] rounded-full"
            style={{ backgroundColor: template.previewColors.textPrimary, opacity: 0.35 }}
          />
        </div>

        {/* Accent bar */}
        <div
          className="absolute bottom-3 left-4 h-1 w-10 rounded-full"
          style={{ backgroundColor: template.previewColors.accent }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {displayName}
        </span>
        <span className="shrink-0 rounded-full bg-[var(--bg-sunken)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
          {styleLabel}
        </span>
      </div>
    </button>
  )
}
