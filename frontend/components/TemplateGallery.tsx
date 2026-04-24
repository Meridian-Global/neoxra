'use client'

import { Upload } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { TemplatePreview } from './TemplatePreview'
import type { TemplateInfo } from '../lib/instagram-types'

const COPY = {
  'zh-TW': {
    title: '選擇模板',
    subtitle: '選擇一個設計模板，或上傳你自己的',
    uploadCustom: '上傳自訂模板',
    builtIn: '內建模板',
    loading: '載入模板中…',
  },
  en: {
    title: 'Choose Template',
    subtitle: 'Pick a design template or upload your own',
    uploadCustom: 'Upload Custom Template',
    builtIn: 'Built-in Templates',
    loading: 'Loading templates…',
  },
}

interface TemplateGalleryProps {
  templates: TemplateInfo[]
  selectedId: string | null
  onSelect: (templateId: string) => void
  onUploadCustom: () => void
  loading?: boolean
  compact?: boolean
}

export function TemplateGallery({
  templates,
  selectedId,
  onSelect,
  onUploadCustom,
  loading = false,
  compact = false,
}: TemplateGalleryProps) {
  const { language } = useLanguage()
  const copy = COPY[language]

  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-[var(--text-tertiary)]">{copy.title}</p>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--border-bold)] border-t-[var(--text-primary)]" />
            {copy.loading}
          </div>
        ) : templates.length === 0 ? null : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelect(template.id)}
                className={`group flex shrink-0 flex-col items-center gap-1.5 rounded-[10px] p-1.5 transition ${
                  selectedId === template.id
                    ? 'bg-[var(--bg-elevated)] ring-2 ring-[var(--accent)]'
                    : 'hover:bg-[var(--bg-elevated)]'
                }`}
              >
                <div
                  className="relative h-[72px] w-[72px] overflow-hidden rounded-[8px]"
                  style={{ backgroundColor: template.previewColors.background }}
                >
                  <div
                    className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full"
                    style={{ backgroundColor: template.previewColors.accent }}
                  />
                  <div className="absolute left-2 right-2 top-[38%] space-y-1">
                    <div className="h-1.5 w-[70%] rounded-full" style={{ backgroundColor: template.previewColors.textPrimary, opacity: 0.85 }} />
                    <div className="h-1.5 w-[50%] rounded-full" style={{ backgroundColor: template.previewColors.textPrimary, opacity: 0.85 }} />
                  </div>
                  <div className="absolute bottom-[22%] left-2 right-2 space-y-0.5">
                    <div className="h-1 w-[85%] rounded-full" style={{ backgroundColor: template.previewColors.textPrimary, opacity: 0.3 }} />
                    <div className="h-1 w-[60%] rounded-full" style={{ backgroundColor: template.previewColors.textPrimary, opacity: 0.3 }} />
                  </div>
                </div>
                <span className="max-w-[72px] truncate text-[10px] font-medium text-[var(--text-tertiary)]">
                  {language === 'zh-TW' ? template.nameZh : template.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">{copy.title}</h3>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onUploadCustom}
          className="inline-flex shrink-0 items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <Upload className="h-3.5 w-3.5" />
          {copy.uploadCustom}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-[12px] bg-[var(--bg-sunken)] py-12">
          <div className="flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-bold)] border-t-[var(--text-primary)]" />
            {copy.loading}
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="flex items-center justify-center rounded-[12px] bg-[var(--bg-sunken)] py-12">
          <p className="text-sm text-[var(--text-tertiary)]">{copy.builtIn}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {templates.map((template) => (
            <TemplatePreview
              key={template.id}
              template={template}
              selected={selectedId === template.id}
              onClick={() => onSelect(template.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
