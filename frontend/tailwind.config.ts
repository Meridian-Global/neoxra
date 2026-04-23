import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'nxr-bg': '#0a0a14',
        'nxr-card': '#12121f',
        'nxr-card-hover': '#1a1a2e',
        'nxr-border': '#1e1e3a',
        'nxr-orange': '#f97316',
        'nxr-purple': '#a855f7',
        'nxr-text': '#f5f5f5',
        'nxr-text-secondary': '#a0a0b8',
        'nxr-text-muted': '#6b6b80',
        'nxr-ig': '#e1306c',
        'nxr-seo': '#10b981',
        'nxr-threads': '#8b5cf6',
        'nxr-fb': '#3b82f6',
      },
      boxShadow: {
        'glow-orange': '0 0 30px rgba(249,115,22,0.3)',
        'glow-purple': '0 0 30px rgba(168,85,247,0.2)',
      },
      fontFamily: {
        sans: ['Noto Sans TC', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
