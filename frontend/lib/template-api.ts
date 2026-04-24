import { API_BASE_URL } from './api'
import type { TemplateInfo } from './instagram-types'
import { mapApiTemplateSpec, type TemplateSpec } from './template-types'

interface RawTemplate {
  id: string
  name: string
  name_zh: string
  preview_colors: {
    background: string
    text_primary: string
    accent: string
  }
  style: string
}

export async function fetchTemplates(): Promise<TemplateInfo[]> {
  const res = await fetch(`${API_BASE_URL}/api/templates`)
  if (!res.ok) throw new Error('Failed to fetch templates')
  const data = await res.json()
  return (data.templates as RawTemplate[]).map((t) => ({
    id: t.id,
    name: t.name,
    nameZh: t.name_zh,
    previewColors: {
      background: t.preview_colors.background,
      textPrimary: t.preview_colors.text_primary,
      accent: t.preview_colors.accent,
    },
    style: t.style,
  }))
}

export async function fetchTemplate(templateId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE_URL}/api/templates/${templateId}`)
  if (!res.ok) throw new Error('Template not found')
  return res.json()
}

export interface ParseTemplateResult {
  templateSpec: TemplateSpec
  parsingConfidence: number
  description: string
}

export async function parseTemplateImage(file: File): Promise<ParseTemplateResult> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE_URL}/api/templates/parse-image`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'Template parsing failed')
  }
  const data = await res.json()
  return {
    templateSpec: mapApiTemplateSpec(data.template_spec ?? {}),
    parsingConfidence: data.parsing_confidence ?? 0,
    description: data.description ?? '',
  }
}
