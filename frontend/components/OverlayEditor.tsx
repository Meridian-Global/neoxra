'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from './LanguageProvider'
import { parseOverlayInput, serializeOverlaySlides } from '../lib/overlay-parser'
import { renderOverlay } from '../lib/render-api'
import type { TextZoneConfig } from '../lib/render-api'

const ZONE_PRESETS = {
  'hogan-green': {
    name: 'Hogan Green Template',
    nameZh: 'Hogan 綠色模板',
    titleZone: {
      y_start: 48, y_end: 110, x_left: 120, x_right: 120,
      font_size: 38, font_weight: 900, color: '#FFFFFF',
      emphasis_color: '#FFD700', text_align: 'center', line_height: 1.25,
    },
    contentZone: {
      y_start: 155, y_end: 830, x_left: 130, x_right: 130,
      font_size: 30, font_weight: 700, color: '#FFFFFF',
      emphasis_color: '#FFD700', text_align: 'center', line_height: 1.55,
    },
    watermark: '',
    watermarkX: 820,
    watermarkY: 1045,
    watermarkFontSize: 26,
  },
  'center-full': {
    name: 'Center Full',
    nameZh: '滿版置中',
    titleZone: {
      y_start: 60, y_end: 160, x_left: 80, x_right: 80,
      font_size: 48, font_weight: 900, color: '#FFFFFF',
      emphasis_color: '#FFD700', text_align: 'center', line_height: 1.2,
    },
    contentZone: {
      y_start: 180, y_end: 880, x_left: 100, x_right: 100,
      font_size: 32, font_weight: 700, color: '#FFFFFF',
      emphasis_color: '#FFD700', text_align: 'center', line_height: 1.6,
    },
    watermark: '',
    watermarkX: 900,
    watermarkY: 1040,
    watermarkFontSize: 24,
  },
} as const
type PresetKey = keyof typeof ZONE_PRESETS | 'custom'

const SAMPLE_CONTENT = {
  'zh-TW': `前言：RUNWAY 是誰
---
他們是雲端上的數位電影工作室
**讓每個人都能成為電影導演**
這家 AI 影片生成公司
用文字就能創造專業級影片
從獨立創作者到好萊塢片廠
都在使用他們的魔法工具
目前估值已達到==三十億美元==
正在重新定義影像敘事的方式

===

他們為何能快速崛起？
---
關鍵在於 Gen-2 模型的突破
實現了高品質的文字轉影片
**就像電影發明初期一樣震撼**
但這次主角換成了 AI
讓影片創作的門檻大幅降低
任何人都能將腦中畫面實現`,
  en: `Intro: Who is RUNWAY
---
A digital film studio in the cloud
**Making everyone a film director**
This AI video generation company
Creates professional videos from text
From indie creators to Hollywood studios
Everyone uses their magic tools
Currently valued at ==$3 billion==
Redefining visual storytelling

===

Why Did They Rise So Fast?
---
The breakthrough came with Gen-2 model
Achieving high-quality text-to-video
**As groundbreaking as cinema's invention**
But this time the star is AI
Drastically lowering the barrier to video
Anyone can bring their vision to life`,
}

const OVERLAY_COPY = {
  'zh-TW': {
    title: '模板套用',
    subtitle: '上傳空白模板 → 貼上文字 → 一鍵產出所有貼文圖片',
    back: '返回',
    presetLabel: '文字位置預設',
    zoneConfig: '文字區域設定',
    titleZone: '標題區域',
    contentZone: '內文區域',
    yStart: '起始 Y',
    yEnd: '結束 Y',
    fontSize: '字型大小',
    textColor: '文字顏色',
    emphasisColor: '強調顏色',
    watermark: '浮水印',
    perSlide: '逐張編輯',
    bulkPaste: '批次貼上',
    bulkHint: '用 === 分隔每張投影片，用 --- 分隔標題與內文\n**粗體** = 整行強調，==文字== = 局部強調',
    renderAll: '渲染全部',
    rendering: '渲染中…',
    renderError: '渲染失敗',
    slideCount: (n: number) => `${n} 張投影片`,
    templatePreview: '模板預覽',
  },
  en: {
    title: 'Template Overlay',
    subtitle: 'Upload blank template → paste text → generate all post images',
    back: 'Back',
    presetLabel: 'Text Position Preset',
    zoneConfig: 'Text Zone Settings',
    titleZone: 'Title Zone',
    contentZone: 'Content Zone',
    yStart: 'Y Start',
    yEnd: 'Y End',
    fontSize: 'Font Size',
    textColor: 'Text Color',
    emphasisColor: 'Emphasis Color',
    watermark: 'Watermark',
    perSlide: 'Per Slide',
    bulkPaste: 'Bulk Paste',
    bulkHint: 'Separate slides with ===, title from content with ---\n**bold** = full emphasis, ==text== = partial emphasis',
    renderAll: 'Render All',
    rendering: 'Rendering…',
    renderError: 'Rendering failed',
    slideCount: (n: number) => `${n} slide${n === 1 ? '' : 's'}`,
    templatePreview: 'Template Preview',
  },
}

interface OverlayEditorProps {
  templateImage: string
  onRenderComplete: (images: string[]) => void
  onBack: () => void
}

function ZoneFields({
  label,
  zone,
  onChange,
  copy,
}: {
  label: string
  zone: TextZoneConfig
  onChange: (z: TextZoneConfig) => void
  copy: typeof OVERLAY_COPY['en']
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-[var(--text-secondary)]">{label}</h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="space-y-1">
          <span className="text-[11px] text-[var(--text-tertiary)]">{copy.yStart}</span>
          <input type="number" value={zone.y_start} onChange={(e) => onChange({ ...zone, y_start: +e.target.value })}
            className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-sunken)] px-2 text-xs text-[var(--text-primary)] outline-none" />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-[var(--text-tertiary)]">{copy.yEnd}</span>
          <input type="number" value={zone.y_end} onChange={(e) => onChange({ ...zone, y_end: +e.target.value })}
            className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-sunken)] px-2 text-xs text-[var(--text-primary)] outline-none" />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-[var(--text-tertiary)]">{copy.fontSize}</span>
          <input type="number" value={zone.font_size ?? 32} onChange={(e) => onChange({ ...zone, font_size: +e.target.value })}
            className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-sunken)] px-2 text-xs text-[var(--text-primary)] outline-none" />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] text-[var(--text-tertiary)]">{copy.textColor}</span>
          <input type="text" value={zone.color ?? '#FFFFFF'} onChange={(e) => onChange({ ...zone, color: e.target.value })}
            className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-sunken)] px-2 text-xs text-[var(--text-primary)] outline-none" />
        </label>
      </div>
      <label className="inline-flex items-center gap-2">
        <span className="text-[11px] text-[var(--text-tertiary)]">{copy.emphasisColor}</span>
        <input type="text" value={zone.emphasis_color ?? '#FFD700'} onChange={(e) => onChange({ ...zone, emphasis_color: e.target.value })}
          className="h-8 w-28 rounded-md border border-[var(--border)] bg-[var(--bg-sunken)] px-2 text-xs text-[var(--text-primary)] outline-none" />
      </label>
    </div>
  )
}

export function OverlayEditor({ templateImage, onRenderComplete, onBack }: OverlayEditorProps) {
  const { language } = useLanguage()
  const copy = OVERLAY_COPY[language]

  const [bulkText, setBulkText] = useState(() => SAMPLE_CONTENT[language])
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('hogan-green')
  const [titleZone, setTitleZone] = useState<TextZoneConfig>({ ...ZONE_PRESETS['hogan-green'].titleZone })
  const [contentZone, setContentZone] = useState<TextZoneConfig>({ ...ZONE_PRESETS['hogan-green'].contentZone })
  const [watermark, setWatermark] = useState<string>(ZONE_PRESETS['hogan-green'].watermark)
  const [watermarkX, setWatermarkX] = useState<number>(ZONE_PRESETS['hogan-green'].watermarkX)
  const [watermarkY, setWatermarkY] = useState<number>(ZONE_PRESETS['hogan-green'].watermarkY)
  const [watermarkFontSize, setWatermarkFontSize] = useState<number>(ZONE_PRESETS['hogan-green'].watermarkFontSize)
  const [isRendering, setIsRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<'bulk' | 'per-slide'>('bulk')
  const [zoneConfigExpanded, setZoneConfigExpanded] = useState(false)
  const prevLanguageRef = useRef(language)

  // Update sample content when user switches language, but only if they haven't
  // manually edited the text (i.e., it still matches the previous language's sample)
  useEffect(() => {
    if (prevLanguageRef.current !== language) {
      const previousSample = SAMPLE_CONTENT[prevLanguageRef.current]
      if (bulkText === previousSample) {
        setBulkText(SAMPLE_CONTENT[language])
      }
      prevLanguageRef.current = language
    }
  }, [language, bulkText])

  const parsedSlides = parseOverlayInput(bulkText)
  const slideCount = parsedSlides.length

  function applyPreset(key: PresetKey) {
    setSelectedPreset(key)
    if (key !== 'custom') {
      const preset = ZONE_PRESETS[key]
      setTitleZone({ ...preset.titleZone })
      setContentZone({ ...preset.contentZone })
      setWatermark(preset.watermark)
      setWatermarkX(preset.watermarkX)
      setWatermarkY(preset.watermarkY)
      setWatermarkFontSize(preset.watermarkFontSize)
    }
  }

  function handlePerSlideChange(index: number, field: 'title' | 'body', value: string) {
    const slides = parseOverlayInput(bulkText)
    if (!slides[index]) return
    if (field === 'title') {
      slides[index] = { ...slides[index], title: value }
    } else {
      const lines = value.split('\n').filter(Boolean).map((raw: string) => {
        const fullMatch = raw.match(/^\*\*(.+)\*\*$/)
        if (fullMatch) return { text: fullMatch[1], emphasis: true as const }
        const partialMatch = raw.match(/==(.+?)==/)
        if (partialMatch) {
          return { text: raw.replace(/==(.+?)==/g, '$1'), partial_emphasis: partialMatch[1] }
        }
        return { text: raw }
      })
      slides[index] = { ...slides[index], lines }
    }
    setBulkText(serializeOverlaySlides(slides))
  }

  async function handleRenderAll() {
    const slides = parseOverlayInput(bulkText)
    if (slides.length === 0) return
    const hasContent = slides.every((s) => s.lines.length > 0)
    if (!hasContent) return

    setIsRendering(true)
    setRenderError(null)

    try {
      const images = await renderOverlay(templateImage, slides, titleZone, contentZone, {
        watermark,
        watermarkX,
        watermarkY,
        watermarkFontSize,
      })
      onRenderComplete(images)
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : copy.renderError)
    } finally {
      setIsRendering(false)
    }
  }

  const presetDisplayName = selectedPreset === 'custom'
    ? 'Custom'
    : language === 'zh-TW'
      ? ZONE_PRESETS[selectedPreset].nameZh
      : ZONE_PRESETS[selectedPreset].name

  // Compute zone overlay positions as percentages (assuming 1080×1080 template)
  const titleOverlay = {
    top: `${(titleZone.y_start / 1080) * 100}%`,
    height: `${((titleZone.y_end - titleZone.y_start) / 1080) * 100}%`,
    left: `${((titleZone.x_left ?? 70) / 1080) * 100}%`,
    right: `${((titleZone.x_right ?? 70) / 1080) * 100}%`,
  }
  const contentOverlay = {
    top: `${(contentZone.y_start / 1080) * 100}%`,
    height: `${((contentZone.y_end - contentZone.y_start) / 1080) * 100}%`,
    left: `${((contentZone.x_left ?? 90) / 1080) * 100}%`,
    right: `${((contentZone.x_right ?? 90) / 1080) * 100}%`,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          {copy.back}
        </button>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{copy.title}</h2>
          <p className="text-sm text-[var(--text-tertiary)]">{copy.subtitle}</p>
        </div>
      </div>

      {/* Grid: template preview + editor */}
      <div className="grid gap-6 lg:grid-cols-[0.4fr_0.6fr]">
        {/* Left: template preview */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">{copy.templatePreview}</h3>
          <div className="relative inline-block max-w-[400px]">
            <img
              src={templateImage}
              alt="Template"
              className="w-full rounded-lg"
            />
            {/* Title zone overlay */}
            <div
              className="pointer-events-none absolute rounded"
              style={{
                top: titleOverlay.top,
                height: titleOverlay.height,
                left: titleOverlay.left,
                right: titleOverlay.right,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                border: '1px dashed rgba(59, 130, 246, 0.5)',
              }}
            />
            {/* Content zone overlay */}
            <div
              className="pointer-events-none absolute rounded"
              style={{
                top: contentOverlay.top,
                height: contentOverlay.height,
                left: contentOverlay.left,
                right: contentOverlay.right,
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                border: '1px dashed rgba(34, 197, 94, 0.5)',
              }}
            />
          </div>
        </div>

        {/* Right: editor */}
        <div className="space-y-5">
          {/* Preset selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-secondary)]">{copy.presetLabel}</label>
            <select
              value={selectedPreset}
              onChange={(e) => applyPreset(e.target.value as PresetKey)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm text-[var(--text-primary)] outline-none"
            >
              <option value="hogan-green">{language === 'zh-TW' ? ZONE_PRESETS['hogan-green'].nameZh : ZONE_PRESETS['hogan-green'].name}</option>
              <option value="center-full">{language === 'zh-TW' ? ZONE_PRESETS['center-full'].nameZh : ZONE_PRESETS['center-full'].name}</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Zone config (collapsible) */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
            <button
              type="button"
              onClick={() => setZoneConfigExpanded(!zoneConfigExpanded)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              <span>{copy.zoneConfig} — {presetDisplayName}</span>
              <span className={`transition-transform ${zoneConfigExpanded ? 'rotate-180' : ''}`}>&#9662;</span>
            </button>
            {zoneConfigExpanded && (
              <div className="space-y-4 border-t border-[var(--border)] px-4 py-4">
                <ZoneFields label={copy.titleZone} zone={titleZone} onChange={(z) => { setTitleZone(z); setSelectedPreset('custom') }} copy={copy} />
                <ZoneFields label={copy.contentZone} zone={contentZone} onChange={(z) => { setContentZone(z); setSelectedPreset('custom') }} copy={copy} />
                <label className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-tertiary)]">{copy.watermark}</span>
                  <input
                    type="text"
                    value={watermark}
                    onChange={(e) => { setWatermark(e.target.value); setSelectedPreset('custom') }}
                    className="h-8 w-40 rounded-md border border-[var(--border)] bg-[var(--bg-sunken)] px-2 text-xs text-[var(--text-primary)] outline-none"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Edit mode tabs */}
          <div className="flex gap-1 rounded-full bg-[var(--bg-sunken)] p-1">
            <button
              type="button"
              onClick={() => setEditMode('bulk')}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                editMode === 'bulk'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {copy.bulkPaste}
            </button>
            <button
              type="button"
              onClick={() => setEditMode('per-slide')}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                editMode === 'per-slide'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {copy.perSlide}
            </button>
          </div>

          {/* Content editor */}
          {editMode === 'bulk' ? (
            <div className="space-y-2">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="min-h-[400px] w-full rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] p-4 text-sm leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
              />
              <p className="whitespace-pre-line text-xs text-[var(--text-tertiary)]">{copy.bulkHint}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {parsedSlides.map((slide, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                  <div className="text-xs font-medium text-[var(--text-tertiary)]">
                    {language === 'zh-TW' ? `第 ${i + 1} 張` : `Slide ${i + 1}`}
                  </div>
                  <input
                    type="text"
                    value={slide.title ?? ''}
                    onChange={(e) => handlePerSlideChange(i, 'title', e.target.value)}
                    placeholder={copy.titleZone}
                    className="h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg-sunken)] px-3 text-sm font-semibold text-[var(--text-primary)] outline-none"
                  />
                  <textarea
                    value={slide.lines.map((l) => {
                      if (l.emphasis) return `**${l.text}**`
                      if (l.partial_emphasis) return l.text.replace(l.partial_emphasis, `==${l.partial_emphasis}==`)
                      return l.text
                    }).join('\n')}
                    onChange={(e) => handlePerSlideChange(i, 'body', e.target.value)}
                    rows={Math.max(3, slide.lines.length + 1)}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-sunken)] p-3 text-sm leading-relaxed text-[var(--text-primary)] outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Slide count + render button */}
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-tertiary)]">{copy.slideCount(slideCount)}</p>
            <button
              type="button"
              onClick={() => void handleRenderAll()}
              disabled={isRendering || slideCount === 0}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[image:var(--gradient-cta)] px-6 text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRendering ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {copy.rendering}
                </>
              ) : (
                copy.renderAll
              )}
            </button>
            {renderError && (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                {copy.renderError}: {renderError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
