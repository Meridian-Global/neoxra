import type { AppLanguage } from '../components/LanguageProvider'
import type { InstagramResult } from './instagram-types'
import { getInstagramSampleResult } from './instagram-demo'
import { getLegalGoldenScenario } from './legal-demo'

export function getDeterministicFallbackResult(fallbackKey: string | null, language: AppLanguage): InstagramResult | null {
  if (!fallbackKey) return null

  if (fallbackKey === 'instagram-public') {
    return getInstagramSampleResult(language)
  }

  if (fallbackKey === 'legal-golden') {
    return getLegalGoldenScenario(language).result
  }

  if (fallbackKey === 'sales-startup') {
    const base = getInstagramSampleResult(language)
    return {
      ...base,
      critique:
        language === 'zh-TW'
          ? '這是一組給 sales meeting 用的穩定 fallback，強調商業價值、可讀性與現場可講解性。'
          : 'This is a deterministic sales-demo fallback designed to stay clear, business-readable, and easy to narrate live.',
    }
  }

  return null
}
