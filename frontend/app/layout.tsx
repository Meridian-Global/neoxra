import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Neoxra | Multi-agent content system',
  description: 'Turn one idea into platform-native content for LinkedIn, Instagram, and Threads.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
