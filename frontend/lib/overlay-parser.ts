import type { OverlaySlideData, TextLineData } from './render-api'

/**
 * Parse bulk text input into overlay slides.
 *
 * Format:
 * - Slides separated by a line containing only "==="
 * - Within each slide, first line before "---" is the title
 * - Lines wrapped in **...** are full-line emphasis
 * - Text wrapped in ==...== within a line is partial emphasis
 * - Everything else is normal text
 *
 * Example:
 * ```
 * 前言：RUNWAY 是誰
 * ---
 * 他們是雲端上的數位電影工作室
 * **讓每個人都能成為電影導演**
 * 目前估值已達到==三十億美元==
 * ===
 * 第二張標題
 * ---
 * 正文行...
 * ```
 */
export function parseOverlayInput(raw: string): OverlaySlideData[] {
  const blocks = raw.split(/^===$/m).map((b) => b.trim()).filter(Boolean)
  return blocks.map(parseOneSlide)
}

function parseOneSlide(block: string): OverlaySlideData {
  const parts = block.split(/^---$/m)
  let title = ''
  let bodyRaw = ''

  if (parts.length >= 2) {
    title = parts[0].trim()
    bodyRaw = parts.slice(1).join('---').trim()
  } else {
    // No --- separator — treat entire block as body lines (no title)
    bodyRaw = block.trim()
  }

  const lines: TextLineData[] = bodyRaw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseLine)

  return { title, lines }
}

function parseLine(raw: string): TextLineData {
  // Full-line emphasis: **entire line**
  const fullMatch = raw.match(/^\*\*(.+)\*\*$/)
  if (fullMatch) {
    return { text: fullMatch[1], emphasis: true }
  }

  // Partial emphasis: some text ==highlighted part== more text
  const partialMatch = raw.match(/==(.+?)==/)
  if (partialMatch) {
    const cleanText = raw.replace(/==(.+?)==/g, '$1')
    return { text: cleanText, partial_emphasis: partialMatch[1] }
  }

  return { text: raw }
}

/**
 * Serialize slides back to the text format for editing.
 */
export function serializeOverlaySlides(slides: OverlaySlideData[]): string {
  return slides
    .map((slide) => {
      const parts: string[] = []
      if (slide.title) {
        parts.push(slide.title)
        parts.push('---')
      }
      for (const line of slide.lines) {
        if (line.emphasis) {
          parts.push(`**${line.text}**`)
        } else if (line.partial_emphasis) {
          parts.push(line.text.replace(line.partial_emphasis, `==${line.partial_emphasis}==`))
        } else {
          parts.push(line.text)
        }
      }
      return parts.join('\n')
    })
    .join('\n\n===\n\n')
}
