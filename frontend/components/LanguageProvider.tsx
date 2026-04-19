'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type AppLanguage = 'en' | 'zh-TW'

const STORAGE_KEY = 'neoxra-language'

interface LanguageContextValue {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
}

const FALLBACK_CONTEXT: LanguageContextValue = {
  language: 'en',
  setLanguage: () => {},
}

const LanguageContext = createContext<LanguageContextValue>(FALLBACK_CONTEXT)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'zh-TW' || stored === 'en') {
        setLanguageState(stored)
      }
    } catch {}
  }, [])

  function setLanguage(nextLanguage: AppLanguage) {
    setLanguageState(nextLanguage)
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage)
    } catch {}
  }

  const value = useMemo(() => ({ language, setLanguage }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  return useContext(LanguageContext)
}
