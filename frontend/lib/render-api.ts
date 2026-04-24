import JSZip from 'jszip'
import { API_BASE_URL } from './api'

export async function renderCarousel(
  templateId: string,
  slides: { title: string; body: string; text_alignment?: string; emphasis?: string }[],
  customTemplateSpec?: Record<string, unknown> | null,
): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/api/render/carousel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_id: templateId,
      slides: slides.map((s) => ({
        title: s.title,
        body: s.body,
        text_alignment: s.text_alignment ?? 'center',
        emphasis: s.emphasis ?? 'normal',
      })),
      template_spec: customTemplateSpec ?? null,
    }),
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'Rendering failed')
  }

  const zipBlob = await res.blob()
  const zip = await JSZip.loadAsync(zipBlob)
  const images: string[] = []

  const fileNames = Object.keys(zip.files).sort()
  for (const name of fileNames) {
    if (name.endsWith('.png')) {
      const base64 = await zip.files[name].async('base64')
      images.push(`data:image/png;base64,${base64}`)
    }
  }

  return images
}

// ---------------------------------------------------------------------------
// Overlay rendering
// ---------------------------------------------------------------------------

export interface TextLineData {
  text: string
  emphasis?: boolean
  partial_emphasis?: string
}

export interface TextZoneConfig {
  y_start: number
  y_end: number
  x_left?: number
  x_right?: number
  font_size?: number
  font_weight?: number
  line_height?: number
  text_align?: string
  color?: string
  emphasis_color?: string
}

export interface OverlaySlideData {
  title?: string
  lines: TextLineData[]
}

export async function renderOverlay(
  templateImage: string,
  slides: OverlaySlideData[],
  titleZone: TextZoneConfig,
  contentZone: TextZoneConfig,
  options?: {
    watermark?: string
    watermarkColor?: string
    watermarkX?: number
    watermarkY?: number
    watermarkFontSize?: number
  },
): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/api/render/overlay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template_image: templateImage,
      slides,
      title_zone: titleZone,
      content_zone: contentZone,
      watermark: options?.watermark ?? '',
      watermark_color: options?.watermarkColor ?? 'rgba(255,255,255,0.6)',
      watermark_x: options?.watermarkX ?? 900,
      watermark_y: options?.watermarkY ?? 1040,
      watermark_font_size: options?.watermarkFontSize ?? 24,
    }),
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'Overlay rendering failed')
  }

  const zipBlob = await res.blob()
  const zip = await JSZip.loadAsync(zipBlob)
  const images: string[] = []
  const fileNames = Object.keys(zip.files).sort()
  for (const name of fileNames) {
    if (name.endsWith('.png')) {
      const base64 = await zip.files[name].async('base64')
      images.push(`data:image/png;base64,${base64}`)
    }
  }
  return images
}
