import type { Metadata } from 'next'

import { Inter } from 'next/font/google'

import './globals.css'

import { NuqsAdapter } from 'nuqs/adapters/next/app'

import { ThemeProvider } from '@/components/theme-provider'
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
    <html className={cn('font-sans', inter.variable)} lang="pt-BR" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
          enableSystem
        >
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
