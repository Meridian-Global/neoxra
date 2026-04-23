'use client'

import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useLanguage } from './LanguageProvider'

const GOALS = ['engagement', 'authority', 'conversion', 'save', 'share'] as const

export interface InstagramFormPreset {
  label: string
  topic: string
  templateText: string
  goal: string
}

interface InstagramFormProps {
  onSubmit: (data: { topic: string; template_text: string; goal: string }) => void
  disabled: boolean
  presets?: readonly InstagramFormPreset[]
  presetsTitle?: string
  presetsDescription?: string
  submitLabel?: string
  initialTopic?: string
  initialTemplateText?: string
  initialGoal?: string
  topicPlaceholder?: string
  templatePlaceholder?: string
  bestInputTips?: readonly string[]
  onPreviewChange?: (data: { topic: string; template_text: string; goal: string }) => void
  formAnchorId?: string
  helperPanel?: ReactNode
}

export function InstagramForm({
  onSubmit,
  disabled,
  presets,
  presetsTitle,
  presetsDescription,
  submitLabel,
  initialTopic = '',
  initialTemplateText = '',
  initialGoal = 'engagement',
  topicPlaceholder,
  templatePlaceholder,
  bestInputTips,
  onPreviewChange,
  formAnchorId,
  helperPanel,
}: InstagramFormProps) {
  const { language } = useLanguage()

  const goalCopy: Record<(typeof GOALS)[number], string> =
    language === 'zh-TW'
      ? {
          engagement: '提升留言、按讚與互動。',
          authority: '建立可信度與專業感，同時維持親和力。',
          conversion: '引導讀者點擊、註冊或採取下一步行動。',
          save: '讓內容值得被收藏與反覆參考。',
          share: '用更容易轉發的社交語感提高分享率。',
        }
      : {
          engagement: 'Drive comments, likes, and fast interaction.',
          authority: 'Sound credible and insight-led without losing warmth.',
          conversion: 'Move readers toward a click, signup, or purchase.',
          save: 'Make the post reference-worthy so people keep it.',
          share: 'Increase repostability with punchy, social framing.',
        }

  const localizedPresets: readonly InstagramFormPreset[] =
    language === 'zh-TW'
      ? [
          {
            label: '小團隊效率',
            topic: 'AI 工具如何幫助小團隊在不增加人力下更快出貨',
            templateText:
              '先用 hook，段落短，語氣實用清楚，最後有明確 CTA。用一個瓶頸、一個流程改變，以及一個創辦人能立刻採取的行動。',
            goal: 'engagement',
          },
          {
            label: '法律風險',
            topic: '創業者簽合約時最常忽略的法律風險',
            templateText:
              '語氣自信但清楚。先講一個可避免的錯誤，再用白話說明真正風險，最後給一個簽名前可以採取的動作。',
            goal: 'authority',
          },
          {
            label: '內容分發',
            topic: '為什麼多數創辦人都低估了內容分發的重要性',
            templateText:
              '語氣犀利、面向創辦人、略帶挑戰性。先點出錯誤認知，再對比真正帶來成效的做法，最後用直接 CTA 收尾。',
            goal: 'save',
          },
        ] as const
      : [
          {
            label: 'Small teams',
            topic: 'How AI tools help small teams ship faster without adding headcount',
            templateText:
              'Hook first, short paragraphs, practical tone, clear CTA. Use one bottleneck, one workflow change, and one takeaway founders can act on immediately.',
            goal: 'engagement',
          },
          {
            label: 'Legal risks',
            topic: 'Common legal mistakes startups make when signing contracts',
            templateText:
              'Confident but clear. Open with an avoidable mistake, explain the real risk in plain English, then close with one practical action founders should take before signing.',
            goal: 'authority',
          },
          {
            label: 'Distribution',
            topic: 'Why most founders underestimate content distribution',
            templateText:
              'Sharp, founder-facing, and slightly provocative. Start with the mistaken belief, contrast it with what actually drives traction, then end with a direct call to rethink distribution.',
            goal: 'save',
          },
        ] as const

  const resolvedPresets = presets ?? localizedPresets
  const resolvedPresetsTitle = presetsTitle ?? (language === 'zh-TW' ? 'Demo 預設情境' : 'Demo Presets')
  const resolvedPresetsDescription =
    presetsDescription ??
    (language === 'zh-TW'
      ? '先選一個適合現場展示的高品質敘事，讓 demo 更穩定。'
      : 'Start with a polished narrative that is safe to use live in a YC or client demo.')
  const resolvedSubmitLabel = submitLabel ?? (language === 'zh-TW' ? '產生內容系統' : 'Generate Post System')
  const resolvedTopicPlaceholder =
    topicPlaceholder ??
    (language === 'zh-TW'
      ? '例如：一篇面向創辦人的貼文，主題是用 AI agents 降低重複性工作。'
      : 'Example: A founder-friendly post about using AI agents to reduce repetitive marketing work.')
  const resolvedTemplatePlaceholder =
    templatePlaceholder ??
    (language === 'zh-TW'
      ? 'Hook-first 結構、短段落、自信語氣、明確 CTA...'
      : 'Hook-first structure, short paragraphs, confident tone, clear CTA...')
  const resolvedBestInputTips =
    bestInputTips ??
    (language === 'zh-TW'
      ? [
          '不要只寫主題，也描述目標受眾與你想強調的結果。',
          '在 template 欄位放入你希望模型模仿的結構或參考文。',
          '現場 demo 時可以用 Cmd/Ctrl + Enter 快速送出。',
        ]
      : [
          'Describe the audience and outcome, not just the topic.',
          'Give a strong reference structure in the template field.',
          'Use Cmd/Ctrl + Enter to generate quickly during demos.',
        ])

  const [topic, setTopic] = useState(initialTopic)
  const [templateText, setTemplateText] = useState(initialTemplateText)
  const [goal, setGoal] = useState<string>(initialGoal)

  const canSubmit = topic.trim() !== '' && templateText.trim() !== '' && !disabled

  useEffect(() => {
    onPreviewChange?.({ topic, template_text: templateText, goal })
  }, [goal, onPreviewChange, templateText, topic])

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit({ topic, template_text: templateText, goal })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function applyPreset(preset: InstagramFormPreset) {
    setTopic(preset.topic)
    setTemplateText(preset.templateText)
    setGoal(preset.goal)
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
    >
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">
              {resolvedPresetsTitle}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{resolvedPresetsDescription}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {resolvedPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={disabled}
                onClick={() => applyPreset(preset)}
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:bg-[var(--bg-elevated-2)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div id={formAnchorId} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)] backdrop-blur">
          <div className="space-y-5">
            <div>
              <label htmlFor="ig-topic" className="block text-sm font-semibold text-[var(--text)]">
                {language === 'zh-TW' ? '主題' : 'Topic'}
              </label>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {language === 'zh-TW'
                  ? '這篇內容在談什麼、寫給誰看，以及你想主張的角度。'
                  : 'What the post is about, who it is for, and the angle you want to own.'}
              </p>
              <textarea
                id="ig-topic"
                className="mt-3 min-h-[168px] w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4 text-base leading-7 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
                placeholder={resolvedTopicPlaceholder}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div>
              <label htmlFor="ig-template" className="block text-sm font-semibold text-[var(--text)]">
                {language === 'zh-TW' ? '參考模板' : 'Template text'}
              </label>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {language === 'zh-TW'
                  ? '貼上你希望模型參考的文章、寫法或結構。'
                  : 'Paste a reference post, writing pattern, or structure you want the model to echo.'}
              </p>
              <textarea
                id="ig-template"
                className="mt-3 min-h-[180px] w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-4 text-base leading-7 text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)]"
                placeholder={resolvedTemplatePlaceholder}
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          {helperPanel}

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)] backdrop-blur">
            <label htmlFor="ig-goal" className="block text-sm font-semibold text-[var(--text)]">
              {language === 'zh-TW' ? '目標' : 'Goal'}
            </label>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{goalCopy[goal as keyof typeof goalCopy]}</p>
            <select
              id="ig-goal"
              className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            >
              {GOALS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-lg)] backdrop-blur">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">
              {language === 'zh-TW' ? '最佳輸入方式' : 'Best Input'}
            </div>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-[var(--muted)]">
              {resolvedBestInputTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="flex flex-wrap gap-4 text-sm text-[var(--subtle)]">
              <span>
                {topic.trim() ? (language === 'zh-TW' ? '主題已就緒' : 'Topic ready') : (language === 'zh-TW' ? '請填寫主題' : 'Add a topic')}
              </span>
              <span>
                {templateText.trim()
                  ? language === 'zh-TW'
                    ? '模板已就緒'
                    : 'Template ready'
                  : language === 'zh-TW'
                    ? '請填寫模板'
                    : 'Add template text'}
              </span>
            </div>
            <button
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[image:var(--gradient-cta)] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[image:var(--gradient-cta-hover)] disabled:cursor-not-allowed disabled:opacity-40"
              type="submit"
              disabled={!canSubmit}
            >
              {disabled ? (language === 'zh-TW' ? '產生中…' : 'Generating…') : resolvedSubmitLabel}
            </button>
          </div>
        </aside>
      </div>
    </form>
  )
}
