'use client'

import { useRef, useState } from 'react'

interface FileUploadProps {
  previewUrl: string | null
  fileName: string | null
  isAnalyzing?: boolean
  error?: string | null
  onFileSelect: (file: File) => void
  onRemove: () => void
}

const ACCEPTED_TYPES = 'image/png,image/jpeg'

export function FileUpload({
  previewUrl,
  fileName,
  isAnalyzing = false,
  error = null,
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
              alt="參考圖片預覽"
              className="h-20 w-20 rounded-[12px] object-cover shadow-[var(--shadow-sm)]"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{fileName}</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {isAnalyzing ? '正在分析圖片風格…' : '已加入參考圖片風格'}
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
              移除
            </button>
          </div>
        ) : (
          <div className="py-2 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">上傳參考圖片</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              拖曳 PNG / JPG 到這裡，或點擊選擇圖片。最多 5MB。
            </p>
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-[var(--text-secondary)]">{error}</p> : null}
    </div>
  )
}
