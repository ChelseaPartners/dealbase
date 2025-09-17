import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import GlobalHeader from '@/components/GlobalHeader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DealBase - CRE Valuation Engine',
  description: 'Commercial Real Estate Valuation System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            <GlobalHeader />
            <main>
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
