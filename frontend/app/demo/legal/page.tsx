'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CarouselPreview } from '../../../components/CarouselPreview'
import { DemoAccessGate } from '../../../components/DemoAccessGate'
import { InstagramForm } from '../../../components/InstagramForm'
import { InstagramResult as InstagramResultView } from '../../../components/InstagramResult'
import { ScorecardRadar } from '../../../components/ScorecardRadar'
import { LanguageToggle } from '../../../components/LanguageToggle'
import { useLanguage } from '../../../components/LanguageProvider'
import { ThemeToggle } from '../../../components/landing/ThemeToggle'
import { API_BASE_URL } from '../../../lib/api'
import { buildDemoHeaders, clearStoredDemoToken } from '../../../lib/demo-access'
import { getDemoSurfaceConfig } from '../../../lib/demo-config'
import {
  getLegalDemoPresets,
  getLegalDemoValueProp,
  getLegalGoldenScenario,
  getLegalVoicePresets,
} from '../../../lib/legal-demo'
import { APIError, streamSSE } from '../../../lib/sse'
import type {
  InstagramContent,
  Scorecard,
  StyleAnalysis,
} from '../../../lib/instagram-types'

const SCORE_DIMS = [
  'hook_strength',
  'cta_clarity',
  'hashtag_relevance',
  'platform_fit',
  'tone_match',
  'originality',
] as const

const KNOWN_EVENTS = new Set([
  'pipeline_started',
  'style_analysis_started',
  'style_analysis_completed',
  'generation_started',
  'generation_completed',
  'scoring_started',
  'scoring_completed',
  'pipeline_completed',
  'error',
])

type PageStatus = 'idle' | 'loading' | 'streaming' | 'completed' | 'error'
type SubmitPayload = { topic: string; template_text: string; goal: string }

function createLegalCopy(language: 'en' | 'zh-TW') {
  if (language === 'zh-TW') {
    return {
      stageLabels: {
        pipeline_started: '正在建立這次 demo 流程…',
        style_analysis_started: '正在分析內容語氣…',
        generation_started: '正在生成 Instagram 內容…',
        scoring_started: '正在評估內容品質…',
      } as Record<string, string>,
      stageSequence: [
        { event: 'style_analysis_started', label: '風格分析' },
        { event: 'generation_started', label: '內容生成' },
        { event: 'scoring_started', label: '品質評分' },
      ] as const,
      statusMeta: {
        idle: {
          label: '準備完成',
          description: '選好法律情境後，就能開始即時 demo。',
        },
        loading: {
          label: '連線中',
          description: '正在開啟串流並準備法律 demo 流程。',
        },
        streaming: {
          label: '直播中',
          description: '法律 demo 執行中，部分結果會即時出現。',
        },
        completed: {
          label: '已完成',
          description: '已收到最終 completion event，結果已可展示。',
        },
        error: {
          label: '需要注意',
          description: '流程提早中止時，可切換到 golden scenario。',
        },
      } as const,
      errors: {
        validation: '請檢查 demo 輸入內容後再試一次。',
        unavailable: '系統暫時無法使用，請改用 golden scenario 或稍後重試。',
        generic: '發生了一點問題，請再試一次。',
        timeout: '生成時間過長，請重試或改用 golden scenario。',
      },
      access: {
        eyebrow: '法律客戶 demo 存取',
        title: '這個法律 demo 目前只對已授權的客戶展示開放。',
        body: '輸入本次 law-firm demo 的 access code，或直接使用已簽章的 signed link 進入。',
        inputLabel: 'Demo access code',
        inputPlaceholder: '輸入法律 demo 的 access code',
        submitLabel: '解鎖法律 demo',
        loadingLabel: '驗證中…',
        signedLinkLoaded: '若你是從 signed link 進入，系統會自動保留這次存取權限。',
        invalidCode: 'Access code 無效，或這個連結已經過期。',
        clearAccess: '清除存取',
      },
      header: {
        badge: 'Neoxra 法律 Demo',
        workflow: '法律 demo 流程',
        back: '返回首頁',
        eyebrow: '法律服務 demo',
        title: '把法律 thought leadership 展示成策略型內容系統。',
        helper: '專為重視清楚、可信與專業感的即時會議而設計。',
        openStudio: '開啟 Instagram Studio',
        loadGolden: '載入 Golden Scenario',
        scenarioCount: '法律情境',
        voiceCount: '語氣預設',
        mode: 'demo 模式',
        live: '即時',
        safe: '穩定',
        stateTitle: 'Demo 狀態',
        complete: '已完成',
        waiting: '等待中',
        connecting: '正在連線至法律 demo 流程…',
        partial: '正在接收部分結果…',
        goldenLoaded: '已載入 golden scenario，可作為會議中的穩定展示備援。',
        cancel: '取消本次生成',
      },
      sections: {
        scenariosEyebrow: '一鍵情境',
        scenariosTitle: '選擇你想展示的法律敘事。',
        voiceEyebrow: '語氣預設',
        voiceTitle: '設定專家式口吻。',
        beforeAfterEyebrow: 'Before → After',
        beforeAfterTitle: '讓轉換過程看起來有策略感。',
        originalTopic: '原始主題',
        strategyLayer: 'Neoxra 策略層',
        platformOutputs: '平台輸出',
        goal: '目標',
        voice: '語氣',
        goldenEyebrow: 'Golden scenario',
        goldenTitle: '適合現場會議的穩定備援。',
        goldenBody: '若你希望會議中使用幾乎可預期的展示路徑，這個模式會直接載入一組已整理好的法律服務範例，不依賴即時模型輸出。',
        demoBriefEyebrow: 'Demo brief',
        demoBriefTitle: '即時生成法律導向的內容系統。',
        demoBriefBody: '從可信的法律主題出發，保持專業且值得信任的語氣，展示 Neoxra 如何把一個敘事轉成多平台 thought leadership。',
        editFlowEyebrow: '編輯後重新生成',
        editFlowTitle: '保留目前 demo，微調後再跑一次。',
        editFlowBody: '你可以在不清空畫面的情況下調整主題、模板或目標，再用新的版本重新生成。',
        editFlowUnsaved: '你有尚未套用到目前輸出的新編輯。',
        editFlowSynced: '目前畫面與最近一次送出的 demo brief 一致。',
        editFlowTopic: '目前主題',
        editFlowGoal: '目前目標',
        editFlowButton: '用目前編輯重新生成',
        editFlowJump: '回到輸入區',
        presetsTitle: '法律 demo 預設',
        presetsDescription: '為法律服務與 SMB 教育情境調整過的高品質 prompt，兼顧可信度、可收藏性與清楚度。',
        submitLabel: '生成法律 Demo',
        topicPlaceholder: '例如：給創辦人的合約風險、招募錯誤、或法律迷思教育貼文。',
        templatePlaceholder: '專業、白話、可信、可執行…',
        bestInputTips: [
          '先點出一個常見法律誤解或創業者錯誤。',
          '建議要具體到能讓人感覺你真的懂實務。',
          '用 voice preset 去貼近現場受眾。',
        ],
        errorTitle: '生成已中止',
        reset: '重設',
        useGolden: '使用 Golden Scenario',
        outputEyebrow: '輸出',
        outputTitle: '檢視法律 demo 結果。',
        outputBody: '讓客戶看到 Neoxra 不是單純生成文字，而是在替專業服務內容調整語氣、結構與可對外溝通的方式。',
        styleRead: '風格讀取',
        detectedVoice: '偵測到的法律語氣',
        structuralPatterns: '結構特徵',
        vocabularyNotes: '用詞觀察',
        preview: '預覽',
        carouselDeck: '輪播展示',
      },
      completedSteps: {
        voice: '語氣分析完成',
        draft: '內容已生成',
        review: '品質審核完成',
      },
    }
  }

  return {
    stageLabels: {
      pipeline_started: 'Setting up the generation run…',
      style_analysis_started: 'Analyzing writing style…',
      generation_started: 'Generating Instagram content…',
      scoring_started: 'Scoring content quality…',
    } as Record<string, string>,
    stageSequence: [
      { event: 'style_analysis_started', label: 'Style analysis' },
      { event: 'generation_started', label: 'Draft generation' },
      { event: 'scoring_started', label: 'Quality scoring' },
    ] as const,
    statusMeta: {
      idle: {
        label: 'Ready',
        description: 'Choose a legal scenario, then start a live generation run.',
      },
      loading: {
        label: 'Connecting',
        description: 'Opening the stream and preparing the demo workflow.',
      },
      streaming: {
        label: 'Live',
        description: 'Partial output is arriving as the legal demo runs.',
      },
      completed: {
        label: 'Completed',
        description: 'The final completion event arrived and the demo output is ready.',
      },
      error: {
        label: 'Needs attention',
        description: 'The run stopped early, so switch to the golden scenario if needed.',
      },
    } as const,
    errors: {
      validation: 'Please check the demo inputs and try again.',
      unavailable: 'System temporarily unavailable. Use the golden scenario or retry.',
      generic: 'Something went wrong. Please try again.',
      timeout: 'The generation took too long. Please retry or switch to the golden scenario.',
    },
    access: {
      eyebrow: 'Legal client demo access',
      title: 'This legal demo is limited to approved client sessions.',
      body: 'Enter the access code for this law-firm demo, or open the signed link that was shared for the meeting.',
      inputLabel: 'Demo access code',
      inputPlaceholder: 'Enter the access code for this legal demo',
      submitLabel: 'Unlock legal demo',
      loadingLabel: 'Checking access…',
      signedLinkLoaded: 'If you opened a signed link, access will be preserved automatically on this device.',
      invalidCode: 'That access code is invalid or this signed link has expired.',
      clearAccess: 'Clear access',
    },
    header: {
      badge: 'Neoxra Legal Demo',
      workflow: 'Legal demo workflow',
      back: 'Back to landing',
      eyebrow: 'Legal-services demo',
      title: 'Show legal thought leadership as a strategic content system.',
      helper: 'Built for live meetings where clarity and trust matter more than novelty.',
      openStudio: 'Open Instagram Studio',
      loadGolden: 'Load Golden Scenario',
      scenarioCount: 'legal scenarios',
      voiceCount: 'voice presets',
      mode: 'demo mode',
      live: 'Live',
      safe: 'Safe',
      stateTitle: 'Demo state',
      complete: 'Completed',
      waiting: 'Waiting',
      connecting: 'Connecting to the legal demo pipeline…',
      partial: 'Streaming partial output…',
      goldenLoaded: 'Golden scenario loaded. Use this path if you want a deterministic demo fallback.',
      cancel: 'Cancel run',
    },
    sections: {
      scenariosEyebrow: 'One-click scenarios',
      scenariosTitle: 'Pick the legal narrative you want to demo.',
      voiceEyebrow: 'Voice preset',
      voiceTitle: 'Set the expert tone.',
      beforeAfterEyebrow: 'Before → After',
      beforeAfterTitle: 'Make the transformation feel strategic.',
      originalTopic: 'Original topic',
      strategyLayer: 'Neoxra strategy layer',
      platformOutputs: 'Platform outputs',
      goal: 'Goal',
      voice: 'Voice',
      goldenEyebrow: 'Golden scenario',
      goldenTitle: 'Reliable fallback for live meetings.',
      goldenBody: 'Use this if you want a near-deterministic path during the meeting. It loads a polished legal-services example instantly without depending on live model output.',
      demoBriefEyebrow: 'Demo brief',
      demoBriefTitle: 'Generate a legal-focused content system live.',
      demoBriefBody: 'Start from a credible legal topic, keep the tone expert and trustworthy, and show how Neoxra turns one narrative into platform-ready thought leadership.',
      editFlowEyebrow: 'Edit and regenerate',
      editFlowTitle: 'Keep the current demo visible, then rerun with sharper edits.',
      editFlowBody: 'Adjust the topic, template, or goal without clearing the screen, then regenerate when you are ready.',
      editFlowUnsaved: 'You have fresh edits that are not reflected in the current output yet.',
      editFlowSynced: 'The current screen matches the most recent submitted brief.',
      editFlowTopic: 'Current topic',
      editFlowGoal: 'Current goal',
      editFlowButton: 'Regenerate with current edits',
      editFlowJump: 'Jump to input',
      presetsTitle: 'Legal demo presets',
      presetsDescription: 'High-quality prompts tuned for legal and SMB education, credibility, and save-worthy content.',
      submitLabel: 'Generate Legal Demo',
      topicPlaceholder: 'Example: A founder-facing post on contract risk, hiring mistakes, or legal myths.',
      templatePlaceholder: 'Professional, plain-English, credible, and practical...',
      bestInputTips: [
        'Lead with one legal misconception or founder mistake.',
        'Keep the advice concrete enough to sound expert, not generic.',
        'Use the voice preset to match the audience in the room.',
      ],
      errorTitle: 'Generation stopped',
      reset: 'Reset',
      useGolden: 'Use Golden Scenario',
      outputEyebrow: 'Output',
      outputTitle: 'Review the legal demo output.',
      outputBody: 'Show the client that Neoxra is not just generating text. It is shaping tone, structure, and business-safe messaging for expert-service content.',
      styleRead: 'Style read',
      detectedVoice: 'Detected legal voice',
      structuralPatterns: 'Structural patterns',
      vocabularyNotes: 'Vocabulary notes',
      preview: 'Preview',
      carouselDeck: 'Carousel Deck',
    },
    completedSteps: {
      voice: 'Voice read complete',
      draft: 'Draft generated',
      review: 'Quality review complete',
    },
  }
}

function toFriendlyError(error: unknown, copy: ReturnType<typeof createLegalCopy>): string {
  if (error instanceof APIError) {
    if (error.status === 422) {
      return copy.errors.validation
    }
    if (error.status === 503) {
      return copy.errors.unavailable
    }
    return copy.errors.generic
  }

  if (error instanceof Error && error.message.includes('timed out')) {
    return copy.errors.timeout
  }

  return copy.errors.generic
}

export default function LegalDemoPage() {
  const { language } = useLanguage()
  const copy = createLegalCopy(language)
  const demoConfig = useMemo(() => getDemoSurfaceConfig('legal'), [])
  const legalDemoPresets = getLegalDemoPresets(language)
  const legalVoicePresets = getLegalVoicePresets(language)
  const legalGoldenScenario = getLegalGoldenScenario(language)
  const legalDemoValueProp = getLegalDemoValueProp(language)
  type LegalVoicePresetId = (typeof legalVoicePresets)[number]['id']

  const [selectedScenarioLabel, setSelectedScenarioLabel] = useState(legalDemoPresets[0].label)
  const [selectedVoiceId, setSelectedVoiceId] = useState<LegalVoicePresetId>(legalVoicePresets[0].id)
  const [preview, setPreview] = useState({
    topic: legalDemoPresets[0].topic,
    template_text: legalDemoPresets[0].templateText,
    goal: legalDemoPresets[0].goal,
  })
  const [lastSubmitted, setLastSubmitted] = useState<SubmitPayload | null>(null)
  const [status, setStatus] = useState<PageStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [currentStage, setCurrentStage] = useState('')
  const [styleAnalysis, setStyleAnalysis] = useState<StyleAnalysis | null>(null)
  const [content, setContent] = useState<InstagramContent | null>(null)
  const [scorecard, setScorecard] = useState<Scorecard | null>(null)
  const [critique, setCritique] = useState<string | null>(null)
  const [resultOrigin, setResultOrigin] = useState<'live' | 'golden' | null>(null)
  const [demoToken, setDemoToken] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const selectedScenario = useMemo(
    () => legalDemoPresets.find((preset) => preset.label === selectedScenarioLabel) ?? legalDemoPresets[0],
    [legalDemoPresets, selectedScenarioLabel],
  )
  const selectedVoice = useMemo(
    () => legalVoicePresets.find((preset) => preset.id === selectedVoiceId) ?? legalVoicePresets[0],
    [legalVoicePresets, selectedVoiceId],
  )

  useEffect(() => {
    if (!legalDemoPresets.some((preset) => preset.label === selectedScenarioLabel)) {
      setSelectedScenarioLabel(legalDemoPresets[0].label)
      setPreview({
        topic: legalDemoPresets[0].topic,
        template_text: legalDemoPresets[0].templateText,
        goal: legalDemoPresets[0].goal,
      })
    }
  }, [legalDemoPresets, selectedScenarioLabel])

  const beforeAfterTopic = preview.topic.trim() || selectedScenario.topic
  const beforeAfterGoal = preview.goal || selectedScenario.goal
  const completedSteps = [
    styleAnalysis ? copy.completedSteps.voice : null,
    content ? copy.completedSteps.draft : null,
    scorecard ? copy.completedSteps.review : null,
  ].filter(Boolean) as string[]
  const statusMeta = copy.statusMeta[status]
  const activeStepIndex = currentStage
    ? copy.stageSequence.findIndex((item) => copy.stageLabels[item.event] === currentStage)
    : status === 'completed'
      ? copy.stageSequence.length
      : -1
  const isLoading = status === 'loading'
  const isStreaming = status === 'streaming'
  const isWorking = isLoading || isStreaming
  const hasResults = Boolean(styleAnalysis || content || scorecard || critique)
  const needsAccess = demoConfig.accessMode === 'gated' && !demoToken
  const hasPendingEdits = Boolean(
    lastSubmitted &&
      (preview.topic !== lastSubmitted.topic ||
        preview.template_text !== lastSubmitted.template_text ||
        preview.goal !== lastSubmitted.goal)
  )

  const clearResults = useCallback(() => {
    setStyleAnalysis(null)
    setContent(null)
    setScorecard(null)
    setCritique(null)
    setError(null)
    setCurrentStage('')
    setResultOrigin(null)
  }, [])

  const applyGoldenScenario = useCallback(() => {
    abortRef.current?.abort()
    setSelectedScenarioLabel(legalGoldenScenario.label)
    setSelectedVoiceId('trusted-counsel')
    setPreview({
      topic: legalGoldenScenario.topic,
      template_text: legalDemoPresets.find((preset) => preset.label === legalGoldenScenario.label)?.templateText ?? '',
      goal: legalDemoPresets.find((preset) => preset.label === legalGoldenScenario.label)?.goal ?? 'save',
    })
    setStyleAnalysis(legalGoldenScenario.result.style_analysis)
    setContent(legalGoldenScenario.result.content)
    setScorecard(legalGoldenScenario.result.scorecard)
    setCritique(legalGoldenScenario.result.critique)
    setError(null)
    setCurrentStage('')
    setStatus('completed')
    setResultOrigin('golden')
  }, [legalDemoPresets, legalGoldenScenario])

  const handleScenarioSelect = useCallback((label: string) => {
    setSelectedScenarioLabel(label)
    clearResults()
    setStatus('idle')
  }, [clearResults])

  const handleSubmit = useCallback(
    async (data: SubmitPayload) => {
      setLastSubmitted(data)
      clearResults()
      setStatus('loading')

      const abort = new AbortController()
      abortRef.current = abort
      let completed = false
      let failed = false
      let sawStreamEvent = false
      const enrichedTemplate = `${data.template_text}\n\nVoice preset: ${selectedVoice.label}. ${selectedVoice.instructions}`

      try {
        for await (const { event, data: payload } of streamSSE(
          `${API_BASE_URL}/api/instagram/generate`,
          {
            topic: data.topic,
            template_text: enrichedTemplate,
            goal: data.goal,
            locale: language,
          },
          {
            signal: abort.signal,
            timeoutMs: 45_000,
            headers: buildDemoHeaders(demoConfig.apiSurface, demoToken),
          },
        )) {
          if (abort.signal.aborted) break
          if (!sawStreamEvent) {
            sawStreamEvent = true
            setStatus('streaming')
          }

          if (!KNOWN_EVENTS.has(event)) {
            setError(copy.errors.generic)
            setStatus('error')
            failed = true
            break
          }

          if (event in copy.stageLabels) {
            setCurrentStage(copy.stageLabels[event])
            continue
          }

          if (event === 'style_analysis_completed') {
            setStyleAnalysis(payload as StyleAnalysis)
            setCurrentStage('')
            continue
          }

          if (event === 'generation_completed') {
            setContent(payload as InstagramContent)
            setCurrentStage('')
            continue
          }

          if (event === 'scoring_completed') {
            const avg = SCORE_DIMS.reduce((sum, dim) => sum + payload[dim], 0) / SCORE_DIMS.length
            setScorecard({ ...payload, average: avg } as Scorecard)
            setCurrentStage('')
            continue
          }

          if (event === 'pipeline_completed') {
            setContent(payload.content)
            setScorecard(payload.scorecard)
            setCritique(payload.critique)
            setStyleAnalysis(payload.style_analysis)
            setCurrentStage('')
            setStatus('completed')
            setResultOrigin('live')
            completed = true
            continue
          }

          if (event === 'error') {
            const rawMessage = typeof payload?.message === 'string' ? payload.message : ''
            if (rawMessage.includes('temporarily unavailable')) {
              setError(copy.errors.unavailable)
            } else {
              setError(copy.errors.generic)
            }
            setStatus('error')
            failed = true
            break
          }
        }

        if (!abort.signal.aborted && !completed && !failed) {
          setError(copy.errors.generic)
          setStatus('error')
          setCurrentStage('')
        }
      } catch (err) {
        if (!abort.signal.aborted && (!(err instanceof DOMException) || err.name !== 'AbortError')) {
          if (err instanceof APIError && err.status === 401) {
            clearStoredDemoToken(demoConfig.apiSurface)
            setDemoToken(null)
            setError(copy.access.invalidCode)
          } else {
            setError(toFriendlyError(err, copy))
          }
          setStatus('error')
          setCurrentStage('')
        }
      }
    },
    [clearResults, copy, demoConfig.apiSurface, demoToken, language, selectedVoice],
  )

  function handleCancel() {
    abortRef.current?.abort()
    setStatus('idle')
    setCurrentStage('')
  }

  function handleRetry() {
    clearResults()
    setStatus('idle')
  }

  const editPanel =
    hasResults || status === 'error' ? (
      <div className="rounded-3xl border border-[color:var(--accent-soft)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.14)]">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.sections.editFlowEyebrow}</div>
        <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--text)]">{copy.sections.editFlowTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy.sections.editFlowBody}</p>

        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-sm font-medium text-[var(--text)]">
            {hasPendingEdits ? copy.sections.editFlowUnsaved : copy.sections.editFlowSynced}
          </div>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.sections.editFlowTopic}</div>
              <div className="mt-1 line-clamp-3 text-[var(--muted)]">{preview.topic || '-'}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.sections.editFlowGoal}</div>
              <div className="mt-1 text-[var(--muted)]">{preview.goal || '-'}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleSubmit(preview)}
            disabled={isWorking || !preview.topic.trim() || !preview.template_text.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.sections.editFlowButton}
          </button>
          <a
            href="#legal-demo-form"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
          >
            {copy.sections.editFlowJump}
          </a>
        </div>
      </div>
    ) : null

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 pb-20 pt-8 sm:px-6 lg:px-8 lg:pb-28">
        {needsAccess ? (
          <section className="pt-12 sm:pt-16">
            <div className="mb-8 flex items-center justify-between gap-4 text-sm text-[var(--muted)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                {copy.header.badge}
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--subtle)] transition hover:border-white/20 hover:text-[var(--text)]"
                >
                  {copy.header.back}
                </Link>
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
            <DemoAccessGate surface={demoConfig.apiSurface} copy={copy.access} onAccessReady={setDemoToken} />
          </section>
        ) : null}

        {!needsAccess ? (
          <>
        <section className="pt-8 sm:pt-12">
          <div className="mb-12 flex items-center justify-between gap-4 text-sm text-[var(--muted)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
              {copy.header.badge}
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-[var(--subtle)] sm:block">{copy.header.workflow}</div>
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--subtle)] transition hover:border-white/20 hover:text-[var(--text)]"
              >
                {copy.header.back}
              </Link>
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_360px] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center rounded-full border border-[color:var(--accent-soft)] bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-[var(--text)]">
                {copy.header.eyebrow}
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.075em] text-[var(--text)] sm:text-5xl lg:text-6xl">
                {copy.header.title}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                {legalDemoValueProp}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/instagram"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[var(--surface)]"
                >
                  {copy.header.openStudio}
                </Link>
                <button
                  type="button"
                  onClick={applyGoldenScenario}
                  className="inline-flex items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90"
                >
                  {copy.header.loadGolden}
                </button>
                <div className="text-sm text-[var(--subtle)]">
                  {copy.header.helper}
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">4</div>
                  <div className="text-sm text-[var(--subtle)]">{copy.header.scenarioCount}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">3</div>
                  <div className="text-sm text-[var(--subtle)]">{copy.header.voiceCount}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
                  <div className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                    {resultOrigin === 'golden' ? copy.header.safe : copy.header.live}
                  </div>
                  <div className="text-sm text-[var(--subtle)]">{copy.header.mode}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-[var(--text)]">{copy.header.stateTitle}</div>
                <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--subtle)]">
                  {statusMeta.label}
                </span>
              </div>

              <p className="mb-4 text-sm leading-6 text-[var(--muted)]">{statusMeta.description}</p>

              <div className="space-y-3">
                {copy.stageSequence.map((step, index) => {
                  const isComplete =
                    status === 'completed' ||
                    index < activeStepIndex ||
                    (index === 0 && styleAnalysis && !currentStage) ||
                    (index === 1 && content && !currentStage) ||
                    (index === 2 && scorecard && !currentStage)
                  const isActive = index === activeStepIndex && isWorking

                  return (
                    <div
                      key={step.event}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                        isActive
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                          : isComplete
                            ? 'border-[var(--border)] bg-[var(--surface)]'
                            : 'border-[var(--border)] bg-transparent'
                      }`}
                    >
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${
                          isActive ? 'bg-[var(--accent)]' : isComplete ? 'bg-[var(--text)]' : 'bg-[var(--subtle)]'
                        }`}
                      />
                      <div>
                        <div className="text-sm font-medium text-[var(--text)]">{step.label}</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {isActive ? copy.stageLabels[step.event] : isComplete ? copy.header.complete : copy.header.waiting}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {(isLoading || isStreaming) && (
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
                  {isLoading ? copy.header.connecting : currentStage || copy.header.partial}
                </div>
              )}

              {completedSteps.length > 0 && (
                <div className="mt-4 text-sm text-[var(--subtle)]">{completedSteps.join(' • ')}</div>
              )}

              {resultOrigin === 'golden' && (
                <div className="mt-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                  {copy.header.goldenLoaded}
                </div>
              )}

              {isWorking && (
                <button
                  className="mt-5 inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--panel)] px-5 py-3 text-sm font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)]"
                  onClick={handleCancel}
                >
                  {copy.header.cancel}
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur">
            <div className="mb-4">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.sections.scenariosEyebrow}</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                {copy.sections.scenariosTitle}
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {legalDemoPresets.map((preset) => {
                const isSelected = preset.label === selectedScenarioLabel
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleScenarioSelect(preset.label)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[var(--text)]">{preset.label}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{preset.topic}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur">
            <div className="mb-4">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.sections.voiceEyebrow}</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                {copy.sections.voiceTitle}
              </h2>
            </div>
            <div className="space-y-3">
              {legalVoicePresets.map((preset) => {
                const isSelected = preset.id === selectedVoiceId
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedVoiceId(preset.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <div className="text-sm font-semibold text-[var(--text)]">{preset.label}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{preset.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur">
            <div className="mb-4">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.sections.beforeAfterEyebrow}</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                {copy.sections.beforeAfterTitle}
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.sections.originalTopic}</div>
                <p className="mt-3 text-sm leading-6 text-[var(--text)]">{beforeAfterTopic}</p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.sections.strategyLayer}</div>
                <p className="mt-3 text-sm leading-6 text-[var(--text)]">{selectedScenario.strategy}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--subtle)]">
                  {copy.sections.goal}: {beforeAfterGoal} • {copy.sections.voice}: {selectedVoice.label}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--subtle)]">{copy.sections.platformOutputs}</div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text)]">
                  {selectedScenario.platformOutcomes.map((outcome) => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.14)] backdrop-blur">
            <div className="mb-4">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.sections.goldenEyebrow}</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">
                {copy.sections.goldenTitle}
              </h2>
            </div>
            <p className="text-sm leading-6 text-[var(--muted)]">
              {copy.sections.goldenBody}
            </p>
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="text-sm font-semibold text-[var(--text)]">{legalGoldenScenario.label}</div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{legalGoldenScenario.transformation}</p>
            </div>
            <button
              type="button"
              onClick={applyGoldenScenario}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90"
            >
              {copy.header.loadGolden}
            </button>
          </div>
        </section>

        <section>
          <div className="mb-6 max-w-2xl">
            <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">
              {copy.sections.demoBriefEyebrow}
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
              {copy.sections.demoBriefTitle}
            </h2>
            <p className="mt-3 text-base leading-7 text-[var(--muted)]">
              {copy.sections.demoBriefBody}
            </p>
          </div>

          <InstagramForm
            key={selectedScenarioLabel}
            onSubmit={handleSubmit}
            disabled={isWorking}
            presets={legalDemoPresets}
            presetsTitle={copy.sections.presetsTitle}
            presetsDescription={copy.sections.presetsDescription}
            submitLabel={lastSubmitted ? copy.sections.editFlowButton : copy.sections.submitLabel}
            initialTopic={selectedScenario.topic}
            initialTemplateText={selectedScenario.templateText}
            initialGoal={selectedScenario.goal}
            topicPlaceholder={copy.sections.topicPlaceholder}
            templatePlaceholder={copy.sections.templatePlaceholder}
            bestInputTips={copy.sections.bestInputTips}
            onPreviewChange={setPreview}
            formAnchorId="legal-demo-form"
            helperPanel={editPanel}
          />
        </section>

        {status === 'error' && error && (
          <div className="rounded-3xl border border-rose-400/30 bg-rose-400/10 p-5 text-[var(--text)]">
            <div>
              <strong className="block text-base">{copy.sections.errorTitle}</strong>
              <p className="mt-2 text-sm leading-6 text-rose-100/90">{error}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-[var(--text)] transition hover:bg-white/10"
                onClick={handleRetry}
              >
                {copy.sections.reset}
              </button>
              <button
                className="inline-flex items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90"
                onClick={applyGoldenScenario}
              >
                {copy.sections.useGolden}
              </button>
            </div>
          </div>
        )}

        {(styleAnalysis || content || scorecard) && (
          <section>
            <div className="mb-6 max-w-2xl">
              <div>
                <span className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--subtle)]">{copy.sections.outputEyebrow}</span>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text)] sm:text-4xl">
                  {copy.sections.outputTitle}
                </h2>
              </div>
              <p className="mt-3 text-base leading-7 text-[var(--muted)]">
                {copy.sections.outputBody}
              </p>
            </div>

            {styleAnalysis && (
              <section className="mb-6 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5">
                <div className="mb-4">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.sections.styleRead}</span>
                  <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">{copy.sections.detectedVoice}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {styleAnalysis.tone_keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text)]"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">{copy.sections.structuralPatterns}</h4>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--muted)]">
                      {styleAnalysis.structural_patterns.map((pattern) => (
                        <li key={pattern}>{pattern}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">{copy.sections.vocabularyNotes}</h4>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{styleAnalysis.vocabulary_notes}</p>
                  </div>
                </div>
              </section>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_360px]">
              {content && (
                <div>
                  <InstagramResultView content={content} critique={critique ?? ''} />
                </div>
              )}

              <div className="space-y-6">
                {scorecard && (
                  <div>
                    <ScorecardRadar scorecard={scorecard} />
                  </div>
                )}

                {critique !== null && content && (
                  <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5">
                    <div className="mb-4">
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">{copy.sections.preview}</span>
                      <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text)]">{copy.sections.carouselDeck}</h3>
                    </div>
                    <CarouselPreview slides={content.carousel_outline} />
                  </section>
                )}
              </div>
            </div>
          </section>
        )}
          </>
        ) : null}
      </div>
    </main>
  )
}
