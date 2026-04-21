'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DemoAccessGate } from '../../components/DemoAccessGate'
import { FileUpload } from '../../components/FileUpload'
import { GlobalNav } from '../../components/GlobalNav'
import { VisualCarouselRenderer } from '../../components/VisualCarouselRenderer'
import { API_BASE_URL } from '../../lib/api'
import { sendBeaconAnalyticsEvent, trackPlausibleEvent } from '../../lib/analytics'
import type { CarouselThemeId } from '../../lib/carousel-themes'
import { buildDemoHeaders, clearStoredDemoToken, getStoredDemoSource } from '../../lib/demo-access'
import { getDemoSurfaceConfig } from '../../lib/demo-config'
import { fetchDemoClientConfig } from '../../lib/demo-client-config'
import { getDeterministicFallbackResult } from '../../lib/demo-fallbacks'
import { APIError, streamSSE } from '../../lib/sse'
import type { InstagramContent, Scorecard, StyleAnalysis } from '../../lib/instagram-types'
import type { DemoClientConfig } from '../../lib/demo-config'

type PageStatus = 'idle' | 'loading' | 'streaming' | 'completed' | 'error'
type PreviewTab = 'instagram' | 'article'
type SubmitPayload = { topic: string; goal: string }
type ReferenceUploadStatus = 'idle' | 'analyzing' | 'ready' | 'error'

interface ArticlePreview {
  seoTitle: string
  outline: string[]
  firstParagraph: string
}

interface PreviewBundle {
  topic: string
  content: InstagramContent
  article: ArticlePreview
}

const GOAL_OPTIONS = [
  { value: 'engagement', label: '互動' },
  { value: 'authority', label: '專業感' },
  { value: 'conversion', label: '轉換' },
] as const

const PRESET_TOPICS = ['車禍理賠', '租約糾紛', '勞資爭議', '遺產繼承', '新創內容行銷'] as const

const DEFAULT_PREVIEW: PreviewBundle = {
  topic: '車禍理賠流程',
  content: {
    caption:
      '車禍後千萬別急著簽和解書。真正影響理賠結果的，往往不是對方先開多少，而是你有沒有先把證據、醫療資料與時間點整理完整。先報警、拍照、就醫，再把診斷證明、收據與請假紀錄留下來，後面談保險理賠與損害賠償才不會落入被動。如果你想知道自己的案件大概能主張哪些項目，先把這五個步驟看完。',
    hook_options: ['車禍後別急著和解，很多權利是一簽就回不來。'],
    hashtags: ['#法律常識', '#車禍理賠', '#交通事故', '#損害賠償', '#律師說法'],
    carousel_outline: [
      { title: '車禍後別急和解', body: '先確認安全、報警備案，再談後續責任與金額。' },
      { title: '先把證據留完整', body: '現場照片、車損、行車紀錄器、診斷證明都很關鍵。' },
      { title: '理賠與求償分開看', body: '保險理賠不等於完整賠償，醫療與工作損失也要算。' },
      { title: '時效不要拖過', body: '無論是告訴期間或民事求償，時間一過就會更被動。' },
      { title: '需要協助就早一點問', body: '涉及受傷、失能或責任爭議時，先讓律師幫你看方向。' },
    ],
    reel_script:
      '車禍後別急著簽和解。先做三件事：報警、拍照、就醫。再把診斷證明、收據和工作損失整理好，後面談理賠才不會吃虧。',
  },
  article: {
    seoTitle: '車禍理賠怎麼算？完整流程、時效與注意事項一次看懂',
    outline: ['車禍發生後第一時間該做什麼', '保險理賠與民事求償差在哪裡', '醫療費、工作損失與慰撫金如何整理', '什麼情況下應該提早找律師'],
    firstParagraph:
      '車禍理賠最常見的問題，不是有沒有保險，而是資料是否在第一時間整理完整。只要前期證據、醫療文件與時效觀念沒掌握好，後續談判與求償就會被拉進不必要的消耗戰。',
  },
}

const ACCESS_COPY = {
  eyebrow: '客戶 demo 存取',
  title: '這個 demo 需要存取碼或授權連結。',
  body: '如果這是客戶展示環境，請輸入 access code，或直接使用已簽章的連結進入。',
  inputLabel: 'Demo access code',
  inputPlaceholder: '輸入這次 demo 的 access code',
  submitLabel: '解鎖 demo',
  loadingLabel: '驗證中…',
  signedLinkLoaded: '如果你是從 signed link 進入，系統會自動保留這次存取。',
  invalidCode: 'Access code 無效，或這個連結已過期。',
  clearAccess: '清除存取',
}

function createTemplate(topic: string, goal: string) {
  const goalText =
    goal === 'authority'
      ? '建立專業可信度'
      : goal === 'conversion'
        ? '促使讀者私訊、預約或採取下一步'
        : '提高留言、收藏與分享'

  return `請以台灣專業服務品牌的 Instagram 內容風格，為主題「${topic}」生成內容。目標是：${goalText}。請用繁體中文、先講結論，再拆成 5 張適合輪播的重點，語氣專業但好懂，最後補上 5 個適合台灣 Instagram 的 hashtag。`
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？!?])/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function deriveArticlePreview(topic: string, content: InstagramContent): ArticlePreview {
  const outline = [
    `${topic}的核心問題是什麼`,
    ...content.carousel_outline.slice(1, 4).map((slide) => slide.title),
  ].slice(0, 4)

  const firstParagraph =
    splitSentences(content.caption).slice(0, 3).join('') ||
    `如果你正在處理「${topic}」相關問題，先把流程、資料與風險整理清楚，會比急著做決定更重要。`

  return {
    seoTitle: `${topic}怎麼處理？流程、重點與注意事項一次看`,
    outline,
    firstParagraph,
  }
}

function toPreviewBundle(topic: string, content: InstagramContent): PreviewBundle {
  return {
    topic,
    content,
    article: deriveArticlePreview(topic, content),
  }
}

function toFriendlyError(error: unknown): string {
  if (error instanceof APIError) {
    if (error.status === 422) return '請輸入更明確的主題後再試一次。'
    if (error.status === 503) return '系統目前較忙，請稍後再試。'
    return '目前無法完成內容產生，請稍後再試。'
  }

  if (error instanceof Error && error.message.includes('timed out')) {
    return '生成時間過長，請重新嘗試。'
  }

  return '目前無法完成內容產生，請稍後再試。'
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-tertiary)] transition hover:bg-[var(--bg-sunken)]"
    >
      <span aria-hidden="true">📋</span>
      {copied ? '已複製' : label}
    </button>
  )
}

function SectionShell({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function LoadingPreview() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-5 w-20 rounded-full bg-[var(--bg-sunken)]" />
        <div className="rounded-[12px] bg-[var(--bg-sunken)] p-5">
          <div className="h-4 w-2/3 rounded bg-[var(--border)]" />
          <div className="mt-3 h-4 w-full rounded bg-[var(--border)]" />
          <div className="mt-2 h-4 w-5/6 rounded bg-[var(--border)]" />
          <div className="mt-2 h-4 w-4/6 rounded bg-[var(--border)]" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-5 w-24 rounded-full bg-[var(--bg-sunken)]" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="min-h-[180px] rounded-[12px] bg-[var(--bg-sunken)] p-5">
              <div className="h-3 w-10 rounded bg-[var(--border)]" />
              <div className="mt-6 h-6 w-2/3 rounded bg-[var(--border)]" />
              <div className="mt-4 h-4 w-full rounded bg-[var(--border)]" />
              <div className="mt-2 h-4 w-4/5 rounded bg-[var(--border)]" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-5 w-20 rounded-full bg-[var(--bg-sunken)]" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-8 w-24 rounded-full bg-[var(--bg-sunken)]" />
          ))}
        </div>
      </div>
    </div>
  )
}

function InstagramPreview({ bundle, exportDisabled = false }: { bundle: PreviewBundle; exportDisabled?: boolean }) {
  const [carouselTheme, setCarouselTheme] = useState<CarouselThemeId>('professional')
  const firstSentence = splitSentences(bundle.content.caption)[0] ?? bundle.content.caption
  const remainingCaption = bundle.content.caption.replace(firstSentence, '').trim()
  const allSlidesText = bundle.content.carousel_outline
    .map((slide, index) => `${index + 1}/5\n${slide.title}\n${slide.body}`)
    .join('\n\n')

  return (
    <div className="space-y-8">
      <SectionShell
        title="📝 Caption"
        action={<CopyButton label="複製 caption" value={bundle.content.caption} />}
      >
        <div className="rounded-[8px] bg-[var(--bg-sunken)] p-4 text-[15px] leading-[1.7] text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">{firstSentence}</p>
          {remainingCaption ? <p className="mt-3 whitespace-pre-wrap">{remainingCaption}</p> : null}
        </div>
      </SectionShell>

      <SectionShell
        title="📱 Carousel（1-5）"
        action={<CopyButton label="複製全部卡片" value={allSlidesText} />}
      >
        <VisualCarouselRenderer
          slides={bundle.content.carousel_outline}
          selectedTheme={carouselTheme}
          onThemeChange={setCarouselTheme}
          topicSlug={bundle.topic}
          exportDisabled={exportDisabled}
        />
      </SectionShell>

      <SectionShell
        title="# Hashtags"
        action={<CopyButton label="複製 hashtags" value={bundle.content.hashtags.join(' ')} />}
      >
        <div className="flex flex-wrap gap-2">
          {bundle.content.hashtags.map((tag) => (
            <span
              key={tag}
              className="inline-flex rounded-full bg-[var(--bg-sunken)] px-3 py-1 text-sm font-medium text-[var(--text-secondary)]"
            >
              {tag}
            </span>
          ))}
        </div>
      </SectionShell>

      <SectionShell
        title="🎬 Reel Script"
        action={<CopyButton label="複製腳本" value={bundle.content.reel_script} />}
      >
        <div className="rounded-[8px] bg-[var(--bg-sunken)] p-4 text-[15px] leading-[1.7] text-[var(--text-secondary)]">
          {bundle.content.reel_script}
        </div>
      </SectionShell>
    </div>
  )
}

function ArticlePreviewPanel({ bundle }: { bundle: PreviewBundle }) {
  const articleCopy = [bundle.article.seoTitle, ...bundle.article.outline.map((item) => `H2｜${item}`), bundle.article.firstParagraph].join('\n\n')

  return (
    <div className="space-y-6">
      <SectionShell
        title="文章"
        action={<CopyButton label="複製全部" value={articleCopy} />}
      >
        <div className="space-y-5 rounded-[var(--card-radius)] bg-[var(--bg-sunken)] p-5">
          <div>
            <div className="text-xs font-medium tracking-[0.08em] text-[var(--text-tertiary)]">SEO 標題</div>
            <h3 className="mt-2 text-[20px] font-bold leading-snug text-[var(--text-primary)]">{bundle.article.seoTitle}</h3>
          </div>

          <div>
            <div className="text-xs font-medium tracking-[0.08em] text-[var(--text-tertiary)]">文章大綱</div>
            <div className="mt-3 space-y-3">
              {bundle.article.outline.map((item, index) => (
                <div key={`${item}-${index}`} className="rounded-[10px] bg-[var(--bg-elevated)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                  H2 {index + 1}｜{item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium tracking-[0.08em] text-[var(--text-tertiary)]">首段</div>
            <p className="mt-3 text-[15px] leading-7 text-[var(--text-secondary)]">{bundle.article.firstParagraph}</p>
          </div>
        </div>
      </SectionShell>
    </div>
  )
}

export default function InstagramPage() {
  const demoConfig = useMemo(() => getDemoSurfaceConfig('instagram'), [])
  const [clientConfig, setClientConfig] = useState<DemoClientConfig | null>(null)
  const [topic, setTopic] = useState('')
  const [goal, setGoal] = useState<string>('engagement')
  const [status, setStatus] = useState<PageStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [previewTab, setPreviewTab] = useState<PreviewTab>('instagram')
  const [streamedContent, setStreamedContent] = useState<InstagramContent | null>(null)
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysis | null>(null)
  const [scorecard, setScorecard] = useState<Scorecard | null>(null)
  const [previewBundle, setPreviewBundle] = useState<PreviewBundle>(DEFAULT_PREVIEW)
  const [lastSubmittedTopic, setLastSubmittedTopic] = useState(DEFAULT_PREVIEW.topic)
  const [demoToken, setDemoToken] = useState<string | null>(null)
  const [source, setSource] = useState(() => getStoredDemoSource(demoConfig.apiSurface))
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null)
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null)
  const [referenceImageDescription, setReferenceImageDescription] = useState('')
  const [referenceUploadStatus, setReferenceUploadStatus] = useState<ReferenceUploadStatus>('idle')
  const [referenceUploadError, setReferenceUploadError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const latestTopicRef = useRef(topic)
  const referencePreviewUrlRef = useRef<string | null>(null)

  const fallbackResult = useMemo(
    () => getDeterministicFallbackResult(clientConfig?.deterministic_fallback?.fallback_key ?? null, 'zh-TW'),
    [clientConfig],
  )

  useEffect(() => {
    let cancelled = false
    void fetchDemoClientConfig(demoConfig.apiSurface, demoConfig.demoKey)
      .then((config) => {
        if (!cancelled) setClientConfig(config)
      })
      .catch(() => {
        if (!cancelled) setClientConfig(null)
      })
    return () => {
      cancelled = true
    }
  }, [demoConfig.apiSurface, demoConfig.demoKey])

  useEffect(() => {
    latestTopicRef.current = topic
  }, [topic])

  useEffect(() => {
    return () => {
      if (referencePreviewUrlRef.current) {
        URL.revokeObjectURL(referencePreviewUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setSource(getStoredDemoSource(demoConfig.apiSurface))
  }, [demoConfig.apiSurface, demoToken])

  useEffect(() => {
    function handlePageHide() {
      if (status !== 'loading' && status !== 'streaming') return
      trackPlausibleEvent('demo_abandoned', { surface: demoConfig.apiSurface, source, locale: 'zh-TW' })
      sendBeaconAnalyticsEvent({
        eventName: 'demo_abandoned',
        route: '/instagram',
        surface: demoConfig.apiSurface,
        source,
        locale: 'zh-TW',
        metadata: {
          reason: 'pagehide',
          topic_length: latestTopicRef.current.trim().length,
        },
      })
    }

    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [demoConfig.apiSurface, source, status])

  const needsAccess = demoConfig.accessMode === 'gated' && !demoToken
  const isWorking = status === 'loading' || status === 'streaming'
  const isReferenceAnalyzing = referenceUploadStatus === 'analyzing'
  const displayBundle = useMemo(() => {
    if (streamedContent) {
      return toPreviewBundle(lastSubmittedTopic, streamedContent)
    }
    return previewBundle
  }, [lastSubmittedTopic, previewBundle, streamedContent])

  function clearReferenceImage() {
    if (referencePreviewUrlRef.current) {
      URL.revokeObjectURL(referencePreviewUrlRef.current)
      referencePreviewUrlRef.current = null
    }
    setReferencePreviewUrl(null)
    setReferenceFileName(null)
    setReferenceImageDescription('')
    setReferenceUploadStatus('idle')
    setReferenceUploadError(null)
  }

  async function handleReferenceFileSelect(file: File) {
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setReferenceUploadStatus('error')
      setReferenceUploadError('請上傳 PNG 或 JPG 圖片。')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setReferenceUploadStatus('error')
      setReferenceUploadError('圖片大小需小於 5MB。')
      return
    }

    if (referencePreviewUrlRef.current) {
      URL.revokeObjectURL(referencePreviewUrlRef.current)
    }

    const previewUrl = URL.createObjectURL(file)
    referencePreviewUrlRef.current = previewUrl
    setReferencePreviewUrl(previewUrl)
    setReferenceFileName(file.name)
    setReferenceImageDescription('')
    setReferenceUploadStatus('analyzing')
    setReferenceUploadError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_BASE_URL}/api/instagram/upload-reference`, {
        method: 'POST',
        headers: buildDemoHeaders(demoConfig.apiSurface, demoToken),
        body: formData,
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) {
          clearStoredDemoToken(demoConfig.apiSurface)
          setDemoToken(null)
        }
        throw new Error(typeof payload?.detail === 'string' ? payload.detail : '圖片風格分析失敗，請換一張圖片再試。')
      }

      const description = typeof payload?.description === 'string' ? payload.description : ''
      if (!description.trim()) {
        throw new Error('圖片風格分析沒有回傳可用描述。')
      }

      setReferenceImageDescription(description)
      setReferenceUploadStatus('ready')
    } catch (err) {
      setReferenceImageDescription('')
      setReferenceUploadStatus('error')
      setReferenceUploadError(err instanceof Error ? err.message : '圖片風格分析失敗，請稍後再試。')
    }
  }

  const handleSubmit = useCallback(
    async (payload: SubmitPayload) => {
      const trimmedTopic = payload.topic.trim()
      if (!trimmedTopic) return

      setStatus('loading')
      setError(null)
      setPreviewTab('instagram')
      setStreamedContent(null)
      setStyleAnalysis(null)
      setScorecard(null)
      setLastSubmittedTopic(trimmedTopic)
      trackPlausibleEvent('demo_started', { surface: demoConfig.apiSurface, source, locale: 'zh-TW' })

      const abort = new AbortController()
      abortRef.current = abort
      let completed = false
      let failed = false

      try {
        for await (const chunk of streamSSE(
          `${API_BASE_URL}/api/instagram/generate`,
          {
            topic: trimmedTopic,
            template_text: createTemplate(trimmedTopic, payload.goal),
            goal: payload.goal,
            locale: 'zh-TW',
            reference_image_description: referenceImageDescription,
          },
          {
            signal: abort.signal,
            timeoutMs: 45_000,
            headers: buildDemoHeaders(demoConfig.apiSurface, demoToken),
          },
        )) {
          if (abort.signal.aborted) break
          setStatus('streaming')

          if (chunk.event === 'style_ready') {
            setStyleAnalysis(chunk.data as StyleAnalysis)
            continue
          }

          if (chunk.event === 'content_ready') {
            const nextContent = chunk.data as InstagramContent
            setStreamedContent(nextContent)
            setPreviewBundle(toPreviewBundle(trimmedTopic, nextContent))
            continue
          }

          if (chunk.event === 'score_ready') {
            setScorecard(chunk.data as Scorecard)
            continue
          }

          if (chunk.event === 'pipeline_completed') {
            const nextContent = chunk.data?.content as InstagramContent | undefined
            if (nextContent) {
              setStreamedContent(nextContent)
              setPreviewBundle(toPreviewBundle(trimmedTopic, nextContent))
            }
            setStatus('completed')
            completed = true
            trackPlausibleEvent('demo_completed', { surface: demoConfig.apiSurface, source, locale: 'zh-TW' })
            break
          }

          if (chunk.event === 'error') {
            throw new Error(typeof chunk.data?.message === 'string' ? chunk.data.message : '內容產生失敗。')
          }
        }

        if (!abort.signal.aborted && !completed) {
          if (streamedContent) {
            setStatus('completed')
          } else if (clientConfig?.deterministic_fallback?.mode === 'auto' && fallbackResult) {
            setPreviewBundle(toPreviewBundle(trimmedTopic, fallbackResult.content))
            setStreamedContent(fallbackResult.content)
            setStatus('completed')
          } else {
            setStatus('error')
            setError('目前無法取得可展示的內容，請稍後再試。')
            failed = true
          }
        }
      } catch (err) {
        if (!abort.signal.aborted && (!(err instanceof DOMException) || err.name !== 'AbortError')) {
          if (err instanceof APIError && err.status === 401) {
            clearStoredDemoToken(demoConfig.apiSurface)
            setDemoToken(null)
            setStatus('error')
            setError('這個 demo 需要有效的存取權限，請重新輸入 access code。')
            return
          }

          if (clientConfig?.deterministic_fallback?.mode === 'auto' && fallbackResult) {
            setPreviewBundle(toPreviewBundle(trimmedTopic, fallbackResult.content))
            setStreamedContent(fallbackResult.content)
            setStatus('completed')
            setError(null)
          } else {
            setStatus('error')
            setError(toFriendlyError(err))
            failed = true
          }
        }
      }

      if (failed) {
        trackPlausibleEvent('demo_failed', { surface: demoConfig.apiSurface, source, locale: 'zh-TW' })
      }
    },
    [clientConfig?.deterministic_fallback?.mode, demoConfig.apiSurface, demoToken, fallbackResult, referenceImageDescription, source, streamedContent],
  )

  function handleGenerate() {
    void handleSubmit({ topic, goal })
  }

  function handleCancel() {
    abortRef.current?.abort()
    setStatus('idle')
    setError(null)
    trackPlausibleEvent('demo_abandoned', { surface: demoConfig.apiSurface, source, locale: 'zh-TW' })
    sendBeaconAnalyticsEvent({
      eventName: 'demo_abandoned',
      route: '/instagram',
      surface: demoConfig.apiSurface,
      source,
      locale: 'zh-TW',
      metadata: {
        reason: 'manual_stop',
        topic_length: latestTopicRef.current.trim().length,
      },
    })
  }

  return (
    <main className="min-h-screen bg-transparent text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 pb-16 pt-8 sm:px-6 lg:px-8">
        <GlobalNav />

        {needsAccess ? (
          <section className="pt-10">
            <DemoAccessGate
              surface={demoConfig.apiSurface}
              copy={ACCESS_COPY}
              onAccessReady={setDemoToken}
            />
          </section>
        ) : null}

        {!needsAccess ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[minmax(0,0.58fr)_minmax(0,0.42fr)]">
              <div className="space-y-6 rounded-[20px] bg-transparent pr-0 lg:pr-6">
                <div className="space-y-4">
                  <label htmlFor="instagram-topic" className="block text-sm font-medium text-[var(--text-secondary)]">
                    主題
                  </label>
                  <input
                    id="instagram-topic"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="輸入主題，例如：車禍理賠流程"
                    className="h-14 w-full rounded-[14px] border border-[var(--border)] bg-[var(--bg-sunken)] px-5 text-base text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-secondary)]">參考圖片風格</p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      選填。上傳一張參考圖，系統會分析版面、色彩與文字風格。
                    </p>
                  </div>
                  <FileUpload
                    previewUrl={referencePreviewUrl}
                    fileName={referenceFileName}
                    isAnalyzing={isReferenceAnalyzing}
                    error={referenceUploadError}
                    onFileSelect={(file) => void handleReferenceFileSelect(file)}
                    onRemove={clearReferenceImage}
                  />
                  {referenceUploadStatus === 'ready' ? (
                    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-xs leading-6 text-[var(--text-secondary)]">
                      已完成風格分析，下一次產生內容會套用這張參考圖的視覺方向。
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  {PRESET_TOPICS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopic(preset)}
                      className="rounded-full border border-transparent bg-[var(--bg-sunken)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-bold)]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <label htmlFor="instagram-goal" className="block text-sm font-medium text-[var(--text-secondary)]">
                    內容目標
                  </label>
                  <select
                    id="instagram-goal"
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    className="h-12 w-full rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-bold)]"
                  >
                    {GOAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4 pt-2">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isWorking || isReferenceAnalyzing || !topic.trim()}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--bg-accent)] px-6 text-[15px] font-semibold text-[var(--text-on-accent)] transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isWorking ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      </>
                    ) : (
                      '產生內容'
                    )}
                  </button>

                  {isWorking ? (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-5 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                    >
                      取消本次生成
                    </button>
                  ) : null}

                  {error ? (
                    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {error}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[20px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
                <div className="sticky top-[72px] z-10 mb-6 flex items-end justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] pb-4">
                  <div>
                    <div className="text-xs font-medium tracking-[0.08em] text-[var(--text-tertiary)]">目前主題</div>
                    <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--text-primary)]">{displayBundle.topic}</h2>
                  </div>
                  <div className="inline-flex gap-5">
                    {([
                      ['instagram', 'Instagram'],
                      ['article', '文章'],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPreviewTab(key)}
                        className={`pb-2 text-sm font-medium transition ${
                          previewTab === key ? 'border-b-2 border-[var(--text-primary)] text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {isWorking && !streamedContent ? (
                  <LoadingPreview />
                ) : previewTab === 'instagram' ? (
                  <InstagramPreview bundle={displayBundle} exportDisabled={isWorking} />
                ) : (
                  <ArticlePreviewPanel bundle={displayBundle} />
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}
