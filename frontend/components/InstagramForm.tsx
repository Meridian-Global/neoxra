'use client'

import { useState, type KeyboardEvent } from 'react'

const GOALS = ['engagement', 'authority', 'conversion', 'save', 'share'] as const

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
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
    >
      <label htmlFor="ig-topic">Topic</label>
      <textarea
        id="ig-topic"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <label htmlFor="ig-template">Template text</label>
      <textarea
        id="ig-template"
        value={templateText}
        onChange={(e) => setTemplateText(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <label htmlFor="ig-goal">Goal</label>
      <select
        id="ig-goal"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
      >
        {GOALS.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>

      <button type="submit" disabled={!canSubmit}>
        Generate
      </button>
    </form>
  )
}
