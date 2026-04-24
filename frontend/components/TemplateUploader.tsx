'use client'

import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useLanguage } from './LanguageProvider'
import { TemplateCustomizer } from './TemplateCustomizer'
import { parseTemplateImage } from '../lib/template-api'
import { createDefaultTemplateSpec, type TemplateSpec } from '../lib/template-types'

type UploaderStep = 'upload' | 'analyzing' | 'preview' | 'customize' | 'error'

const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp'
const MAX_FILE_SIZE = 5 * 1024 * 1024

const COPY = {
  'zh-TW': {
    dropzone: '拖放模板圖片到此處',
    or: '或',
    browse: '選擇檔案',
    sizeLimit: '最大 5MB，支援 PNG、JPG、WEBP',
    analyze: '分析模板',
    analyzing: 'AI 正在分析模板設計…',
    extracted: '模板分析完成',
    useThis: '使用此模板',
    customize: '自訂調整',
    tryAgain: '重新嘗試',
    cancel: '取消',
    confidence: '分析信心度',
    colors: '色彩配置',
    errorType: '請上傳 PNG、JPG 或 WEBP 圖片。',
    errorSize: '圖片大小需小於 5MB。',
    errorGeneric: '模板分析失敗，請稍後再試。',
  },
  en: {
    dropzone: 'Drop template image here',
    or: 'or',
    browse: 'Browse files',
    sizeLimit: 'Max 5MB — PNG, JPG, WEBP',
    analyze: 'Analyze Template',
    analyzing: 'AI is analyzing the template design…',
    extracted: 'Template analysis complete',
    useThis: 'Use This Template',
    customize: 'Customize',
    tryAgain: 'Try Again',
    cancel: 'Cancel',
    confidence: 'Analysis Confidence',
    colors: 'Color Palette',
    errorType: 'Please upload a PNG, JPG, or WEBP image.',
    errorSize: 'Image must be under 5MB.',
    errorGeneric: 'Template analysis failed. Please try again.',
  },
}

interface TemplateUploaderProps {
  onTemplateExtracted: (templateSpec: TemplateSpec) => void
  onCancel: () => void
}

export function TemplateUploader({ onTemplateExtracted, onCancel }: TemplateUploaderProps) {
  const { language } = useLanguage()
  const copy = COPY[language]
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [step, setStep] = useState<UploaderStep>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [extractedSpec, setExtractedSpec] = useState<TemplateSpec | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [customizingSpec, setCustomizingSpec] = useState<TemplateSpec | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  function cleanup() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
  }

  function handleFileSelected(selectedFile: File) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!validTypes.includes(selectedFile.type)) {
      setError(copy.errorType)
      setStep('error')
      return
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(copy.errorSize)
      setStep('error')
      return
    }

    cleanup()
    const url = URL.createObjectURL(selectedFile)
    previewUrlRef.current = url
    setFile(selectedFile)
    setPreviewUrl(url)
    setError(null)
    setStep('upload')
  }

  function handleFiles(files: FileList | null) {
    const f = files?.[0]
    if (f) handleFileSelected(f)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleAnalyze() {
    if (!file) return
    setStep('analyzing')
    setError(null)

    try {
      const result = await parseTemplateImage(file)
      setExtractedSpec(result.templateSpec)
      setConfidence(result.parsingConfidence)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errorGeneric)
      setStep('error')
    }
  }

  function handleReset() {
    cleanup()
    setFile(null)
    setPreviewUrl(null)
    setExtractedSpec(null)
    setCustomizingSpec(null)
    setError(null)
    setStep('upload')
  }

  // Upload step
  if (step === 'upload') {
    return (
      <div className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }}
          className={`flex flex-col items-center gap-3 rounded-[16px] border border-dashed p-8 transition ${
            isDragging
              ? 'border-[var(--accent)] bg-[var(--bg-elevated)]'
              : 'border-[var(--border)] bg-[var(--bg-sunken)] hover:border-[var(--border-bold)]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {previewUrl ? (
            <img src={previewUrl} alt="" className="h-32 w-32 rounded-[12px] object-cover shadow-[var(--shadow-sm)]" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-tertiary)]">
              <Upload className="h-5 w-5" />
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.dropzone}</p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {copy.or}{' '}
              <span className="font-medium text-[var(--accent)]">{copy.browse}</span>
            </p>
            <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{copy.sizeLimit}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!file}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] bg-[image:var(--gradient-cta)] text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copy.analyze}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--bg-elevated)] px-5 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            {copy.cancel}
          </button>
        </div>
      </div>
    )
  }

  // Analyzing step
  if (step === 'analyzing') {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[16px] bg-[var(--bg-sunken)] py-12">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-bold)] border-t-[var(--accent)]" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">{copy.analyzing}</p>
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-20 w-20 rounded-[12px] object-cover opacity-60" />
        ) : null}
      </div>
    )
  }

  // Error step
  if (step === 'error') {
    return (
      <div className="space-y-4">
        <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-[8px] bg-[image:var(--gradient-cta)] text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            {copy.tryAgain}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--bg-elevated)] px-5 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            {copy.cancel}
          </button>
        </div>
      </div>
    )
  }

  // Customize step
  if (step === 'customize' && customizingSpec) {
    return (
      <TemplateCustomizer
        templateSpec={customizingSpec}
        onChange={setCustomizingSpec}
        onConfirm={() => {
          onTemplateExtracted(customizingSpec)
          cleanup()
        }}
        onCancel={() => {
          setCustomizingSpec(null)
          setStep('preview')
        }}
      />
    )
  }

  // Preview step
  if (step === 'preview' && extractedSpec) {
    const colors = extractedSpec.colors
    const colorEntries = [
      { label: 'BG', value: colors.background },
      { label: 'Title', value: colors.textPrimary },
      { label: 'Body', value: colors.textSecondary },
      { label: 'Accent', value: colors.accent },
      { label: 'Badge', value: colors.badgeBg },
    ]

    return (
      <div className="space-y-4">
        <div className="rounded-[16px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.extracted}</p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">
            {copy.confidence}: {Math.round(confidence * 100)}%
          </p>

          {/* Color palette */}
          <div className="mt-4">
            <p className="text-[10px] font-medium tracking-wide text-[var(--text-tertiary)]">{copy.colors}</p>
            <div className="mt-2 flex items-center gap-3">
              {colorEntries.map((c) => (
                <div key={c.label} className="flex flex-col items-center gap-1">
                  <div
                    className="h-7 w-7 rounded-full border border-[var(--border)] shadow-[var(--shadow-sm)]"
                    style={{ backgroundColor: c.value }}
                  />
                  <span className="text-[9px] text-[var(--text-tertiary)]">{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mini preview */}
          <div className="mx-auto mt-4 w-full max-w-[160px]">
            <div
              className="relative aspect-square w-full overflow-hidden rounded-[10px]"
              style={{ backgroundColor: colors.background }}
            >
              <div
                className="absolute left-2.5 top-2.5 h-4 w-4 rounded-full text-center text-[7px] font-bold leading-4"
                style={{ backgroundColor: colors.badgeBg, color: colors.badgeText }}
              >
                1
              </div>
              <div className="absolute left-3 right-3 top-[36%] space-y-1.5">
                <div className="h-2 w-[70%] rounded-full" style={{ backgroundColor: colors.textPrimary, opacity: 0.85 }} />
                <div className="h-2 w-[50%] rounded-full" style={{ backgroundColor: colors.textPrimary, opacity: 0.85 }} />
              </div>
              <div className="absolute bottom-[24%] left-3 right-3 space-y-1">
                <div className="h-1 w-[85%] rounded-full" style={{ backgroundColor: colors.textSecondary, opacity: 0.5 }} />
                <div className="h-1 w-[65%] rounded-full" style={{ backgroundColor: colors.textSecondary, opacity: 0.5 }} />
              </div>
              <div className="absolute bottom-2.5 left-3 h-0.5 w-7 rounded-full" style={{ backgroundColor: colors.accent }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              onTemplateExtracted(extractedSpec)
              cleanup()
            }}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-[8px] bg-[image:var(--gradient-cta)] text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            {copy.useThis}
          </button>
          <button
            type="button"
            onClick={() => {
              setCustomizingSpec({ ...extractedSpec })
              setStep('customize')
            }}
            className="inline-flex h-10 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--bg-elevated)] px-5 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            {copy.customize}
          </button>
        </div>
      </div>
    )
  }

  return null
}
