import type { CarouselSlide, InstagramContent } from './instagram-types'

export interface LegalArticlePreview {
  articleTitle: string
  articleOutline: { heading: string }[]
  articleSummary: string
}

export interface LegalRenderableContent {
  caption: string
  slides: CarouselSlide[]
  articleTitle: string
  articleOutline: { heading: string }[]
  articleSummary: string
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((part) => cleanText(part))
    .filter(Boolean)
}

function splitSentences(text: string): string[] {
  return cleanText(text)
    .split(/(?<=[。！？!?])/)
    .map((part) => cleanText(part))
    .filter(Boolean)
}

function firstMeaningfulLine(text: string): string {
  return splitParagraphs(text)[0] || splitSentences(text)[0] || ''
}

function trimHeading(value: string, fallback: string): string {
  const cleaned = cleanText(value).replace(/^[#*\-\d.\s]+/, '')
  if (!cleaned) return fallback
  return cleaned.length > 24 ? `${cleaned.slice(0, 24)}…` : cleaned
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    const cleaned = cleanText(value)
    return cleaned ? [cleaned] : []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStrings(item))
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap((item) => collectStrings(item))
  }

  return []
}

function getLongestParagraph(texts: string[]): string {
  return texts
    .flatMap((text) => splitParagraphs(text))
    .sort((a, b) => b.length - a.length)[0] || ''
}

function extractStructuredContent(payload: unknown): Partial<InstagramContent> | null {
  if (!payload || typeof payload !== 'object') return null

  const maybeContent = (payload as { content?: unknown }).content
  if (maybeContent && typeof maybeContent === 'object') {
    return maybeContent as Partial<InstagramContent>
  }

  if (
    'caption' in (payload as Record<string, unknown>) ||
    'carousel_outline' in (payload as Record<string, unknown>) ||
    'hook_options' in (payload as Record<string, unknown>)
  ) {
    return payload as Partial<InstagramContent>
  }

  return null
}

export function parseToCarousel(topic: string, rawText: string, structuredContent?: Partial<InstagramContent> | null): CarouselSlide[] {
  const structuredSlides = Array.isArray(structuredContent?.carousel_outline)
    ? structuredContent.carousel_outline.filter((slide) => cleanText(slide?.title || '') && cleanText(slide?.body || ''))
    : []

  if (structuredSlides.length >= 5) {
    return structuredSlides.slice(0, 5).map((slide) => ({
      title: trimHeading(slide.title, '重點整理'),
      body: cleanText(slide.body),
    }))
  }

  const candidateParts = [
    ...splitParagraphs(rawText),
    ...splitSentences(rawText),
    ...(structuredContent?.caption ? splitSentences(structuredContent.caption) : []),
    ...(structuredContent?.reel_script ? splitSentences(structuredContent.reel_script) : []),
  ].filter(Boolean)

  const opener =
    structuredContent?.hook_options?.find((item) => cleanText(item)) ||
    firstMeaningfulLine(rawText) ||
    `${topic}，先看五個重點`

  const detailPool = candidateParts.filter((part) => part !== opener)
  const middleSlides = Array.from({ length: 3 }).map((_, index) => {
    const body =
      detailPool[index] ||
      `先把 ${topic} 的程序、時效與常見風險整理清楚，再決定下一步。`

    return {
      title: trimHeading(detailPool[index]?.split(/[，。：:]/)[0] || `重點 ${index + 1}`, `重點 ${index + 1}`),
      body,
    }
  })

  return [
    {
      title: trimHeading(opener, `${topic}重點`),
      body: candidateParts[0] || `先用一句清楚的結論，讓讀者知道 ${topic} 最重要的風險在哪裡。`,
    },
    ...middleSlides,
    {
      title: '需要專業協助？歡迎私訊諮詢',
      body: `如果 ${topic} 已經影響到時效、權利或談判空間，建議及早尋求專業法律協助。`,
    },
  ]
}

export function parseToArticle(topic: string, rawText: string, slides: CarouselSlide[], structuredContent?: Partial<InstagramContent> | null): LegalArticlePreview {
  const lead = getLongestParagraph([
    rawText,
    structuredContent?.caption || '',
    structuredContent?.reel_script || '',
    ...slides.map((slide) => slide.body),
  ])

  const articleTitle =
    trimHeading(firstMeaningfulLine(rawText).replace(/[。！？!?]+$/, ''), '') ||
    `${topic}怎麼處理？流程、重點與注意事項一次看`

  const defaultTitle = articleTitle.includes(topic) ? articleTitle : `${topic}怎麼處理？流程、重點與注意事項一次看`

  const articleOutline = [
    { heading: `${topic}的核心問題是什麼` },
    ...slides.slice(1, 4).map((slide) => ({ heading: trimHeading(slide.title, '重點整理') })),
  ].slice(0, 4)

  return {
    articleTitle: defaultTitle,
    articleOutline,
    articleSummary:
      lead ||
      `如果你正在處理「${topic}」，先把流程、證據、時效與常見風險整理清楚，會比急著做結論更重要。`,
  }
}

export function normalizeLegalLivePayload(topic: string, payload: unknown): LegalRenderableContent {
  const structuredContent = extractStructuredContent(payload)
  const rawStrings = collectStrings(payload)
  const rawText = rawStrings.sort((a, b) => b.length - a.length)[0] || structuredContent?.caption || ''

  const caption =
    cleanText(structuredContent?.caption || '') ||
    getLongestParagraph(rawStrings) ||
    `針對「${topic}」，先把程序、證據與時效觀念整理清楚，才能更穩定地對外說明，也更容易轉成社群與文章內容。`

  const slides = parseToCarousel(topic, rawText || caption, structuredContent)
  const article = parseToArticle(topic, rawText || caption, slides, structuredContent)

  return {
    caption,
    slides,
    articleTitle: article.articleTitle,
    articleOutline: article.articleOutline,
    articleSummary: article.articleSummary,
  }
}
