import type { Metadata } from 'next'

import Link from 'next/link'

import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Página não encontrada',
}

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0a0a1a] p-4">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Error Code */}
        <div className="flex size-20 items-center justify-center rounded-full bg-white/5">
          <span className="text-4xl font-bold text-white/40">404</span>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Página não encontrada</h1>
          <p className="max-w-md text-sm text-white/50 md:text-base">
            A página que você está procurando pode ter sido removida, renomeada ou está
            temporariamente indisponível.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            asChild
            className="bg-linear-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500"
          >
            <Link href="/">Página Inicial</Link>
          </Button>
          <Button
            asChild
            className="border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            variant="outline"
          >
            <Link href="/create">Nova Maratona</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
