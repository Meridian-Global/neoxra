'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DemoAccessGate } from '../../components/DemoAccessGate'
import { FileUpload } from '../../components/FileUpload'
import { GlobalNav } from '../../components/GlobalNav'
import { useLanguage } from '../../components/LanguageProvider'
import { ServerRenderedCarousel } from '../../components/ServerRenderedCarousel'
import { TemplateGallery } from '../../components/TemplateGallery'
import { TemplateUploader } from '../../components/TemplateUploader'
import { OverlayEditor } from '../../components/OverlayEditor'
import { VisualCarouselRenderer } from '../../components/VisualCarouselRenderer'
import { API_BASE_URL } from '../../lib/api'
import { Upload } from 'lucide-react'
import { renderCarousel, fetchSampleCarousel } from '../../lib/render-api'
import { fetchTemplates } from '../../lib/template-api'
import { sendBeaconAnalyticsEvent, trackPlausibleEvent } from '../../lib/analytics'
import { createDynamicTheme, type CarouselTheme, type CarouselThemeId } from '../../lib/carousel-themes'
import { buildDemoHeaders, clearStoredDemoToken, getStoredDemoSource } from '../../lib/demo-access'
import { getDemoSurfaceConfig } from '../../lib/demo-config'
import { fetchDemoClientConfig } from '../../lib/demo-client-config'
import { getDeterministicFallbackResult } from '../../lib/demo-fallbacks'
import { APIError, streamSSE } from '../../lib/sse'
import type { InstagramContent, Scorecard, StyleAnalysis, TemplateInfo } from '../../lib/instagram-types'
import type { TemplateSpec } from '../../lib/template-types'
import type { DemoClientConfig } from '../../lib/demo-config'

type PageStatus = 'idle' | 'loading' | 'streaming' | 'completed' | 'error'
type Language = 'en' | 'zh-TW'
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

type InstagramCopy = {
  goalOptions: Array<{ value: string; label: string }>
  presetTopics: string[]
  defaultPreview: PreviewBundle
  access: {
    eyebrow: string
    title: string
    body: string
    inputLabel: string
    inputPlaceholder: string
    submitLabel: string
    loadingLabel: string
    signedLinkLoaded: string
    invalidCode: string
    clearAccess: string
  }
  labels: {
    topic: string
    topicPlaceholder: string
    referenceTitle: string
    referenceBody: string
    referenceReady: string
    goal: string
    generate: string
    cancel: string
    currentTopic: string
    articleTab: string
    articleTitle: string
    seoTitle: string
    outline: string
    intro: string
    copyCaption: string
    copySlides: string
    copyHashtags: string
    copyScript: string
    copyAll: string
    copied: string
    rendering: string
    renderError: string
    chooseTemplate: string
    changeTemplate: string
    reRendering: string
  }
  fileUpload: {
    previewAlt: string
    analyzing: string
    ready: string
    remove: string
    uploadTitle: string
    uploadBody: string
  }
  errors: {
    imageType: string
    imageSize: string
    imageAnalysis: string
    imageEmpty: string
    imageGeneric: string
    invalidTopic: string
    unavailable: string
    generic: string
    timeout: string
    generation: string
    noContent: string
    access: string
  }
  templateGoal: Record<string, string>
  template: (topic: string, goalText: string) => string
  articleCoreQuestion: (topic: string) => string
  articleFallback: (topic: string) => string
  articleSeoTitle: (topic: string) => string
}

const DEFAULT_PREVIEWS: Record<Language, PreviewBundle> = {
  'zh-TW': {
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
  },
  en: {
    topic: 'Car accident compensation process',
    content: {
      caption:
        'After a car accident, do not rush into signing a settlement. The outcome often depends less on the first number offered and more on whether you preserve evidence, medical records, and timing from the start. Report it, take photos, get medical care, and organize receipts before negotiating compensation.',
      hook_options: ['Do not rush into settlement after a car accident.'],
      hashtags: ['#LegalTips', '#CarAccident', '#Compensation', '#InsuranceClaims', '#LawFirm'],
      carousel_outline: [
        { title: 'Do Not Settle Too Fast', body: 'Check safety, report the accident, and preserve the record first.' },
        { title: 'Keep Evidence Complete', body: 'Photos, repairs, dashcam clips, and medical records matter.' },
        { title: 'Claims Are Not Full Recovery', body: 'Insurance coverage may not include every loss you can claim.' },
        { title: 'Watch The Timeline', body: 'Deadlines can affect your options if you wait too long.' },
        { title: 'Ask Early When It Matters', body: 'Injury, disability, or disputed fault deserves early review.' },
      ],
      reel_script:
        'Do not rush into settlement after a car accident. Start with three steps: report it, take photos, and get medical care. Then organize receipts and work-loss records before negotiating.',
    },
    article: {
      seoTitle: 'How Car Accident Compensation Works: Process, Timing, and Key Documents',
      outline: ['What to do right after the accident', 'Insurance claims versus civil compensation', 'How to document medical costs and lost income', 'When to speak with a lawyer early'],
      firstParagraph:
        'Car accident compensation is rarely just about whether insurance pays. The stronger question is whether your evidence, medical records, and timeline are organized early enough to support a fair recovery.',
    },
  },
}

const COPY: Record<Language, InstagramCopy> = {
  'zh-TW': {
    goalOptions: [
      { value: 'engagement', label: '互動' },
      { value: 'authority', label: '專業感' },
      { value: 'conversion', label: '轉換' },
    ],
    presetTopics: ['車禍理賠', '租約糾紛', '勞資爭議', '遺產繼承', '新創內容行銷'],
    defaultPreview: DEFAULT_PREVIEWS['zh-TW'],
    access: {
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
    },
    labels: {
      topic: '主題',
      topicPlaceholder: '輸入主題，例如：車禍理賠流程',
      referenceTitle: '參考圖片風格',
      referenceBody: '選填。上傳一張參考圖，系統會分析版面、色彩與文字風格。',
      referenceReady: '已完成風格分析，下一次產生內容會套用這張參考圖的視覺方向。',
      goal: '內容目標',
      generate: '產生內容',
      cancel: '取消本次生成',
      currentTopic: '目前主題',
      articleTab: '文章',
      articleTitle: '文章',
      seoTitle: 'SEO 標題',
      outline: '文章大綱',
      intro: '首段',
      copyCaption: '複製 caption',
      copySlides: '複製全部卡片',
      copyHashtags: '複製 hashtags',
      copyScript: '複製腳本',
      copyAll: '複製全部',
      copied: '已複製',
      rendering: '正在渲染高畫質圖片…',
      renderError: '圖片渲染失敗，使用預覽版本',
      chooseTemplate: '選擇設計模板',
      changeTemplate: '更換模板',
      reRendering: '正在重新渲染…',
    },
    fileUpload: {
      previewAlt: '參考圖片預覽',
      analyzing: '正在分析圖片風格…',
      ready: '已加入參考圖片風格',
      remove: '移除',
      uploadTitle: '上傳參考圖片',
      uploadBody: '拖曳 PNG / JPG 到這裡，或點擊選擇圖片。最多 5MB。',
    },
    errors: {
      imageType: '請上傳 PNG 或 JPG 圖片。',
      imageSize: '圖片大小需小於 5MB。',
      imageAnalysis: '圖片風格分析失敗，請換一張圖片再試。',
      imageEmpty: '圖片風格分析沒有回傳可用描述。',
      imageGeneric: '圖片風格分析失敗，請稍後再試。',
      invalidTopic: '請輸入更明確的主題後再試一次。',
      unavailable: '系統目前較忙，請稍後再試。',
      generic: '目前無法完成內容產生，請稍後再試。',
      timeout: '生成時間過長，請重新嘗試。',
      generation: '內容產生失敗。',
      noContent: '目前無法取得可展示的內容，請稍後再試。',
      access: '這個 demo 需要有效的存取權限，請重新輸入 access code。',
    },
    templateGoal: {
      authority: '建立專業可信度',
      conversion: '促使讀者私訊、預約或採取下一步',
      engagement: '提高留言、收藏與分享',
    },
    template: (topic, goalText) =>
      `請以台灣專業服務品牌的 Instagram 內容風格，為主題「${topic}」生成內容。目標是：${goalText}。請用繁體中文、先講結論，再拆成 5 張適合輪播的重點，語氣專業但好懂，最後補上 5 個適合台灣 Instagram 的 hashtag。`,
    articleCoreQuestion: (topic) => `${topic}的核心問題是什麼`,
    articleFallback: (topic) => `如果你正在處理「${topic}」相關問題，先把流程、資料與風險整理清楚，會比急著做決定更重要。`,
    articleSeoTitle: (topic) => `${topic}怎麼處理？流程、重點與注意事項一次看`,
  },
  en: {
    goalOptions: [
      { value: 'engagement', label: 'Engagement' },
      { value: 'authority', label: 'Authority' },
      { value: 'conversion', label: 'Conversion' },
    ],
    presetTopics: ['Car accident claims', 'Lease disputes', 'Labor disputes', 'Inheritance process', 'Startup content marketing'],
    defaultPreview: DEFAULT_PREVIEWS.en,
    access: {
      eyebrow: 'Client demo access',
      title: 'This demo requires an access code or signed link.',
      body: 'If this is a client demo environment, enter the access code or use the signed link provided for this session.',
      inputLabel: 'Demo access code',
      inputPlaceholder: 'Enter this demo access code',
      submitLabel: 'Unlock demo',
      loadingLabel: 'Verifying…',
      signedLinkLoaded: 'If you entered through a signed link, this access will be saved automatically.',
      invalidCode: 'The access code is invalid or the link has expired.',
      clearAccess: 'Clear access',
    },
    labels: {
      topic: 'Topic',
      topicPlaceholder: 'Enter a topic, e.g. car accident compensation process',
      referenceTitle: 'Reference image style',
      referenceBody: 'Optional. Upload one reference image so the system can analyze layout, color, and typography style.',
      referenceReady: 'Style analysis is complete. The next generation will use this visual direction.',
      goal: 'Content goal',
      generate: 'Generate content',
      cancel: 'Cancel generation',
      currentTopic: 'Current topic',
      articleTab: 'Article',
      articleTitle: 'Article',
      seoTitle: 'SEO title',
      outline: 'Article outline',
      intro: 'Opening paragraph',
      copyCaption: 'Copy caption',
      copySlides: 'Copy all slides',
      copyHashtags: 'Copy hashtags',
      copyScript: 'Copy script',
      copyAll: 'Copy all',
      copied: 'Copied',
      rendering: 'Rendering high-quality images…',
      renderError: 'Image rendering failed, using preview',
      chooseTemplate: 'Choose Design Template',
      changeTemplate: 'Change Template',
      reRendering: 'Re-rendering…',
    },
    fileUpload: {
      previewAlt: 'Reference image preview',
      analyzing: 'Analyzing image style…',
      ready: 'Reference image style added',
      remove: 'Remove',
      uploadTitle: 'Upload reference image',
      uploadBody: 'Drag a PNG / JPG here, or click to choose an image. Max 5MB.',
    },
    errors: {
      imageType: 'Please upload a PNG or JPG image.',
      imageSize: 'Image size must be under 5MB.',
      imageAnalysis: 'Image style analysis failed. Please try another image.',
      imageEmpty: 'Image style analysis did not return a usable description.',
      imageGeneric: 'Image style analysis failed. Please try again later.',
      invalidTopic: 'Please enter a more specific topic and try again.',
      unavailable: 'The system is busy right now. Please try again shortly.',
      generic: 'Content generation could not finish right now. Please try again later.',
      timeout: 'Generation took too long. Please try again.',
      generation: 'Content generation failed.',
      noContent: 'No demo-ready content was returned. Please try again later.',
      access: 'This demo requires valid access. Please enter the access code again.',
    },
    templateGoal: {
      authority: 'build professional authority',
      conversion: 'encourage readers to message, book, or take the next step',
      engagement: 'increase comments, saves, and shares',
    },
    template: (topic, goalText) =>
      `Generate Instagram content for the topic "${topic}" in a professional services brand style. The goal is to ${goalText}. Use English, lead with the conclusion, break the idea into 5 carousel-ready points, keep the tone professional and easy to understand, and add 5 relevant Instagram hashtags.`,
    articleCoreQuestion: (topic) => `What is the core issue behind ${topic}?`,
    articleFallback: (topic) => `If you are dealing with "${topic}", clarifying the process, documents, and risks before making decisions is usually the better first move.`,
    articleSeoTitle: (topic) => `How to Handle ${topic}: Process, Key Points, and What to Watch`,
  },
}

function createTemplate(topic: string, goal: string, copy: InstagramCopy) {
  const goalText =
    goal === 'authority'
      ? copy.templateGoal.authority
      : goal === 'conversion'
        ? copy.templateGoal.conversion
        : copy.templateGoal.engagement

  return copy.template(topic, goalText)
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[。！？!?])/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function deriveArticlePreview(topic: string, content: InstagramContent, copy: InstagramCopy): ArticlePreview {
  const outline = [
    copy.articleCoreQuestion(topic),
    ...content.carousel_outline.slice(1, 4).map((slide) => slide.title),
  ].slice(0, 4)

  const firstParagraph =
    splitSentences(content.caption).slice(0, 3).join('') ||
    copy.articleFallback(topic)

  return {
    seoTitle: copy.articleSeoTitle(topic),
    outline,
    firstParagraph,
  }
}

function toPreviewBundle(topic: string, content: InstagramContent, copy: InstagramCopy): PreviewBundle {
  return {
    topic,
    content,
    article: deriveArticlePreview(topic, content, copy),
  }
}

function toFriendlyError(error: unknown, copy: InstagramCopy): string {
  if (error instanceof APIError) {
    if (error.status === 422) return copy.errors.invalidTopic
    if (error.status === 503) return copy.errors.unavailable
    return copy.errors.generic
  }

  if (error instanceof Error && error.message.includes('timed out')) {
    return copy.errors.timeout
  }

  return copy.errors.generic
}

function CopyButton({ label, value, copiedLabel }: { label: string; value: string; copiedLabel: string }) {
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
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-tertiary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      <span aria-hidden="true">📋</span>
      {copied ? copiedLabel : label}
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


const TEMPLATE_TO_THEME: Record<string, CarouselThemeId> = {
  'editorial-green': 'professional',
  'luxury-dark': 'professional',
  'fresh-coral': 'bold',
  'modern-minimal': 'minimal',
  'ocean-editorial': 'professional',
}

function InstagramPreview({
  bundle,
  copy,
  exportDisabled = false,
  dynamicTheme,
  selectedTemplateId,
  customTemplateSpec,
  language,
  sampleImages,
}: {
  bundle: PreviewBundle
  copy: InstagramCopy
  exportDisabled?: boolean
  dynamicTheme?: CarouselTheme
  selectedTemplateId: string
  customTemplateSpec?: TemplateSpec | null
  language: Language
  sampleImages?: string[]
}) {
  const fallbackTheme: CarouselThemeId = TEMPLATE_TO_THEME[selectedTemplateId] ?? 'professional'
  const [carouselTheme, setCarouselTheme] = useState<CarouselThemeId>(fallbackTheme)
  // Initialize with sample images if available (instant preview, no API call)
  const [renderedImages, setRenderedImages] = useState<string[]>(sampleImages ?? [])
  const [isRendering, setIsRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const lastRenderKeyRef = useRef<string>('')
  const firstSentence = splitSentences(bundle.content.caption)[0] ?? bundle.content.caption
  const remainingCaption = bundle.content.caption.replace(firstSentence, '').trim()
  const allSlidesText = bundle.content.carousel_outline
    .map((slide, index) => `${index + 1}/5\n${slide.title}\n${slide.body}`)
    .join('\n\n')

  const slidesKey = bundle.content.carousel_outline.map((s) => s.title).join('|')
  const renderKey = `${selectedTemplateId}::${slidesKey}`

  function triggerRender() {
    const slides = bundle.content.carousel_outline
    if (slides.length === 0) return
    setIsRendering(true)
    setRenderError(null)

    const templateSpec = selectedTemplateId === 'custom' && customTemplateSpec
      ? (customTemplateSpec as unknown as Record<string, unknown>)
      : null
    const templateId = selectedTemplateId === 'custom' ? 'custom' : selectedTemplateId

    renderCarousel(
      templateId,
      slides.map((s) => ({
        title: s.title,
        body: s.body,
        text_alignment: s.text_alignment ?? 'center',
        emphasis: s.emphasis ?? 'normal',
      })),
      templateSpec,
    )
      .then((images) => {
        setRenderedImages(images)
        setIsRendering(false)
        lastRenderKeyRef.current = renderKey
      })
      .catch(() => {
        setRenderError(copy.labels.renderError)
        setIsRendering(false)
      })
  }

  useEffect(() => {
    if (bundle.content.carousel_outline.length === 0) return
    if (renderKey === lastRenderKeyRef.current) return

    // If we have sample images and this is the initial default content, use them directly
    if (sampleImages && sampleImages.length > 0 && renderedImages.length === 0) {
      setRenderedImages(sampleImages)
      lastRenderKeyRef.current = renderKey
      return
    }

    lastRenderKeyRef.current = renderKey

    let cancelled = false
    setIsRendering(true)
    setRenderError(null)

    const templateSpec = selectedTemplateId === 'custom' && customTemplateSpec
      ? (customTemplateSpec as unknown as Record<string, unknown>)
      : null
    const templateId = selectedTemplateId === 'custom' ? 'custom' : selectedTemplateId

    renderCarousel(
      templateId,
      bundle.content.carousel_outline.map((s) => ({
        title: s.title,
        body: s.body,
        text_alignment: s.text_alignment ?? 'center',
        emphasis: s.emphasis ?? 'normal',
      })),
      templateSpec,
    )
      .then((images) => {
        if (!cancelled) {
          setRenderedImages(images)
          setIsRendering(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRenderError(copy.labels.renderError)
          setIsRendering(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [renderKey, bundle.content.carousel_outline, copy.labels.renderError, selectedTemplateId, customTemplateSpec, sampleImages, renderedImages.length])

  // When sampleImages prop changes and renderedImages is still empty, update
  useEffect(() => {
    if (sampleImages && sampleImages.length > 0 && renderedImages.length === 0) {
      setRenderedImages(sampleImages)
    }
  }, [sampleImages]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleRetryRender() {
    lastRenderKeyRef.current = ''
    setRenderedImages([])
    triggerRender()
  }

  // Update fallback theme when template changes
  useEffect(() => {
    setCarouselTheme(TEMPLATE_TO_THEME[selectedTemplateId] ?? 'professional')
  }, [selectedTemplateId])

  const useServerRendered = renderedImages.length > 0 || isRendering

  return (
    <div className="space-y-8">
      <SectionShell
        title="📝 Caption"
        action={<CopyButton label={copy.labels.copyCaption} copiedLabel={copy.labels.copied} value={bundle.content.caption} />}
      >
        <div className="rounded-[8px] bg-[var(--bg-sunken)] p-4 text-[15px] leading-[1.7] text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--text-primary)]">{firstSentence}</p>
          {remainingCaption ? <p className="mt-3 whitespace-pre-wrap">{remainingCaption}</p> : null}
        </div>
      </SectionShell>

      <SectionShell
        title="📱 Carousel（1-5）"
        action={<CopyButton label={copy.labels.copySlides} copiedLabel={copy.labels.copied} value={allSlidesText} />}
      >
        {useServerRendered && !renderError ? (
          <ServerRenderedCarousel
            images={renderedImages}
            loading={isRendering}
            error={null}
            topicSlug={bundle.topic}
            slideCount={bundle.content.carousel_outline.length}
            onRetry={handleRetryRender}
          />
        ) : (
          <VisualCarouselRenderer
            slides={bundle.content.carousel_outline}
            selectedTheme={carouselTheme}
            onThemeChange={setCarouselTheme}
            topicSlug={bundle.topic}
            exportDisabled={exportDisabled}
            dynamicTheme={dynamicTheme}
          />
        )}
        {renderError ? (
          <p className="mt-2 text-center text-xs text-[var(--text-tertiary)]">{renderError}</p>
        ) : null}
      </SectionShell>

      <SectionShell
        title="# Hashtags"
        action={<CopyButton label={copy.labels.copyHashtags} copiedLabel={copy.labels.copied} value={bundle.content.hashtags.join(' ')} />}
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
        action={<CopyButton label={copy.labels.copyScript} copiedLabel={copy.labels.copied} value={bundle.content.reel_script} />}
      >
        <div className="rounded-[8px] bg-[var(--bg-sunken)] p-4 text-[15px] leading-[1.7] text-[var(--text-secondary)]">
          {bundle.content.reel_script}
        </div>
      </SectionShell>
    </div>
  )
}

function ArticlePreviewPanel({ bundle, copy }: { bundle: PreviewBundle; copy: InstagramCopy }) {
  const articleCopy = [bundle.article.seoTitle, ...bundle.article.outline.map((item) => `H2｜${item}`), bundle.article.firstParagraph].join('\n\n')

  return (
    <div className="space-y-6">
      <SectionShell
        title={copy.labels.articleTitle}
        action={<CopyButton label={copy.labels.copyAll} copiedLabel={copy.labels.copied} value={articleCopy} />}
      >
        <div className="space-y-5 rounded-[var(--card-radius)] bg-[var(--bg-sunken)] p-5">
          <div>
            <div className="text-xs font-medium tracking-[0.08em] text-[var(--text-tertiary)]">{copy.labels.seoTitle}</div>
            <h3 className="mt-2 text-[20px] font-bold leading-snug text-[var(--text-primary)]">{bundle.article.seoTitle}</h3>
          </div>

          <div>
            <div className="text-xs font-medium tracking-[0.08em] text-[var(--text-tertiary)]">{copy.labels.outline}</div>
            <div className="mt-3 space-y-3">
              {bundle.article.outline.map((item, index) => (
                <div key={`${item}-${index}`} className="rounded-[10px] bg-[var(--bg-elevated)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                  H2 {index + 1}｜{item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium tracking-[0.08em] text-[var(--text-tertiary)]">{copy.labels.intro}</div>
            <p className="mt-3 text-[15px] leading-7 text-[var(--text-secondary)]">{bundle.article.firstParagraph}</p>
          </div>
        </div>
      </SectionShell>
    </div>
  )
}

export default function InstagramPage() {
  const { language } = useLanguage()
  const copy = COPY[language]
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
  const [previewBundle, setPreviewBundle] = useState<PreviewBundle>(copy.defaultPreview)
  const [lastSubmittedTopic, setLastSubmittedTopic] = useState(copy.defaultPreview.topic)
  const [demoToken, setDemoToken] = useState<string | null>(null)
  const [source, setSource] = useState(() => getStoredDemoSource(demoConfig.apiSurface))
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null)
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null)
  const [referenceImageDescription, setReferenceImageDescription] = useState('')
  const [referenceUploadStatus, setReferenceUploadStatus] = useState<ReferenceUploadStatus>('idle')
  const [referenceUploadError, setReferenceUploadError] = useState<string | null>(null)
  const [referencePalette, setReferencePalette] = useState<{ background: string; textPrimary: string; accent: string; textSecondary: string } | null>(null)
  const [availableTemplates, setAvailableTemplates] = useState<TemplateInfo[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('editorial-green')
  const [customTemplateSpec, setCustomTemplateSpec] = useState<TemplateSpec | null>(null)
  const [showTemplateUploader, setShowTemplateUploader] = useState(false)
  type PageMode = 'ai-generate' | 'template-overlay'
  const [pageMode, setPageMode] = useState<PageMode>('ai-generate')
  const [overlayTemplateImage, setOverlayTemplateImage] = useState<string | null>(null)
  const [overlayRenderedImages, setOverlayRenderedImages] = useState<string[]>([])
  const [sampleImages, setSampleImages] = useState<string[]>([])
  const [sampleImagesLoaded, setSampleImagesLoaded] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const latestTopicRef = useRef(topic)
  const referencePreviewUrlRef = useRef<string | null>(null)

  const fallbackResult = useMemo(
    () => getDeterministicFallbackResult(clientConfig?.deterministic_fallback?.fallback_key ?? null, language),
    [clientConfig, language],
  )

  useEffect(() => {
    setPreviewBundle(copy.defaultPreview)
    setLastSubmittedTopic(copy.defaultPreview.topic)
    setStreamedContent(null)
  }, [copy.defaultPreview])

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
    let cancelled = false
    fetchTemplates()
      .then((templates) => {
        if (!cancelled) setAvailableTemplates(templates)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false

    // Load pre-rendered sample carousel images for instant preview
    fetchSampleCarousel(selectedTemplateId, language)
      .then((images) => {
        if (!cancelled) {
          setSampleImages(images)
          setSampleImagesLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setSampleImagesLoaded(true)  // Don't block on failure
      })

    return () => { cancelled = true }
  }, [selectedTemplateId, language])

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
      trackPlausibleEvent('demo_abandoned', { surface: demoConfig.apiSurface, source, locale: language })
      sendBeaconAnalyticsEvent({
        eventName: 'demo_abandoned',
        route: '/instagram',
        surface: demoConfig.apiSurface,
        source,
        locale: language,
        metadata: {
          reason: 'pagehide',
          topic_length: latestTopicRef.current.trim().length,
        },
      })
    }

    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [demoConfig.apiSurface, language, source, status])

  const needsAccess = demoConfig.accessMode === 'gated' && !demoToken
  const isWorking = status === 'loading' || status === 'streaming'
  const isReferenceAnalyzing = referenceUploadStatus === 'analyzing'
  const displayBundle = useMemo(() => {
    if (streamedContent) {
      return toPreviewBundle(lastSubmittedTopic, streamedContent, copy)
    }
    return previewBundle
  }, [copy, lastSubmittedTopic, previewBundle, streamedContent])

  const dynamicTheme = useMemo(
    () => referencePalette ? createDynamicTheme(referencePalette) : undefined,
    [referencePalette],
  )

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
    setReferencePalette(null)
  }

  async function handleReferenceFileSelect(file: File) {
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setReferenceUploadStatus('error')
      setReferenceUploadError(copy.errors.imageType)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setReferenceUploadStatus('error')
      setReferenceUploadError(copy.errors.imageSize)
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
        throw new Error(typeof payload?.detail === 'string' ? payload.detail : copy.errors.imageAnalysis)
      }

      const description = typeof payload?.description === 'string' ? payload.description : ''
      if (!description.trim()) {
        throw new Error(copy.errors.imageEmpty)
      }

      setReferenceImageDescription(description)
      setReferenceUploadStatus('ready')

      if (payload?.palette && typeof payload.palette === 'object') {
        const p = payload.palette
        if (p.background && p.text_primary && p.accent && p.text_secondary) {
          setReferencePalette({
            background: p.background,
            textPrimary: p.text_primary,
            accent: p.accent,
            textSecondary: p.text_secondary,
          })
        }
      }
    } catch (err) {
      setReferenceImageDescription('')
      setReferenceUploadStatus('error')
      setReferenceUploadError(err instanceof Error ? err.message : copy.errors.imageGeneric)
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
      trackPlausibleEvent('demo_started', { surface: demoConfig.apiSurface, source, locale: language })

      const abort = new AbortController()
      abortRef.current = abort
      let completed = false
      let failed = false

      try {
        for await (const chunk of streamSSE(
          `${API_BASE_URL}/api/instagram/generate`,
          {
            topic: trimmedTopic,
            template_text: createTemplate(trimmedTopic, payload.goal, copy),
            goal: payload.goal,
            locale: language,
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
            setPreviewBundle(toPreviewBundle(trimmedTopic, nextContent, copy))
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
              setPreviewBundle(toPreviewBundle(trimmedTopic, nextContent, copy))
            }
            setStatus('completed')
            completed = true
            trackPlausibleEvent('demo_completed', { surface: demoConfig.apiSurface, source, locale: language })
            break
          }

          if (chunk.event === 'error') {
            throw new Error(typeof chunk.data?.message === 'string' ? chunk.data.message : copy.errors.generation)
          }
        }

        if (!abort.signal.aborted && !completed) {
          if (streamedContent) {
            setStatus('completed')
          } else if (clientConfig?.deterministic_fallback?.mode === 'auto' && fallbackResult) {
            setPreviewBundle(toPreviewBundle(trimmedTopic, fallbackResult.content, copy))
            setStreamedContent(fallbackResult.content)
            setStatus('completed')
          } else {
            setStatus('error')
            setError(copy.errors.noContent)
            failed = true
          }
        }
      } catch (err) {
        if (!abort.signal.aborted && (!(err instanceof DOMException) || err.name !== 'AbortError')) {
          if (err instanceof APIError && err.status === 401) {
            clearStoredDemoToken(demoConfig.apiSurface)
            setDemoToken(null)
            setStatus('error')
            setError(copy.errors.access)
            return
          }

          if (clientConfig?.deterministic_fallback?.mode === 'auto' && fallbackResult) {
            setPreviewBundle(toPreviewBundle(trimmedTopic, fallbackResult.content, copy))
            setStreamedContent(fallbackResult.content)
            setStatus('completed')
            setError(null)
          } else {
            setStatus('error')
            setError(toFriendlyError(err, copy))
            failed = true
          }
        }
      }

      if (failed) {
        trackPlausibleEvent('demo_failed', { surface: demoConfig.apiSurface, source, locale: language })
      }
    },
    [clientConfig?.deterministic_fallback?.mode, copy, demoConfig.apiSurface, demoToken, fallbackResult, language, referenceImageDescription, source, streamedContent],
  )

  function handleGenerate() {
    void handleSubmit({ topic, goal })
  }

  function handleCancel() {
    abortRef.current?.abort()
    setStatus('idle')
    setError(null)
    trackPlausibleEvent('demo_abandoned', { surface: demoConfig.apiSurface, source, locale: language })
    sendBeaconAnalyticsEvent({
      eventName: 'demo_abandoned',
      route: '/instagram',
      surface: demoConfig.apiSurface,
      source,
      locale: language,
      metadata: {
        reason: 'manual_stop',
        topic_length: latestTopicRef.current.trim().length,
      },
    })
  }

  function handleOverlayTemplateUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setOverlayTemplateImage(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 pb-16 pt-8 sm:px-6 lg:px-8">
        <GlobalNav />

        {/* Mode toggle */}
        <div className="flex justify-center">
          <div className="inline-flex gap-1 rounded-full bg-[var(--bg-sunken)] p-1">
            <button
              type="button"
              onClick={() => setPageMode('ai-generate')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                pageMode === 'ai-generate'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {language === 'zh-TW' ? 'AI 生成' : 'AI Generate'}
            </button>
            <button
              type="button"
              onClick={() => setPageMode('template-overlay')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                pageMode === 'template-overlay'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {language === 'zh-TW' ? '模板套用' : 'Template Overlay'}
            </button>
          </div>
        </div>

        {pageMode === 'ai-generate' ? (
        <>
        {needsAccess ? (
          <section className="pt-10">
            <DemoAccessGate
              surface={demoConfig.apiSurface}
              copy={copy.access}
              onAccessReady={setDemoToken}
            />
          </section>
        ) : null}

        {!needsAccess ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
              <div className="space-y-6 rounded-[20px] bg-transparent pr-0 lg:pr-6">
                <div className="space-y-4">
                  <label htmlFor="instagram-topic" className="block text-sm font-medium text-[var(--text-secondary)]">
                    {copy.labels.topic}
                  </label>
                  <input
                    id="instagram-topic"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder={copy.labels.topicPlaceholder}
                    className="h-14 w-full rounded-[14px] border border-[var(--border)] bg-[var(--bg-sunken)] px-5 text-base text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
                  />
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-secondary)]">{copy.labels.referenceTitle}</p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      {copy.labels.referenceBody}
                    </p>
                  </div>
                  <FileUpload
                    previewUrl={referencePreviewUrl}
                    fileName={referenceFileName}
                    isAnalyzing={isReferenceAnalyzing}
                    error={referenceUploadError}
                    copy={copy.fileUpload}
                    onFileSelect={(file) => void handleReferenceFileSelect(file)}
                    onRemove={clearReferenceImage}
                  />
                  {referenceUploadStatus === 'ready' ? (
                    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-xs leading-6 text-[var(--text-secondary)]">
                      {copy.labels.referenceReady}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  {copy.presetTopics.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTopic(preset)}
                      className="rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition hover:border-[var(--accent)] hover:bg-[var(--bg-elevated-2)]"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <label htmlFor="instagram-goal" className="block text-sm font-medium text-[var(--text-secondary)]">
                    {copy.labels.goal}
                  </label>
                  <select
                    id="instagram-goal"
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    className="h-12 w-full rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-bold)]"
                  >
                    {copy.goalOptions.map((option) => (
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
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[image:var(--gradient-cta)] px-6 text-[15px] font-semibold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isWorking ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      </>
                    ) : (
                      copy.labels.generate
                    )}
                  </button>

                  {isWorking ? (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-5 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                    >
                      {copy.labels.cancel}
                    </button>
                  ) : null}

                  {error ? (
                    <div className="rounded-[12px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                      {error}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-6">
                {availableTemplates.length > 0 ? (
                  <div className="rounded-[20px] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
                    <TemplateGallery
                      templates={availableTemplates}
                      selectedId={selectedTemplateId}
                      onSelect={(id) => {
                        setSelectedTemplateId(id)
                        setCustomTemplateSpec(null)
                      }}
                      onUploadCustom={() => setShowTemplateUploader(true)}
                      compact
                    />
                  </div>
                ) : null}

              <div className="rounded-[20px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-sm)]">
                <div className="sticky top-[72px] z-10 mb-6 flex items-end justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] pb-4">
                  <div>
                    <div className="text-xs font-medium tracking-[0.08em] text-[var(--text-tertiary)]">{copy.labels.currentTopic}</div>
                    <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--text-primary)]">{displayBundle.topic}</h2>
                  </div>
                  <div className="inline-flex shrink-0 gap-2">
                    {([
                      ['instagram', 'Instagram'],
                      ['article', copy.labels.articleTab],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPreviewTab(key)}
                        className={`w-24 whitespace-nowrap rounded-full px-3 py-2 text-center text-sm font-medium transition ${
                          previewTab === key
                            ? 'bg-[image:var(--gradient-cta)] text-white shadow-[var(--shadow-glow)]'
                            : 'border border-transparent text-[var(--text-tertiary)] hover:border-[var(--border)] hover:bg-[var(--bg-elevated-2)]'
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
                  <InstagramPreview bundle={displayBundle} copy={copy} exportDisabled={isWorking} dynamicTheme={dynamicTheme} selectedTemplateId={selectedTemplateId} customTemplateSpec={customTemplateSpec} language={language} sampleImages={sampleImages} />
                ) : (
                  <ArticlePreviewPanel bundle={displayBundle} copy={copy} />
                )}
              </div>
              </div>
            </section>
          </>
        ) : null}
        </>
        ) : (
          <>
            {!overlayTemplateImage ? (
              <section className="flex flex-col items-center gap-6 pt-10">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    {language === 'zh-TW' ? '上傳空白模板' : 'Upload Blank Template'}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-tertiary)]">
                    {language === 'zh-TW'
                      ? '上傳你的模板圖片 (1080×1080 PNG/JPG)，然後貼上文字內容'
                      : 'Upload your template image (1080×1080 PNG/JPG), then paste your text content'}
                  </p>
                </div>
                <label className="flex h-48 w-full max-w-md cursor-pointer flex-col items-center justify-center gap-3 rounded-[16px] border-2 border-dashed border-[var(--border)] bg-[var(--bg-sunken)] transition hover:border-[var(--accent)]">
                  <Upload className="h-8 w-8 text-[var(--text-tertiary)]" />
                  <span className="text-sm font-medium text-[var(--text-tertiary)]">
                    {language === 'zh-TW' ? '點擊或拖放上傳' : 'Click or drag to upload'}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleOverlayTemplateUpload}
                  />
                </label>
              </section>
            ) : (
              <section className="space-y-6">
                <OverlayEditor
                  templateImage={overlayTemplateImage}
                  onRenderComplete={(images) => setOverlayRenderedImages(images)}
                  onBack={() => {
                    setOverlayTemplateImage(null)
                    setOverlayRenderedImages([])
                  }}
                />
                {overlayRenderedImages.length > 0 && (
                  <div className="mx-auto max-w-xl">
                    <ServerRenderedCarousel
                      images={overlayRenderedImages}
                      loading={false}
                      error={null}
                      topicSlug="overlay-render"
                      slideCount={overlayRenderedImages.length}
                    />
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {showTemplateUploader ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-[20px] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-lg)]">
            <TemplateUploader
              onTemplateExtracted={(spec) => {
                setCustomTemplateSpec(spec)
                setSelectedTemplateId('custom')
                setShowTemplateUploader(false)
              }}
              onCancel={() => setShowTemplateUploader(false)}
            />
          </div>
        </div>
      ) : null}
    </main>
  )
}
