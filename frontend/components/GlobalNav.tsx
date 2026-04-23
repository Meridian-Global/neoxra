'use client'

import { useLanguage } from './LanguageProvider'
import Navbar from './landing/Navbar'

export function GlobalNav() {
  const { language } = useLanguage()

  const copy =
    language === 'zh-TW'
      ? {
          features: '功能',
          useCases: '使用案例',
          resources: '資源',
          pricing: '定價',
          login: '登入',
          getStarted: '開始使用',
        }
      : {
          features: 'Features',
          useCases: 'Use Cases',
          resources: 'Resources',
          pricing: 'Pricing',
          login: 'Login',
          getStarted: 'Get Started',
        }

  return <Navbar copy={copy} anchorPrefix="/" />
}
