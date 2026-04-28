import type { Metadata } from 'next'
import { AnalyticsProvider } from '../components/AnalyticsProvider'
import { LanguageProvider } from '../components/LanguageProvider'
import { AuthProvider } from '../contexts/AuthContext'
// @ts-ignore -- Global CSS is resolved by Next.js bundler at build time.
import './globals.css'

export const metadata: Metadata = {
  title: 'Neoxra | AI-Powered Traffic Infrastructure',
  description: 'Turn ideas into traffic. Neoxra is the AI-powered infrastructure layer for scalable distribution across every surface, language, and region.',
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
          <AuthProvider>
            <AnalyticsProvider />
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
