'use client'

import { useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('neoxra-theme')
    const nextTheme: Theme = storedTheme === 'light' ? 'light' : 'dark'
    document.documentElement.dataset.theme = nextTheme
    setTheme(nextTheme)
  }, [])

  function toggleTheme() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = nextTheme
    window.localStorage.setItem('neoxra-theme', nextTheme)
    setTheme(nextTheme)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3 py-1.5 text-sm text-[var(--subtle)] transition hover:border-white/20 hover:text-[var(--text)]"
      aria-label="Toggle color theme"
    >
      <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  )
}
