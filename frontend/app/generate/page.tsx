'use client'

import { useMemo, useRef, useState, type MutableRefObject } from 'react'
import { GlobalNav } from '../../components/GlobalNav'
import { PipelineProgress, type PipelineStep, type PipelineStepStatus } from '../../components/PipelineProgress'
import { PlatformTabs, type PlatformErrors, type PlatformResults, type PlatformStatuses } from '../../components/PlatformTabs'
import { API_BASE_URL } from '../../lib/api'
import { getCarouselTheme } from '../../lib/carousel-themes'
import { buildDemoHeaders } from '../../lib/demo-access'
import { getDemoSurfaceConfig } from '../../lib/demo-config'
import { DEMO_SCENARIOS, type DemoScenario } from '../../lib/demo-scenarios'
import { downloadAllOutputs } from '../../lib/export-all'
import type { FacebookPost } from '../../lib/facebook-types'
import type { CarouselSlide, InstagramContent } from '../../lib/instagram-types'
import type { SeoArticle } from '../../lib/seo-types'
import { APIError, streamSSE } from '../../lib/sse'
import type { ThreadsThread } from '../../lib/threads-types'

type PageStatus = 'idle' | 'loading' | 'streaming' | 'completed' | 'error'

const INDUSTRY_OPTIONS = [
  { value: 'legal', label: '法律服務' },
  { value: 'tech', label: '科技 / SaaS' },
  { value: 'health', label: '健康 / 醫療' },
  { value: 'real_estate', label: '房地產' },
  { value: 'general', label: '一般品牌' },
] as const

const GOAL_OPTIONS = [
  { value: 'traffic', label: '帶來流量' },
  { value: 'authority', label: '建立專業權威' },
  { value: 'conversion', label: '引導諮詢轉換' },
  { value: 'education', label: '教育市場' },
] as const

const VOICE_OPTIONS = [
  { value: 'default', label: '清楚直接' },
  { value: 'law_firm', label: '法律事務所' },
] as const

const EXPORT_THEME = getCarouselTheme('professional')

const INITIAL_PLATFORM_STATUSES: PlatformStatuses = {
  instagram: 'waiting',
  seo: 'waiting',
  threads: 'waiting',
  facebook: 'waiting',
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'neoxra'
}

function friendlyError(error: unknown) {
  if (error instanceof APIError) {
    if (error.status === 503) return 'Generate All 服務目前尚未開啟，請確認 core 能力與 API key。'
    if (error.status === 422) return '請確認主題、產業與語氣設定後再試一次。'
    if (error.status === 429) return '目前請求量較高，請稍後再試。'
  }
  if (error instanceof Error && error.message.includes('timed out')) {
    return '整體生成時間過長，請縮短主題或重新嘗試。'
  }
  return '目前無法完成 Generate All，請稍後再試。'
}

function InputLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-[var(--text-secondary)]">
      {children}
    </label>
  )
}

function SelectField({
  id,
  value,
  onChange,
  children,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full rounded-[12px] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
    >
      {children}
    </select>
  )
}

function HiddenInstagramSlides({
  slides,
  slideRefs,
}: {
  slides: CarouselSlide[]
  slideRefs: MutableRefObject<HTMLDivElement[]>
}) {
  return (
    <div className="pointer-events-none fixed left-[-12000px] top-0 z-[-1]">
      {slides.map((slide, index) => (
        <div
          key={`${slide.title}-generate-export-${index}`}
          ref={(element) => {
            if (element) slideRefs.current[index] = element
          }}
          className="h-[1080px] w-[1080px] overflow-hidden"
        >
          <div
            className="relative flex h-full w-full flex-col p-[88px]"
            style={{ background: EXPORT_THEME.bgColor, color: EXPORT_THEME.textColor }}
          >
            <div
              className="inline-flex self-start rounded-full px-8 py-3 text-[32px] font-bold"
              style={{ background: EXPORT_THEME.accentColor, color: '#111827' }}
            >
              {index + 1}/{slides.length}
            </div>
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <h4 className="max-w-[92%] text-[92px] font-bold leading-[1.05] tracking-[-0.03em]">
                {slide.title}
              </h4>
              <p
                className="mt-8 max-w-[92%] text-[44px] font-medium leading-[1.42]"
                style={{ color: EXPORT_THEME.subtextColor }}
              >
                {slide.body}
              </p>
            </div>
            <div
              className="absolute bottom-[88px] left-[88px] h-3 w-44 rounded-full"
              style={{ background: EXPORT_THEME.accentColor }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function GeneratePage() {
  const demoConfig = useMemo(() => getDemoSurfaceConfig('landing'), [])
  const [idea, setIdea] = useState('車禍理賠流程')
  const [industry, setIndustry] = useState('legal')
  const [audience, setAudience] = useState('正在處理事故理賠的一般民眾')
  const [goal, setGoal] = useState('traffic')
  const [voiceProfile, setVoiceProfile] = useState('law_firm')
  const [pageStatus, setPageStatus] = useState<PageStatus>('idle')
  const [plannerStatus, setPlannerStatus] = useState<PipelineStepStatus>('waiting')
  const [platformStatuses, setPlatformStatuses] = useState<PlatformStatuses>(INITIAL_PLATFORM_STATUSES)
  const [results, setResults] = useState<PlatformResults>({})
  const [errors, setErrors] = useState<PlatformErrors>({})
  const [brief, setBrief] = useState<Record<string, unknown> | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const runSlugRef = useRef<string>('')
  const exportSlideRefs = useRef<HTMLDivElement[]>([])
  const isGenerating = pageStatus === 'loading' || pageStatus === 'streaming'
  const hasAnyResult = Boolean(results.instagram || results.seo || results.threads || results.facebook)

  const progressSteps: PipelineStep[] = [
    { id: 'planner', label: 'Planner', status: plannerStatus },
    { id: 'instagram', label: 'IG', status: platformStatuses.instagram },
    { id: 'seo', label: 'SEO', status: platformStatuses.seo },
    { id: 'threads', label: 'Threads', status: platformStatuses.threads },
    { id: 'facebook', label: 'FB', status: platformStatuses.facebook },
  ]

  function resetRunState() {
    setPlannerStatus('running')
    setPlatformStatuses(INITIAL_PLATFORM_STATUSES)
    setResults({})
    setErrors({})
    setBrief(null)
    setPageError(null)
    setDownloadError(null)
    exportSlideRefs.current = []
  }

  function setPlatformStatus(platform: keyof PlatformStatuses, status: PipelineStepStatus) {
    setPlatformStatuses((current) => ({ ...current, [platform]: status }))
  }

  function setPlatformResult(platform: keyof PlatformResults, value: PlatformResults[keyof PlatformResults]) {
    setResults((current) => ({ ...current, [platform]: value }))
  }

  function applyScenario(scenario: DemoScenario) {
    setIdea(scenario.idea)
    setIndustry(scenario.industry)
    setAudience(scenario.audience)
    setGoal(scenario.goal)
    setVoiceProfile(scenario.voiceProfile)
  }

  async function handleDownloadAll() {
    if (!hasAnyResult || isDownloading) return

    setIsDownloading(true)
    setDownloadError(null)

    try {
      await downloadAllOutputs(
        {
          ...results,
          instagramSlideElements: exportSlideRefs.current.slice(0, results.instagram?.carousel_outline.length ?? 0),
        },
        runSlugRef.current || slugify(idea),
      )
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : '匯出 ZIP 失敗，請稍後再試。')
    } finally {
      setIsDownloading(false)
    }
  }

  async function handleGenerate() {
    const trimmedIdea = idea.trim()
    if (!trimmedIdea) return

    runSlugRef.current = slugify(trimmedIdea)
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort
    setPageStatus('loading')
    resetRunState()

    try {
      for await (const chunk of streamSSE(
        `${API_BASE_URL}/api/generate-all`,
        {
          idea: trimmedIdea,
          industry,
          audience,
          goal,
          voice_profile: voiceProfile,
          locale: 'zh-TW',
        },
        {
          signal: abort.signal,
          timeoutMs: 90_000,
          headers: buildDemoHeaders(demoConfig.apiSurface),
        },
      )) {
        if (abort.signal.aborted) break
        setPageStatus('streaming')

        if (chunk.event === 'brief_ready') {
          setBrief(chunk.data?.brief ?? null)
          setPlannerStatus('complete')
          setPlatformStatuses({
            instagram: 'running',
            seo: 'running',
            threads: 'running',
            facebook: 'waiting',
          })
          continue
        }

        if (chunk.event === 'instagram_ready') {
          setPlatformResult('instagram', chunk.data as InstagramContent)
          setPlatformStatus('instagram', 'complete')
          setPlatformStatus('facebook', 'running')
          continue
        }

        if (chunk.event === 'seo_ready') {
          setPlatformResult('seo', chunk.data as SeoArticle)
          setPlatformStatus('seo', 'complete')
          continue
        }

        if (chunk.event === 'threads_ready') {
          setPlatformResult('threads', chunk.data as ThreadsThread)
          setPlatformStatus('threads', 'complete')
          continue
        }

        if (chunk.event === 'facebook_ready') {
          setPlatformResult('facebook', chunk.data as FacebookPost)
          setPlatformStatus('facebook', 'complete')
          continue
        }

        if (chunk.event === 'platform_error') {
          const platform = chunk.data?.platform as keyof PlatformStatuses | undefined
          if (platform && platform in INITIAL_PLATFORM_STATUSES) {
            setPlatformStatus(platform, 'error')
            setErrors((current) => ({
              ...current,
              [platform]: typeof chunk.data?.message === 'string' ? chunk.data.message : '此平台產生失敗。',
            }))
          }
          continue
        }

        if (chunk.event === 'all_completed') {
          const output = chunk.data?.outputs as Record<string, unknown> | undefined
          if (output) {
            const platformOutput: Partial<PlatformResults> = {}
            if ('instagram' in output) platformOutput.instagram = output.instagram as InstagramContent
            if ('seo' in output) platformOutput.seo = output.seo as SeoArticle
            if ('threads' in output) platformOutput.threads = output.threads as ThreadsThread
            if ('facebook' in output) platformOutput.facebook = output.facebook as FacebookPost
            setResults((current) => ({ ...current, ...platformOutput }))
          }
          setPageStatus('completed')
          return
        }

        if (chunk.event === 'error') {
          throw new Error(typeof chunk.data?.message === 'string' ? chunk.data.message : 'Generate All 失敗。')
        }
      }
    } catch (error) {
      if (!abort.signal.aborted) {
        setPageStatus('error')
        setPageError(friendlyError(error))
        setPlannerStatus((current) => (current === 'complete' ? current : 'error'))
      }
    }
  }

  return (
    <main className="min-h-screen bg-transparent text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 pb-16 pt-8 sm:px-6 lg:px-8">
        <GlobalNav />

        <section className="grid gap-6 lg:grid-cols-[minmax(300px,0.34fr)_minmax(0,0.66fr)]">
          <aside className="space-y-6 rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-md)] lg:sticky lg:top-24 lg:self-start">
            <div>
              <p className="text-sm font-semibold tracking-[0.16em] text-[var(--text-tertiary)]">GENERATE ALL</p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[var(--text-primary)]">
                一個想法，產出四個平台
              </h1>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                輸入一個核心 idea，Neoxra 會同時產出 Instagram、SEO、Threads 與 Facebook 版本。
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Demo 情境</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.name}
                    type="button"
                    onClick={() => applyScenario(scenario)}
                    className="rounded-full border border-[var(--border)] bg-[var(--bg-sunken)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-bold)] hover:bg-[var(--bg-elevated)]"
                  >
                    {scenario.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <InputLabel htmlFor="generate-idea">核心想法</InputLabel>
              <textarea
                id="generate-idea"
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder="例如：車禍理賠流程"
                className="min-h-[150px] w-full resize-none rounded-[16px] border border-[var(--border)] bg-[var(--bg-sunken)] px-5 py-4 text-base leading-7 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="space-y-3">
                <InputLabel htmlFor="generate-industry">產業</InputLabel>
                <SelectField id="generate-industry" value={industry} onChange={setIndustry}>
                  {INDUSTRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="space-y-3">
                <InputLabel htmlFor="generate-goal">內容目標</InputLabel>
                <SelectField id="generate-goal" value={goal} onChange={setGoal}>
                  {GOAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="space-y-3">
              <InputLabel htmlFor="generate-audience">目標受眾</InputLabel>
              <input
                id="generate-audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                placeholder="例如：正在處理事故理賠的一般民眾"
                className="h-12 w-full rounded-[12px] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
              />
            </div>

            <div className="space-y-3">
              <InputLabel htmlFor="generate-voice">語氣設定</InputLabel>
              <SelectField id="generate-voice" value={voiceProfile} onChange={setVoiceProfile}>
                {VOICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isGenerating || !idea.trim()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--bg-accent)] px-6 text-[15px] font-semibold text-[var(--text-on-accent)] transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  生成中…
                </>
              ) : (
                'Generate All'
              )}
            </button>

            {pageError ? (
              <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg-sunken)] px-4 py-3 text-sm leading-6 text-[var(--text-secondary)]">
                {pageError}
              </div>
            ) : null}
          </aside>

          <section className="space-y-6">
            <PipelineProgress steps={progressSteps} />

            {brief ? (
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
                <p className="text-xs font-semibold tracking-[0.16em] text-[var(--text-tertiary)]">BRIEF</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  Planner 已完成方向規劃，四個平台會依同一份策略 brief 產出不同格式。
                </p>
              </div>
            ) : null}

            <PlatformTabs
              results={results}
              statuses={platformStatuses}
              errors={errors}
              topicSlug={runSlugRef.current}
              isGenerating={isGenerating}
            />

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">交付包</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    一鍵下載 Instagram 圖片、caption、SEO Markdown/HTML、Threads 與 Facebook 文案。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDownloadAll()}
                  disabled={!hasAnyResult || isGenerating || isDownloading}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[var(--bg-accent)] px-6 text-[15px] font-semibold text-[var(--text-on-accent)] transition-all duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDownloading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      打包中…
                    </>
                  ) : (
                    '下載全部 ZIP'
                  )}
                </button>
              </div>
              {downloadError ? <p className="mt-3 text-sm text-[var(--text-secondary)]">{downloadError}</p> : null}
            </div>
          </section>
        </section>
      </div>

      {results.instagram ? (
        <HiddenInstagramSlides slides={results.instagram.carousel_outline} slideRefs={exportSlideRefs} />
      ) : null}
    </main>
  )
}
