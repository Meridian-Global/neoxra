import type { Metadata } from 'next'
import { AnalyticsProvider } from '../components/AnalyticsProvider'
import { LanguageProvider } from '../components/LanguageProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Neoxra | Multi-agent content system',
  description: 'Turn one idea into platform-native content for LinkedIn, Instagram, and Threads.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Space+Grotesk:wght@600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  const stored = window.localStorage.getItem('neoxra-theme');
                  const theme = stored === 'light' ? 'light' : 'dark';
                  document.documentElement.dataset.theme = theme;
                } catch (error) {
                  document.documentElement.dataset.theme = 'dark';
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <LanguageProvider>
          <AnalyticsProvider />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
