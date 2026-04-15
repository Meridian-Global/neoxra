'use client'

import { useState, type KeyboardEvent } from 'react'

const GOALS = ['engagement', 'authority', 'conversion', 'save', 'share'] as const
const GOAL_COPY: Record<(typeof GOALS)[number], string> = {
  engagement: 'Drive comments, likes, and fast interaction.',
  authority: 'Sound credible and insight-led without losing warmth.',
  conversion: 'Move readers toward a click, signup, or purchase.',
  save: 'Make the post reference-worthy so people keep it.',
  share: 'Increase repostability with punchy, social framing.',
}

interface InstagramFormProps {
  onSubmit: (data: { topic: string; template_text: string; goal: string }) => void
  disabled: boolean
}

export function InstagramForm({ onSubmit, disabled }: InstagramFormProps) {
  const [topic, setTopic] = useState('')
  const [templateText, setTemplateText] = useState('')
  const [goal, setGoal] = useState<string>('engagement')

  const canSubmit = topic.trim() !== '' && templateText.trim() !== '' && !disabled

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

  return (
    <form
      className="ig-form"
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
    >
      <div className="ig-form-grid">
        <div className="ig-form-main">
          <div className="ig-field">
            <label htmlFor="ig-topic">Topic</label>
            <p className="ig-field-note">
              What the post is about, who it is for, and the angle you want to own.
            </p>
            <textarea
              id="ig-topic"
              className="ig-textarea ig-textarea-lg"
              placeholder="Example: A founder-friendly post about using AI agents to reduce repetitive marketing work."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="ig-field">
            <label htmlFor="ig-template">Template text</label>
            <p className="ig-field-note">
              Paste a reference post, writing pattern, or structure you want the model to echo.
            </p>
            <textarea
              id="ig-template"
              className="ig-textarea"
              placeholder="Hook-first structure, short paragraphs, confident tone, clear CTA..."
              value={templateText}
              onChange={(e) => setTemplateText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <aside className="ig-form-side">
          <div className="ig-field">
            <label htmlFor="ig-goal">Goal</label>
            <p className="ig-field-note">{GOAL_COPY[goal as keyof typeof GOAL_COPY]}</p>
            <select
              id="ig-goal"
              className="ig-select"
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

          <div className="ig-tip-card">
            <span className="ig-tip-label">Best Input</span>
            <ul className="ig-tip-list">
              <li>Describe the audience and outcome, not just the topic.</li>
              <li>Give a strong reference structure in the template field.</li>
              <li>Use `Cmd/Ctrl + Enter` to generate quickly.</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="ig-form-footer">
        <div className="ig-form-meta">
          <span>{topic.trim() ? 'Topic ready' : 'Add a topic'}</span>
          <span>{templateText.trim() ? 'Template ready' : 'Add template text'}</span>
        </div>
        <button className="ig-primary-btn" type="submit" disabled={!canSubmit}>
          {disabled ? 'Generating…' : 'Generate Post System'}
        </button>
      </div>
    </form>
  )
}
