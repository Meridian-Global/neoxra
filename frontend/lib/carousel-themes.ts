export type CarouselThemeId = 'professional' | 'bold' | 'minimal'

export interface CarouselTheme {
  id: CarouselThemeId
  name: string
  bgColor: string
  textColor: string
  accentColor: string
  subtextColor: string
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

export function getCarouselTheme(themeId: CarouselThemeId): CarouselTheme {
  return CAROUSEL_THEMES.find((theme) => theme.id === themeId) ?? CAROUSEL_THEMES[0]
}
