'use client'

import { useState } from 'react'
import type { InstagramContent } from '../lib/instagram-types'

interface InstagramResultProps {
  content: InstagramContent
  critique: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button className="copy-btn" type="button" onClick={copy}>
      {copied ? 'copied' : 'copy'}
    </button>
  )
}

export function InstagramResult({ content, critique }: InstagramResultProps) {
  return (
    <div className="ig-result">
      <section className="ig-panel ig-panel-feature">
        <div className="ig-panel-head">
          <div>
            <span className="ig-section-kicker">Primary Copy</span>
            <h3>Caption</h3>
          </div>
          <CopyButton text={content.caption} />
        </div>
        <p className="ig-body-copy">{content.caption}</p>
      </section>

      <section className="ig-panel">
        <div className="ig-panel-head">
          <div>
            <span className="ig-section-kicker">Open Strong</span>
            <h3>Hook Options</h3>
          </div>
        </div>
        <ol className="ig-hook-list">
          {content.hook_options.map((hook, i) => (
            <li key={i} className="ig-hook-item">
              <span className="ig-hook-index">{String(i + 1).padStart(2, '0')}</span>
              <span>{hook}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="ig-panel">
        <div className="ig-panel-head">
          <div>
            <span className="ig-section-kicker">Discovery</span>
            <h3>Hashtags</h3>
          </div>
        </div>
        <div className="hashtag-chips">
          {content.hashtags.map((tag) => (
            <span key={tag} className="hashtag-chip">{tag}</span>
          ))}
        </div>
      </section>

      <section className="ig-panel">
        <div className="ig-panel-head">
          <div>
            <span className="ig-section-kicker">Structure</span>
            <h3>Carousel Outline</h3>
          </div>
        </div>
        <ol className="ig-carousel-outline">
          {content.carousel_outline.map((slide, i) => (
            <li key={i} className="ig-carousel-outline-item">
              <div className="ig-carousel-outline-step">Slide {i + 1}</div>
              <div>
                <strong>{slide.title}</strong>
                <p>{slide.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="ig-panel">
        <div className="ig-panel-head">
          <div>
            <span className="ig-section-kicker">Motion Version</span>
            <h3>Reel Script</h3>
          </div>
          <CopyButton text={content.reel_script} />
        </div>
        <p className="ig-body-copy">{content.reel_script}</p>
      </section>

      <section className="ig-panel ig-panel-muted">
        <div className="ig-panel-head">
          <div>
            <span className="ig-section-kicker">Editor Note</span>
            <h3>Critique</h3>
          </div>
        </div>
        <p className="critique-note">{critique}</p>
      </section>
    </div>
  )
}
