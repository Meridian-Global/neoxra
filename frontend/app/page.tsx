'use client'

import { useLanguage } from '../components/LanguageProvider'
import CTAFooter from '../components/landing/CTAFooter'
import Features from '../components/landing/Features'
import Footer from '../components/landing/Footer'
import HeroSection from '../components/landing/HeroSection'
import HowItWorks from '../components/landing/HowItWorks'
import Navbar from '../components/landing/Navbar'
import PlatformOutput from '../components/landing/PlatformOutput'
import StatsBar from '../components/landing/StatsBar'

type LocalizedCopy = {
  nav: {
    features: string
    useCases: string
    resources: string
    pricing: string
    login: string
    getStarted: string
  }
  hero: {
    badge: string
    titlePrefix: string
    titleHighlight: string
    tagline: string
    body: string
    primaryCta: string
    secondaryCta: string
    trustSignals: string[]
    mockup: {
      instagramLabel: string
      instagramTitle: string
      instagramSubtitle: string
      seoLabel: string
      seoTitle: string
      seoDescription: string
      threadsLabel: string
      threadsBody: string
      facebookLabel: string
      facebookBody: string
    }
  }
  stats: [
    { value: string; label: string },
    { value: string; label: string },
    { value: string; label: string },
    { value: string; label: string },
  ]
  howItWorks: {
    title: string
    subtitle: string
    steps: [
      { title: string; description: string },
      { title: string; description: string },
      { title: string; description: string },
    ]
  }
  features: {
    title: string
    items: [
      { title: string; description: string },
      { title: string; description: string },
      { title: string; description: string },
      { title: string; description: string },
    ]
  }
  platformOutput: {
    title: string
    subtitle: string
    cards: [
      { name: string; description: string; cta: string; href: string },
      { name: string; description: string; cta: string; href: string },
      { name: string; description: string; cta: string; href: string },
      { name: string; description: string; cta: string; href: string },
    ]
  }
  ctaFooter: {
    title: string
    subtitle: string
    button: string
    trust: string
  }
  footer: {
    text: string
  }
}

const COPY: Record<'en' | 'zh-TW', LocalizedCopy> = {
  'zh-TW': {
    nav: {
      features: '功能',
      useCases: '使用案例',
      resources: '資源',
      pricing: '定價',
      login: '登入',
      getStarted: '開始使用',
    },
    hero: {
      badge: '⚡ AI 內容交響樂團',
      titlePrefix: '把想法變成',
      titleHighlight: '流量',
      tagline: '一個想法，四個平台，直接發布。',
      body:
        'Neoxra 將一個想法轉化為 Instagram 輪播、SEO 文章、Threads 貼文與 Facebook 內容，結構完整、格式就緒、可直接上線。',
      primaryCta: '免費開始使用',
      secondaryCta: '預約 Demo',
      trustSignals: ['無需信用卡', '3 分鐘快速開始', '支援繁中'],
      mockup: {
        instagramLabel: 'Instagram 輪播',
        instagramTitle: '車禍後別急著和解',
        instagramSubtitle: '先做對 3 件事，才能保障自己的權益。',
        seoLabel: 'SEO 文章',
        seoTitle: '車禍理賠怎麼算？完整流程與常見索賠類型',
        seoDescription: '從蒐證、醫療文件到理賠時效，整理成可搜尋、可閱讀、可轉換的長文架構。',
        threadsLabel: 'Threads 貼文',
        threadsBody: '同一個主題，可以同時變成輪播、文章與社群貼文，讓內容真正開始分發。',
        facebookLabel: 'Facebook 內容',
        facebookBody: '把專業觀點整理成更適合分享與留言互動的貼文，延伸觸及與信任。',
      },
    },
    stats: [
      { value: '4 平台內容', label: '一次生成' },
      { value: '節省 80% 時間', label: '從構想到發布' },
      { value: '提升 300% 效率', label: '內容產出速度' },
      { value: '10,000+ 用戶', label: '專業團隊信賴' },
    ],
    howItWorks: {
      title: '內容交響樂團如何運作',
      subtitle: '你是指揮，AI 代理人是專精樂手。你給方向，他們同步執行。',
      steps: [
        {
          title: '輸入想法',
          description: '輸入一個核心想法或主題，選擇目標受眾與內容目標。',
        },
        {
          title: 'AI 樂手協作',
          description: '各專精代理人同步創作，為不同平台量身打造內容。',
        },
        {
          title: '獲得完整內容包',
          description: '結構完整、格式就緒，可直接發布的內容系統。',
        },
      ],
    },
    features: {
      title: '不只是生成內容，而是創造流量',
      items: [
        {
          title: '精準平台適配',
          description: '每個平台都有專屬格式與內容策略，最大化觸及與互動。',
        },
        {
          title: '結構完整',
          description: '標題、內文、標籤、CTA、視覺建議，一應俱全。',
        },
        {
          title: '直接發布',
          description: '不需要編輯、不用調整，複製貼上即可上線。',
        },
        {
          title: '帶來真實流量',
          description: '專業 SEO 與社群演算法優化，讓內容被更多人看到。',
        },
      ],
    },
    platformOutput: {
      title: '一個引擎，多平台輸出',
      subtitle: '同一個核心想法，在不同平台發揮最大影響力',
      cards: [
        {
          name: 'Instagram 輪播',
          description: '視覺化內容，吸引滑動與互動',
          cta: '了解更多',
          href: '/instagram',
        },
        {
          name: 'SEO 文章',
          description: '深度內容，提升搜尋排名',
          cta: '了解更多',
          href: '/seo',
        },
        {
          name: 'Threads 貼文',
          description: '快速對話，引發討論與分享',
          cta: '了解更多',
          href: '/threads',
        },
        {
          name: 'Facebook 內容',
          description: '建立社群信任，促進轉換',
          cta: '了解更多',
          href: '/facebook',
        },
      ],
    },
    ctaFooter: {
      title: '準備好把想法變成流量了嗎？',
      subtitle: '加入數千個專業團隊，讓 Neoxra 成為你的內容交響樂團。',
      button: '免費開始使用',
      trust: '✓ 無需信用卡 · 3 分鐘設定完成',
    },
    footer: {
      text: 'Neoxra © 2026 · Meridian Global LLC',
    },
  },
  en: {
    nav: {
      features: 'Features',
      useCases: 'Use Cases',
      resources: 'Resources',
      pricing: 'Pricing',
      login: 'Login',
      getStarted: 'Get Started',
    },
    hero: {
      badge: '⚡ AI Content Orchestra',
      titlePrefix: 'Turn Ideas Into',
      titleHighlight: 'Traffic',
      tagline: 'One idea. Four platforms. Ready to publish.',
      body:
        'Neoxra turns a single idea into Instagram carousels, SEO articles, Threads posts, and Facebook content — structured, formatted, and built to perform.',
      primaryCta: 'Get Started Free',
      secondaryCta: 'Book a Demo',
      trustSignals: ['No credit card', '3-minute setup', 'Traditional Chinese support'],
      mockup: {
        instagramLabel: 'Instagram Carousel',
        instagramTitle: 'Do Not Settle Too Fast',
        instagramSubtitle: 'Start with 3 steps to protect your options.',
        seoLabel: 'SEO Article',
        seoTitle: 'How Car Accident Claims Work: timing, proof, and common compensation types',
        seoDescription: 'From evidence collection to timelines, Neoxra structures a search-ready long-form article automatically.',
        threadsLabel: 'Threads Post',
        threadsBody: 'One topic can become carousels, articles, and social posts at the same time so distribution actually happens.',
        facebookLabel: 'Facebook Content',
        facebookBody: 'Turn expert viewpoints into posts built for comments, shares, and community trust.',
      },
    },
    stats: [
      { value: '4 Platforms', label: 'One generation' },
      { value: '80% Time Saved', label: 'Idea to publish' },
      { value: '300% More Output', label: 'Content velocity' },
      { value: '10,000+ Users', label: 'Trusted by pros' },
    ],
    howItWorks: {
      title: 'How Your Content Orchestra Works',
      subtitle: "You're the conductor. AI agents are the musicians. You direct, they perform in sync.",
      steps: [
        {
          title: 'Input Your Idea',
          description: 'Enter a core topic, define the audience, and set the content goal.',
        },
        {
          title: 'AI Musicians Collaborate',
          description: 'Specialist agents create platform-native content in parallel.',
        },
        {
          title: 'Get Your Content Package',
          description: 'Receive a structured, publish-ready content system across platforms.',
        },
      ],
    },
    features: {
      title: 'Not Just Content Generation. Traffic Creation.',
      items: [
        {
          title: 'Platform-Native Fit',
          description: 'Every platform gets its own format and strategy to maximize reach and interaction.',
        },
        {
          title: 'Structured Output',
          description: 'Titles, body copy, hashtags, CTAs, and visual suggestions all come together.',
        },
        {
          title: 'Publish-Ready',
          description: 'No editing needed. Copy, paste, and publish.',
        },
        {
          title: 'Drives Real Traffic',
          description: 'SEO and social optimization help more people discover the content.',
        },
      ],
    },
    platformOutput: {
      title: 'One Engine, Multiple Platforms',
      subtitle: 'Same core idea, maximum impact on every platform',
      cards: [
        {
          name: 'Instagram Carousel',
          description: 'Visual content that stops the scroll',
          cta: 'Learn more',
          href: '/instagram',
        },
        {
          name: 'SEO Article',
          description: 'Deep content built to rank in search',
          cta: 'Learn more',
          href: '/seo',
        },
        {
          name: 'Threads Post',
          description: 'Conversational content that sparks discussion',
          cta: 'Learn more',
          href: '/threads',
        },
        {
          name: 'Facebook Content',
          description: 'Community trust and conversion-oriented posts',
          cta: 'Learn more',
          href: '/facebook',
        },
      ],
    },
    ctaFooter: {
      title: 'Ready to Turn Ideas Into Traffic?',
      subtitle: 'Join the teams that let Neoxra orchestrate their content.',
      button: 'Get Started Free',
      trust: '✓ No credit card · 3 minutes to set up',
    },
    footer: {
      text: 'Neoxra © 2026 · Meridian Global LLC',
    },
  },
}

export default function HomePage() {
  const { language } = useLanguage()
  const t = COPY[language]

  return (
    <main className="min-h-screen bg-nxr-bg font-sans">
      <Navbar copy={t.nav} />
      <HeroSection copy={t.hero} />
      <StatsBar stats={t.stats} />
      <HowItWorks {...t.howItWorks} />
      <Features {...t.features} />
      <PlatformOutput {...t.platformOutput} />
      <CTAFooter {...t.ctaFooter} />
      <Footer {...t.footer} />
    </main>
  )
}
