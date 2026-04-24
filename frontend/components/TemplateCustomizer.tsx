'use client'

import { useLanguage } from './LanguageProvider'
import type { TemplateSpec } from '../lib/template-types'

const COPY = {
  'zh-TW': {
    colors: '色彩配置',
    typography: '字型設定',
    layout: '版面配置',
    background: '背景',
    titleText: '標題文字',
    bodyText: '內文文字',
    accent: '強調色',
    badgeBg: '標籤背景',
    badgeText: '標籤文字',
    titleSize: '標題字級',
    bodySize: '內文字級',
    textAlign: '文字對齊',
    padding: '內距',
    apply: '套用',
    reset: '重設',
    left: '靠左',
    center: '置中',
    right: '靠右',
  },
  en: {
    colors: 'Color Palette',
    typography: 'Typography',
    layout: 'Layout',
    background: 'Background',
    titleText: 'Title text',
    bodyText: 'Body text',
    accent: 'Accent',
    badgeBg: 'Badge bg',
    badgeText: 'Badge text',
    titleSize: 'Title size',
    bodySize: 'Body size',
    textAlign: 'Text align',
    padding: 'Padding',
    apply: 'Apply',
    reset: 'Reset',
    left: 'Left',
    center: 'Center',
    right: 'Right',
  },
}

interface TemplateCustomizerProps {
  templateSpec: TemplateSpec
  onChange: (updated: TemplateSpec) => void
  onConfirm: () => void
  onCancel: () => void
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safeValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'
  return (
    <label className="flex items-center gap-2.5">
      <input
        type="color"
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 shrink-0 cursor-pointer rounded-md border border-[var(--border)] bg-transparent p-0.5"
      />
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="ml-auto font-mono text-[10px] text-[var(--text-tertiary)]">{value}</span>
    </label>
  )
}

export function TemplateCustomizer({ templateSpec, onChange, onConfirm, onCancel }: TemplateCustomizerProps) {
  const { language } = useLanguage()
  const copy = COPY[language]

  function updateColors(key: keyof TemplateSpec['colors'], value: string) {
    onChange({ ...templateSpec, colors: { ...templateSpec.colors, [key]: value } })
  }

  return (
    <div className="space-y-5">
      {/* Live preview */}
      <div className="mx-auto w-full max-w-[200px]">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-[12px]"
          style={{ backgroundColor: templateSpec.colors.background, padding: `${Math.round(templateSpec.padding / 5)}px` }}
        >
          <div
            className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-bold"
            style={{ backgroundColor: templateSpec.colors.badgeBg, color: templateSpec.colors.badgeText }}
          >
            1
          </div>
          <div className="flex h-full flex-col justify-center gap-2" style={{ textAlign: templateSpec.titleSlot.textAlign as 'left' | 'center' | 'right' }}>
            <div className="text-[13px] font-bold leading-tight" style={{ color: templateSpec.colors.textPrimary }}>
              Sample Title
            </div>
            <div className="text-[9px] leading-snug" style={{ color: templateSpec.colors.textSecondary }}>
              Body text preview line here for reference.
            </div>
          </div>
          <div
            className="absolute bottom-3 left-3 h-1 w-8 rounded-full"
            style={{ backgroundColor: templateSpec.colors.accentBar }}
          />
        </div>
      </div>

      {/* Colors */}
      <fieldset className="space-y-2.5">
        <legend className="text-xs font-semibold tracking-wide text-[var(--text-tertiary)]">{copy.colors}</legend>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <ColorField label={copy.background} value={templateSpec.colors.background} onChange={(v) => updateColors('background', v)} />
          <ColorField label={copy.titleText} value={templateSpec.colors.textPrimary} onChange={(v) => updateColors('textPrimary', v)} />
          <ColorField label={copy.bodyText} value={templateSpec.colors.textSecondary} onChange={(v) => updateColors('textSecondary', v)} />
          <ColorField label={copy.accent} value={templateSpec.colors.accent} onChange={(v) => updateColors('accent', v)} />
          <ColorField label={copy.badgeBg} value={templateSpec.colors.badgeBg} onChange={(v) => updateColors('badgeBg', v)} />
          <ColorField label={copy.badgeText} value={templateSpec.colors.badgeText} onChange={(v) => updateColors('badgeText', v)} />
        </div>
      </fieldset>

      {/* Typography */}
      <fieldset className="space-y-2.5">
        <legend className="text-xs font-semibold tracking-wide text-[var(--text-tertiary)]">{copy.typography}</legend>
        <label className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-[var(--text-secondary)]">{copy.titleSize}</span>
          <input
            type="range"
            min={40}
            max={96}
            value={templateSpec.titleSlot.fontSize}
            onChange={(e) =>
              onChange({ ...templateSpec, titleSlot: { ...templateSpec.titleSlot, fontSize: Number(e.target.value) } })
            }
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--bg-sunken)] accent-[var(--accent)]"
          />
          <span className="w-9 text-right font-mono text-[10px] text-[var(--text-tertiary)]">{templateSpec.titleSlot.fontSize}px</span>
        </label>
        <label className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-[var(--text-secondary)]">{copy.bodySize}</span>
          <input
            type="range"
            min={24}
            max={48}
            value={templateSpec.bodySlot.fontSize}
            onChange={(e) =>
              onChange({ ...templateSpec, bodySlot: { ...templateSpec.bodySlot, fontSize: Number(e.target.value) } })
            }
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--bg-sunken)] accent-[var(--accent)]"
          />
          <span className="w-9 text-right font-mono text-[10px] text-[var(--text-tertiary)]">{templateSpec.bodySlot.fontSize}px</span>
        </label>
      </fieldset>

      {/* Layout */}
      <fieldset className="space-y-2.5">
        <legend className="text-xs font-semibold tracking-wide text-[var(--text-tertiary)]">{copy.layout}</legend>
        <div className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-[var(--text-secondary)]">{copy.textAlign}</span>
          <div className="inline-flex gap-1">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                type="button"
                onClick={() =>
                  onChange({
                    ...templateSpec,
                    titleSlot: { ...templateSpec.titleSlot, textAlign: align },
                    bodySlot: { ...templateSpec.bodySlot, textAlign: align },
                  })
                }
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  templateSpec.titleSlot.textAlign === align
                    ? 'bg-[var(--bg-accent)] text-[var(--text-on-accent)]'
                    : 'bg-[var(--bg-sunken)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {copy[align]}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-xs text-[var(--text-secondary)]">{copy.padding}</span>
          <input
            type="range"
            min={40}
            max={120}
            value={templateSpec.padding}
            onChange={(e) => onChange({ ...templateSpec, padding: Number(e.target.value) })}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--bg-sunken)] accent-[var(--accent)]"
          />
          <span className="w-9 text-right font-mono text-[10px] text-[var(--text-tertiary)]">{templateSpec.padding}px</span>
        </label>
      </fieldset>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex h-10 flex-1 items-center justify-center rounded-[8px] bg-[image:var(--gradient-cta)] text-sm font-semibold text-white transition hover:-translate-y-0.5"
        >
          {copy.apply}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--bg-elevated)] px-5 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          {copy.reset}
        </button>
      </div>
    </div>
  )
}
