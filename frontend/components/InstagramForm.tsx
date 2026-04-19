'use client'

import { useEffect, useState, type KeyboardEvent } from 'react'

const GOALS = ['engagement', 'authority', 'conversion', 'save', 'share'] as const
const GOAL_COPY: Record<(typeof GOALS)[number], string> = {
  engagement: 'Drive comments, likes, and fast interaction.',
  authority: 'Sound credible and insight-led without losing warmth.',
  conversion: 'Move readers toward a click, signup, or purchase.',
  save: 'Make the post reference-worthy so people keep it.',
  share: 'Increase repostability with punchy, social framing.',
}

export interface InstagramFormPreset {
  label: string
  topic: string
  templateText: string
  goal: string
}

const DEMO_PRESETS: readonly InstagramFormPreset[] = [
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
}

export function InstagramForm({
  onSubmit,
  disabled,
  presets = DEMO_PRESETS,
  presetsTitle = 'Demo Presets',
  presetsDescription = 'Start with a polished narrative that is safe to use live in a YC or client demo.',
  submitLabel = 'Generate Post System',
  initialTopic = '',
  initialTemplateText = '',
  initialGoal = 'engagement',
  topicPlaceholder = 'Example: A founder-friendly post about using AI agents to reduce repetitive marketing work.',
  templatePlaceholder = 'Hook-first structure, short paragraphs, confident tone, clear CTA...',
  bestInputTips = [
    'Describe the audience and outcome, not just the topic.',
    'Give a strong reference structure in the template field.',
    'Use Cmd/Ctrl + Enter to generate quickly during demos.',
  ],
  onPreviewChange,
}: InstagramFormProps) {
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
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">
              {presetsTitle}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {presetsDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {DEMO_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={disabled}
                onClick={() => applyPreset(preset)}
                className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur">
          <div className="space-y-5">
            <div>
              <label htmlFor="ig-topic" className="block text-sm font-semibold text-[var(--text)]">
                Topic
              </label>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                What the post is about, who it is for, and the angle you want to own.
              </p>
              <textarea
                id="ig-topic"
                className="mt-3 min-h-[168px] w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-base leading-7 text-[var(--text)] outline-none transition placeholder:text-[var(--subtle)] focus:border-[var(--accent)]"
                placeholder={topicPlaceholder}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            <div>
              <label htmlFor="ig-template" className="block text-sm font-semibold text-[var(--text)]">
                Template text
              </label>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Paste a reference post, writing pattern, or structure you want the model to echo.
              </p>
              <textarea
                id="ig-template"
                className="mt-3 min-h-[180px] w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-base leading-7 text-[var(--text)] outline-none transition placeholder:text-[var(--subtle)] focus:border-[var(--accent)]"
                placeholder={templatePlaceholder}
                value={templateText}
                onChange={(e) => setTemplateText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.16)] backdrop-blur">
            <label htmlFor="ig-goal" className="block text-sm font-semibold text-[var(--text)]">
              Goal
            </label>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {GOAL_COPY[goal as keyof typeof GOAL_COPY]}
            </p>
            <select
              id="ig-goal"
              className="mt-4 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
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

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.16)] backdrop-blur">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--subtle)]">
              Best Input
            </div>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-[var(--muted)]">
              {bestInputTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex flex-wrap gap-4 text-sm text-[var(--subtle)]">
              <span>{topic.trim() ? 'Topic ready' : 'Add a topic'}</span>
              <span>{templateText.trim() ? 'Template ready' : 'Add template text'}</span>
            </div>
            <button
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[var(--text)] px-5 py-3 text-sm font-semibold text-[var(--bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              type="submit"
              disabled={!canSubmit}
            >
              {disabled ? 'Generating…' : submitLabel}
            </button>
          </div>
        </aside>
      </div>
    </form>
  )
}
