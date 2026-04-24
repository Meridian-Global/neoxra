'use client'

import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { useLanguage } from './LanguageProvider'

const COPY = {
  'zh-TW': {
    downloadZip: '下載全部 (ZIP)',
    downloadCurrent: '下載當前',
    format: '1080 × 1080 PNG',
    slides: (n: number) => `${n} 張`,
  },
  en: {
    downloadZip: 'Download All (ZIP)',
    downloadCurrent: 'Download Current',
    format: '1080 × 1080 PNG',
    slides: (n: number) => `${n} slide${n === 1 ? '' : 's'}`,
  },
}

function slugifyTopic(topicSlug: string) {
  const slug = topicSlug
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'instagram'
}

async function downloadAllAsZip(images: string[], topicSlug: string) {
  const zip = new JSZip()
  for (const [i, image] of images.entries()) {
    const name = `slide-${String(i + 1).padStart(2, '0')}.png`
    if (image.startsWith('data:')) {
      const base64 = image.replace(/^data:image\/png;base64,/, '')
      zip.file(name, base64, { base64: true })
    } else {
      const response = await fetch(image)
      const blob = await response.blob()
      zip.file(name, blob)
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `${slugifyTopic(topicSlug)}-carousel.zip`)
}

function downloadSingle(dataUrl: string, index: number, topicSlug: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `${slugifyTopic(topicSlug)}-slide-${String(index + 1).padStart(2, '0')}.png`
  link.click()
}

interface DownloadPanelProps {
  images: string[]
  topicSlug: string
  currentIndex: number
  disabled: boolean
}

export function DownloadPanel({ images, topicSlug, currentIndex, disabled }: DownloadPanelProps) {
  const { language } = useLanguage()
  const copy = COPY[language]

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-[var(--text-tertiary)]">
        {copy.format} · {copy.slides(images.length)}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void downloadAllAsZip(images, topicSlug)}
          disabled={disabled || images.length === 0}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[image:var(--gradient-cta)] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copy.downloadZip}
        </button>
        <button
          type="button"
          onClick={() => {
            const img = images[currentIndex]
            if (img) downloadSingle(img, currentIndex, topicSlug)
          }}
          disabled={disabled || !images[currentIndex]}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--bg-elevated)] px-5 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:bg-[var(--bg-sunken)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copy.downloadCurrent}
        </button>
      </div>
    </div>
  )
}
