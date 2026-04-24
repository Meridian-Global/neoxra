export interface LayoutSlot {
  x: number
  y: number
  width: number
  maxLines: number
  fontSize: number
  fontWeight: number
  lineHeight: number
  textAlign: string
}

export interface TemplateSpec {
  id: string
  name: string
  nameZh: string
  colors: {
    background: string
    textPrimary: string
    textSecondary: string
    accent: string
    badgeBg: string
    badgeText: string
    accentBar: string
  }
  titleSlot: LayoutSlot
  bodySlot: LayoutSlot
  badgeSlot: LayoutSlot
  accentBarSlot: LayoutSlot | null
  fontFamily: string
  borderRadius: number
  padding: number
  watermark: string | null
  watermarkPosition: string
}

const DEFAULT_FONT_FAMILY =
  "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif"

export function createDefaultTemplateSpec(partial?: Partial<TemplateSpec>): TemplateSpec {
  return {
    id: 'custom',
    name: 'Custom',
    nameZh: '自訂',
    colors: {
      background: '#101828',
      textPrimary: '#F8FAFC',
      textSecondary: '#CBD5E1',
      accent: '#D6B981',
      badgeBg: '#D6B981',
      badgeText: '#111827',
      accentBar: '#D6B981',
    },
    titleSlot: { x: 72, y: 200, width: 936, maxLines: 3, fontSize: 64, fontWeight: 700, lineHeight: 1.2, textAlign: 'center' },
    bodySlot: { x: 72, y: 450, width: 936, maxLines: 6, fontSize: 28, fontWeight: 400, lineHeight: 1.6, textAlign: 'center' },
    badgeSlot: { x: 72, y: 100, width: 200, maxLines: 1, fontSize: 18, fontWeight: 600, lineHeight: 1.0, textAlign: 'center' },
    accentBarSlot: null,
    fontFamily: DEFAULT_FONT_FAMILY,
    borderRadius: 0,
    padding: 72,
    watermark: null,
    watermarkPosition: 'bottom-right',
    ...partial,
  }
}

/** Map a snake_case backend response to camelCase TemplateSpec. */
export function mapApiTemplateSpec(raw: Record<string, unknown>): TemplateSpec {
  const colors = (raw.colors ?? {}) as Record<string, string>
  const titleSlot = (raw.title_slot ?? raw.titleSlot ?? {}) as Record<string, unknown>
  const bodySlot = (raw.body_slot ?? raw.bodySlot ?? {}) as Record<string, unknown>
  const badgeSlot = (raw.badge_slot ?? raw.badgeSlot ?? {}) as Record<string, unknown>
  const accentBarSlot = (raw.accent_bar_slot ?? raw.accentBarSlot ?? null) as Record<string, unknown> | null

  return createDefaultTemplateSpec({
    id: (raw.id as string) ?? 'custom',
    name: (raw.name as string) ?? 'Custom',
    nameZh: (raw.name_zh as string) ?? '自訂',
    colors: {
      background: colors.background ?? '#101828',
      textPrimary: colors.text_primary ?? '#F8FAFC',
      textSecondary: colors.text_secondary ?? '#CBD5E1',
      accent: colors.accent ?? '#D6B981',
      badgeBg: colors.badge_bg ?? '#D6B981',
      badgeText: colors.badge_text ?? '#111827',
      accentBar: colors.accent_bar ?? '#D6B981',
    },
    titleSlot: mapLayoutSlot(titleSlot, { x: 72, y: 200, width: 936, maxLines: 3, fontSize: 64, fontWeight: 700, lineHeight: 1.2, textAlign: 'center' }),
    bodySlot: mapLayoutSlot(bodySlot, { x: 72, y: 450, width: 936, maxLines: 6, fontSize: 28, fontWeight: 400, lineHeight: 1.6, textAlign: 'center' }),
    badgeSlot: mapLayoutSlot(badgeSlot, { x: 72, y: 100, width: 200, maxLines: 1, fontSize: 18, fontWeight: 600, lineHeight: 1.0, textAlign: 'center' }),
    accentBarSlot: accentBarSlot ? mapLayoutSlot(accentBarSlot, { x: 72, y: 950, width: 200, maxLines: 1, fontSize: 12, fontWeight: 400, lineHeight: 1.0, textAlign: 'left' }) : null,
    fontFamily: (raw.font_family as string) ?? (raw.fontFamily as string) ?? undefined,
    borderRadius: (raw.border_radius as number) ?? (raw.borderRadius as number) ?? 0,
    padding: (raw.padding as number) ?? 72,
  })
}

function mapLayoutSlot(raw: Record<string, unknown>, defaults: LayoutSlot): LayoutSlot {
  return {
    x: (raw.x as number) ?? defaults.x,
    y: (raw.y as number) ?? defaults.y,
    width: (raw.width as number) ?? defaults.width,
    maxLines: (raw.max_lines as number) ?? (raw.maxLines as number) ?? defaults.maxLines,
    fontSize: (raw.font_size as number) ?? (raw.fontSize as number) ?? defaults.fontSize,
    fontWeight: (raw.font_weight as number) ?? (raw.fontWeight as number) ?? defaults.fontWeight,
    lineHeight: (raw.line_height as number) ?? (raw.lineHeight as number) ?? defaults.lineHeight,
    textAlign: (raw.text_align as string) ?? (raw.textAlign as string) ?? defaults.textAlign,
  }
}
