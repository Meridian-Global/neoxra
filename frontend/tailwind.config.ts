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
      backgroundImage: {
        'gradient-instagram': 'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)',
        'gradient-warm': 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
        'gradient-cta': 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)',
        'gradient-cta-hover': 'linear-gradient(135deg, #fb923c 0%, #fbbf24 100%)',
        'gradient-hero-text': 'linear-gradient(90deg, #f97316, #f59e0b, #fbbf24)',
        'gradient-ig': 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)',
        'gradient-seo': 'linear-gradient(135deg, #34d399, #10b981, #059669)',
        'gradient-threads': 'linear-gradient(135deg, #c084fc, #8b5cf6, #6d28d9)',
        'gradient-fb': 'linear-gradient(135deg, #60a5fa, #3b82f6, #2563eb)',
      },
      fontFamily: {
        sans: ['Noto Sans TC', 'system-ui', 'sans-serif'],
        logo: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
