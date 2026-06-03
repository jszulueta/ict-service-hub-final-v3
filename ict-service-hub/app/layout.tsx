// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NextTopLoader from 'nextjs-toploader'
import { FetchInterceptor } from '@/components/FetchInterceptor'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'ICT Service Hub — Diocese of Kalookan',
    template: '%s | ICT Service Hub',
  },
  description: 'Internal ICT support and media service request platform for the Diocese of Kalookan.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-PH" className={inter.variable}>
      <body className="bg-slate-50 text-slate-900 antialiased font-sans">
        <NextTopLoader color="#0ea5e9" showSpinner={false} />
        <FetchInterceptor />
        {children}
      </body>
    </html>
  )
}
