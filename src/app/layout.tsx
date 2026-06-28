import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: {
    default: 'RateMyRealtor — Find & Review Top Real Estate Agents',
    template: '%s | RateMyRealtor',
  },
  description:
    'Find top-rated real estate agents in your area. Read verified reviews, compare realtors, and connect with the best agent for buying, selling, or renting a home.',
  keywords: [
    'real estate agent reviews',
    'find a realtor',
    'realtor ratings',
    'top real estate agents',
    'home buying',
    'home selling',
    'rate my realtor',
  ],
  authors: [{ name: 'RateMyRealtor' }],
  creator: 'RateMyRealtor',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: 'RateMyRealtor',
    title: 'RateMyRealtor — Find & Review Top Real Estate Agents',
    description:
      'Verified reviews for real estate agents across all 50 states. Find your perfect agent today.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RateMyRealtor',
    description: 'Verified reviews for real estate agents across all 50 states.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e3a5f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
