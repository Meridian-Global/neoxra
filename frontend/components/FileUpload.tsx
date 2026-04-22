'use client'

import { useRef, useState } from 'react'

interface FileUploadProps {
  previewUrl: string | null
  fileName: string | null
  isAnalyzing?: boolean
  error?: string | null
  copy?: {
    previewAlt: string
    analyzing: string
    ready: string
    remove: string
    uploadTitle: string
    uploadBody: string
  }
  onFileSelect: (file: File) => void
  onRemove: () => void
}

const ACCEPTED_TYPES = 'image/png,image/jpeg'

export function FileUpload({
  previewUrl,
  fileName,
  isAnalyzing = false,
  error = null,
  copy = {
    previewAlt: '參考圖片預覽',
    analyzing: '正在分析圖片風格…',
    ready: '已加入參考圖片風格',
    remove: '移除',
    uploadTitle: '上傳參考圖片',
    uploadBody: '拖曳 PNG / JPG 到這裡，或點擊選擇圖片。最多 5MB。',
  },
  onFileSelect,
  onRemove,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    onFileSelect(file)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          handleFiles(event.dataTransfer.files)
        }}
        className={`rounded-[16px] border border-dashed p-4 transition ${
          isDragging
            ? 'border-[var(--border-bold)] bg-[var(--bg-elevated)]'
            : 'border-[var(--border)] bg-[var(--bg-sunken)] hover:border-[var(--border-bold)]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />

        {previewUrl ? (
          <div className="flex items-center gap-4">
            <img
              src={previewUrl}
              alt={copy.previewAlt}
              className="h-20 w-20 rounded-[12px] object-cover shadow-[var(--shadow-sm)]"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{fileName}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {isAnalyzing ? copy.analyzing : copy.ready}
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onRemove()
              }}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-sunken)]"
            >
              {copy.remove}
            </button>
          </div>
        ) : (
          <div className="py-2 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.uploadTitle}</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {copy.uploadBody}
            </p>
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-[var(--text-secondary)]">{error}</p> : null}
    </div>
  )
}
