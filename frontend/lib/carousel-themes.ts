export type CarouselThemeId = 'professional' | 'bold' | 'minimal' | 'dynamic'

export interface CarouselTheme {
  id: CarouselThemeId
  name: string
  bgColor: string
  textColor: string
  accentColor: string
  subtextColor: string
}

export interface DynamicCarouselTheme extends CarouselTheme {
  id: 'dynamic'
  source: 'reference-image'
}

export const CAROUSEL_THEMES: CarouselTheme[] = [
  {
    id: 'professional',
    name: '專業',
    bgColor: '#101828',
    textColor: '#F8FAFC',
    accentColor: '#D6B981',
    subtextColor: '#CBD5E1',
  },
  {
    id: 'bold',
    name: '醒目',
    bgColor: 'linear-gradient(135deg, #111827 0%, #8A4B2A 52%, #D6B981 100%)',
    textColor: '#FFFFFF',
    accentColor: '#FDE68A',
    subtextColor: '#FFF7ED',
  },
  {
    id: 'minimal',
    name: '極簡',
    bgColor: '#F7F1E8',
    textColor: '#1F2937',
    accentColor: '#8A6A3D',
    subtextColor: '#5F5A52',
  },
]

export function createDynamicTheme(palette: {
  background: string
  textPrimary: string
  accent: string
  textSecondary: string
}): DynamicCarouselTheme {
  return {
    id: 'dynamic',
    name: 'Custom',
    bgColor: palette.background,
    textColor: palette.textPrimary,
    accentColor: palette.accent,
    subtextColor: palette.textSecondary,
    source: 'reference-image',
  }
}

export function getCarouselTheme(themeId: CarouselThemeId, dynamicTheme?: CarouselTheme): CarouselTheme {
  if (themeId === 'dynamic' && dynamicTheme) return dynamicTheme
  return CAROUSEL_THEMES.find((theme) => theme.id === themeId) ?? CAROUSEL_THEMES[0]
}
