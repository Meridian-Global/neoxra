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
