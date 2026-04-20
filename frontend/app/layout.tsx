import type { Metadata } from 'next'
import { AnalyticsProvider } from '../components/AnalyticsProvider'
import { LanguageProvider } from '../components/LanguageProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Neoxra | Multi-agent content system',
  description: 'Turn one idea into platform-native content for LinkedIn, Instagram, and Threads.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
