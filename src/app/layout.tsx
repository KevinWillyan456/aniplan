import type { Metadata } from 'next'

import { Inter } from 'next/font/google'

import './globals.css'

import { NuqsAdapter } from 'nuqs/adapters/next/app'

import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  description:
    'AniPlan - Planejador de maratonas de anime. Organize seu tempo e descubra quando você termina seu anime.',
  title: {
    default: 'AniPlan - Maratone seus animes',
    template: '%s | AniPlan',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html className={cn('font-sans', inter.variable)} lang="pt-BR">
      <body className="antialiased">
        <NuqsAdapter>{children}</NuqsAdapter>
        <Toaster />
      </body>
    </html>
  )
}
